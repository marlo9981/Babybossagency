"""
routers/outputs.py — /outputs list and download
"""
import mimetypes
from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import FileResponse

import paths  # noqa: F401
from auth_utils import get_current_user
from db import User
from paths import OUTPUT_DIR, TMP_DIR

router = APIRouter(prefix="/outputs", tags=["outputs"])


def _parse_filename(name: str) -> dict:
    stem = Path(name).stem
    parts = stem.split("_")
    if len(parts) >= 2:
        return {"type": parts[0], "client": parts[-1]}
    return {"type": "other", "client": "unknown"}


@router.get("")
def list_outputs(user: User = Depends(get_current_user)):
    files = []
    for d in (OUTPUT_DIR, TMP_DIR):
        if not d.exists():
            continue
        for f in sorted(d.iterdir()):
            if not f.is_file():
                continue
            meta = _parse_filename(f.name)
            files.append({
                "filename": f.name,
                "client": meta["client"],
                "type": meta["type"],
                "date": f.stat().st_mtime,
                "size": f.stat().st_size,
                "dir": "output" if d == OUTPUT_DIR else "tmp",
            })
    files.sort(key=lambda x: x["date"], reverse=True)
    return {"files": files}


@router.get("/{filename}")
def download_output(filename: str, user: User = Depends(get_current_user)):
    for d in (OUTPUT_DIR, TMP_DIR):
        path = d / filename
        if path.exists() and path.is_file():
            mime, _ = mimetypes.guess_type(filename)
            return FileResponse(
                path=str(path),
                filename=filename,
                media_type=mime or "application/octet-stream",
            )
    raise HTTPException(status_code=404, detail=f"File '{filename}' not found")
