"""
routers/billing.py — Stripe billing: subscriptions, credit packs, webhooks.
"""
import os
from datetime import datetime

import stripe
from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session

from auth_utils import get_current_user
from db import get_db, User, CreditEvent
from models import CheckoutRequest

router = APIRouter(prefix="/billing", tags=["billing"])

stripe.api_key = os.getenv("STRIPE_SECRET_KEY", "")
WEBHOOK_SECRET = os.getenv("STRIPE_WEBHOOK_SECRET", "")

CREDIT_PACK_MAP: dict[str, int] = {
    os.getenv("STRIPE_PRICE_CREDITS_20", ""): 20,
    os.getenv("STRIPE_PRICE_CREDITS_100", ""): 100,
}

PLANS = [
    {
        "id": "free",
        "name": "Free",
        "price": 0,
        "interval": None,
        "features": ["10 starter credits", "Skills pages only", "No agency tools"],
    },
    {
        "id": "agency",
        "name": "Agency",
        "price": 299,
        "interval": "month",
        "stripe_price_id": os.getenv("STRIPE_PRICE_AGENCY_MONTHLY", ""),
        "features": [
            "Unlimited agency tool runs",
            "50 credits/month for Skills",
            "All workflows",
            "Client management",
        ],
    },
    {
        "id": "retainer",
        "name": "Retainer",
        "price": None,
        "interval": "custom",
        "features": [
            "Everything in Agency",
            "Dedicated onboarding",
            "Custom workflow integration",
        ],
    },
]

CREDIT_PACKS = [
    {"credits": 20, "price": 9, "price_id": os.getenv("STRIPE_PRICE_CREDITS_20", "")},
    {"credits": 100, "price": 29, "price_id": os.getenv("STRIPE_PRICE_CREDITS_100", "")},
]


@router.get("/plans")
def get_plans():
    return {"plans": PLANS, "credit_packs": CREDIT_PACKS}


@router.get("/subscription")
def get_subscription(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    events = (
        db.query(CreditEvent)
        .filter(CreditEvent.user_id == user.id)
        .order_by(CreditEvent.created_at.desc())
        .limit(50)
        .all()
    )
    usage = [
        {"date": e.created_at.isoformat(), "skill": e.skill, "credits_used": e.credits_used}
        for e in events
    ]
    return {
        "plan": user.plan,
        "credits": user.credits,
        "stripe_customer_id": user.stripe_customer_id,
        "usage": usage,
    }


@router.post("/checkout")
def create_checkout(
    req: CheckoutRequest,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if not stripe.api_key:
        raise HTTPException(status_code=503, detail="Stripe not configured")

    frontend_url = os.getenv("FRONTEND_URL", "http://localhost:5173")

    session = stripe.checkout.Session.create(
        mode="subscription" if req.type == "subscription" else "payment",
        line_items=[{"price": req.price_id, "quantity": 1}],
        success_url=f"{frontend_url}/billing?success=1",
        cancel_url=f"{frontend_url}/billing",
        customer_email=user.email,
        metadata={"price_id": req.price_id, "user_id": str(user.id)},
    )
    return {"url": session.url}


@router.post("/portal")
def billing_portal(user: User = Depends(get_current_user)):
    if not stripe.api_key or not user.stripe_customer_id:
        raise HTTPException(status_code=400, detail="No billing account found")
    frontend_url = os.getenv("FRONTEND_URL", "http://localhost:5173")
    portal = stripe.billing_portal.Session.create(
        customer=user.stripe_customer_id,
        return_url=f"{frontend_url}/billing",
    )
    return {"url": portal.url}


@router.post("/webhook")
async def stripe_webhook(request: Request, db: Session = Depends(get_db)):
    payload = await request.body()
    sig = request.headers.get("stripe-signature", "")

    try:
        event = stripe.Webhook.construct_event(payload, sig, WEBHOOK_SECRET)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid webhook signature")

    if event["type"] == "checkout.session.completed":
        session = event["data"]["object"]
        user_id = int(session.get("metadata", {}).get("user_id", 0))
        user = db.query(User).filter(User.id == user_id).first()
        if not user:
            return {"status": "ignored"}

        if session.get("mode") == "subscription":
            user.plan = "agency"
            user.stripe_customer_id = session.get("customer")
            user.credits = (user.credits or 0) + 50  # monthly credit top-up
            db.commit()

        elif session.get("mode") == "payment":
            price_id = session.get("metadata", {}).get("price_id", "")
            qty = CREDIT_PACK_MAP.get(price_id, 0)
            if qty:
                user.credits = (user.credits or 0) + qty
                db.add(CreditEvent(user_id=user.id, skill="credit_purchase", credits_used=-qty))
                db.commit()

    elif event["type"] == "customer.subscription.deleted":
        customer_id = event["data"]["object"].get("customer")
        user = db.query(User).filter(User.stripe_customer_id == customer_id).first()
        if user:
            user.plan = "free"
            db.commit()

    return {"status": "ok"}


@router.get("/usage")
def get_usage(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    events = (
        db.query(CreditEvent)
        .filter(CreditEvent.user_id == user.id)
        .order_by(CreditEvent.created_at.desc())
        .all()
    )
    return [
        {"date": e.created_at.isoformat(), "skill": e.skill, "credits_used": e.credits_used}
        for e in events
    ]
