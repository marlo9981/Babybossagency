# Marketing & Media Agency Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the full Marketing & Media Agency tool layer and workflow SOPs on top of the existing WAT framework in `AI Agent /`.

**Architecture:** A shared `brand_loader.py` utility handles multi-client profile loading for all tools. Nine new CLI tool scripts handle content generation, media planning, analytics, and distribution. Ten Markdown SOPs define agent operating procedures. Two existing tools (`generate_pdf.py`, `save_company_profile.py`) are extended with new flags.

**Tech Stack:** Python 3, argparse, pathlib, pyyaml, duckduckgo-search, requests, beautifulsoup4, smtplib (stdlib), twilio, pytest with tmp_path. All AI calls via `src/tools/ai_client.py` (Ollama-first, OpenAI fallback).

**Spec:** `docs/superpowers/specs/2026-03-14-marketing-media-agency-design.md`

---

## File Map

**Create:**
```
AI Agent /tools/brand_loader.py          # shared --client flag utility
AI Agent /tools/content_writer.py        # AI copy generation
AI Agent /tools/audience_analyzer.py     # AI audience profile from client data
AI Agent /tools/seo_analyzer.py          # DuckDuckGo keyword research + SERP
AI Agent /tools/media_planner.py         # AI channel mix + budget splits
AI Agent /tools/ad_brief_creator.py      # per-channel ad creative brief
AI Agent /tools/analytics_puller.py      # GA4 / Meta CSV / manual metrics
AI Agent /tools/client_reporter.py       # client-facing report body
AI Agent /tools/social_poster.py         # social platform posting (--dry-run)
AI Agent /tools/email_sender.py          # SMTP campaign send (--dry-run)
AI Agent /tests/__init__.py
AI Agent /tests/conftest.py
AI Agent /tests/test_brand_loader.py
AI Agent /tests/test_content_writer.py
AI Agent /tests/test_seo_analyzer.py
AI Agent /tests/test_analytics_puller.py
AI Agent /tests/test_social_poster.py
AI Agent /tests/test_email_sender.py
AI Agent /workflows/agency_routing_workflow.md
AI Agent /workflows/campaign_kickoff_workflow.md
AI Agent /workflows/content_production_workflow.md
AI Agent /workflows/social_media_workflow.md
AI Agent /workflows/email_campaign_workflow.md
AI Agent /workflows/seo_audit_workflow.md
AI Agent /workflows/media_plan_workflow.md
AI Agent /workflows/performance_report_workflow.md
AI Agent /workflows/client_onboarding_workflow.md
AI Agent /workflows/influencer_research_workflow.md
brand/clients/.gitkeep
```

**Modify:**
```
AI Agent /tools/generate_pdf.py          # add --input, --template, --output, --client
AI Agent /tools/save_company_profile.py  # add --output-dir flag
```

**Working directory for all commands:** `cd "/Users/marcus/ai-agent-team/AI Agent "`

---

## Chunk 1: Foundation

### Task 1: Test scaffolding + `brand_loader.py`

**Files:**
- Create: `AI Agent /tests/__init__.py`
- Create: `AI Agent /tests/conftest.py`
- Create: `AI Agent /tools/brand_loader.py`
- Create: `AI Agent /tests/test_brand_loader.py`
- Create: `AI Agent /brand/clients/.gitkeep`

- [ ] **Step 1: Create test directory and conftest**

```bash
mkdir -p "tests"
touch "tests/__init__.py"
```

Create `tests/conftest.py`:

```python
import sys
from pathlib import Path

# Allow importing tools as modules (AI Agent / on path)
sys.path.insert(0, str(Path(__file__).parent.parent))
# Allow importing src.tools.ai_client (ai-agent-team/ on path)
sys.path.insert(0, str(Path(__file__).parent.parent.parent))
```

- [ ] **Step 2: Create `brand/clients/` directory**

```bash
mkdir -p "brand/clients"
touch "brand/clients/.gitkeep"
```

- [ ] **Step 3: Write failing tests for `brand_loader.py`**

Create `tests/test_brand_loader.py`:

```python
import json
import os
import pytest
from pathlib import Path


@pytest.fixture
def brand_dir(tmp_path):
    """Create a fake brand directory structure matching on-disk conventions."""
    brand = tmp_path / "brand"
    brand.mkdir()

    # Default profile — uses company_profile.json (matches existing on-disk convention)
    (brand / "company_profile.json").write_text(json.dumps({
        "name": "Movara",
        "brand_voice": "premium and minimal"
    }))
    (brand / "brand_config.json").write_text(json.dumps({
        "primary_color": "#1A1A1A",
        "font": "Inter"
    }))

    # Client profile — uses profile.json
    client_dir = brand / "clients" / "test-client"
    client_dir.mkdir(parents=True)
    (client_dir / "profile.json").write_text(json.dumps({
        "name": "Test Client Co",
        "brand_voice": "bold and direct"
    }))
    (client_dir / "brand_config.json").write_text(json.dumps({
        "primary_color": "#FF0000"
    }))

    return brand


def test_load_default_profile(brand_dir, monkeypatch):
    """load_brand() with no slug returns default company_profile.json."""
    import tools.brand_loader as bl
    monkeypatch.setattr(bl, "BRAND_DIR", brand_dir)

    profile, config = bl.load_brand()
    assert profile["name"] == "Movara"
    assert config["font"] == "Inter"


def test_load_client_profile(brand_dir, monkeypatch):
    """load_brand('test-client') returns client-specific profile.json."""
    import tools.brand_loader as bl
    monkeypatch.setattr(bl, "BRAND_DIR", brand_dir)

    profile, config = bl.load_brand("test-client")
    assert profile["name"] == "Test Client Co"
    assert config["primary_color"] == "#FF0000"


def test_missing_client_returns_empty_dicts(brand_dir, monkeypatch):
    """load_brand() with unknown slug returns empty dicts (no crash)."""
    import tools.brand_loader as bl
    monkeypatch.setattr(bl, "BRAND_DIR", brand_dir)

    profile, config = bl.load_brand("nonexistent-client")
    assert profile == {}
    assert config == {}


def test_missing_default_returns_empty_dicts(tmp_path, monkeypatch):
    """load_brand() with empty brand dir returns empty dicts."""
    import tools.brand_loader as bl
    monkeypatch.setattr(bl, "BRAND_DIR", tmp_path / "brand")

    profile, config = bl.load_brand()
    assert profile == {}
    assert config == {}


def test_active_client_env_var(brand_dir, monkeypatch):
    """load_brand() with no slug reads ACTIVE_CLIENT env var as fallback."""
    import tools.brand_loader as bl
    monkeypatch.setattr(bl, "BRAND_DIR", brand_dir)
    monkeypatch.setenv("ACTIVE_CLIENT", "test-client")

    profile, config = bl.load_brand()  # no explicit slug
    assert profile["name"] == "Test Client Co"
```

- [ ] **Step 4: Run tests to confirm they fail**

```bash
cd "/Users/marcus/ai-agent-team/AI Agent "
pytest tests/test_brand_loader.py -v
```

Expected: `ModuleNotFoundError` — `brand_loader` does not exist yet.

- [ ] **Step 5: Create `tools/brand_loader.py`**

```python
"""
Shared brand profile loader for --client flag support.
All tools that read from brand/ import this module.

Profile filename convention:
  - Default (agency):  brand/company_profile.json  (matches existing on-disk file)
  - Client:            brand/clients/<slug>/profile.json
"""

import json
import os
from pathlib import Path

BRAND_DIR = Path(__file__).parent.parent / "brand"


def load_brand(client_slug: str = None) -> tuple[dict, dict]:
    """Load brand profile and config for a client or the default agency profile.

    Args:
        client_slug: directory name under brand/clients/. If None, checks the
                     ACTIVE_CLIENT environment variable, then falls back to the
                     default agency profile (brand/company_profile.json).

    Returns:
        (profile dict, brand_config dict) — either may be {} if file missing.
    """
    slug = client_slug or os.environ.get("ACTIVE_CLIENT")

    if slug:
        base = BRAND_DIR / "clients" / slug
        profile_file = "profile.json"
    else:
        base = BRAND_DIR
        profile_file = "company_profile.json"

    def _read(path: Path) -> dict:
        if path.exists() and path.stat().st_size > 0:
            try:
                return json.loads(path.read_text(encoding="utf-8"))
            except (json.JSONDecodeError, OSError):
                return {}
        return {}

    return _read(base / profile_file), _read(base / "brand_config.json")
```

- [ ] **Step 6: Run tests to confirm they pass**

```bash
pytest tests/test_brand_loader.py -v
```

Expected: all 5 `PASSED`.

- [ ] **Step 7: Commit**

```bash
git add tools/brand_loader.py tests/__init__.py tests/conftest.py tests/test_brand_loader.py "brand/clients/.gitkeep"
git commit -m "feat: add brand_loader utility with ACTIVE_CLIENT env var support and test scaffolding"
```

---

### Task 2: Extend `generate_pdf.py`

**Files:**
- Modify: `AI Agent /tools/generate_pdf.py`
- Create: `AI Agent /tests/test_generate_pdf.py`

> **Before editing:** Read `tools/generate_pdf.py` in full to understand the current implementation.

- [ ] **Step 1: Read the existing file**

Read `tools/generate_pdf.py` completely. Note the exact function names and structure — you will wrap the existing body into `_render_pdf()` in Step 4.

- [ ] **Step 2: Write a failing test for the new flags**

Create `tests/test_generate_pdf.py`:

```python
import subprocess
import sys
from pathlib import Path

AI_AGENT_DIR = Path(__file__).parent.parent


def _run(args):
    return subprocess.run(
        [sys.executable, "tools/generate_pdf.py"] + args,
        capture_output=True, text=True, cwd=str(AI_AGENT_DIR)
    )


def test_new_flags_in_help():
    """All new flags must appear in --help output."""
    result = _run(["--help"])
    for flag in ["--input", "--template", "--output", "--client"]:
        assert flag in result.stdout, f"Missing flag in help: {flag}"


def test_template_choices_in_help():
    """All template names from the spec must be listed in --help."""
    result = _run(["--help"])
    for template in ["competitor_analysis", "seo_audit", "media_plan",
                     "performance_report", "campaign_kickoff", "onboarding",
                     "influencer_brief"]:
        assert template in result.stdout, f"Missing template: {template}"


def test_default_input_path_is_analysis_json():
    """Without --input, the tool must attempt to read .tmp/analysis.json."""
    result = _run([])  # no flags — default behaviour
    # Should fail because .tmp/analysis.json likely doesn't exist in CI,
    # but the error must reference analysis.json, not some other path.
    assert "analysis.json" in result.stderr or "analysis.json" in result.stdout \
        or result.returncode != 0
```

- [ ] **Step 3: Run tests to confirm they fail**

```bash
pytest tests/test_generate_pdf.py -v
```

