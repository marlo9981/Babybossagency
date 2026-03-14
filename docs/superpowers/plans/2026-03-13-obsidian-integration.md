# Obsidian Integration Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Wire the ai-agent-team agent to an Obsidian vault — auto-saving all outputs to organised folders and reading key notes as AI context.

**Architecture:** A new `ObsidianClient` class handles all vault I/O via direct filesystem access (no plugins). A new thin `src/agent.py` orchestrator is the single place Obsidian is wired in. One small change to `ai_client.py` threads `system_context` through to both backends.

**Tech Stack:** Python 3, `pathlib`, `pyyaml` (already in requirements), `pytest` with `tmp_path` for tests.

**Spec:** `docs/superpowers/specs/2026-03-13-obsidian-integration-design.md`

---

## Chunk 1: Config + `ObsidianClient` foundation

### Task 1: Add obsidian block to `config/settings.yaml`

**Files:**
- Modify: `config/settings.yaml`

- [ ] **Step 1: Add the obsidian config block**

Open `config/settings.yaml` and append:

```yaml
# Obsidian
obsidian:
  vault_path: "~/Library/Mobile Documents/iCloud~md~obsidian/Documents/AI Marc"
  always_on_notes:
    - "Profile.md"
    - "Goals.md"
  daily_notes_folder: "Daily"
```

- [ ] **Step 2: Verify YAML is valid**

```bash
python -c "import yaml; yaml.safe_load(open('config/settings.yaml'))"
```
Expected: no output (no errors).

- [ ] **Step 3: Commit**

```bash
git add config/settings.yaml
git commit -m "config: add obsidian vault settings"
```

---

### Task 2: Scaffold `ObsidianClient` with `__init__` and slug helper

**Files:**
- Create: `src/tools/__init__.py`
- Create: `tests/__init__.py`
- Create: `conftest.py`
- Create: `src/tools/obsidian.py`
- Create: `tests/test_obsidian.py`

- [ ] **Step 1: Create required package files**

```bash
mkdir -p tests
touch src/tools/__init__.py tests/__init__.py
```

Create `conftest.py` at the project root:

```python
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
```

- [ ] **Step 2: Write the failing slug test**

Create `tests/test_obsidian.py`:

```python
import pytest
from pathlib import Path
from src.tools.obsidian import make_slug, ObsidianClient


def test_slug_generation_strips_special_characters():
    assert make_slug("What is AI?") == "what-is-ai"
    assert make_slug("Hello, World!!!") == "hello-world"
    assert make_slug("  leading and trailing  ") == "leading-and-trailing"
    assert make_slug("AI -- Research") == "ai-research"   # consecutive hyphens collapsed
    # truncation: many words → slug must be ≤50 chars and no trailing hyphen
    long_title = " ".join(["word"] * 20)
    slug = make_slug(long_title)
    assert len(slug) <= 50
    assert not slug.endswith("-")
```

- [ ] **Step 3: Run test to verify it fails**

```bash
cd /Users/marcus/ai-agent-team
pytest tests/test_obsidian.py::test_slug_generation_strips_special_characters -v
```
Expected: `ModuleNotFoundError` or `ImportError` — `obsidian.py` doesn't exist yet.

- [ ] **Step 4: Create `src/tools/obsidian.py` with `make_slug` and `ObsidianClient.__init__`**

