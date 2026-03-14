"""
models.py — Pydantic request/response models.
"""
from __future__ import annotations

from pydantic import BaseModel, EmailStr


# ── Auth ──────────────────────────────────────────────────────────────────────

class RegisterRequest(BaseModel):
    email: EmailStr
    password: str


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


class UserResponse(BaseModel):
    id: int
    email: str
    plan: str
    credits: int


# ── Billing ───────────────────────────────────────────────────────────────────

class CheckoutRequest(BaseModel):
    type: str       # "subscription" | "credits"
    price_id: str   # Stripe price ID


# ── Clients ───────────────────────────────────────────────────────────────────

class ClientCreateRequest(BaseModel):
    name: str
    description: str
    market: str
    differentiators: str          # comma-separated
    primary_color: str            # hex e.g. #1A2B3C
    secondary_color: str = "#6B7280"
    accent_color: str = "#3B82F6"
    text_color: str = "#111827"
    font: str = "Inter"
    logo_path: str | None = None


# ── Tools ─────────────────────────────────────────────────────────────────────

class ContentWriterRequest(BaseModel):
    brief: str
    fmt: str        # instagram | facebook | linkedin | email | blog | script | calendar | social
    tone: str = ""
    max_words: int = 0
    count: int = 3
    client: str | None = None


class AudienceAnalyzerRequest(BaseModel):
    client: str | None = None


class SEOAnalyzerRequest(BaseModel):
    topic: str
    num_results: int = 8
    client: str | None = None


class MediaPlannerRequest(BaseModel):
    brief: str
    budget: float = 0.0
    channels: list[str] = []
    client: str | None = None


class AdBriefRequest(BaseModel):
    campaign: str
    channel: str
    client: str | None = None


class AnalyticsPullerRequest(BaseModel):
    list_path: str
    client: str | None = None


class ReporterRequest(BaseModel):
    platform: str
    date_from: str
    date_to: str
    client: str | None = None


class SocialPosterRequest(BaseModel):
    platform: str
    caption: str
    scheduled_time: str
    dry_run: bool = True


class EmailSenderRequest(BaseModel):
    subject: str
    body: str
    list_path: str
    dry_run: bool = True
    client: str | None = None


# ── Command ───────────────────────────────────────────────────────────────────

class CommandRequest(BaseModel):
    message: str
    client: str | None = None


# ── Skills ────────────────────────────────────────────────────────────────────

class ResearchRequest(BaseModel):
    message: str