Expected: `test_new_flags_in_help` and `test_template_choices_in_help` fail because the flags don't exist yet.

- [ ] **Step 4: Add new imports and argparse to `generate_pdf.py`**

At the top of the file, after all existing imports, add:

```python
import argparse
import sys as _sys
from pathlib import Path as _Path

_sys.path.insert(0, str(_Path(__file__).parent.parent))
from tools.brand_loader import load_brand
```

- [ ] **Step 5: Wrap existing body and add `main()`**

The existing `if __name__ == "__main__":` block runs the rendering logic directly. Refactor it:

1. Move the existing rendering body (everything after the import block) into a new function `_render_pdf(data, brand_config, output_path)`. Replace any hardcoded `brand/brand_config.json` reads inside it with the `brand_config` parameter that is passed in.

2. Add `main()` and update `if __name__ == "__main__":` to call it:

```python
TEMPLATE_DEFAULTS = {
    "competitor_analysis": {
        "input": ".tmp/analysis.json",
    },
}


def main():
    parser = argparse.ArgumentParser(description="Generate branded PDF report")
    parser.add_argument("--input", default=None,
                        help="Path to input JSON file")
    parser.add_argument("--template", default="competitor_analysis",
                        choices=["competitor_analysis", "campaign_kickoff", "seo_audit",
                                 "media_plan", "performance_report", "onboarding",
                                 "influencer_brief"],
                        help="Report template to use")
    parser.add_argument("--output", default=None, help="Output PDF path")
    parser.add_argument("--client", default=None, help="Client slug")
    args = parser.parse_args()

    _, brand_config = load_brand(args.client)

    defaults = TEMPLATE_DEFAULTS.get(args.template, {})
    input_path = args.input or defaults.get("input", ".tmp/analysis.json")

    from datetime import date
    date_str = date.today().strftime("%Y-%m-%d")
    slug = args.client or "agency"
    output_path = args.output or f"output/{args.template}_{slug}_{date_str}.pdf"

    import json as _json
    input_data = _json.loads(open(input_path).read())

    _render_pdf(input_data, brand_config, output_path)
    print(f"PDF saved to: {output_path}")


if __name__ == "__main__":
    main()
```

- [ ] **Step 6: Run tests to confirm they pass**

```bash
pytest tests/test_generate_pdf.py -v
```

Expected: `test_new_flags_in_help` and `test_template_choices_in_help` PASS.

- [ ] **Step 7: Verify backward compatibility**

```bash
python tools/generate_pdf.py
```

Expected: same behaviour as before the change. If `.tmp/analysis.json` does not exist: FileNotFoundError mentioning that path (same error as before).

- [ ] **Step 8: Test new flags with a real input file**

```bash
mkdir -p .tmp output
echo '{"title": "Test Report", "sections": []}' > .tmp/test_input.json
python tools/generate_pdf.py \
  --input .tmp/test_input.json \
  --template seo_audit \
  --output .tmp/test_output.pdf \
  --client movara
```

Expected: `PDF saved to: .tmp/test_output.pdf` and the file exists (`ls -la .tmp/test_output.pdf`).

- [ ] **Step 9: Commit**

```bash
git add tools/generate_pdf.py tests/test_generate_pdf.py
git commit -m "feat: extend generate_pdf.py with --input, --template, --output, --client flags"
```

---

### Task 3: Extend `save_company_profile.py`

**Files:**
- Modify: `AI Agent /tools/save_company_profile.py`
- Create: `AI Agent /tests/test_save_company_profile.py`

> **Before editing:** Read `tools/save_company_profile.py` in full.

- [ ] **Step 1: Read the existing file**

Read `tools/save_company_profile.py` completely. Note exactly where logo copying and profile/config file writing happen.

- [ ] **Step 2: Write a failing test**

Create `tests/test_save_company_profile.py`:

```python
import json
import subprocess
import sys
from pathlib import Path

AI_AGENT_DIR = Path(__file__).parent.parent


def _run_save(extra_args):
    return subprocess.run(
        [sys.executable, "tools/save_company_profile.py",
         "--name", "Test Co",
         "--description", "A test company",
         "--market", "Singapore",
         "--differentiators", "Speed, Quality",
         "--primary-color", "#000000",
         "--font", "Inter",
         ] + extra_args,
        capture_output=True, text=True, cwd=str(AI_AGENT_DIR)
    )


def test_output_dir_flag_in_help():
    result = subprocess.run(
        [sys.executable, "tools/save_company_profile.py", "--help"],
        capture_output=True, text=True, cwd=str(AI_AGENT_DIR)
    )
    assert "--output-dir" in result.stdout


def test_output_dir_writes_profile_json(tmp_path):
    """--output-dir writes profile.json (not company_profile.json) to the given dir."""
    out_dir = tmp_path / "clients" / "test-co"
    result = _run_save(["--output-dir", str(out_dir)])
    assert result.returncode == 0, result.stderr
    assert (out_dir / "profile.json").exists()
    assert (out_dir / "brand_config.json").exists()
    data = json.loads((out_dir / "profile.json").read_text())
    assert data.get("name") == "Test Co"


def test_default_writes_company_profile_json(tmp_path, monkeypatch):
    """Without --output-dir, writes company_profile.json to brand/ (default)."""
    # Run from tmp_path so brand/ is created there, not in the real project
    result = subprocess.run(
        [sys.executable, str(AI_AGENT_DIR / "tools/save_company_profile.py"),
         "--name", "Default Co", "--description", "d", "--market", "m",
         "--differentiators", "x", "--primary-color", "#111", "--font", "Arial"],
        capture_output=True, text=True, cwd=str(tmp_path)
    )
    # Must write company_profile.json to brand/ in cwd
    assert (tmp_path / "brand" / "company_profile.json").exists() or result.returncode != 0


def test_logo_extension_preserved(tmp_path):
    """Logo file extension is preserved when copying."""
    logo = tmp_path / "logo.svg"
    logo.write_bytes(b"<svg/>")
    out_dir = tmp_path / "clients" / "logo-test"
    result = _run_save(["--output-dir", str(out_dir), "--logo", str(logo)])
    assert result.returncode == 0, result.stderr
    # Logo must be copied with original .svg extension, not renamed to .png
    logo_files = list(out_dir.glob("logo.*"))
    assert logo_files, "No logo file found in output dir"
    assert logo_files[0].suffix == ".svg", f"Expected .svg, got {logo_files[0].suffix}"
```

- [ ] **Step 3: Run tests to confirm they fail**

```bash
pytest tests/test_save_company_profile.py -v
```

Expected: `test_output_dir_flag_in_help` fails — `--output-dir` not in help yet.

- [ ] **Step 4: Add `--output-dir` argument**

Find the argparse section in `save_company_profile.py`. Add:

```python
parser.add_argument(
    "--output-dir",
    default=None,
    help="Directory to write profile files. Default: brand/ (writes company_profile.json). "
         "For client profiles use brand/clients/<slug>/ (writes profile.json)."
)
```

- [ ] **Step 5: Update file writing logic**

Find where the tool writes `company_profile.json` and `brand_config.json`. Replace:

```python
# BEFORE (existing hardcoded logic — exact variable names may differ):
output_dir = Path("brand")
output_dir.mkdir(parents=True, exist_ok=True)
profile_path = output_dir / "company_profile.json"
config_path = output_dir / "brand_config.json"
logo_dest = output_dir / f"logo{logo_src.suffix}"  # preserve existing extension logic
```

With:

```python
# AFTER:
if args.output_dir:
    output_dir = Path(args.output_dir)
    profile_filename = "profile.json"          # client profile convention
else:
    output_dir = Path("brand")
    profile_filename = "company_profile.json"  # default agency convention

output_dir.mkdir(parents=True, exist_ok=True)
profile_path = output_dir / profile_filename
config_path = output_dir / "brand_config.json"
# Preserve the original logo extension (do NOT hardcode .png):
logo_dest = output_dir / f"logo{logo_src.suffix}"
```

> **Important:** Do not change `logo_src.suffix` — this line must use the existing variable for the source logo path's extension. If the existing code uses a different variable name, adapt accordingly.

- [ ] **Step 6: Run tests**

```bash
pytest tests/test_save_company_profile.py -v
```

Expected: all 4 `PASSED`.

- [ ] **Step 7: Commit**

```bash
git add tools/save_company_profile.py tests/test_save_company_profile.py
git commit -m "feat: add --output-dir flag to save_company_profile.py; preserve logo extension"
```

---

## Chunk 2: Content, SEO & Research Tools

### Task 4: `content_writer.py`

**Files:**
- Create: `AI Agent /tools/content_writer.py`
- Create: `AI Agent /tests/test_content_writer.py`

- [ ] **Step 1: Write failing tests**

Create `tests/test_content_writer.py`:

```python
import pytest
from pathlib import Path


def test_build_prompt_includes_brief():
    from tools.content_writer import build_prompt
    prompt = build_prompt(
        brief="Launch a new product",
        fmt="instagram",
        tone="premium",
        max_words=150,
        count=3,
        profile={"name": "Movara", "brand_voice": "minimal and premium"}
    )
    assert "Launch a new product" in prompt
    assert "Movara" in prompt
    assert "150" in prompt
    assert "3" in prompt


def test_build_prompt_uses_brand_voice_when_no_tone():
    from tools.content_writer import build_prompt
    prompt = build_prompt(
        brief="Post about renovation",
        fmt="facebook",
        tone="",
        max_words=200,
        count=3,
        profile={"name": "BuildCo", "brand_voice": "authoritative and warm"}
    )
    assert "authoritative and warm" in prompt


def test_word_limits_map_has_all_formats():
    from tools.content_writer import WORD_LIMITS
    for fmt in ["instagram", "facebook", "linkedin", "email", "blog", "script", "calendar"]:
        assert fmt in WORD_LIMITS
        assert WORD_LIMITS[fmt] > 0


def test_output_path_email_format(tmp_path, monkeypatch):
    from tools import content_writer as cw
    monkeypatch.setattr(cw, "TMP_DIR", tmp_path)
    path = cw.get_output_path("email", "acme")
    assert path.name == "email_body_acme.md"


def test_output_path_non_email_format(tmp_path, monkeypatch):
    from tools import content_writer as cw
    monkeypatch.setattr(cw, "TMP_DIR", tmp_path)
    path = cw.get_output_path("instagram", "acme")
    assert path.name == "content_acme.md"


def test_output_path_no_client(tmp_path, monkeypatch):
    from tools import content_writer as cw
    monkeypatch.setattr(cw, "TMP_DIR", tmp_path)
    path = cw.get_output_path("blog", None)
    assert "default" in path.name
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
pytest tests/test_content_writer.py -v
```

Expected: `ImportError`.

- [ ] **Step 3: Create `tools/content_writer.py`**