```python
"""
Obsidian vault integration — read/write via direct filesystem access.
"""

import re
import logging
from datetime import datetime
from pathlib import Path

import yaml

logger = logging.getLogger(__name__)

_FOLDER_MAP = {
    "research": "Research",
    "task": "Tasks",
    "report": "Reports",
    "reminder": "Reminders",
}


def make_slug(title: str) -> str:
    """Convert a title to a filename-safe slug (max 50 chars, no trailing hyphen)."""
    slug = title.lower()
    slug = re.sub(r"[^a-z0-9\s-]", "", slug)
    slug = re.sub(r"[\s]+", "-", slug.strip())
    slug = re.sub(r"-{2,}", "-", slug)   # collapse consecutive hyphens (e.g. from "AI -- Research")
    slug = slug[:50].rstrip("-")
    return slug


class ObsidianClient:
    def __init__(self, settings: dict):
        """
        settings: the parsed 'obsidian' block from settings.yaml, e.g.:
          {"vault_path": "~/...", "always_on_notes": [...], "daily_notes_folder": "Daily"}
        """
        raw_path = settings.get("vault_path", "")
        self.vault = Path(raw_path).expanduser() if raw_path else None
        self.always_on = settings.get("always_on_notes", [])
        self.daily_folder = settings.get("daily_notes_folder", "Daily")
        self._check_vault()

    def _check_vault(self) -> bool:
        """Return True if vault is accessible; log warning and return False otherwise."""
        if not self.vault or not self.vault.exists():
            logger.warning("Obsidian vault not found at %s — Obsidian integration disabled", self.vault)
            self.vault = None
            return False
        return True
```

- [ ] **Step 5: Run slug test to verify it passes**

```bash
pytest tests/test_obsidian.py::test_slug_generation_strips_special_characters -v
```
Expected: `PASSED`.

- [ ] **Step 6: Commit**

```bash
git add src/tools/__init__.py tests/__init__.py conftest.py src/tools/obsidian.py tests/test_obsidian.py
git commit -m "feat: scaffold ObsidianClient with slug helper and vault init"
```

---

### Task 3: Implement and test `write_note`

**Files:**
- Modify: `src/tools/obsidian.py`
- Modify: `tests/test_obsidian.py`

- [ ] **Step 1: Write the failing tests**

Append to `tests/test_obsidian.py`:

```python
def _make_client(tmp_path: Path) -> ObsidianClient:
    return ObsidianClient({"vault_path": str(tmp_path), "always_on_notes": [], "daily_notes_folder": "Daily"})


def test_write_note_creates_folder_and_frontmatter(tmp_path):
    client = _make_client(tmp_path)
    path = client.write_note("Some research content.", "research", "AI Trends 2026")
    assert path.exists()
    assert path.parent.name == "Research"
    text = path.read_text()
    assert "source: ai-agent-team" in text
    assert "type: research" in text
    assert "Some research content." in text


def test_write_note_task_includes_id_and_status_in_frontmatter(tmp_path):
    client = _make_client(tmp_path)
    path = client.write_note("Fix the bug.", "task", "Fix login bug", metadata={"id": 42, "status": "completed"})
    text = path.read_text()
    assert "42-fix-login-bug" in path.name
    assert "status: completed" in text
    assert "id: 42" in text


def test_write_note_collision_appends_counter_suffix(tmp_path):
    client = _make_client(tmp_path)
    path1 = client.write_note("First.", "research", "AI Trends")
    path2 = client.write_note("Second.", "research", "AI Trends")
    assert path1 != path2
    assert path2.stem.endswith("-2")


def test_missing_vault_path_degrades_gracefully(tmp_path):
    client = ObsidianClient({"vault_path": str(tmp_path / "nonexistent"), "always_on_notes": [], "daily_notes_folder": "Daily"})
    # Should not raise; returns None when vault unavailable
    result = client.write_note("content", "research", "title")
    assert result is None
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
pytest tests/test_obsidian.py -k "write_note or missing_vault" -v
```
Expected: all fail — `write_note` not defined yet.

- [ ] **Step 3: Implement `write_note` in `src/tools/obsidian.py`**

Add this method to `ObsidianClient` (inside the class, after `_check_vault`):

