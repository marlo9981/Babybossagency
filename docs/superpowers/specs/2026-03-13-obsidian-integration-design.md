# Obsidian Integration Design

**Date:** 2026-03-13
**Project:** ai-agent-team
**Status:** Approved

---

## Overview

Integrate the ai-agent-team agent with an Obsidian vault using direct filesystem access. The agent automatically writes all outputs (research, tasks, reports, reminders) to organized folders in the vault, appends a summary entry to the daily note, and reads key notes as persistent context for every query.

---

## Architecture

### New module: `src/tools/obsidian.py`

Single module responsible for all vault I/O, implemented as an `ObsidianClient` class. Instantiated at startup with the vault path and config; passed into the orchestrator.

### New module: `src/agent.py` (thin orchestrator)

A new `run_query(user_message: str) -> str` function that:
1. Classifies intent via the prompt in `config/prompts/intent_detection.txt`
2. Loads always-on Obsidian context and (for `research`/`analysis` intents) vault search results
3. Calls the appropriate tool (`web_search`, etc.)
4. Sends the enriched prompt to `ai_client.get_ai_response()`
5. Persists the result to Obsidian via `ObsidianClient`
6. Returns the response

This is the single place `obsidian.py` is wired in. Existing tool modules (`ai_client.py`, `web.py`, `notifications.py`) remain unchanged except for one addition to `ai_client.py` (see Context Injection below).

### Vault folder structure (agent-managed)

```
AI Marc/
├── Profile.md          ← user-created, loaded as always-on context
├── Goals.md            ← user-created, loaded as always-on context
├── Daily/              ← daily notes (one per day, appended to)
├── Research/           ← web search results and AI summaries
├── Tasks/              ← task records mirroring the SQLite tasks table
├── Reports/            ← weekly and scheduled reports
└── Reminders/          ← reminder notes
```

### Config addition (`config/settings.yaml`)

```yaml
obsidian:
  vault_path: "~/Library/Mobile Documents/iCloud~md~obsidian/Documents/AI Marc"
  always_on_notes:
    - "Profile.md"
    - "Goals.md"
  daily_notes_folder: "Daily"
```

`vault_path` is always resolved with `Path(vault_path).expanduser()` at `ObsidianClient` init time.

---

## `ObsidianClient` API

```python
class ObsidianClient:
    def __init__(self, settings: dict): ...
    # settings is the parsed `obsidian` block from settings.yaml

    def write_note(self, content: str, note_type: str, title: str, metadata: dict = None) -> Path:
        """Create a new note in the appropriate folder.
        metadata is merged into YAML frontmatter.
        Task notes expect metadata={"id": <int>, "status": <str>}.
        Returns the written note path."""

    def append_daily(self, entry: str, link_path: Path = None, force: bool = False) -> None:
        """Append a timestamped entry (with optional wikilink) to today's daily note.
        Skips if an entry linking to the same target already exists in today's note,
        unless force=True (used for task status-change events)."""

    def load_context_notes(self) -> str:
        """Load always-on notes (e.g. Profile.md, Goals.md).
        Returns combined text, or empty string if none exist."""

    def search_vault(self, query: str, max_results: int = 3) -> list[dict]:
        """Case-insensitive full-text search across ALL .md files including
        agent-written notes in Research/, Tasks/, Reports/, Reminders/.
        Returns list of {"file": Path, "excerpt": str}."""
```

**Note on `search_vault` scope:** Search intentionally includes agent-written notes — past research and reports are valid context for new queries. Excerpts are labelled in the prompt with their source folder so the AI can weight them appropriately (e.g. "From your past research:").

---

## Data Flow

### Writing (automatic after every agent output)

| Intent / Event         | Destination                                      | Daily note entry   |
|------------------------|--------------------------------------------------|--------------------|
| `research` result      | `Research/YYYY-MM-DD-<slug>.md`                  | Yes, with wikilink |
| Task created/completed | `Tasks/<id>-<slug>.md` (status in frontmatter)   | Yes, with wikilink |
| Scheduled digest       | `Reports/YYYY-MM-DD-digest.md`                   | Yes, with wikilink |
| Weekly report          | `Reports/YYYY-MM-DD-weekly.md`                   | Yes, with wikilink |
| Reminder set           | `Reminders/YYYY-MM-DD-<slug>.md`                 | Yes, with wikilink |