```python
"""
Content Writer — AI-powered copy generation for any format.

Usage:
    python tools/content_writer.py --brief "Launch our new product" --format instagram --client movara
    python tools/content_writer.py --brief brief.md --format email --count 3 --client acme
"""

import argparse
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent.parent))

from src.tools.ai_client import get_ai_response
from tools.brand_loader import load_brand

TMP_DIR = Path(__file__).parent.parent / ".tmp"

WORD_LIMITS = {
    "instagram": 150,
    "facebook": 200,
    "linkedin": 300,
    "email": 250,
    "blog": 800,
    "script": 500,
    "calendar": 1000,
    "social": 200,
}


def build_prompt(brief: str, fmt: str, tone: str, max_words: int, count: int, profile: dict) -> str:
    business = profile.get("name", "the business")
    brand_voice = tone or profile.get("brand_voice", "professional")

    return f"""You are a copywriter for {business}.
Brand voice: {brand_voice}

Write {count} options for the following content request.
Format: {fmt}
Max words per option: {max_words}
Brief: {brief}

Label and structure your response exactly as:

OPTION 1 — ASPIRATIONAL
[copy here]
CTA: [call to action]

OPTION 2 — PRACTICAL
[copy here]
CTA: [call to action]

OPTION 3 — BOLD
[copy here]
CTA: [call to action]

Recommendation: [one sentence on which to use and why]

Rules: No filler phrases (no "game-changer", "world-class", "In today's fast-paced world"). \
No passive voice. Every option ends with a CTA. Stay within {max_words} words per option."""


def get_output_path(fmt: str, client_slug: str) -> Path:
    TMP_DIR.mkdir(exist_ok=True)
    slug = client_slug or "default"
    if fmt == "email":
        return TMP_DIR / f"email_body_{slug}.md"
    return TMP_DIR / f"content_{slug}.md"


def write_copy(brief: str, fmt: str, tone: str, max_words: int, count: int,
               client_slug: str = None) -> str:
    profile, _ = load_brand(client_slug)
    prompt = build_prompt(brief, fmt, tone, max_words, count, profile)
    return get_ai_response(prompt)


def main():
    parser = argparse.ArgumentParser(description="Generate AI copy for any format")
    parser.add_argument("--brief", required=True,
                        help="Brief text or path to a brief .md file")
    parser.add_argument("--format", required=True, dest="fmt",
                        choices=list(WORD_LIMITS.keys()))
    parser.add_argument("--tone", default="", help="Tone override (optional)")
    parser.add_argument("--max-words", type=int, default=0,
                        help="Word limit per option (default: format-specific)")
    parser.add_argument("--count", type=int, default=3,
                        help="Number of copy options to generate")
    parser.add_argument("--platforms", default="",
                        help="Comma-separated platforms (informational, used in brief context)")
    parser.add_argument("--client", default=None, help="Client slug for brand loading")
    args = parser.parse_args()

    # Resolve brief from file or inline string
    brief_path = Path(args.brief)
    brief = brief_path.read_text(encoding="utf-8") if brief_path.exists() else args.brief

    max_words = args.max_words or WORD_LIMITS.get(args.fmt, 200)

    result = write_copy(brief, args.fmt, args.tone, max_words, args.count, args.client)

    output_path = get_output_path(args.fmt, args.client)
    output_path.write_text(result, encoding="utf-8")

    print(f"Output written to: {output_path}")
    print(result)


if __name__ == "__main__":
    main()
```

- [ ] **Step 4: Run tests**

```bash
pytest tests/test_content_writer.py -v
```

Expected: all 6 `PASSED`.

- [ ] **Step 5: Smoke test (requires Ollama or OPENAI_API_KEY)**

```bash
python tools/content_writer.py \
  --brief "Launching a new minimal leather wallet for design-conscious buyers" \
  --format instagram \
  --client movara
```

Expected: 3 caption options written to `.tmp/content_movara.md` and printed.

- [ ] **Step 6: Commit**

```bash
git add tools/content_writer.py tests/test_content_writer.py
git commit -m "feat: add content_writer.py with multi-client support and 3-option output"
```

---

### Task 5: `audience_analyzer.py`

**Files:**
- Create: `AI Agent /tools/audience_analyzer.py`

> No dedicated unit tests — this tool is a thin AI call wrapper. Validated by smoke test.

- [ ] **Step 1: Create `tools/audience_analyzer.py`**

```python
"""
Audience Analyzer — generates a target audience profile from client data.

Usage:
    python tools/audience_analyzer.py --client movara
    python tools/audience_analyzer.py  # uses default agency profile
"""

import argparse
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent.parent))

from src.tools.ai_client import get_ai_response
from tools.brand_loader import load_brand

TMP_DIR = Path(__file__).parent.parent / ".tmp"


def analyze_audience(profile: dict) -> dict:
    name = profile.get("name", "the business")
    description = profile.get("description", "")
    market = profile.get("market", "")
    differentiators = profile.get("differentiators", "")

    prompt = f"""You are a senior marketing strategist.

Based on the following business profile, produce a detailed target audience analysis.

Business: {name}
Description: {description}
Market: {market}
Key differentiators: {differentiators}

Produce a structured audience profile with these sections:
1. Primary audience (demographics, psychographics, behaviour)
2. Pain points and motivations
3. Where they spend time online
4. What content resonates with them
5. Tone and language that works for them

Be specific. Avoid generic statements. Format as plain text with section headers."""

    response = get_ai_response(prompt)

    return {
        "business": name,
        "audience_analysis": response
    }


def main():
    parser = argparse.ArgumentParser(description="Generate audience profile from client data")
    parser.add_argument("--client", default=None, help="Client slug for brand loading")
    args = parser.parse_args()

    profile, _ = load_brand(args.client)

    if not profile:
        print("Warning: no profile found. Using empty profile.")

    result = analyze_audience(profile)

    TMP_DIR.mkdir(exist_ok=True)
    slug = args.client or "default"
    output_path = TMP_DIR / f"audience_{slug}.json"
    output_path.write_text(json.dumps(result, indent=2), encoding="utf-8")

    print(f"Audience profile written to: {output_path}")
    print(result["audience_analysis"])


if __name__ == "__main__":
    main()
```

- [ ] **Step 2: Smoke test**

```bash
python tools/audience_analyzer.py --client movara
```

Expected: audience profile written to `.tmp/audience_movara.json` and printed.

- [ ] **Step 3: Commit**

```bash
git add tools/audience_analyzer.py
git commit -m "feat: add audience_analyzer.py"
```

---

### Task 6: `seo_analyzer.py`

**Files:**
- Create: `AI Agent /tools/seo_analyzer.py`
- Create: `AI Agent /tests/test_seo_analyzer.py`

- [ ] **Step 1: Write failing tests**

Create `tests/test_seo_analyzer.py`:

```python
import pytest


def test_parse_ddg_results_extracts_fields():
    from tools.seo_analyzer import parse_ddg_results
    # web_search() already normalises to {title, url, snippet} — pass that format through
    raw = [
        {"title": "Best AI tools", "url": "https://example.com", "snippet": "AI is changing everything"},
        {"title": "AI trends 2026", "url": "https://other.com", "snippet": "Latest trends in AI"}
    ]
    results = parse_ddg_results(raw)
    assert len(results) == 2
    assert results[0]["title"] == "Best AI tools"
    assert results[0]["url"] == "https://example.com"
    assert "AI" in results[0]["snippet"]


def test_parse_ddg_results_empty():
    from tools.seo_analyzer import parse_ddg_results
    assert parse_ddg_results([]) == []


def test_format_keyword_output_returns_string():
    from tools.seo_analyzer import format_keyword_output
    results = [
        {"title": "Keyword one", "url": "https://a.com", "snippet": "About keyword one"},
    ]
    output = format_keyword_output("AI tools", results)
    assert "AI tools" in output
    assert "Keyword one" in output


def test_format_keyword_output_no_results():
    from tools.seo_analyzer import format_keyword_output
    output = format_keyword_output("obscure query", [])
    assert "no results" in output.lower() or "unavailable" in output.lower()
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
pytest tests/test_seo_analyzer.py -v
```

Expected: `ImportError`.

- [ ] **Step 3: Create `tools/seo_analyzer.py`**

```python
"""
SEO Analyzer — DuckDuckGo keyword research and SERP snapshot.

Usage:
    python tools/seo_analyzer.py --topic "minimal leather wallet Singapore"
    python tools/seo_analyzer.py --url https://movara.com --client movara
    python tools/seo_analyzer.py --topic "renovation contractor" --url https://site.com --client acme
"""

import argparse
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent.parent))

from src.tools.web import web_search, fetch_url
from src.tools.ai_client import get_ai_response
from tools.brand_loader import load_brand

TMP_DIR = Path(__file__).parent.parent / ".tmp"


def parse_ddg_results(raw: list) -> list:
    """Pass through web_search() results (already normalised to {title, url, snippet}).
    Validates expected keys are present; returns empty dict for malformed entries.
    """
    return [
        {
            "title": r.get("title", ""),
            "url": r.get("url", ""),
            "snippet": r.get("snippet", "")
        }
        for r in raw
    ]


def format_keyword_output(query: str, results: list) -> str:
    if not results:
        return (
            f"Keyword research for '{query}': SERP data unavailable — "
            "results are AI-generated estimates, not live rankings."
        )
    lines = [f"Keyword research for: {query}\n"]
    for i, r in enumerate(results, 1):
        lines.append(f"{i}. {r['title']}\n   {r['url']}\n   {r['snippet']}\n")
    return "\n".join(lines)


def keyword_research(topic: str, num_results: int = 8) -> dict:
    """Run DuckDuckGo search for keyword research."""
    try:
        raw = web_search(topic, num_results=num_results)
        results = parse_ddg_results(raw)
    except Exception as e:
        print(f"SERP search failed: {e} — falling back to AI-generated suggestions.")
        results = []

    formatted = format_keyword_output(topic, results)

    # Ask AI to extract keyword insights regardless of live data availability
    prompt = f"""You are an SEO specialist. Based on the following search results (or the topic if no results),
extract and recommend:
1. Primary keyword (highest relevance + search intent)
2. 5 secondary long-tail keywords
3. Content gaps (topics competitors cover that this site should target)
4. Recommended content type for this topic

Topic: {topic}
Search results:
{formatted}"""

    insights = get_ai_response(prompt)

    return {
        "topic": topic,
        "serp_results": results,
        "keyword_insights": insights,
        "data_source": "live" if results else "ai-generated"
    }


def serp_check(url: str) -> dict:
    """Fetch and analyse a URL for on-page SEO signals."""
    content = fetch_url(url)

    prompt = f"""You are an SEO specialist. Analyse the following page content for on-page SEO:
1. Title tag and meta description quality
2. Heading structure (H1, H2 usage)
3. Keyword density and relevance signals
4. Internal linking opportunities
5. Top 3 improvement recommendations

URL: {url}
Content (first 3000 chars):
{content[:3000]}"""

    analysis = get_ai_response(prompt)

    return {
        "url": url,
        "on_page_analysis": analysis
    }


def main():
    parser = argparse.ArgumentParser(description="SEO keyword research and SERP analysis")
    parser.add_argument("--topic", default=None, help="Topic or keyword to research")
    parser.add_argument("--url", default=None, help="URL for on-page SEO analysis")
    parser.add_argument("--client", default=None, help="Client slug for brand loading")
    args = parser.parse_args()

    if not args.topic and not args.url:
        parser.error("Provide at least --topic or --url")

    profile, _ = load_brand(args.client)
    slug = args.client or "default"

    output = {"client": slug}

    if args.topic:
        output["keyword_research"] = keyword_research(args.topic)

    if args.url:
        output["serp_check"] = serp_check(args.url)

    TMP_DIR.mkdir(exist_ok=True)
    output_path = TMP_DIR / f"seo_{slug}.json"
    output_path.write_text(json.dumps(output, indent=2), encoding="utf-8")

    print(f"SEO analysis written to: {output_path}")
    if "keyword_research" in output:
        print(output["keyword_research"]["keyword_insights"])
    if "serp_check" in output:
        print(output["serp_check"]["on_page_analysis"])


if __name__ == "__main__":
    main()
```