```python
    def write_note(self, content: str, note_type: str, title: str, metadata: dict = None) -> Path | None:
        """Write a new note to the appropriate vault subfolder.

        Returns the Path of the written file, or None if vault is unavailable.
        metadata is merged into YAML frontmatter; task notes expect {"id": int, "status": str}.
        """
        if not self.vault:
            return None

        folder_name = _FOLDER_MAP.get(note_type, note_type.capitalize())
        folder = self.vault / folder_name
        try:
            folder.mkdir(parents=True, exist_ok=True)
        except OSError as e:
            logger.warning("Could not create Obsidian folder %s: %s", folder, e)
            return None

        # Build filename
        date_str = datetime.now().strftime("%Y-%m-%d")
        extra = metadata or {}

        if note_type == "task" and "id" in extra:
            base_name = f"{extra['id']}-{make_slug(title)}"
        else:
            base_name = f"{date_str}-{make_slug(title)}"

        path = self._resolve_collision(folder / f"{base_name}.md")

        # Build frontmatter
        fm: dict = {
            "created": datetime.now().astimezone().isoformat(timespec="seconds"),
            "source": "ai-agent-team",
            "type": note_type,
            "tags": ["ai-agent"],
        }
        fm.update({k: v for k, v in extra.items()})

        fm_str = yaml.dump(fm, default_flow_style=False, sort_keys=False).strip()
        body = f"---\n{fm_str}\n---\n\n# {title}\n\n{content}\n"

        try:
            path.write_text(body, encoding="utf-8")
        except OSError as e:
            logger.warning("Could not write Obsidian note %s: %s", path, e)
            return None

        return path

    def _resolve_collision(self, path: Path) -> Path:
        """Return path unchanged if it doesn't exist; otherwise append -2, -3, etc."""
        if not path.exists():
            return path
        stem, suffix = path.stem, path.suffix
        counter = 2
        while True:
            candidate = path.parent / f"{stem}-{counter}{suffix}"
            if not candidate.exists():
                return candidate
            counter += 1
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
pytest tests/test_obsidian.py -k "write_note or missing_vault" -v
```
Expected: all 4 `PASSED`.

- [ ] **Step 5: Commit**

```bash
git add src/tools/obsidian.py tests/test_obsidian.py
git commit -m "feat: implement ObsidianClient.write_note with collision handling"
```

---

### Task 4: Implement and test `append_daily`

**Files:**
- Modify: `src/tools/obsidian.py`
- Modify: `tests/test_obsidian.py`

- [ ] **Step 1: Write the failing tests**

Append to `tests/test_obsidian.py`:

```python
def test_append_daily_creates_timestamped_entry(tmp_path):
    client = _make_client(tmp_path)
    client.append_daily("Did some research")
    daily_dir = tmp_path / "Daily"
    files = list(daily_dir.glob("*.md"))
    assert len(files) == 1
    text = files[0].read_text()
    assert "Did some research" in text


def test_append_daily_skips_duplicate_wikilink(tmp_path):
    client = _make_client(tmp_path)
    link = tmp_path / "Research" / "2026-03-13-ai-trends.md"
    client.append_daily("AI research", link_path=link)
    client.append_daily("AI research again", link_path=link)
    daily_dir = tmp_path / "Daily"
    text = list(daily_dir.glob("*.md"))[0].read_text()
    # wikilink should appear exactly once
    assert text.count("2026-03-13-ai-trends") == 1


def test_append_daily_task_status_change_always_appends(tmp_path):
    client = _make_client(tmp_path)
    link = tmp_path / "Tasks" / "42-fix-bug.md"
    client.append_daily("Task created", link_path=link)
    client.append_daily("Task completed", link_path=link, force=True)
    daily_dir = tmp_path / "Daily"
    text = list(daily_dir.glob("*.md"))[0].read_text()
    # Both entries should appear
    assert text.count("42-fix-bug") == 2
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
pytest tests/test_obsidian.py -k "append_daily" -v
```
Expected: all fail — `append_daily` not defined yet.

- [ ] **Step 3: Implement `append_daily` in `src/tools/obsidian.py`**

Add this method to `ObsidianClient`:

