"""
state.py — in-memory active client state (reset on restart).
Falls back to ACTIVE_CLIENT env var if set.
"""
import os

_state: dict = {"active_client": os.getenv("ACTIVE_CLIENT")}


def get_active_client() -> str | None:
    return _state["active_client"]


def set_active_client(slug: str) -> None:
    _state["active_client"] = slug