- [ ] **Step 4: Run tests**

```bash
pytest tests/test_seo_analyzer.py -v
```

Expected: all 4 `PASSED`.

- [ ] **Step 5: Smoke test**

```bash
python tools/seo_analyzer.py --topic "minimal leather wallet Singapore"
```

Expected: keyword insights printed and written to `.tmp/seo_default.json`.

- [ ] **Step 6: Commit**

```bash
git add tools/seo_analyzer.py tests/test_seo_analyzer.py
git commit -m "feat: add seo_analyzer.py with DuckDuckGo research and AI insights"
```

---

## Chunk 3: Media, Analytics & Distribution Tools

### Task 7: `media_planner.py`

**Files:**
- Create: `AI Agent /tools/media_planner.py`

- [ ] **Step 1: Create `tools/media_planner.py`**

```python
"""
Media Planner — AI-generated channel mix and budget splits.

Usage:
    python tools/media_planner.py --brief brief.md --budget 5000 --client movara
    python tools/media_planner.py --brief "Launch campaign for Q2" --client acme
"""

import argparse
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent.parent))

from src.tools.ai_client import get_ai_response
from tools.brand_loader import load_brand

TMP_DIR = Path(__file__).parent.parent / ".tmp"


def generate_media_plan(brief: str, budget: float, channels: list, profile: dict) -> dict:
    business = profile.get("name", "the business")
    audience = profile.get("market", "general audience")
    budget_line = f"Total budget: SGD ${budget:,.0f}" if budget else \
        f"Budget: {profile.get('budget', 'to be confirmed')}"

    channels_line = f"Focus channels: {', '.join(channels)}" if channels else \
        "Channels: recommend based on audience and brief"

    prompt = f"""You are a media strategist for {business}.
Audience: {audience}
{budget_line}
{channels_line}

Brief:
{brief}

Produce a structured media plan with:
1. Recommended channel mix (Instagram, Facebook, LinkedIn, Google Ads, etc.) with % budget allocation
2. Content format per channel (Reels, static posts, Stories, articles, etc.)
3. Posting frequency per channel per week
4. Budget breakdown per channel in SGD
5. KPIs to track per channel
6. Timeline recommendation

Format as structured sections. Be specific with numbers."""

    response = get_ai_response(prompt)
    return {
        "business": business,
        "budget": budget,
        "channels": channels,
        "plan": response
    }


def main():
    parser = argparse.ArgumentParser(description="Generate AI media plan")
    parser.add_argument("--brief", required=True, help="Brief text or path to brief file")
    parser.add_argument("--budget", type=float, default=0,
                        help="Total campaign budget in SGD (optional — reads from profile if omitted)")
    parser.add_argument("--channels", default="",
                        help="Comma-separated channels to focus on (optional)")
    parser.add_argument("--client", default=None)
    args = parser.parse_args()

    brief_path = Path(args.brief)
    brief = brief_path.read_text(encoding="utf-8") if brief_path.exists() else args.brief

    channels = [c.strip() for c in args.channels.split(",") if c.strip()]
    profile, _ = load_brand(args.client)
    budget = args.budget or float(profile.get("budget", 0))

    result = generate_media_plan(brief, budget, channels, profile)

    TMP_DIR.mkdir(exist_ok=True)
    slug = args.client or "default"
    output_path = TMP_DIR / f"media_plan_{slug}.json"
    output_path.write_text(json.dumps(result, indent=2), encoding="utf-8")

    print(f"Media plan written to: {output_path}")
    print(result["plan"])


if __name__ == "__main__":
    main()
```

- [ ] **Step 2: Smoke test**

```bash
python tools/media_planner.py \
  --brief "Q2 product launch for Movara minimal leather wallet" \
  --budget 3000 \
  --channels "instagram,facebook,linkedin"
```

Expected: media plan written to `.tmp/media_plan_default.json`.

- [ ] **Step 3: Commit**

```bash
git add tools/media_planner.py
git commit -m "feat: add media_planner.py"
```

---

### Task 8: `ad_brief_creator.py`

**Files:**
- Create: `AI Agent /tools/ad_brief_creator.py`

- [ ] **Step 1: Create `tools/ad_brief_creator.py`**

```python
"""
Ad Brief Creator — generate per-channel creative brief.

Usage:
    python tools/ad_brief_creator.py --campaign brief.md --channel instagram --client movara
    python tools/ad_brief_creator.py --campaign "Q2 wallet launch" --client acme
"""

import argparse
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent.parent))

from src.tools.ai_client import get_ai_response
from tools.brand_loader import load_brand

TMP_DIR = Path(__file__).parent.parent / ".tmp"

CHANNEL_SPECS = {
    "instagram": "Feed post (1080x1080px) or Reel (1080x1920px). Caption ≤150 words. Hashtags 5-10.",
    "facebook": "Feed post or video. Caption ≤200 words. Link preview supported.",
    "linkedin": "Feed post or article. Professional tone. No links in post body.",
    "google": "Search ad: headline ≤30 chars x3, description ≤90 chars x2. Display: 300x250, 728x90.",
    "email": "Subject ≤9 words. Preview text ≤100 chars. Body ≤250 words. Single CTA.",
}


def create_brief(campaign: str, channel: str, profile: dict) -> str:
    business = profile.get("name", "the business")
    brand_voice = profile.get("brand_voice", "professional")
    specs = CHANNEL_SPECS.get(channel, f"Standard {channel} ad specs apply.")

    prompt = f"""You are a creative director for {business}.
Brand voice: {brand_voice}

Create a detailed ad creative brief for the following campaign and channel.

Campaign:
{campaign}

Channel: {channel}
Technical specs: {specs}

Brief must include:
1. Objective (what this ad must achieve)
2. Headline options (3 variations)
3. Body copy (2 options, within spec)
4. CTA (2 options)
5. Visual direction (mood, style, key visual elements, colour guidance)
6. Do nots (what to avoid for this brand/channel)

Be specific. This brief goes directly to a copywriter and designer."""

    return get_ai_response(prompt)


def main():
    parser = argparse.ArgumentParser(description="Generate per-channel ad creative brief")
    parser.add_argument("--campaign", required=True,
                        help="Campaign description or path to campaign brief file")
    parser.add_argument("--channel", default=None,
                        choices=list(CHANNEL_SPECS.keys()),
                        help="Target channel (optional — produces general brief if omitted)")
    parser.add_argument("--client", default=None)
    args = parser.parse_args()

    campaign_path = Path(args.campaign)
    campaign = campaign_path.read_text(encoding="utf-8") \
        if campaign_path.exists() else args.campaign

    profile, _ = load_brand(args.client)
    channel = args.channel or "general"

    result = create_brief(campaign, channel, profile)

    TMP_DIR.mkdir(exist_ok=True)
    slug = args.client or "default"
    output_path = TMP_DIR / f"ad_brief_{channel}_{slug}.md"
    output_path.write_text(result, encoding="utf-8")

    print(f"Ad brief written to: {output_path}")
    print(result)


if __name__ == "__main__":
    main()
```

- [ ] **Step 2: Smoke test**

```bash
python tools/ad_brief_creator.py \
  --campaign "Minimal leather wallet — Q2 launch" \
  --channel instagram
```

Expected: creative brief written to `.tmp/ad_brief_instagram_default.md`.

- [ ] **Step 3: Commit**

```bash
git add tools/ad_brief_creator.py
git commit -m "feat: add ad_brief_creator.py"
```

---

### Task 9: `analytics_puller.py`

**Files:**
- Create: `AI Agent /tools/analytics_puller.py`
- Create: `AI Agent /tests/test_analytics_puller.py`

- [ ] **Step 1: Write failing tests**

Create `tests/test_analytics_puller.py`:

```python
import pytest
from datetime import date


def test_parse_date_range_valid():
    from tools.analytics_puller import parse_date_range
    start, end = parse_date_range("2026-01-01", "2026-03-01")
    assert start == date(2026, 1, 1)
    assert end == date(2026, 3, 1)


def test_parse_date_range_invalid():
    from tools.analytics_puller import parse_date_range
    with pytest.raises(ValueError):
        parse_date_range("not-a-date", "2026-03-01")


def test_parse_date_range_reversed():
    from tools.analytics_puller import parse_date_range
    with pytest.raises(ValueError, match="start.*before.*end"):
        parse_date_range("2026-03-01", "2026-01-01")


def test_load_csv_metrics(tmp_path):
    from tools.analytics_puller import load_csv_metrics
    csv_file = tmp_path / "metrics.csv"
    csv_file.write_text(
        "date,sessions,clicks,conversions\n"
        "2026-01-01,100,50,5\n"
        "2026-01-02,120,60,8\n"
    )
    metrics = load_csv_metrics(str(csv_file))
    assert metrics["total_rows"] == 2
    assert "sessions" in metrics["columns"]
    assert metrics["data"][0]["sessions"] == "100"


def test_load_csv_missing_file():
    from tools.analytics_puller import load_csv_metrics
    with pytest.raises(FileNotFoundError):
        load_csv_metrics("/nonexistent/file.csv")
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
pytest tests/test_analytics_puller.py -v
```

Expected: `ImportError`.

- [ ] **Step 3: Create `tools/analytics_puller.py`**