```python
    def append_daily(self, entry: str, link_path: Path = None, force: bool = False) -> None:
        """Append a timestamped line to today's daily note.

        If link_path is given the line includes a wikilink.
        Duplicate wikilink targets are skipped unless force=True
        (use force=True for task status-change events).
        """
        if not self.vault:
            return

        daily_dir = self.vault / self.daily_folder
        try:
            daily_dir.mkdir(parents=True, exist_ok=True)
        except OSError as e:
            logger.warning("Could not create Daily folder: %s", e)
            return

        today = datetime.now().strftime("%Y-%m-%d")
        daily_file = daily_dir / f"{today}.md"

        # Build the wikilink string (relative to vault root)
        wikilink_target = None
        if link_path:
            try:
                rel = link_path.relative_to(self.vault)
                # Remove .md extension for wikilink
                wikilink_target = str(rel.with_suffix(""))
            except ValueError:
                wikilink_target = link_path.stem

        # Deduplication: skip if same wikilink already in today's file (unless forced)
        if wikilink_target and not force and daily_file.exists():
            existing = daily_file.read_text(encoding="utf-8")
            if wikilink_target in existing:
                return

        time_str = datetime.now().strftime("%H:%M")
        if wikilink_target:
            line = f"- {time_str} [[{wikilink_target}|{entry}]]\n"
        else:
            line = f"- {time_str} {entry}\n"

        try:
            with daily_file.open("a", encoding="utf-8") as f:
                f.write(line)
        except OSError as e:
            logger.warning("Could not write to daily note %s: %s", daily_file, e)
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
pytest tests/test_obsidian.py -k "append_daily" -v
```
Expected: all 3 `PASSED`.

- [ ] **Step 5: Commit**

```bash
git add src/tools/obsidian.py tests/test_obsidian.py
git commit -m "feat: implement ObsidianClient.append_daily with deduplication"
```

---

### Task 5: Implement and test `load_context_notes` and `search_vault`

**Files:**
- Modify: `src/tools/obsidian.py`
- Modify: `tests/test_obsidian.py`

- [ ] **Step 1: Write the failing tests**

Append to `tests/test_obsidian.py`:

```python
def test_load_context_notes_skips_missing_files(tmp_path):
    # Configure notes that don't exist on disk — exercises the skip-missing-file branch
    client = ObsidianClient({
        "vault_path": str(tmp_path),
        "always_on_notes": ["Profile.md", "Goals.md"],
        "daily_notes_folder": "Daily",
    })
    result = client.load_context_notes()
    assert result == ""


def test_load_context_notes_returns_combined_text(tmp_path):
    client = ObsidianClient({
        "vault_path": str(tmp_path),
        "always_on_notes": ["Profile.md", "Goals.md"],
        "daily_notes_folder": "Daily",
    })
    (tmp_path / "Profile.md").write_text("I am Marcus.", encoding="utf-8")
    (tmp_path / "Goals.md").write_text("My goal is to build AI agents.", encoding="utf-8")
    result = client.load_context_notes()
    assert "I am Marcus." in result
    assert "My goal is to build AI agents." in result


def test_search_vault_returns_correct_excerpts(tmp_path):
    client = _make_client(tmp_path)
    research_dir = tmp_path / "Research"
    research_dir.mkdir()
    (research_dir / "2026-03-13-ai.md").write_text("AI stands for artificial intelligence.", encoding="utf-8")
    (research_dir / "2026-03-13-other.md").write_text("Nothing relevant here.", encoding="utf-8")
    results = client.search_vault("artificial intelligence")
    assert len(results) == 1
    assert "artificial intelligence" in results[0]["excerpt"].lower()
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
pytest tests/test_obsidian.py -k "context_notes or search_vault" -v
```
Expected: all fail.

- [ ] **Step 3: Implement `load_context_notes` and `search_vault`**

Add these methods to `ObsidianClient`:

