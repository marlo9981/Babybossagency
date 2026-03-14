"""
paths.py — resolve AGENT_DIR and patch sys.path so tool imports work.

Import this module at the top of main.py before any tool imports.
"""
import os
import sys
from pathlib import Path

# app/backend/ → app/ → ai-agent-team/
REPO_ROOT = Path(__file__).parent.parent.parent

# "AI Agent " has a trailing space — preserve it
AGENT_DIR = Path(os.getenv("AGENT_DIR", str(REPO_ROOT / "AI Agent ")))
BRAND_DIR = AGENT_DIR / "brand"
OUTPUT_DIR = AGENT_DIR / "output"
TMP_DIR = AGENT_DIR / ".tmp"
WORKFLOWS_DIR = AGENT_DIR / "workflows"

# Patch sys.path so tool imports resolve correctly
if str(AGENT_DIR) not in sys.path:
    sys.path.insert(0, str(AGENT_DIR))   # for tools.*
if str(REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(REPO_ROOT))   # for src.tools.*

# Ensure output dirs exist on startup
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
TMP_DIR.mkdir(parents=True, exist_ok=True)
