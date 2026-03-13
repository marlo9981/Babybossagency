"""
routers/workflows.py — /workflows list and view (not plan-gated — read-only)
"""
from fastapi import APIRouter, Depends, HTTPException

import paths  # noqa: F401
from auth_utils import get_current_user
from db import User
from paths import WORKFLOWS_DIR

router = APIRouter(prefix="/workflows", tags=["workflows"])


@router.get("")
def list_workflows(user: User = Depends(get_current_user)):
    if not WORKFLOWS_DIR.exists():
        return {"workflows": []}
    workflows = []
    for f in sorted(WORKFLOWS_DIR.glob("*.md")):
        lines = f.read_text(encoding="utf-8").splitlines()
        objective = ""
        for line in lines[:5]:
            line = line.strip().lstrip("#").strip()
            if line:
                objective = line
                break
        workflows.append({"name": f.stem, "filename": f.name, "objective": objective})
    return {"workflows": workflows}


@router.get("/{name}")
def get_workflow(name: str, user: User = Depends(get_current_user)):
    # Accept with or without .md extension
    clean = name.removesuffix(".md")
    path = WORKFLOWS_DIR / f"{clean}.md"
    if not path.exists():
        raise HTTPException(status_code=404, detail=f"Workflow '{clean}' not found")
    return {"name": clean, "content": path.read_text(encoding="utf-8")}