```python
    def load_context_notes(self) -> str:
        """Load always-on notes (Profile.md, Goals.md, etc.) from vault root.
        Returns combined text, or empty string if none exist or vault unavailable.
        iCloud placeholder stubs (zero-byte) are silently skipped.
        """
        if not self.vault:
            return ""
        parts = []
        for note_name in self.always_on:
            note_path = self.vault / note_name
            if not note_path.exists() or note_path.stat().st_size == 0:
                continue
            try:
                text = note_path.read_text(encoding="utf-8").strip()
                if text:
                    parts.append(f"## {note_name}\n{text}")
            except OSError as e:
                logger.warning("Could not read context note %s: %s", note_path, e)
        return "\n\n".join(parts)

    def search_vault(self, query: str, max_results: int = 3) -> list[dict]:
        """Case-insensitive full-text search across all .md files in the vault.

        Returns list of {"file": Path, "excerpt": str} for the top matches.
        iCloud placeholder stubs (zero-byte files) are skipped.
        """
        if not self.vault:
            return []
        query_lower = query.lower()
        matches = []
        for md_file in self.vault.rglob("*.md"):
            if md_file.stat().st_size == 0:
                continue
            try:
                text = md_file.read_text(encoding="utf-8")
            except OSError:
                continue
            if query_lower in text.lower():
                # Find the first matching line as excerpt
                for line in text.splitlines():
                    if query_lower in line.lower():
                        excerpt = line.strip()[:200]
                        matches.append({"file": md_file, "excerpt": excerpt})
                        break
        return matches[:max_results]
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
pytest tests/test_obsidian.py -k "context_notes or search_vault" -v
```
Expected: all 3 `PASSED`.

- [ ] **Step 5: Run the full test suite**

```bash
pytest tests/test_obsidian.py -v
```
Expected: all 11 tests `PASSED`. (10 from the spec + `test_load_context_notes_returns_combined_text`)

- [ ] **Step 6: Commit**

```bash
git add src/tools/obsidian.py tests/test_obsidian.py
git commit -m "feat: implement load_context_notes and search_vault"
```

---

## Chunk 2: `ai_client.py` patch + `agent.py` orchestrator

> **Prerequisite:** Chunk 1 must be completed first. `src/tools/__init__.py`, `conftest.py`, and `tests/` must exist before running any step in this chunk.

### Task 6: Add `system_context` to `ai_client.py`

**Files:**
- Modify: `src/tools/ai_client.py`

- [ ] **Step 1: Open `src/tools/ai_client.py` and read the current `get_openai_response` and `get_ai_response` signatures**

Current (lines 25 and 42):
```python
def get_openai_response(prompt: str, model: str = "gpt-4o") -> str:
def get_ai_response(prompt: str, prefer_cloud: bool = False) -> str:
```

- [ ] **Step 2: Update `get_openai_response` to accept and use `system_context`**

Replace the function body (lines 25–40). **Do not delete the `if __name__ == "__main__":` block at the end of the file.** Replace only the named function definitions shown below:


```python
def get_openai_response(prompt: str, model: str = "gpt-4o", system_context: str = "") -> str:
    """Get response from OpenAI."""
    api_key = os.getenv("OPENAI_API_KEY")
    if not api_key:
        return None

    client = OpenAI(api_key=api_key)
    messages = []
    if system_context:
        messages.append({"role": "system", "content": system_context})
    messages.append({"role": "user", "content": prompt})

    try:
        response = client.chat.completions.create(model=model, messages=messages)
        return response.choices[0].message.content
    except Exception as e:
        print(f"OpenAI error: {e}")
        return None
```

- [ ] **Step 3: Update `get_ai_response` to accept and forward `system_context`**

Replace the function with:

```python
def get_ai_response(prompt: str, system_context: str = "", prefer_cloud: bool = False) -> str:
    """Get AI response with fallback — default to local Ollama.

    system_context is prepended to the Ollama prompt and passed as a system
    role message to OpenAI. prefer_cloud is accepted but currently a no-op.
    """
    # Build the Ollama prompt with context prepended as plain text
    ollama_prompt = f"{system_context}\n\n{prompt}".strip() if system_context else prompt

    result = get_ollama_response(ollama_prompt)
    if result:
        return result

    print("Falling back to OpenAI...")
    result = get_openai_response(prompt, system_context=system_context)
    if result:
        return result

    return "Sorry, I'm having trouble connecting to any AI service right now."
```

