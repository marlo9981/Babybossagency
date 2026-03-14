# Agency Dashboard Design Spec

## Goal
A web application that puts a UI on top of the existing WAT framework (Workflows, Agents, Tools). The WAT framework is unchanged — the app is a thin layer that lets Marcus trigger tools, manage clients, and view outputs without touching the terminal.

## Stack
- **Frontend:** React (Vite), deployed to Vercel or GitHub Pages
- **Backend:** FastAPI (Python), deployed to Railway or Render via GitHub push
- **Styling:** Tailwind CSS — dark theme, electric blue accents
- **AI routing:** Existing `src/tools/ai_client.py` + `agency_routing_workflow.md` logic

## Architecture

```
React Frontend (Vercel / GitHub Pages)
        ↕ REST API (JSON over HTTPS)
FastAPI Backend (Railway / Render)
        ↕ direct Python import
Existing tools/*.py + brand/ + workflows/
```

The backend lives in the same `ai-agent-team/` repo under a new `app/` directory. It imports the existing tools directly — no subprocess calls, no rewrites.

## File Structure

```
ai-agent-team/
  app/
    backend/
      main.py              # FastAPI app, all routes
      routers/
        tools.py           # /tools/* endpoints
        clients.py         # /clients endpoints
        outputs.py         # /outputs endpoint
        command.py         # /command (AI routing) endpoint
        workflows.py       # /workflows endpoints
      models.py            # Pydantic request/response models
      state.py             # In-memory active client state
      paths.py             # Resolves AGENT_DIR to AI Agent / tools and brand/
    frontend/
      src/
        App.tsx
        components/
          Sidebar.tsx
          CommandBar.tsx
          ToolForm.tsx
          OutputPanel.tsx
          ClientSwitcher.tsx
        pages/
          Dashboard.tsx
          Clients.tsx
          Tools.tsx
          Workflows.tsx
          Outputs.tsx
      index.html
      vite.config.ts
      tailwind.config.ts
      package.json
  docs/
    superpowers/
      specs/
        2026-03-14-agency-dashboard-design.md
```

## Backend: FastAPI

### Path resolution (`paths.py`)
`AGENT_DIR` is set via environment variable (default: `AI Agent /` relative to repo root). All tool imports and brand/ lookups are resolved from this directory. The backend adds `AGENT_DIR` and the repo root to `sys.path` on startup so `from tools.content_writer import write_copy` and `from src.tools.ai_client import get_ai_response` resolve correctly.

```python
# paths.py
import os, sys
from pathlib import Path

REPO_ROOT = Path(__file__).parent.parent.parent.parent  # ai-agent-team/
AGENT_DIR = Path(os.getenv("AGENT_DIR", str(REPO_ROOT / "AI Agent ")))
BRAND_DIR = AGENT_DIR / "brand"
OUTPUT_DIR = AGENT_DIR / "output"
TMP_DIR = AGENT_DIR / ".tmp"
WORKFLOWS_DIR = AGENT_DIR / "workflows"

sys.path.insert(0, str(AGENT_DIR))   # for tools.*
sys.path.insert(0, str(REPO_ROOT))   # for src.tools.*

# Ensure output dirs exist on startup
OUTPUT_DIR.mkdir(exist_ok=True)
TMP_DIR.mkdir(exist_ok=True)
```

### Active client state (`state.py`)
Active client is stored in a server-side in-memory dict (reset on restart) with fallback to `ACTIVE_CLIENT` env var. Not an env var mutation — a runtime value:
```python
_state = {"active_client": os.getenv("ACTIVE_CLIENT")}

def get_active_client() -> str | None:
    return _state["active_client"]

def set_active_client(slug: str):
    _state["active_client"] = slug
```

### Endpoints

| Method | Path | Description |
|---|---|---|
| `POST` | `/command` | Natural language → AI routes → tool result |
| `GET` | `/clients` | List all client slugs + names from `brand/clients/` |
| `POST` | `/clients` | Onboard new client (wraps save_company_profile.py) |
| `GET` | `/clients/active` | Get current active client slug — **must be registered before `/{slug}`** |
| `POST` | `/clients/{slug}/activate` | Set active client in runtime state |
| `GET` | `/clients/{slug}` | Get client profile + brand config — registered after `/active` |
| `POST` | `/tools/content-writer` | Run content_writer.py |
| `POST` | `/tools/audience-analyzer` | Run audience_analyzer.py |
| `POST` | `/tools/seo-analyzer` | Run seo_analyzer.py |
| `POST` | `/tools/media-planner` | Run media_planner.py |
| `POST` | `/tools/ad-brief` | Run ad_brief_creator.py |
| `POST` | `/tools/analytics` | Run analytics_puller.py (CSV upload) |
| `POST` | `/tools/reporter` | Run client_reporter.py |
| `POST` | `/tools/social-poster` | Run social_poster.py (dry-run default) |
| `POST` | `/tools/email-sender` | Run email_sender.py (dry-run default) |
| `GET` | `/outputs` | List files in output/ and .tmp/ |
| `GET` | `/workflows` | List workflow filenames + first-line objectives |
| `GET` | `/workflows/{name}` | Return full markdown content of a workflow |

