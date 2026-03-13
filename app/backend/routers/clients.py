"""
routers/clients.py — /clients endpoints
"""
import json
import subprocess
import sys
from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException

import paths  # noqa: F401 — side-effect: patches sys.path
from auth_utils import get_current_user, require_agency_plan
from db import User
from models import ClientCreateRequest
from paths import BRAND_DIR
from state import get_active_client, set_active_client

router = APIRouter(prefix="/clients", tags=["clients"])


def _list_client_slugs() -> list[dict]:
    clients_dir = BRAND_DIR / "clients"
    if not clients_dir.exists():
        return []
    result = []
    for slug_dir in sorted(clients_dir.iterdir()):
        if not slug_dir.is_dir():
            continue
        profile_path = slug_dir / "profile.json"
        name = slug_dir.name
        if profile_path.exists():
            try:
                profile = json.loads(profile_path.read_text())
                name = profile.get("name", slug_dir.name)
            except Exception:
                pass
        brand_config_path = slug_dir / "brand_config.json"
        primary_color = "#3B82F6"
        if brand_config_path.exists():
            try:
                cfg = json.loads(brand_config_path.read_text())
                primary_color = cfg.get("colors", {}).get("primary", "#3B82F6")
            except Exception:
                pass
        result.append({"slug": slug_dir.name, "name": name, "primary_color": primary_color})
    return result


@router.get("")
def list_clients(user: User = Depends(get_current_user)):
    return {"clients": _list_client_slugs()}


@router.post("")
def create_client(req: ClientCreateRequest, user: User = Depends(require_agency_plan)):
    from tools.save_company_profile import main as _save  # noqa
    slug = req.name.lower().replace(" ", "-")
    output_dir = BRAND_DIR / "clients" / slug
    output_dir.mkdir(parents=True, exist_ok=True)

    profile = {
        "name": req.name,
        "description": req.description,
        "market": req.market,
        "differentiators": [d.strip() for d in req.differentiators.split(",")],
    }
    (output_dir / "profile.json").write_text(json.dumps(profile, indent=2))

    brand_config = {
        "logo_path": req.logo_path or "",
        "colors": {
            "primary": req.primary_color,
            "secondary": req.secondary_color,
            "accent": req.accent_color,
            "text": req.text_color,
            "background": "#FFFFFF",
        },
        "font": req.font,
        "heading_font": req.font,
    }
    (output_dir / "brand_config.json").write_text(json.dumps(brand_config, indent=2))
    return {"slug": slug, "name": req.name}


# NOTE: /clients/active MUST be registered before /clients/{slug}
@router.get("/active")
def get_active(user: User = Depends(get_current_user)):
    return {"active_client": get_active_client()}


@router.post("/{slug}/activate")
def activate_client(slug: str, user: User = Depends(require_agency_plan)):
    client_dir = BRAND_DIR / "clients" / slug
    if not client_dir.exists():
        raise HTTPException(status_code=404, detail=f"Client '{slug}' not found")
    set_active_client(slug)
    return {"active_client": slug}


@router.get("/{slug}")
def get_client(slug: str, user: User = Depends(get_current_user)):
    client_dir = BRAND_DIR / "clients" / slug
    if not client_dir.exists():
        raise HTTPException(status_code=404, detail=f"Client '{slug}' not found")

    profile = {}
    profile_path = client_dir / "profile.json"
    if profile_path.exists():
        profile = json.loads(profile_path.read_text())

    brand_config = {}
    config_path = client_dir / "brand_config.json"
    if config_path.exists():
        brand_config = json.loads(config_path.read_text())

    return {"slug": slug, "profile": profile, "brand_config": brand_config}