- [ ] **Step 4: Verify the module imports cleanly**

```bash
python -c "from src.tools.ai_client import get_ai_response; print('OK')"
```
Expected: `OK`

- [ ] **Step 5: Commit**

```bash
git add src/tools/ai_client.py
git commit -m "feat: add system_context parameter to ai_client for Obsidian context injection"
```

---

### Task 7: Build `src/agent.py` orchestrator

**Files:**
- Create: `src/agent.py`

- [ ] **Step 1: Create `src/agent.py`**

```python
"""
Thin orchestrator — intent classification, tool dispatch, Obsidian persistence.
"""

import logging
from pathlib import Path

import yaml

from src.tools.ai_client import get_ai_response
from src.tools.web import web_search
from src.tools.obsidian import ObsidianClient

logger = logging.getLogger(__name__)

_CONFIG_PATH = Path(__file__).parent.parent / "config" / "settings.yaml"
_INTENT_PROMPT_PATH = Path(__file__).parent.parent / "config" / "prompts" / "intent_detection.txt"


def _load_config() -> dict:
    with open(_CONFIG_PATH, encoding="utf-8") as f:
        return yaml.safe_load(f)


def _classify_intent(message: str, template: str) -> str:
    prompt = template.replace("{user_message}", message)
    intent = get_ai_response(prompt).strip().lower()
    valid = {"research", "coding", "analysis", "writing", "general", "scheduling", "admin"}
    return intent if intent in valid else "general"


def run_query(user_message: str) -> str:
    """Classify intent, enrich prompt with Obsidian context, call AI, persist result."""
    config = _load_config()
    obsidian_settings = config.get("obsidian", {})
    client = ObsidianClient(obsidian_settings)

    # Load always-on Obsidian context
    context_notes = client.load_context_notes()
    system_context = f"[Your profile and goals]\n{context_notes}" if context_notes else ""

    # Classify intent
    intent_template = _INTENT_PROMPT_PATH.read_text(encoding="utf-8")
    intent = _classify_intent(user_message, intent_template)

    # For research/analysis: augment with vault search results
    vault_context = ""
    if intent in ("research", "analysis"):
        results = client.search_vault(user_message)
        if results:
            labelled = []
            for r in results:
                # Use the parent folder name as a source label (e.g. "Research", "Tasks")
                source = r["file"].parent.name
                labelled.append(f"- [{source}] {r['excerpt']}")
            vault_context = f"[From your past notes]\n" + "\n".join(labelled)

    # For research intent: run a live web search and include results in the prompt
    web_results = ""
    if intent == "research":
        web_results = _do_research(user_message)

    # Build enriched prompt
    full_context = "\n\n".join(filter(None, [system_context, vault_context]))
    user_prompt = f"{web_results}\n\n{user_message}".strip() if web_results else user_message
    response = get_ai_response(user_prompt, system_context=full_context)

    # Persist to Obsidian
    _persist(client, intent, user_message, response)

    return response


def _do_research(query: str) -> str:
    """Run a web search and return formatted results."""
    results = web_search(query, num_results=5)
    if not results:
        return ""
    lines = [f"- [{r['title']}]({r['url']}): {r['snippet']}" for r in results]
    return "**Web search results:**\n" + "\n".join(lines)


def _persist(client: ObsidianClient, intent: str, query: str, response: str) -> None:
    """Save the agent output to the appropriate Obsidian folder and daily note."""
    if intent == "research":
        content = f"**Query:** {query}\n\n**Response:**\n\n{response}"
        note_path = client.write_note(content, "research", query)
        if note_path:
            client.append_daily(query, link_path=note_path)
    else:
        # For other intents, append a plain entry to the daily note
        client.append_daily(f"[{intent}] {query[:80]}")
```