### /command endpoint (AI routing)

Accepts: `{ "message": "write 3 Instagram captions for Movara's wallet launch" }`

1. Calls `get_ai_response()` with the routing prompt from `agency_routing_workflow.md`
2. AI returns structured JSON: `{ "intent": "content", "tool": "content-writer", "params": {...} }`
3. Backend calls the resolved tool with extracted params
4. Returns tool output to frontend

### Tool integration pattern
Each tool function is imported directly and called in-process after `paths.py` has patched `sys.path`:
```python
from tools.content_writer import write_copy
result = write_copy(brief=..., fmt=..., tone=..., max_words=..., count=..., client_slug=...)
```
No subprocess. No shell calls.

### Pydantic models (models.py)
Key request models:
```python
class ContentWriterRequest(BaseModel):
    brief: str
    fmt: str  # instagram | facebook | linkedin | email | blog | script | calendar | social
    tone: str = ""
    max_words: int = 0
    count: int = 3
    client: str | None = None

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
    logo_path: str | None = None  # local path, optional

class CommandRequest(BaseModel):
    message: str
    client: str | None = None     # override active client for this command

class SocialPosterRequest(BaseModel):
    platform: str
    caption: str
    scheduled_time: str
    dry_run: bool = True          # default safe

class EmailSenderRequest(BaseModel):
    subject: str
    body: str
    list_path: str
    dry_run: bool = True          # default safe
    client: str | None = None
```

### GET /outputs — filename convention
Tools write files following the pattern `{type}_{slug}.{ext}` (e.g. `content_movara.md`, `seo_acme.json`). The backend parses filename to extract client slug (last `_`-separated segment before extension) and type (first segment). Files that don't match the convention are shown with client=`unknown` and type=`other`.

### Dry-run default
`social_poster` and `email_sender` always default `dry_run=True` unless the request explicitly passes `"dry_run": false`. This prevents accidental live sends.

### CORS
Backend allows requests from the frontend origin. Configurable via `FRONTEND_URL` env var.

## Frontend: React

### Layout
Dark sidebar (240px fixed left) + main content area. Electric blue (`#3B82F6`) as accent color. Background `#0F172A`, sidebar `#1E293B`, cards `#1E293B` with `#334155` borders.

### Pages

**Dashboard (`/`)**
- AI Command Bar — full-width text input at top: `"What do you want to do?"`. Submit button. Below it: last 5 outputs as cards (tool name, client, timestamp, preview).
- Active client badge top-right of sidebar.

**Clients (`/clients`)**
- List of client cards (name, slug, primary color swatch).
- "Set Active" button per client (sets `ACTIVE_CLIENT` via API).
- "Add Client" form — name, description, market, differentiators, colors, font.

**Tools (`/tools`)**
- Grid of tool cards. Click → expands inline form with the tool's params.
- Each form has a Run button. Output appears below the form in a code/markdown block.

**Workflows (`/workflows`)**
- List of workflow SOPs from `workflows/`. Each card shows the workflow name and objective (first 2 lines of the file).
- "View" opens the full markdown in a panel.
- "Run" button sends the workflow name to `POST /command` with message `"Run workflow: {name}"` — the AI command router handles intent classification and tool sequencing.

**Outputs (`/outputs`)**
- Table of files in `output/` and `.tmp/`. Columns: filename, client, type, date, size.
- Download link per file.

### CommandBar component
```
[ What do you want to do?                    ] [→ Send]
```
- On submit: `POST /command` with the message text.
- Shows a spinner while waiting.
- Renders the result (markdown) in an expandable panel below.
- Stores last 10 commands in localStorage for quick re-run.

### ClientSwitcher component
Dropdown in sidebar footer. Lists all clients. Selecting one calls `POST /clients/{slug}/activate` and updates the active client context globally.

## Deployment

### Backend (Railway / Render)
- `app/backend/` contains `requirements.txt` and `Procfile`: `web: uvicorn main:app --host 0.0.0.0 --port $PORT`
- Environment variables set in Railway/Render dashboard: `OPENAI_API_KEY`, `ACTIVE_CLIENT`, `AGENT_DIR` (absolute path to `AI Agent /` on server), SMTP/social credentials as needed.
- `brand/` directory is committed to the repo and available at `$AGENT_DIR/brand/` on the server.
- Auto-deploys on push to `main`.

### Frontend (Vercel)
- `app/frontend/` deployed as a Vite React app.
- `VITE_API_URL` env var points to the Railway backend URL.
- Custom domain configured in Vercel dashboard.

### GitHub repo
Both `app/backend/` and `app/frontend/` live in the same `ai-agent-team/` repo. Single repo, two deploy targets.

## Error handling
- All tool calls wrapped in try/except. Errors returned as `{ "error": "...", "detail": "..." }` with HTTP 422 or 500.
- Frontend shows error inline below the form/command bar — no page crashes.
- Dry-run is the default for destructive tools (social, email). Explicit opt-in to go live.

## Testing
- Backend: pytest for each router, mocking tool imports.
- Frontend: Vitest + React Testing Library for CommandBar and ToolForm components.
- No E2E tests in v1.