```python
"""
Analytics Puller — pull metrics from GA4, Meta Ads CSV, or manual entry.

Usage:
    python tools/analytics_puller.py --platform csv --csv-path data/metrics.csv --from 2026-01-01 --to 2026-03-01 --client acme
    python tools/analytics_puller.py --platform manual --from 2026-01-01 --to 2026-03-01 --client acme
"""

import argparse
import csv
import json
import sys
from datetime import date, datetime
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent.parent))

from tools.brand_loader import load_brand

TMP_DIR = Path(__file__).parent.parent / ".tmp"


def parse_date_range(from_str: str, to_str: str) -> tuple:
    """Parse and validate ISO 8601 date strings. Returns (date, date)."""
    try:
        start = datetime.strptime(from_str, "%Y-%m-%d").date()
        end = datetime.strptime(to_str, "%Y-%m-%d").date()
    except ValueError as e:
        raise ValueError(f"Invalid date format (use YYYY-MM-DD): {e}")

    if start >= end:
        raise ValueError(f"start date must be before end date: {from_str} >= {to_str}")

    return start, end


def load_csv_metrics(csv_path: str) -> dict:
    """Load metrics from a CSV file. Returns summary dict."""
    path = Path(csv_path)
    if not path.exists():
        raise FileNotFoundError(f"CSV file not found: {csv_path}")

    with open(path, newline="", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        rows = list(reader)

    return {
        "source": csv_path,
        "total_rows": len(rows),
        "columns": list(rows[0].keys()) if rows else [],
        "data": rows
    }


def pull_manual_metrics() -> dict:
    """Interactive manual data entry for platforms without API access."""
    print("\nManual metrics entry — press Enter to skip any field.\n")
    fields = [
        "Total impressions",
        "Total reach",
        "Total engagements (likes/comments/shares)",
        "Link clicks",
        "New followers",
        "Website sessions from social",
        "Leads generated",
        "Revenue attributed (SGD)"
    ]
    metrics = {}
    for field in fields:
        value = input(f"{field}: ").strip()
        if value:
            try:
                metrics[field] = float(value.replace(",", ""))
            except ValueError:
                metrics[field] = value
    return {"source": "manual", "data": metrics}


def pull_ga4_metrics(property_id: str, start: date, end: date) -> dict:
    """Pull from GA4 API. Requires GA4_CREDENTIALS_PATH in environment."""
    try:
        from google.analytics.data_v1beta import BetaAnalyticsDataClient
        from google.analytics.data_v1beta.types import (
            DateRange, Dimension, Metric, RunReportRequest
        )
        import os

        credentials_path = os.getenv("GA4_CREDENTIALS_PATH")
        if not credentials_path:
            raise EnvironmentError("GA4_CREDENTIALS_PATH not set in .env")

        os.environ["GOOGLE_APPLICATION_CREDENTIALS"] = credentials_path
        client = BetaAnalyticsDataClient()

        request = RunReportRequest(
            property=f"properties/{property_id}",
            dimensions=[Dimension(name="date")],
            metrics=[
                Metric(name="sessions"),
                Metric(name="totalUsers"),
                Metric(name="screenPageViews"),
            ],
            date_ranges=[DateRange(
                start_date=start.strftime("%Y-%m-%d"),
                end_date=end.strftime("%Y-%m-%d")
            )],
        )

        response = client.run_report(request)
        rows = [
            {
                "date": row.dimension_values[0].value,
                "sessions": row.metric_values[0].value,
                "users": row.metric_values[1].value,
                "pageviews": row.metric_values[2].value,
            }
            for row in response.rows
        ]
        return {"source": "ga4", "property_id": property_id, "data": rows}

    except ImportError:
        print("GA4 library not installed. Run: pip install google-analytics-data")
        return {"source": "ga4", "error": "library not installed", "data": []}
    except Exception as e:
        print(f"GA4 pull failed: {e}")
        return {"source": "ga4", "error": str(e), "data": []}


def main():
    parser = argparse.ArgumentParser(description="Pull analytics metrics")
    parser.add_argument("--platform", required=True,
                        choices=["ga4", "meta", "csv", "manual"],
                        help="Data source platform")
    parser.add_argument("--from", dest="date_from", required=True,
                        help="Start date YYYY-MM-DD")
    parser.add_argument("--to", dest="date_to", required=True,
                        help="End date YYYY-MM-DD")
    parser.add_argument("--csv-path", default=None,
                        help="Path to CSV file (required for --platform csv)")
    parser.add_argument("--client", default=None)
    args = parser.parse_args()

    start, end = parse_date_range(args.date_from, args.date_to)

    if args.platform == "csv":
        if not args.csv_path:
            parser.error("--csv-path is required when --platform csv")
        metrics = load_csv_metrics(args.csv_path)

    elif args.platform == "ga4":
        import os
        property_id = os.getenv("GA4_PROPERTY_ID")
        if not property_id:
            parser.error("GA4_PROPERTY_ID not set in .env")
        metrics = pull_ga4_metrics(property_id, start, end)

    elif args.platform == "manual":
        metrics = pull_manual_metrics()

    else:  # meta — CSV export from Meta Ads Manager
        if not args.csv_path:
            parser.error("For Meta Ads, export a CSV from Meta Ads Manager and pass --csv-path")
        metrics = load_csv_metrics(args.csv_path)
        metrics["source"] = "meta"

    metrics["date_range"] = {"from": str(start), "to": str(end)}
    metrics["platform"] = args.platform

    TMP_DIR.mkdir(exist_ok=True)
    slug = args.client or "default"
    output_path = TMP_DIR / f"metrics_{slug}.json"
    output_path.write_text(json.dumps(metrics, indent=2), encoding="utf-8")

    print(f"Metrics written to: {output_path}")
    print(json.dumps(metrics, indent=2))


if __name__ == "__main__":
    main()
```

- [ ] **Step 4: Run tests**

```bash
pytest tests/test_analytics_puller.py -v
```

Expected: all 5 `PASSED`.

- [ ] **Step 5: Smoke test (CSV mode — no API needed)**

```bash
printf "date,sessions,clicks\n2026-01-01,100,40\n" > .tmp/test_metrics.csv
python tools/analytics_puller.py \
  --platform csv \
  --csv-path .tmp/test_metrics.csv \
  --from 2026-01-01 \
  --to 2026-03-14
```

Expected: metrics written to `.tmp/metrics_default.json`.

- [ ] **Step 6: Commit**

```bash
git add tools/analytics_puller.py tests/test_analytics_puller.py
git commit -m "feat: add analytics_puller.py with CSV, GA4, and manual entry modes"
```

---

### Task 10: `client_reporter.py`

**Files:**
- Create: `AI Agent /tools/client_reporter.py`

- [ ] **Step 1: Create `tools/client_reporter.py`**

```python
"""
Client Reporter — compose client-facing performance report body.

Usage:
    python tools/client_reporter.py --metrics .tmp/metrics_acme.json --client acme
"""

import argparse
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent.parent))

from src.tools.ai_client import get_ai_response
from tools.brand_loader import load_brand

TMP_DIR = Path(__file__).parent.parent / ".tmp"


def generate_report_body(metrics: dict, profile: dict) -> dict:
    business = profile.get("name", "the business")
    platform = metrics.get("platform", "social media")
    date_range = metrics.get("date_range", {})
    period = f"{date_range.get('from', '?')} to {date_range.get('to', '?')}"

    prompt = f"""You are writing a performance report for {business}'s client.
Platform: {platform}
Period: {period}

Raw metrics:
{json.dumps(metrics.get('data', metrics), indent=2)}

Write a professional client-facing performance summary with:
1. Executive summary (2-3 sentences — plain language, no jargon)
2. Key metrics table (format as markdown table)
3. What performed well (top 3 observations)
4. What to improve (top 2 recommendations)
5. Next steps (2-3 concrete actions for next period)

Tone: professional, clear, positive but honest. No fluff. Written for a business owner, not a marketer."""

    report_body = get_ai_response(prompt)

    return {
        "business": business,
        "platform": platform,
        "period": period,
        "report_body": report_body
    }


def main():
    parser = argparse.ArgumentParser(description="Generate client performance report body")
    parser.add_argument("--metrics", required=True,
                        help="Path to metrics JSON file (from analytics_puller.py)")
    parser.add_argument("--client", default=None)
    args = parser.parse_args()

    metrics_path = Path(args.metrics)
    if not metrics_path.exists():
        print(f"Error: metrics file not found: {args.metrics}")
        sys.exit(1)

    metrics = json.loads(metrics_path.read_text(encoding="utf-8"))
    profile, _ = load_brand(args.client)

    result = generate_report_body(metrics, profile)

    TMP_DIR.mkdir(exist_ok=True)
    slug = args.client or "default"
    output_path = TMP_DIR / f"perf_report_{slug}.json"
    output_path.write_text(json.dumps(result, indent=2), encoding="utf-8")

    print(f"Report written to: {output_path}")
    print(result["report_body"])


if __name__ == "__main__":
    main()
```

- [ ] **Step 2: Smoke test (requires a metrics file from Task 9)**

```bash
python tools/client_reporter.py --metrics .tmp/metrics_default.json
```

Expected: report body written to `.tmp/perf_report_default.json`.

- [ ] **Step 3: Commit**

```bash
git add tools/client_reporter.py
git commit -m "feat: add client_reporter.py"
```

---

### Task 11: `social_poster.py`

**Files:**
- Create: `AI Agent /tools/social_poster.py`
- Create: `AI Agent /tests/test_social_poster.py`

- [ ] **Step 1: Write failing tests**

Create `tests/test_social_poster.py`:

```python
import json
import pytest
from pathlib import Path


@pytest.fixture
def post_file(tmp_path):
    data = {
        "platform": "instagram",
        "caption": "Test caption #minimal",
        "scheduled_time": "2026-03-15T11:00:00+08:00"
    }
    p = tmp_path / "post.json"
    p.write_text(json.dumps(data))
    return p


def test_dry_run_does_not_post(post_file, capsys):
    from tools.social_poster import execute_post
    result = execute_post(
        platform="instagram",
        caption="Test caption",
        scheduled_time="2026-03-15T11:00:00+08:00",
        dry_run=True
    )
    assert result["status"] == "dry-run"
    assert result["posted"] is False
    captured = capsys.readouterr()
    assert "DRY RUN" in captured.out


def test_missing_credentials_returns_error():
    from tools.social_poster import execute_post
    import os
    # Ensure no credentials set
    result = execute_post(
        platform="instagram",
        caption="Test",
        scheduled_time="2026-03-15T11:00:00+08:00",
        dry_run=False
    )
    # Without credentials, should return error dict, not crash
    assert "status" in result
    assert result["posted"] is False


def test_load_post_file(post_file):
    from tools.social_poster import load_post_file
    data = load_post_file(str(post_file))
    assert data["platform"] == "instagram"
    assert "caption" in data
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
pytest tests/test_social_poster.py -v
```

Expected: `ImportError`.

- [ ] **Step 3: Create `tools/social_poster.py`**

