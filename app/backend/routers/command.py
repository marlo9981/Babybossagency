"""
routers/command.py — natural language → AI routing → tool result
"""
import json
import re

from fastapi import APIRouter, Depends, HTTPException

import paths  # noqa: F401
from auth_utils import require_agency_plan
from db import User
from models import CommandRequest
from state import get_active_client

router = APIRouter(tags=["command"])

_ROUTING_PROMPT = """You are an AI agency assistant. The user has sent a natural language request.
Classify the intent and return a JSON object with this exact structure:
{
  "intent": "<intent>",
  "tool": "<tool-name>",
  "params": { <tool params> }
}

Available tools and their params:
- content-writer: brief (str), fmt (instagram|facebook|linkedin|email|blog|script|calendar|social), tone (str, optional), count (int, default 3)
- audience-analyzer: (no params needed)
- seo-analyzer: topic (str), num_results (int, default 8)
- media-planner: brief (str), budget (float, optional), channels (list[str], optional)
- ad-brief: campaign (str), channel (str)
- reporter: platform (str), date_from (YYYY-MM-DD), date_to (YYYY-MM-DD)
- social-poster: platform (str), caption (str), scheduled_time (ISO datetime), dry_run (bool, default true)
- email-sender: subject (str), body (str), list_path (str), dry_run (bool, default true)

Return ONLY valid JSON. No explanation.

User request: {message}
Active client: {client}
"""


def _extract_json(text: str) -> dict:
    text = text.strip()
    # Strip markdown code fences if present
    text = re.sub(r"^```(?:json)?\n?", "", text)
    text = re.sub(r"\n?```$", "", text)
    return json.loads(text)


@router.post("/command")
def run_command(req: CommandRequest, user: User = Depends(require_agency_plan)):
    from src.tools.ai_client import get_ai_response  # lazy import

    client = req.client or get_active_client() or "unknown"
    prompt = _ROUTING_PROMPT.format(message=req.message, client=client)

    try:
        raw = get_ai_response(prompt)
        routing = _extract_json(raw)
    except Exception as e:
        raise HTTPException(
            status_code=422,
            detail={"error": "routing_failed", "detail": str(e), "raw": raw if "raw" in dir() else ""},
        )

    tool = routing.get("tool", "")
    params = routing.get("params", {})
    if req.client:
        params["client"] = req.client

    try:
        result = _dispatch(tool, params)
        return {"intent": routing.get("intent"), "tool": tool, "output": result}
    except Exception as e:
        raise HTTPException(status_code=500, detail={"error": "tool_failed", "tool": tool, "detail": str(e)})


def _dispatch(tool: str, params: dict):
    if tool == "content-writer":
        from tools.content_writer import write_copy
        return write_copy(
            brief=params.get("brief", ""),
            fmt=params.get("fmt", "instagram"),
            tone=params.get("tone", ""),
            max_words=params.get("max_words", 0),
            count=params.get("count", 3),
            client_slug=params.get("client"),
        )
    elif tool == "audience-analyzer":
        from tools.brand_loader import load_brand
        from tools.audience_analyzer import analyze_audience
        profile, _ = load_brand(params.get("client"))
        return analyze_audience(profile)
    elif tool == "seo-analyzer":
        from tools.seo_analyzer import keyword_research
        return keyword_research(params.get("topic", ""), params.get("num_results", 8))
    elif tool == "media-planner":
        from tools.brand_loader import load_brand
        from tools.media_planner import generate_media_plan
        profile, _ = load_brand(params.get("client"))
        return generate_media_plan(
            brief=params.get("brief", ""),
            budget=float(params.get("budget", 0)),
            channels=params.get("channels", []),
            profile=profile,
        )
    elif tool == "ad-brief":
        from tools.brand_loader import load_brand
        from tools.ad_brief_creator import create_brief
        profile, _ = load_brand(params.get("client"))
        return create_brief(campaign=params.get("campaign", ""), channel=params.get("channel", ""), profile=profile)
    elif tool == "reporter":
        from tools.brand_loader import load_brand
        from tools.client_reporter import generate_report_body
        profile, _ = load_brand(params.get("client"))
        metrics = {"platform": params.get("platform", ""), "date_range": {"from": params.get("date_from", ""), "to": params.get("date_to", "")}}
        return generate_report_body(metrics=metrics, profile=profile)
    elif tool == "social-poster":
        from tools.social_poster import execute_post
        return execute_post(
            platform=params.get("platform", "instagram"),
            caption=params.get("caption", ""),
            scheduled_time=params.get("scheduled_time", ""),
            dry_run=params.get("dry_run", True),
        )
    elif tool == "email-sender":
        from tools.email_sender import send_campaign
        return send_campaign(
            subject=params.get("subject", ""),
            body=params.get("body", ""),
            list_path=params.get("list_path", ""),
            dry_run=params.get("dry_run", True),
        )
    else:
        raise ValueError(f"Unknown tool: {tool}")