- [ ] **Step 2: Verify the module imports cleanly**

```bash
python -c "from src.agent import run_query; print('OK')"
```
Expected: `OK`

- [ ] **Step 3: Smoke-test with a simple query (no AI required)**

This will fail gracefully if Ollama isn't running — that's fine, we just want no import/runtime crash:

```bash
python -c "
from src.agent import run_query
try:
    result = run_query('hello')
    print('Response:', result[:80])
except Exception as e:
    print('Error (expected if Ollama not running):', e)
"
```
Expected: either a response or a graceful error message — **not** an unhandled exception.

- [ ] **Step 4: Commit**

```bash
git add src/agent.py
git commit -m "feat: add agent.py orchestrator wiring Obsidian context into queries"
```

---

### Task 8: Update `CLAUDE.md` and run full test suite

**Files:**
- Create: `ai-agent-team/CLAUDE.md`

- [ ] **Step 1: Create `CLAUDE.md` in the project root**

Write the following content to `ai-agent-team/CLAUDE.md` (use the Write tool or a text editor — do not copy the fences below, they are just plan formatting):

~~~markdown
# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Setup

    pip install -r requirements.txt
    cp .env.example .env  # fill in credentials
    python src/storage/database.py  # initialise SQLite DB

## Running

    # Run a query through the orchestrator
    python -c "from src.agent import run_query; print(run_query('your question here'))"

    # Streamlit web UI (port 8501)
    streamlit run src/interfaces/web.py

## Tests

    pytest tests/ -v
    # Run a single test
    pytest tests/test_obsidian.py::test_write_note_creates_folder_and_frontmatter -v

## Architecture

**`src/agent.py`** — thin orchestrator: intent classification → Obsidian context load → web search (research intent) → AI response → Obsidian persist. Entry point for all queries.

**`src/tools/obsidian.py`** — `ObsidianClient` class. All vault I/O lives here. Vault path from `config/settings.yaml` (`obsidian.vault_path`), resolved with `expanduser()`. Writes to `Research/`, `Tasks/`, `Reports/`, `Reminders/`; appends one-line wikilink entries to `Daily/YYYY-MM-DD.md`. Reads `Profile.md` and `Goals.md` as always-on system context.

**`src/tools/ai_client.py`** — Ollama-first, OpenAI fallback. Accepts `system_context` string: prepended as plain text for Ollama, passed as a `system` role message for OpenAI.

**`src/tools/web.py`** — DuckDuckGo search + URL fetch.

**`src/tools/notifications.py`** — WhatsApp via Twilio, SMTP email fallback.

**`src/storage/database.py`** — SQLite at `~/.ai-agent-team/data.db`. Tables: `conversations`, `tasks`, `settings`, `reminders`.

## Environment variables

| Variable | Purpose |
|---|---|
| `OPENAI_API_KEY` | Cloud AI fallback |
| `TWILIO_ACCOUNT_SID` / `TWILIO_AUTH_TOKEN` / `TWILIO_WHATSAPP_NUMBER` | WhatsApp |
| `DEFAULT_NOTIFY_NUMBER` | Recipient number |
| `SMTP_HOST` / `SMTP_PORT` / `SMTP_USERNAME` / `SMTP_PASSWORD` | Email fallback |

## Obsidian vault

Vault: `~/Library/Mobile Documents/iCloud~md~obsidian/Documents/AI Marc`

Create `Profile.md` and `Goals.md` at the vault root to give the agent persistent context about you. The agent will not create these files — they are user-authored.
~~~

- [ ] **Step 2: Run the full test suite**

```bash
pytest tests/ -v
```
Expected: all 11 tests in `tests/test_obsidian.py` pass. No failures.

- [ ] **Step 3: Final commit**

```bash
git add CLAUDE.md
git commit -m "docs: add CLAUDE.md with architecture and Obsidian integration details"
```