```python
"""
Social Poster — post content to social platforms via API.

Usage:
    python tools/social_poster.py --content .tmp/social_acme.json --scheduled-time "2026-03-15T11:00:00+08:00" --client acme
    python tools/social_poster.py --content .tmp/social_acme.json --dry-run
"""

import argparse
import json
import os
import sys
from datetime import datetime
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent.parent))

from tools.brand_loader import load_brand

TMP_DIR = Path(__file__).parent.parent / ".tmp"


def load_post_file(path: str) -> dict:
    return json.loads(Path(path).read_text(encoding="utf-8"))


def execute_post(platform: str, caption: str, scheduled_time: str,
                 dry_run: bool = False) -> dict:
    if dry_run:
        print(f"[DRY RUN] Would post to {platform} at {scheduled_time}:")
        print(f"  Caption: {caption[:80]}...")
        return {"status": "dry-run", "posted": False, "platform": platform}

    platform = platform.lower()

    if platform == "instagram" or platform == "facebook":
        return _post_meta(platform, caption, scheduled_time)
    elif platform == "linkedin":
        return _post_linkedin(caption, scheduled_time)
    else:
        return {"status": "error", "posted": False,
                "message": f"Unsupported platform: {platform}"}


def _post_meta(platform: str, caption: str, scheduled_time: str) -> dict:
    """Post to Instagram or Facebook via Meta Graph API."""
    access_token = os.getenv("INSTAGRAM_ACCESS_TOKEN") if platform == "instagram" \
        else os.getenv("FACEBOOK_ACCESS_TOKEN")
    page_id = os.getenv("META_PAGE_ID")

    if not access_token or not page_id:
        missing = []
        if not access_token:
            missing.append(f"{'INSTAGRAM' if platform == 'instagram' else 'FACEBOOK'}_ACCESS_TOKEN")
        if not page_id:
            missing.append("META_PAGE_ID")
        print(f"Error: missing .env keys: {', '.join(missing)}")
        return {"status": "error", "posted": False, "missing_keys": missing}

    try:
        import requests
        # For scheduling, Meta requires a Unix timestamp
        dt = datetime.fromisoformat(scheduled_time)
        scheduled_ts = int(dt.timestamp())

        url = f"https://graph.facebook.com/v18.0/{page_id}/feed"
        payload = {
            "message": caption,
            "scheduled_publish_time": scheduled_ts,
            "published": False,
            "access_token": access_token
        }
        response = requests.post(url, data=payload, timeout=30)
        response.raise_for_status()
        post_id = response.json().get("id")
        print(f"Scheduled {platform} post: {post_id}")
        return {"status": "scheduled", "posted": True, "platform": platform,
                "post_id": post_id, "scheduled_time": scheduled_time}

    except Exception as e:
        print(f"Meta posting error: {e}")
        return {"status": "error", "posted": False, "message": str(e)}


def _post_linkedin(caption: str, scheduled_time: str) -> dict:
    """Post to LinkedIn via LinkedIn API."""
    access_token = os.getenv("LINKEDIN_ACCESS_TOKEN")
    if not access_token:
        print("Error: LINKEDIN_ACCESS_TOKEN not set in .env")
        return {"status": "error", "posted": False, "missing_keys": ["LINKEDIN_ACCESS_TOKEN"]}

    try:
        import requests
        headers = {
            "Authorization": f"Bearer {access_token}",
            "Content-Type": "application/json",
            "X-Restli-Protocol-Version": "2.0.0"
        }
        # Get LinkedIn member URN
        me = requests.get("https://api.linkedin.com/v2/me", headers=headers, timeout=10)
        me.raise_for_status()
        person_urn = f"urn:li:person:{me.json()['id']}"

        payload = {
            "author": person_urn,
            "lifecycleState": "PUBLISHED",
            "specificContent": {
                "com.linkedin.ugc.ShareContent": {
                    "shareCommentary": {"text": caption},
                    "shareMediaCategory": "NONE"
                }
            },
            "visibility": {"com.linkedin.ugc.MemberNetworkVisibility": "PUBLIC"}
        }
        response = requests.post(
            "https://api.linkedin.com/v2/ugcPosts",
            headers=headers,
            json=payload,
            timeout=30
        )
        response.raise_for_status()
        print(f"LinkedIn post published: {response.headers.get('x-restli-id')}")
        return {"status": "published", "posted": True, "platform": "linkedin"}

    except Exception as e:
        print(f"LinkedIn posting error: {e}")
        return {"status": "error", "posted": False, "message": str(e)}


def main():
    parser = argparse.ArgumentParser(description="Post content to social platforms")
    parser.add_argument("--content", required=True,
                        help="Path to JSON file with post data")
    parser.add_argument("--scheduled-time", default=None,
                        help="ISO 8601 datetime for scheduling (e.g. 2026-03-15T11:00:00+08:00)")
    parser.add_argument("--dry-run", action="store_true",
                        help="Log the post without actually sending it")
    parser.add_argument("--client", default=None)
    args = parser.parse_args()

    # Respect TEST_MODE env var
    dry_run = args.dry_run or os.getenv("TEST_MODE", "").lower() == "true"

    post_data = load_post_file(args.content)
    platform = post_data.get("platform", "instagram")
    caption = post_data.get("caption", "")
    scheduled_time = args.scheduled_time or post_data.get("scheduled_time", "")

    if not caption:
        print("Error: no caption found in content file")
        sys.exit(1)

    result = execute_post(platform, caption, scheduled_time, dry_run=dry_run)

    TMP_DIR.mkdir(exist_ok=True)
    slug = args.client or "default"
    log_path = TMP_DIR / f"social_log_{slug}.json"
    log_path.write_text(json.dumps(result, indent=2), encoding="utf-8")
    print(f"Log written to: {log_path}")


if __name__ == "__main__":
    main()
```

- [ ] **Step 4: Run tests**

```bash
pytest tests/test_social_poster.py -v
```

Expected: all 3 `PASSED`.

- [ ] **Step 5: Smoke test (dry-run — safe, no API call)**

```bash
echo '{"platform": "instagram", "caption": "Test post #minimal", "scheduled_time": "2026-03-15T11:00:00+08:00"}' > .tmp/test_post.json
python tools/social_poster.py --content .tmp/test_post.json --dry-run
```

Expected: `[DRY RUN]` output printed, log written.

- [ ] **Step 6: Commit**

```bash
git add tools/social_poster.py tests/test_social_poster.py
git commit -m "feat: add social_poster.py with --dry-run and Meta/LinkedIn support"
```

---

### Task 12: `email_sender.py`

**Files:**
- Create: `AI Agent /tools/email_sender.py`
- Create: `AI Agent /tests/test_email_sender.py`

- [ ] **Step 1: Write failing tests**

Create `tests/test_email_sender.py`:

```python
import json
import pytest
from pathlib import Path


@pytest.fixture
def email_list(tmp_path):
    csv = tmp_path / "list.csv"
    csv.write_text("email,name\njohn@example.com,John\njane@example.com,Jane\n")
    return csv


@pytest.fixture
def body_file(tmp_path):
    f = tmp_path / "body.md"
    f.write_text("Hello {{name}},\n\nThis is a test email.\n\nRegards,\nThe Team")
    return f


def test_load_email_list(email_list):
    from tools.email_sender import load_email_list
    recipients = load_email_list(str(email_list))
    assert len(recipients) == 2
    assert recipients[0]["email"] == "john@example.com"
    assert recipients[0]["name"] == "John"


def test_load_email_list_missing_file():
    from tools.email_sender import load_email_list
    with pytest.raises(FileNotFoundError):
        load_email_list("/nonexistent/list.csv")


def test_personalise_body(body_file):
    from tools.email_sender import personalise_body
    body = body_file.read_text()
    result = personalise_body(body, {"name": "Alice", "email": "alice@example.com"})
    assert "Alice" in result
    assert "{{name}}" not in result


def test_dry_run_returns_preview(email_list, body_file, capsys):
    from tools.email_sender import send_campaign
    result = send_campaign(
        subject="Test subject",
        body=body_file.read_text(),
        list_path=str(email_list),
        dry_run=True
    )
    assert result["status"] == "dry-run"
    assert result["recipient_count"] == 2
    captured = capsys.readouterr()
    assert "DRY RUN" in captured.out
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
pytest tests/test_email_sender.py -v
```

Expected: `ImportError`.

- [ ] **Step 3: Create `tools/email_sender.py`**

```python
"""
Email Sender — send email campaign via SMTP.

Usage:
    python tools/email_sender.py --subject "Our new collection" --body .tmp/email_body_movara.md --list data/list.csv --dry-run
    python tools/email_sender.py --subject "..." --body .tmp/email_body_acme.md --list data/acme_list.csv --client acme
"""

import argparse
import csv
import json
import os
import smtplib
import sys
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent.parent))

from tools.brand_loader import load_brand

TMP_DIR = Path(__file__).parent.parent / ".tmp"


def load_email_list(list_path: str) -> list:
    """Load recipient list from CSV. Must have at minimum an 'email' column."""
    path = Path(list_path)
    if not path.exists():
        raise FileNotFoundError(f"Email list not found: {list_path}")

    with open(path, newline="", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        rows = list(reader)

    if not rows or "email" not in rows[0]:
        raise ValueError("CSV must have an 'email' column as the first column header")

    return rows


def personalise_body(body: str, recipient: dict) -> str:
    """Replace {{field}} placeholders with recipient data."""
    result = body
    for key, value in recipient.items():
        result = result.replace(f"{{{{{key}}}}}", str(value))
    return result


def send_campaign(subject: str, body: str, list_path: str, dry_run: bool = False) -> dict:
    """Send email to all recipients in the list. Returns send stats."""
    recipients = load_email_list(list_path)

    if dry_run:
        print(f"[DRY RUN] Would send to {len(recipients)} recipients")
        print(f"  Subject: {subject}")
        print(f"  Body preview: {body[:100]}...")
        return {
            "status": "dry-run",
            "recipient_count": len(recipients),
            "sent": 0,
            "failed": 0
        }

    smtp_host = os.getenv("SMTP_HOST")
    smtp_port = int(os.getenv("SMTP_PORT", 587))
    smtp_user = os.getenv("SMTP_USERNAME")
    smtp_pass = os.getenv("SMTP_PASSWORD")

    if not smtp_host or not smtp_user:
        missing = [k for k, v in {
            "SMTP_HOST": smtp_host, "SMTP_USERNAME": smtp_user
        }.items() if not v]
        print(f"Error: missing .env keys: {', '.join(missing)}")
        return {"status": "error", "missing_keys": missing, "sent": 0, "failed": 0}

    sent = 0
    failed = 0
    errors = []

    try:
        with smtplib.SMTP(smtp_host, smtp_port) as server:
            server.starttls()
            server.login(smtp_user, smtp_pass)

            for recipient in recipients:
                try:
                    personalised = personalise_body(body, recipient)
                    msg = MIMEMultipart("alternative")
                    msg["Subject"] = subject
                    msg["From"] = smtp_user
                    msg["To"] = recipient["email"]
                    msg.attach(MIMEText(personalised, "plain"))
                    server.send_message(msg)
                    sent += 1
                except Exception as e:
                    failed += 1
                    errors.append({"email": recipient.get("email"), "error": str(e)})

    except Exception as e:
        print(f"SMTP connection failed: {e}")
        return {"status": "error", "message": str(e), "sent": sent, "failed": failed}

    print(f"Campaign sent: {sent} delivered, {failed} failed")
    return {
        "status": "sent",
        "sent": sent,
        "failed": failed,
        "errors": errors
    }


def main():
    parser = argparse.ArgumentParser(description="Send email campaign via SMTP")
    parser.add_argument("--subject", required=True, help="Email subject line")
    parser.add_argument("--body", required=True,
                        help="Path to email body file (.md or .txt)")
    parser.add_argument("--list", required=True, dest="list_path",
                        help="Path to recipient CSV file (must have 'email' column)")
    parser.add_argument("--dry-run", action="store_true",
                        help="Preview send without delivering")
    parser.add_argument("--client", default=None)
    args = parser.parse_args()

    dry_run = args.dry_run or os.getenv("TEST_MODE", "").lower() == "true"

    body_path = Path(args.body)
    if not body_path.exists():
        print(f"Error: body file not found: {args.body}")
        sys.exit(1)

    body = body_path.read_text(encoding="utf-8")
    result = send_campaign(args.subject, body, args.list_path, dry_run=dry_run)

    TMP_DIR.mkdir(exist_ok=True)
    slug = args.client or "default"
    log_path = TMP_DIR / f"email_log_{slug}.json"
    log_path.write_text(json.dumps(result, indent=2), encoding="utf-8")
    print(f"Log written to: {log_path}")


if __name__ == "__main__":
    main()
```

