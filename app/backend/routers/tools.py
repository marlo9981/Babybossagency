"""
routers/tools.py — /tools/* endpoints
All tool imports are lazy (inside the handler) so they don't run at import time.
"""
from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException

import paths  # noqa: F401 — side-effect: patches sys.path
from auth_utils import require_agency_plan
from db import User
from models import (
    ContentWriterRequest,
    AudienceAnalyzerRequest,
    SEOAnalyzerRequest,
    MediaPlannerRequest,
    AdBriefRequest,
    ReporterRequest,
    SocialPosterRequest,
    EmailSenderRequest,
)
from state import get_active_client

router = APIRouter(prefix="/tools", tags=["tools"])


def _resolve_client(req_client: str | None) -> str | None:
    return req_client or get_active_client()


@router.post("/content-writer")
def run_content_writer(req: ContentWriterRequest, user: User = Depends(require_agency_plan)):
    try:
        from tools.content_writer import write_copy
        result = write_copy(
            brief=req.brief,
            fmt=req.fmt,
            tone=req.tone,
            max_words=req.max_words,
            count=req.count,
            client_slug=_resolve_client(req.client),
        )
        return {"output": result}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/audience-analyzer")
def run_audience_analyzer(req: AudienceAnalyzerRequest, user: User = Depends(require_agency_plan)):
    try:
        from tools.brand_loader import load_brand
        from tools.audience_analyzer import analyze_audience
        profile, _ = load_brand(_resolve_client(req.client))
        result = analyze_audience(profile)
        return {"output": result}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/seo-analyzer")
def run_seo_analyzer(req: SEOAnalyzerRequest, user: User = Depends(require_agency_plan)):
    try:
        from tools.seo_analyzer import keyword_research
        result = keyword_research(req.topic, req.num_results)
        return {"output": result}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/media-planner")
def run_media_planner(req: MediaPlannerRequest, user: User = Depends(require_agency_plan)):
    try:
        from tools.brand_loader import load_brand
        from tools.media_planner import generate_media_plan
        profile, _ = load_brand(_resolve_client(req.client))
        result = generate_media_plan(
            brief=req.brief,
            budget=req.budget,
            channels=req.channels,
            profile=profile,
        )
        return {"output": result}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/ad-brief")
def run_ad_brief(req: AdBriefRequest, user: User = Depends(require_agency_plan)):
    try:
        from tools.brand_loader import load_brand
        from tools.ad_brief_creator import create_brief
        profile, _ = load_brand(_resolve_client(req.client))
        result = create_brief(campaign=req.campaign, channel=req.channel, profile=profile)
        return {"output": result}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/reporter")
def run_reporter(req: ReporterRequest, user: User = Depends(require_agency_plan)):
    try:
        from tools.brand_loader import load_brand
        from tools.client_reporter import generate_report_body
        profile, _ = load_brand(_resolve_client(req.client))
        metrics = {
            "platform": req.platform,
            "date_range": {"from": req.date_from, "to": req.date_to},
        }
        result = generate_report_body(metrics=metrics, profile=profile)
        return {"output": result}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/social-poster")
def run_social_poster(req: SocialPosterRequest, user: User = Depends(require_agency_plan)):
    try:
        from tools.social_poster import execute_post
        result = execute_post(
            platform=req.platform,
            caption=req.caption,
            scheduled_time=req.scheduled_time,
            dry_run=req.dry_run,
        )
        return {"output": result}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/email-sender")
def run_email_sender(req: EmailSenderRequest, user: User = Depends(require_agency_plan)):
    try:
        from tools.email_sender import send_campaign
        result = send_campaign(
            subject=req.subject,
            body=req.body,
            list_path=req.list_path,
            dry_run=req.dry_run,
        )
        return {"output": result}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