Daily note path: `Daily/YYYY-MM-DD.md`. Entries are **appended** (never overwritten). An entry is a duplicate if a wikilink to the same target already appears in today's note — duplicates are silently skipped. **Exception:** task status-change events (task completed) always append even if a wikilink to that task already exists, so same-day create + complete events both appear. Format:

```markdown
- 08:00 [[Research/2026-03-13-ai-trends|AI trends research]]
```

### Slug generation

Slugs are generated from the title by: lowercasing, replacing spaces with hyphens, stripping non-alphanumeric characters (except hyphens), truncating to 50 characters, and stripping any trailing hyphens. Example: `"What is AI?"` → `what-is-ai`.

### Note frontmatter (all agent-written notes)

```yaml
---
created: 2026-03-13T08:00:00+11:00   # local time with UTC offset
source: ai-agent-team
type: research|task|report|reminder
tags: [ai-agent]
---
```

Timestamps use `datetime.now().astimezone().isoformat(timespec="seconds")` — local time with explicit UTC offset, consistent across timezones.

### Reading (at query time, handled in `src/agent.py`)

1. **Always-on context:** `client.load_context_notes()` → prepended to the AI prompt as `"[Your profile and goals]\n{text}\n"`. Silently skipped if files don't exist.
2. **On-demand search:** For `research` and `analysis` intents, `client.search_vault(query)` → top 3 excerpts appended as `"[From your past notes]\n{excerpts}\n"` before the user message.

### Context injection into `ai_client.py`

`get_ai_response` gains one new optional parameter:

```python
def get_ai_response(prompt: str, system_context: str = "", prefer_cloud: bool = False) -> str:
```

When `system_context` is non-empty:
- **Ollama:** prepended to the prompt string as plain text
- **OpenAI:** passed as a `{"role": "system", "content": system_context}` message before the user message, so it lands in the correct system role

Both `get_ai_response` and `get_openai_response` gain the `system_context` parameter; `get_ai_response` forwards it to `get_openai_response` so context is preserved on the Ollama→OpenAI fallback path.

Note: the existing `prefer_cloud` parameter is currently a no-op (Ollama is always tried first regardless). This is a pre-existing limitation; fixing it is out of scope for this change.

---

## Error Handling

| Scenario | Behaviour |
|---|---|
| Vault path missing or inaccessible | Log warning; skip write silently; agent responds normally |
| File is an iCloud placeholder stub (not yet downloaded) | Log warning; skip read/write; treat as missing |
| Concurrent write to daily note | Append mode only — never overwrite |
| Filename collision | Append counter suffix: `-2`, `-3`, etc. |
| `Profile.md` / `Goals.md` absent | Silently skip; no error raised |
| Write fails mid-operation | Log exception; do not crash the agent |

---

## Testing (`tests/test_obsidian.py`)

All tests use pytest's `tmp_path` fixture as a fake vault — the real vault is never touched.

- `test_write_note_creates_folder_and_frontmatter`
- `test_write_note_task_includes_id_and_status_in_frontmatter`
- `test_append_daily_creates_timestamped_entry`
- `test_append_daily_skips_duplicate_wikilink`
- `test_search_vault_returns_correct_excerpts`
- `test_missing_vault_path_degrades_gracefully`
- `test_load_context_notes_skips_missing_files`
- `test_slug_generation_strips_special_characters`
- `test_write_note_collision_appends_counter_suffix`
- `test_append_daily_task_status_change_always_appends`

---

## Files Changed

| File | Change |
|---|---|
| `src/tools/obsidian.py` | **New** — `ObsidianClient` class |
| `src/agent.py` | **New** — thin orchestrator wiring tools + Obsidian |
| `src/tools/ai_client.py` | Add optional `system_context: str = ""` parameter to both `get_ai_response` and `get_openai_response`; forward it through the fallback chain |
| `config/settings.yaml` | Add `obsidian` config block |
| `tests/test_obsidian.py` | **New** — unit tests |
| `requirements.txt` | No new dependencies required |
| `CLAUDE.md` | **New** — create project conventions file including Obsidian integration details |