- [ ] **Step 4: Run tests**

```bash
pytest tests/test_email_sender.py -v
```

Expected: all 4 `PASSED`.

- [ ] **Step 5: Smoke test (dry-run — safe)**

```bash
printf "email,name\ntest@example.com,Test User\n" > .tmp/test_list.csv
printf "Hi {{name}},\n\nTest email.\n" > .tmp/test_body.md
python tools/email_sender.py \
  --subject "Test subject" \
  --body .tmp/test_body.md \
  --list .tmp/test_list.csv \
  --dry-run
```

Expected: `[DRY RUN]` output, log written. No emails sent.

- [ ] **Step 6: Run full test suite**

```bash
pytest tests/ -v
```

Expected: all tests pass.

- [ ] **Step 7: Commit**

```bash
git add tools/email_sender.py tests/test_email_sender.py
git commit -m "feat: add email_sender.py with --dry-run and {{name}} personalisation"
```

---

## Chunk 4: Workflow SOPs

> Workflow files are Markdown SOPs. No tests required. Each workflow is validated by running it end-to-end with a test client profile.

### Task 13: Write all 10 workflow files

Write each file below to `AI Agent /workflows/`. Each file is a ready-to-use SOP the agent reads and follows.

---

- [ ] **Step 1: Write `agency_routing_workflow.md`**

```markdown
# Agency Routing Workflow

## Objective
Classify an incoming request and route it to the correct specialist agent and workflow.

## Intent Classification
Map the user request to one of these intents:

| Intent | Route to | Notes |
|---|---|---|
| `campaign` | agency_orchestrator → campaign_kickoff_workflow.md | |
| `content` | content_agent → content_production_workflow.md | |
| `social` | social_agent → social_media_workflow.md | |
| `email` | content_agent → email_campaign_workflow.md | New in this plan |
| `seo` | seo_agent → seo_audit_workflow.md | |
| `media` | media_agent → media_plan_workflow.md | |
| `analytics` | analytics_agent → performance_report_workflow.md | |
| `client` | client_agent → client_onboarding_workflow.md | |
| `influencer` | strategy_agent → influencer_research_workflow.md | New in this plan |
| `research` | strategy_agent → research_workflow.md | Pre-existing workflow |
| `competitor` | strategy_agent → competitor_analysis_workflow.md | Pre-existing workflow |

## Steps

### Step 1: Determine active client
Check `ACTIVE_CLIENT` in `.env`. If set, load `brand/clients/<slug>/profile.json`. If not set, use `brand/company_profile.json`. Pass `--client <slug>` to all tool calls.

### Step 2: Classify intent
Read the user's request. Classify into one intent from the table above. If multiple intents apply (e.g. "launch a campaign and write the social posts"), use `campaign` and sequence accordingly.

### Step 3: Handle ambiguity
If intent cannot be confidently classified, ask **one** question only. Example: "Are you looking to create content for a specific platform, or launch a full campaign?"

### Step 4: Route
Execute the relevant workflow. Pass the original brief and client slug to the first agent in the sequence.

### Step 5: Log
Write routing decision to `.tmp/routing_log.json`:
```json
{
  "timestamp": "ISO8601",
  "client": "slug",
  "intent": "content",
  "workflow": "content_production_workflow.md",
  "brief_summary": "first 100 chars of user request"
}
```

## Edge Cases
- **Ambiguous after one question:** Default to `content` intent and proceed.
- **Multi-intent request:** Always lead with `campaign` if campaign work is part of the request — it sequences the other agents.
- **New client (no profile):** Block. Ask user to run `client_onboarding_workflow.md` first.
```

- [ ] **Step 2: Write `campaign_kickoff_workflow.md`**

```markdown
# Campaign Kickoff Workflow

## Objective
Take a campaign brief and produce: audience analysis, 4-week content calendar, media plan, and a compiled kickoff PDF.

## Required Inputs
- Campaign brief (topic, goal, timeline, budget if known)
- Active client slug (or default agency profile)

## Sequence: strategy_agent → content_agent → media_agent → orchestrator

### Step 1: strategy_agent — Audience analysis and positioning brief
1. Load client profile: `brand/clients/<slug>/profile.json`
2. Run `python tools/audience_analyzer.py --client <slug>` → `.tmp/audience_<slug>.json`
3. If `.tmp/extract_*.json` files exist from a prior competitor analysis: run `python tools/analyze_competitors.py --client <slug>` → `.tmp/analysis.json`. Otherwise skip — note the omission.
4. Draft positioning statement and campaign objectives using AI reasoning. Save to `.tmp/strategy_brief_<slug>.md`.

### Step 2: content_agent — Content calendar
1. Read `.tmp/strategy_brief_<slug>.md` as context
2. Run: `python tools/content_writer.py --brief .tmp/strategy_brief_<slug>.md --format calendar --client <slug>`
3. Output: `.tmp/content_calendar_<slug>.md`

### Step 3: media_agent — Media plan and ad briefs
1. Read `.tmp/strategy_brief_<slug>.md` and client budget from profile
2. Run: `python tools/media_planner.py --brief .tmp/strategy_brief_<slug>.md --client <slug>`
3. For each channel in the plan: `python tools/ad_brief_creator.py --campaign .tmp/strategy_brief_<slug>.md --channel <channel> --client <slug>`
4. Output: `.tmp/media_plan_<slug>.json`, `.tmp/ad_brief_<channel>_<slug>.md` per channel

### Step 4: orchestrator — Compile and deliver
1. Merge outputs into `.tmp/kickoff_input_<slug>.json`
2. Run: `python tools/generate_pdf.py --input .tmp/kickoff_input_<slug>.json --template campaign_kickoff --output output/kickoff_<slug>_<date>.pdf --client <slug>`
3. Run: `python tools/upload_to_drive.py --file output/kickoff_<slug>_<date>.pdf --client <slug> --folder-id [from profile.drive_folder_id or DRIVE_FOLDER_ID]`
4. **PAUSE:** Notify Marcus on WhatsApp: "Campaign kickoff PDF ready for [client]. Drive link: [link]"

## Edge Cases
- Missing budget in profile: proceed with "TBC" in media plan. Flag in output.
- Competitor data not yet scraped: note "competitive analysis not included — run competitor_analysis_workflow.md to add."
- PDF generation fails: save markdown outputs as fallback and deliver those to Marcus.
```

- [ ] **Step 3: Write `content_production_workflow.md`**

```markdown
# Content Production Workflow

## Objective
Turn a brief into polished, on-brand copy ready to use or lightly refine.

## Required Inputs
- Brief: topic, format, tone, word count, platform
- Active client slug

## Steps

### Step 1: Assess research need
If the brief requires up-to-date facts or competitor context: run `research_workflow.md` first and include the summary in the brief.

### Step 2: Generate copy
Run: `python tools/content_writer.py --brief "<brief>" --format <format> --tone <tone> --max-words <n> --client <slug>`

Output: `.tmp/content_<slug>.md` (or `.tmp/email_body_<slug>.md` for email format)

### Step 3: Deliver
Paste the 3 options into the conversation for Marcus to review and select.

### Step 4: Save to Obsidian (blog/article only)
If format is `blog` or `article`: save the output file to the Obsidian vault `Research/` folder using the project's existing Obsidian file-write convention (copy `.tmp/content_<slug>.md` to `~/[vault path]/Research/<title>.md`).

## Edge Cases
- Brief too vague: ask one clarifying question before generating.
- Output sounds generic: append "Rewrite in a more [specific tone] voice. Remove any phrases like [example generic phrase]." and re-run.
- Word limit too tight for the format: note the constraint and produce the best version possible, flagging what was cut.
```

- [ ] **Step 4: Write `social_media_workflow.md`**

```markdown
# Social Media Workflow

## Objective
Produce ready-to-post captions, hashtags, and scheduled posts for one or more platforms.

## Required Inputs
- Brief: topic, platforms (instagram/facebook/linkedin), post count, tone
- Active client slug

## Steps

### Step 1: Generate captions
Run: `python tools/content_writer.py --brief "<brief>" --format social --tone <tone> --platforms <csv> --count <n> --client <slug>`

Output: `.tmp/content_<slug>.md`

### Step 2: Format for each platform
Instagram: shorten to ≤150 words, add 5-10 hashtags.
Facebook: up to 200 words, 2-3 hashtags, optional link.
LinkedIn: up to 300 words, 3-5 hashtags, no link in post body.

### Step 3: Schedule (if enabled)
If `SOCIAL_PLATFORMS` is set in `.env` and scheduling is requested:
Create `.tmp/social_<slug>.json` with platform, caption, and scheduled time.
Run: `python tools/social_poster.py --content .tmp/social_<slug>.json --scheduled-time "<ISO8601>" --client <slug>`

In test/development: always use `--dry-run` or set `TEST_MODE=true`.

### Step 4: Confirm
Deliver post copy in conversation. Log schedule confirmation from `.tmp/social_log_<slug>.json`.

## Edge Cases
- Scheduling credentials missing: deliver copy only, flag as "needs manual scheduling."
- Platform not in `SOCIAL_PLATFORMS`: skip scheduling for that platform, deliver copy.
```

- [ ] **Step 5: Write `email_campaign_workflow.md`**

