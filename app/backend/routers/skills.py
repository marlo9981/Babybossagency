"""
routers/skills.py — /skills/analytics and /skills/research
Both are standalone — no client context, credit-gated.
"""
from __future__ import annotations

import csv
import io
import json
import os
from datetime import date

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from sqlalchemy.orm import Session

import paths  # noqa: F401
from auth_utils import get_current_user
from db import get_db, User, CreditEvent
from models import ResearchRequest

router = APIRouter(prefix="/skills", tags=["skills"])

ANALYTICS_COST = 2
RESEARCH_COST = 1


def _deduct_credits(user: User, skill: str, cost: int, db: Session):
    if user.credits < cost:
        raise HTTPException(
            status_code=402,
            detail=f"Insufficient credits. Need {cost}, have {user.credits}.",
        )
    user.credits -= cost
    db.add(CreditEvent(user_id=user.id, skill=skill, credits_used=cost))
    db.commit()


@router.post("/analytics")
async def run_analytics(
    source: str = Form(...),
    date_from: str = Form(...),
    date_to: str = Form(...),
    file: UploadFile | None = File(None),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if source not in ("csv", "ga4"):
        raise HTTPException(status_code=422, detail="source must be 'csv' or 'ga4'")

    _deduct_credits(user, "analytics", ANALYTICS_COST, db)

    rows = []
    if source == "csv":
        if not file:
            raise HTTPException(status_code=422, detail="file is required for source=csv")
        content = await file.read()
        reader = csv.DictReader(io.StringIO(content.decode("utf-8")))
        rows = list(reader)
    elif source == "ga4":
        from tools.analytics_puller import pull_ga4_metrics
        property_id = os.getenv("GA4_PROPERTY_ID", "")
        if not property_id:
            raise HTTPException(status_code=503, detail="GA4_PROPERTY_ID not configured")
        start = date.fromisoformat(date_from)
        end = date.fromisoformat(date_to)
        result = pull_ga4_metrics(property_id=property_id, start=start, end=end)
        rows = result.get("rows", []) if isinstance(result, dict) else []

    if not rows:
        raise HTTPException(status_code=422, detail="No data rows found")

    columns = list(rows[0].keys()) if rows else []
    sample = rows[:50]

    from src.tools.ai_client import get_ai_response  # lazy
    prompt = f"""You are a data analyst. Analyse the following dataset ({len(rows)} rows, columns: {', '.join(columns)}).
Date range: {date_from} to {date_to}.

Sample data (first 50 rows):
{json.dumps(sample, indent=2)}

Return a JSON object with this exact structure:
{{
  "summary": "<2-3 sentence executive summary in markdown>",
  "insights": ["insight 1", "insight 2", "insight 3", "insight 4", "insight 5"],
  "chart_data": [{{ "date": "...", "<metric>": <value> }}]
}}

chart_data should have one entry per date row with all numeric columns included."""

    raw = get_ai_response(prompt)
    try:
        raw = raw.strip().lstrip("```json").lstrip("```").rstrip("```").strip()
        parsed = json.loads(raw)
    except Exception:
        parsed = {"summary": raw, "insights": [], "chart_data": []}

    return {
        "summary": parsed.get("summary", ""),
        "insights": parsed.get("insights", []),
        "chart_data": parsed.get("chart_data", []),
        "columns": columns,
        "total_rows": len(rows),
    }


@router.post("/research")
def run_research(
    req: ResearchRequest,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    _deduct_credits(user, "research", RESEARCH_COST, db)

    from src.tools.ai_client import get_ai_response  # lazy

    # Step 1: extract clean search query
    query_prompt = f"""Extract a clean, concise web search query from this research request.
Return only the search query string — no explanation, no quotes.

Request: {req.message}"""
    search_query = get_ai_response(query_prompt).strip().strip('"')

    # Step 2: web search
    sources = []
    data_source = "ai-generated"
    try:
        from src.tools.web import web_search
        results = web_search(search_query, num_results=10)
        sources = [
            {"title": r.get("title", ""), "url": r.get("href", r.get("url", "")), "snippet": r.get("body", r.get("snippet", ""))}
            for r in (results if isinstance(results, list) else [])
        ]
        data_source = "live"
    except Exception:
        pass

    # Step 3: synthesise
    synthesis_prompt = f"""You are a research analyst. Synthesise findings for this request: "{req.message}"

Search query used: {search_query}

Web results:
{json.dumps(sources[:10], indent=2)}

Return a JSON object with this exact structure:
{{
  "topic": "<extracted topic, 3-6 words>",
  "summary": "<2-3 sentence executive summary>",
  "findings": [
    {{"heading": "...", "detail": "..."}}
  ]
}}

Include 4-6 findings. Return ONLY valid JSON."""

    raw = get_ai_response(synthesis_prompt)
    try:
        raw = raw.strip().lstrip("```json").lstrip("```").rstrip("```").strip()
        parsed = json.loads(raw)
    except Exception:
        parsed = {"topic": search_query, "summary": raw, "findings": []}

    return {
        "topic": parsed.get("topic", search_query),
        "summary": parsed.get("summary", ""),
        "findings": parsed.get("findings", []),
        "sources": sources,
        "data_source": data_source,
    }