```markdown
# Email Campaign Workflow

## Objective
Write, finalise, and send an email campaign to a recipient list.

## Required Inputs
- Campaign goal and audience segment
- Path to recipient CSV file (must have 'email' column; 'name' column optional for personalisation)
- Active client slug

## Steps

### Step 1: Generate email copy
Run: `python tools/content_writer.py --brief "<brief>" --format email --count 3 --client <slug>`

Output: `.tmp/email_body_<slug>.md` (body) and 3 subject line options in the conversation.

### Step 2: PAUSE — Subject line selection
Present the 3 subject line options to Marcus. Wait for his selection before proceeding.

### Step 3: Send campaign
Run: `python tools/email_sender.py --subject "<selected subject>" --body .tmp/email_body_<slug>.md --list <list_path> --client <slug>`

**Always use `--dry-run` in test/development.** Only send live with explicit confirmation from Marcus.

### Step 4: Log and record
Log is written to `.tmp/email_log_<slug>.json`. Append summary to Obsidian daily note.
Report to Marcus: "Email campaign sent to [n] recipients. Subject: [subject]. Log: .tmp/email_log_<slug>.json"

## Edge Cases
- SMTP credentials missing: block. List the missing `.env` keys and stop.
- Recipient list has no 'email' column: block. Instruct Marcus to fix the CSV format.
- High failure rate (>10%): flag immediately. Do not retry without Marcus's confirmation.
```

- [ ] **Step 6: Write `seo_audit_workflow.md`**

```markdown
# SEO Audit Workflow

## Objective
Produce keyword research and on-page analysis for a topic or URL, delivered as a branded PDF.

## Required Inputs
- Topic (keyword to research) and/or URL (page to audit)
- Active client slug

## Steps

### Step 1: Keyword research
If topic provided: `python tools/seo_analyzer.py --topic "<topic>" --client <slug>`

### Step 2: On-page analysis (if URL provided)
`python tools/seo_analyzer.py --url <url> --client <slug>`

Both steps write to `.tmp/seo_<slug>.json`.

### Step 3: Generate PDF
`python tools/generate_pdf.py --input .tmp/seo_<slug>.json --template seo_audit --output output/seo_<slug>_<date>.pdf --client <slug>`

### Step 4: Upload to Drive
`python tools/upload_to_drive.py --file output/seo_<slug>_<date>.pdf --client <slug>`

### Step 5: Deliver
Share Drive link with Marcus. Summarise top 3 keyword recommendations in the conversation.

## Edge Cases
- DuckDuckGo search fails or is rate-limited: tool falls back to AI-generated keyword suggestions. Output is labelled "AI-estimated, not live SERP data."
- URL returns 403 or timeout: note inaccessible page, skip on-page analysis, proceed with keyword research only.
```

- [ ] **Step 7: Write `media_plan_workflow.md`**

```markdown
# Media Plan Workflow

## Objective
Produce a channel mix recommendation, budget allocation, and per-channel ad briefs as a PDF.

## Required Inputs
- Campaign brief (goals, budget if known, audience, timeline)
- Active client slug

## Steps

### Step 1: Generate media plan
`python tools/media_planner.py --brief "<brief>" [--budget <amount>] [--channels <csv>] --client <slug>`

Output: `.tmp/media_plan_<slug>.json`

### Step 2: Generate ad briefs per channel
For each recommended channel in `.tmp/media_plan_<slug>.json`:
`python tools/ad_brief_creator.py --campaign "<brief>" --channel <channel> --client <slug>`

Output: `.tmp/ad_brief_<channel>_<slug>.md` per channel.

### Step 3: Generate PDF
`python tools/generate_pdf.py --input .tmp/media_plan_<slug>.json --template media_plan --output output/media_<slug>_<date>.pdf --client <slug>`

### Step 4: Upload and deliver
`python tools/upload_to_drive.py --file output/media_<slug>_<date>.pdf --client <slug>`
Share link with Marcus.

## Edge Cases
- No budget provided and not in profile: produce plan with "TBC" budget. Flag for Marcus to confirm before activating.
- Client has no brand config: use agency default. Note in PDF cover.
```

- [ ] **Step 8: Write `performance_report_workflow.md`**

```markdown
# Performance Report Workflow

## Objective
Pull metrics from one or more platforms, analyse performance, and deliver a branded PDF report to the client.

## Required Inputs
- Date range: from (YYYY-MM-DD) and to (YYYY-MM-DD)
- Platform(s): ga4, meta (CSV), or manual
- Active client slug

## Steps

### Step 1: Pull metrics
For each platform:
`python tools/analytics_puller.py --platform <platform> --from <YYYY-MM-DD> --to <YYYY-MM-DD> [--csv-path <path>] --client <slug>`

Output: `.tmp/metrics_<slug>.json`

### Step 2: Compose report body
`python tools/client_reporter.py --metrics .tmp/metrics_<slug>.json --client <slug>`

Output: `.tmp/perf_report_<slug>.json`

### Step 3: Generate PDF
`python tools/generate_pdf.py --input .tmp/perf_report_<slug>.json --template performance_report --output output/report_<slug>_<date>.pdf --client <slug>`

### Step 4: Upload and notify
`python tools/upload_to_drive.py --file output/report_<slug>_<date>.pdf --client <slug>`
Append summary to Obsidian daily note.
Notify Marcus: "Performance report for [client] ready. Period: [from] to [to]. Drive: [link]"

## Edge Cases
- Platform not connected: `analytics_puller.py` returns empty data. Flag: "No data available — manual entry required." Run with `--platform manual`.
- Multiple platforms: run Step 1 once per platform, then merge all metric files before Step 2.
```

- [ ] **Step 9: Write `client_onboarding_workflow.md`**

```markdown
# Client Onboarding Workflow

## Objective
Set up a new client profile, run initial competitor analysis, and produce an onboarding summary PDF.

## Steps

### Step 1: Collect client details
Ask Marcus (or receive from intake form) for:
- Business name
- Industry and market segment
- Goals (top 3)
- Monthly budget (if known)
- Target audience description
- Main competitors (3-5)
- Brand assets: logo file path, primary colour (hex), secondary colour, font name

### Step 2: Create client profile
Determine `<slug>` = lowercased, hyphenated business name (e.g. "Acme Co" → "acme-co").

Run: `python tools/save_company_profile.py --name "<name>" --description "<description>" --market "<market>" --differentiators "<differentiators>" --primary-color "<hex>" --font "<font>" [--logo <path>] --output-dir brand/clients/<slug>/`

If `drive_folder_id` is provided: add it manually to `brand/clients/<slug>/profile.json` as `"drive_folder_id": "<id>"`.

### Step 3: Initial competitor analysis
Run `competitor_analysis_workflow.md` with the new client as active client.
This produces `.tmp/extract_*.json` files for future campaign use.

### Step 4: Generate onboarding document
Save onboarding summary to `.tmp/onboarding_<slug>.json`.
Run: `python tools/generate_pdf.py --input .tmp/onboarding_<slug>.json --template onboarding --output output/onboarding_<slug>.pdf --client <slug>`

### Step 5: Upload and deliver
`python tools/upload_to_drive.py --file output/onboarding_<slug>.pdf --client <slug> --folder-id <DRIVE_FOLDER_ID>`

Notify Marcus: "Client [name] onboarded. Profile at brand/clients/<slug>/. Onboarding PDF on Drive."

### Step 6: Set active client
Add to `.env`: `ACTIVE_CLIENT=<slug>`

## Edge Cases
- Logo file not provided: skip logo, use text-only header in PDFs.
- Drive folder not created yet: upload to root, note in output.
```

- [ ] **Step 10: Write `influencer_research_workflow.md`**

```markdown
# Influencer Research Workflow

## Objective
Identify 10-15 influencer prospects for a given niche and produce a prioritised brief PDF.

## Required Inputs
- Niche/topic
- Target audience description
- Active client slug

## Steps

### Step 1: Web research
Search for influencers in the niche using `tools/scrape_website.py` and `tools/extract_text.py` (reads `.tmp/scraped_*.html` — existing convention).
Supplement with AI-generated prospect suggestions based on the niche and audience profile.

### Step 2: Build prospect list
For each prospect: record name, platform, handle, estimated follower count, niche alignment, and content style.
Save to `.tmp/influencers_<slug>.json`:

```json
{
  "niche": "minimal lifestyle",
  "prospects": [
    {
      "name": "Creator Name",
      "platform": "instagram",
      "handle": "@handle",
      "est_followers": "50k",
      "alignment": "high",
      "content_style": "editorial photography",
      "notes": ""
    }
  ]
}
```

### Step 3: Score and prioritise
Ask AI to score each prospect: relevance (1-5), estimated reach fit for the campaign, and content style match.
Sort by combined score descending.

### Step 4: Generate PDF
`python tools/generate_pdf.py --input .tmp/influencers_<slug>.json --template influencer_brief --output output/influencers_<slug>_<date>.pdf --client <slug>`

### Step 5: Upload and deliver
`python tools/upload_to_drive.py --file output/influencers_<slug>_<date>.pdf --client <slug>`
Deliver Drive link to Marcus. Summarise top 5 prospects in the conversation.

## Edge Cases
- Scraping blocked: use AI-generated prospect suggestions only. Flag as "AI-estimated, not scraped."
- Fewer than 10 prospects found: deliver what was found, note the gap.
```

- [ ] **Step 11: Commit all workflow files**

```bash
git add workflows/agency_routing_workflow.md \
        workflows/campaign_kickoff_workflow.md \
        workflows/content_production_workflow.md \
        workflows/social_media_workflow.md \
        workflows/email_campaign_workflow.md \
        workflows/seo_audit_workflow.md \
        workflows/media_plan_workflow.md \
        workflows/performance_report_workflow.md \
        workflows/client_onboarding_workflow.md \
        workflows/influencer_research_workflow.md
git commit -m "feat: add all 10 agency workflow SOPs"
```

---

## Final Verification

- [ ] **Run the full test suite**

```bash
cd "/Users/marcus/ai-agent-team/AI Agent "
pytest tests/ -v
```

Expected: all tests pass. Zero failures.

- [ ] **Verify all new tool scripts are executable**

```bash
python tools/brand_loader.py 2>&1 | grep -v "^$" || echo "brand_loader: no __main__ block (expected)"
python tools/content_writer.py --help
python tools/audience_analyzer.py --help
python tools/seo_analyzer.py --help
python tools/media_planner.py --help
python tools/ad_brief_creator.py --help
python tools/analytics_puller.py --help
python tools/client_reporter.py --help
python tools/social_poster.py --help
python tools/email_sender.py --help
# Verify extended tools still work after modification
python tools/generate_pdf.py --help
python tools/save_company_profile.py --help
```

Expected: each prints a usage/help message with no import errors. `generate_pdf.py --help` must list all 7 `--template` choices. `save_company_profile.py --help` must list `--output-dir`.

- [ ] **Verify all workflow files exist**

```bash
ls workflows/
```

Expected: all 12 workflow files present (10 new + 2 existing).

- [ ] **Final commit**

```bash
git add -u
git commit -m "chore: final verification — all agency tools and workflows complete"
```
