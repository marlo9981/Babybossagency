# Marketing & Media Agency — AI Agent System Design

**Date:** 2026-03-14
**Project:** ai-agent-team
**Status:** Approved

---

## Overview

A full-stack Marketing & Media agency AI agent system built on the existing WAT framework (Workflows, Agents, Tools). A central orchestrator agent classifies incoming requests and routes them to seven specialist agents, each owning a set of Markdown workflows and Python tools. Outputs flow to branded PDFs, Google Drive, and the Obsidian vault.

---

## Architecture

### Pattern: Orchestrator + Specialists

One `agency_orchestrator` is the single entry point for all requests. It classifies intent, routes to the appropriate specialist agent(s), and coordinates multi-agent tasks (e.g. campaign kickoff = strategy + content + media plan executed sequentially, each output feeding the next).

Specialists never call each other directly. All inter-agent coordination goes through the orchestrator.

### Agent Roster

| Agent | Responsibility |
|---|---|
| `agency_orchestrator` | Intent classification, routing, multi-agent coordination |
| `strategy_agent` | Market research, audience analysis, campaign briefs, positioning, influencer research |
| `content_agent` | Copy, social posts, blogs, ad copy, email body, scripts |
| `media_agent` | Channel selection, ad briefs, budget allocation, media plans |
| `analytics_agent` | Performance reporting, ROI analysis, trend spotting |
| `seo_agent` | Keyword research, on-page audits, SERP analysis, content gap reports |
| `social_agent` | Social scheduling, caption writing, hashtag strategy, engagement monitoring |
| `client_agent` | Client onboarding, status reports, meeting prep, deliverable tracking |

The `research` and `competitor` routing intents are handled by `strategy_agent` using `research_workflow.md` and `competitor_analysis_workflow.md` respectively.

---

## Tool Invocation Convention

All tools follow the existing CLI script pattern: invoked as `python tools/<script>.py [flags]`, not imported as modules. Each script reads inputs from CLI flags and/or `.tmp/` files, writes outputs to `.tmp/` or `output/`, and includes a `if __name__ == "__main__":` block.

**Multi-client flag:** Every tool that reads from `brand/` accepts an optional `--client <slug>` flag. When provided, the tool loads `brand/clients/<slug>/profile.json` and `brand/clients/<slug>/brand_config.json` instead of the default `brand/company_profile.json` and `brand/brand_config.json`. Tools that do not read from `brand/` (e.g. `seo_analyzer.py`) ignore this flag. For `upload_to_drive.py`: when both `--client <slug>` and `--folder-id <id>` are passed, `--folder-id` takes precedence as the upload destination; `--client` is still passed for convention consistency.

**`generate_pdf.py` extension:** The existing `generate_pdf.py` will be extended to accept `--input <json_path>`, `--template <template_name>`, `--output <pdf_path>`, and `--client <slug>`. Existing behaviour (default template = `competitor_analysis`, default input = `.tmp/analysis.json`) is preserved when flags are omitted. New workflows pass their own input JSON and template name explicitly.

---

## Workflows

All workflows are Markdown SOPs in `AI Agent /workflows/`. Existing workflows (`research_workflow.md`, `competitor_analysis_workflow.md`) are unchanged.

### New Workflows (10)

#### `agency_routing_workflow.md`
**Owner:** agency_orchestrator
- Classify user request into one of: `campaign`, `content`, `media`, `analytics`, `seo`, `social`, `client`, `research`, `competitor`
- `research` → strategy_agent + `research_workflow.md`; `competitor` → strategy_agent + `competitor_analysis_workflow.md`
- For single-domain requests: route directly to the relevant specialist agent and its workflow
- For multi-domain requests (e.g. "launch a new campaign"): sequence specialist agents, passing each agent's output as context to the next
- If intent is ambiguous after classification: ask the user one clarifying question before routing
- Log routing decision and client slug to `.tmp/routing_log.json`

#### `campaign_kickoff_workflow.md`
**Owner:** agency_orchestrator (multi-agent)
**Sequence:** strategy_agent → content_agent → media_agent

1. **strategy_agent** — produce audience analysis and positioning brief:
   - Use AI reasoning to draft a target audience profile and positioning statement from the client profile (`brand/clients/<slug>/profile.json`)
   - If competitor extract files already exist in `.tmp/extract_*.json` (from a prior competitor analysis run), call `python tools/analyze_competitors.py --client <slug>` to incorporate competitive context; otherwise skip this step and note the omission in the brief
   - Call `python tools/audience_analyzer.py --client <slug>` to produce `.tmp/audience_<slug>.json`
   - Output: `.tmp/strategy_brief_<slug>.md`

2. **content_agent** — generate a 4-week content calendar and sample copy:
   - Read `.tmp/strategy_brief_<slug>.md` as context
   - Call `python tools/content_writer.py --brief .tmp/strategy_brief_<slug>.md --format calendar --tone [from profile] --client <slug>`
   - Output: `.tmp/content_calendar_<slug>.md`

3. **media_agent** — produce channel brief and budget allocation:
   - Read `.tmp/strategy_brief_<slug>.md` and client budget from profile as context
   - Call `python tools/media_planner.py --brief .tmp/strategy_brief_<slug>.md --client <slug>`
   - Call `python tools/ad_brief_creator.py --campaign .tmp/strategy_brief_<slug>.md --client <slug>`
   - Output: `.tmp/media_plan_<slug>.json`

4. **Orchestrator** — compile outputs into a single kickoff PDF:
   - Merge `.tmp/strategy_brief_<slug>.md`, `.tmp/content_calendar_<slug>.md`, `.tmp/media_plan_<slug>.json` into `.tmp/kickoff_input_<slug>.json`
   - Call `python tools/generate_pdf.py --input .tmp/kickoff_input_<slug>.json --template campaign_kickoff --output output/kickoff_<slug>_<date>.pdf --client <slug>`
   - Call `python tools/upload_to_drive.py --file output/kickoff_<slug>_<date>.pdf --client <slug> --folder-id [from client profile.drive_folder_id or DRIVE_FOLDER_ID env var]`

#### `content_production_workflow.md`
**Owner:** content_agent
1. Receive brief (topic, format, tone, word count, platform)
2. If research needed: run `research_workflow.md` first and pass summary as context
3. Call `python tools/content_writer.py --brief "<brief>" --format <format> --tone <tone> --max-words <n> --client <slug>`
4. Output: copy delivered in conversation + saved to `.tmp/content_<slug>.md`
5. If format is blog/article: also save to Obsidian `Research/` folder

#### `social_media_workflow.md`
**Owner:** social_agent
1. Receive brief (topic, platforms, post count, tone)
2. Call `python tools/content_writer.py --brief "<brief>" --format social --tone <tone> --platforms <csv> --client <slug>`
3. If `SOCIAL_PLATFORMS` is set and scheduling is requested: call `python tools/social_poster.py --content .tmp/social_<slug>.json --scheduled-time "<ISO8601>" --client <slug>`
4. Output: post copy delivered in conversation; schedule confirmation logged to `.tmp/social_schedule.json`

#### `email_campaign_workflow.md`
**Owner:** content_agent
1. Receive brief (campaign goal, audience segment, list path)
2. Call `python tools/content_writer.py --brief "<brief>" --format email --count 3 --client <slug>` to generate 3 subject line options and email body — when `--format email`, tool writes body to `.tmp/email_body_<slug>.md` (separate from the default `.tmp/content_<slug>.md`)
3. **PAUSE:** present subject lines to user and wait for selection
4. Call `python tools/email_sender.py --subject "<selected>" --body .tmp/email_body_<slug>.md --list <list_path> --client <slug>`
   - In test/dry-run mode: pass `--dry-run` flag; tool logs the send without delivering
5. Log send result to `.tmp/email_log.json`; append to Obsidian daily note

#### `seo_audit_workflow.md`
**Owner:** seo_agent
1. Receive target URL or topic
2. Call `python tools/seo_analyzer.py --topic "<topic>" --client <slug>` for keyword research
3. If URL provided: also call `python tools/seo_analyzer.py --url <url> --client <slug>` for SERP snapshot and on-page analysis
4. Generate recommendations from AI analysis of tool outputs
5. Save recommendations to `.tmp/seo_report_<slug>.json`
6. Call `python tools/generate_pdf.py --input .tmp/seo_report_<slug>.json --template seo_audit --output output/seo_<slug>_<date>.pdf --client <slug>`
7. Call `python tools/upload_to_drive.py --file output/seo_<slug>_<date>.pdf --client <slug>`

#### `media_plan_workflow.md`
**Owner:** media_agent
1. Receive campaign brief (goals, budget, audience, timeline)
2. Call `python tools/media_planner.py --brief "<brief>" --budget <amount> --channels <csv> --client <slug>`
3. For each channel in `.tmp/media_plan_<slug>.json`: call `python tools/ad_brief_creator.py --campaign "<campaign>" --channel <channel> --client <slug>` — outputs `.tmp/ad_brief_<channel>_<slug>.md`
4. Save plan to `.tmp/media_plan_<slug>.json`
5. Call `python tools/generate_pdf.py --input .tmp/media_plan_<slug>.json --template media_plan --output output/media_<slug>_<date>.pdf --client <slug>`
6. Call `python tools/upload_to_drive.py --file output/media_<slug>_<date>.pdf --client <slug>`

#### `performance_report_workflow.md`
**Owner:** analytics_agent
1. Receive date range (ISO 8601: `YYYY-MM-DD` to `YYYY-MM-DD`) and platforms to report on
2. Call `python tools/analytics_puller.py --platform <platform> --from <YYYY-MM-DD> --to <YYYY-MM-DD> --client <slug>` for each platform
3. Call `python tools/client_reporter.py --metrics .tmp/metrics_<slug>.json --client <slug>` to compose report body
4. Save report data to `.tmp/perf_report_<slug>.json`
5. Call `python tools/generate_pdf.py --input .tmp/perf_report_<slug>.json --template performance_report --output output/report_<slug>_<date>.pdf --client <slug>`
6. Call `python tools/upload_to_drive.py --file output/report_<slug>_<date>.pdf --client <slug>`
7. Append summary to Obsidian daily note

#### `client_onboarding_workflow.md`
**Owner:** client_agent
1. Collect client details interactively: name, industry, goals, budget, target audience, competitors, brand assets (logo path, colours, font)
2. Call `python tools/save_company_profile.py --name "..." --description "..." ... --output-dir brand/clients/<slug>/`
3. Run `competitor_analysis_workflow.md` to generate initial competitive landscape (produces `.tmp/extract_*.json` for future use)
4. Generate onboarding summary; save to `.tmp/onboarding_<slug>.json`
5. Call `python tools/generate_pdf.py --input .tmp/onboarding_<slug>.json --template onboarding --output output/onboarding_<slug>.pdf --client <slug>`
6. Call `python tools/upload_to_drive.py --file output/onboarding_<slug>.pdf --client <slug> --folder-id <DRIVE_FOLDER_ID env var>` (`--folder-id` overrides the client profile folder; when both are passed, `--folder-id` takes precedence)
7. Add `drive_folder_id` to `brand/clients/<slug>/profile.json` if provided

#### `influencer_research_workflow.md`
**Owner:** strategy_agent
1. Receive niche/topic and target audience
2. Run web research via `python tools/scrape_website.py <url>` (writes `.tmp/scraped_*.html`) and `python tools/extract_text.py` (reads `.tmp/scraped_*.html` — existing convention) for each prospect found
3. Use AI to identify 10–15 influencer prospects with profile summaries from search results
4. Score prospects by relevance, estimated reach, and content fit
5. Save prospect list to `.tmp/influencers_<slug>.json`
6. Call `python tools/generate_pdf.py --input .tmp/influencers_<slug>.json --template influencer_brief --output output/influencers_<slug>_<date>.pdf --client <slug>`
7. Call `python tools/upload_to_drive.py --file output/influencers_<slug>_<date>.pdf --client <slug>`

---

## Tools

All tools are Python CLI scripts in `AI Agent /tools/`. Credentials from `.env`. Intermediates to `.tmp/`. Deliverables to `output/`. All tools that read brand assets accept `--client <slug>`.

### New Tools (9)

| Tool | Invocation | Purpose |
|---|---|---|
| `content_writer.py` | `python tools/content_writer.py --brief <file_or_str> --format <format> --tone <tone> --max-words <n> [--platforms <csv>] [--count <n>] [--client <slug>]` | AI-powered copy generation; writes output to `.tmp/content_<slug>.md` |
| `social_poster.py` | `python tools/social_poster.py --content <json_path> --scheduled-time <ISO8601> [--dry-run] [--client <slug>]` | Post to social platforms via API; `--dry-run` logs without posting |
| `email_sender.py` | `python tools/email_sender.py --subject "<str>" --body <file> --list <csv_path> [--dry-run] [--client <slug>]` | Send email via SMTP; `--dry-run` logs without sending; outputs send stats |
| `seo_analyzer.py` | `python tools/seo_analyzer.py [--topic "<str>"] [--url <url>] [--client <slug>]` | DuckDuckGo keyword research + SERP snapshot; outputs `.tmp/seo_<slug>.json` |
| `analytics_puller.py` | `python tools/analytics_puller.py --platform <ga4\|meta\|csv> --from <YYYY-MM-DD> --to <YYYY-MM-DD> [--csv-path <path>] [--client <slug>]` | Pull metrics from GA4 API, Meta Ads CSV, or prompt for manual entry; outputs `.tmp/metrics_<slug>.json` |
| `media_planner.py` | `python tools/media_planner.py --brief <file_or_str> [--budget <float>] [--channels <csv>] [--client <slug>]` | AI-generated channel mix and budget splits; when `--budget` is omitted, reads from client profile. Outputs `.tmp/media_plan_<slug>.json` |
| `ad_brief_creator.py` | `python tools/ad_brief_creator.py --campaign <file_or_str> [--channel <str>] [--client <slug>]` | Generate per-channel ad creative brief; outputs `.tmp/ad_brief_<channel>_<slug>.md` |
| `client_reporter.py` | `python tools/client_reporter.py --metrics <json_path> [--client <slug>]` | Compose client-facing performance report body; outputs `.tmp/perf_report_<slug>.json` |
| `audience_analyzer.py` | `python tools/audience_analyzer.py [--client <slug>]` | AI-generated audience profile from client profile data; outputs `.tmp/audience_<slug>.json` |

### Extended Existing Tools

| Tool | Extension |
|---|---|
| `generate_pdf.py` | Add `--input <json>`, `--template <name>`, `--output <path>`, `--client <slug>`. Default behaviour unchanged when flags omitted. Template names: `competitor_analysis` (default), `campaign_kickoff`, `seo_audit`, `media_plan`, `performance_report`, `onboarding`, `influencer_brief`. |
| `save_company_profile.py` | Add `--output-dir <path>` to write to `brand/clients/<slug>/` instead of `brand/`. |

### Unchanged Existing Tools

`scrape_website.py`, `extract_text.py`, `summarize_text.py`, `find_competitors.py`, `analyze_competitors.py`, `upload_to_drive.py`

---

## Data Flow

```
User request
     │
     ▼
agency_routing_workflow.md
     │ (intent classification via AI)
     ▼
agency_orchestrator  [loads brand/clients/<slug>/ at session start]
     │
     ├── single-domain ──────────────────────────────────────┐
     │                                                        │
     └── multi-domain (campaign) ──► strategy_agent          │
                                      [.tmp/strategy_brief]  │
                                          │                   │
                                     content_agent            │
                                      [.tmp/content_cal]     │
                                          │                   │
                                     media_agent              │
                                      [.tmp/media_plan]      │
                                          │                   │
                                     orchestrator compiles    │
                                     kickoff PDF + Drive      │
                                                              │
                              specialist agent ◄─────────────┘
                                     │
                        python tools/<script>.py --client <slug> [flags]
                                     │
                          ┌──────────┴──────────┐
                      .tmp/ files           Outputs
                      (disposable)    PDFs / Drive / Obsidian
```

### Multi-client support

Each client has a profile at `brand/clients/<client_slug>/`:
- `profile.json` — name, industry, goals, audience, competitors, `drive_folder_id` (optional)
- `brand_config.json` — colours, font, logo path

Switch active client by setting `ACTIVE_CLIENT=<slug>` in `.env` or passing `--client <slug>` at invocation. The orchestrator reads `ACTIVE_CLIENT` at session start and forwards the slug to every tool call.

---

## Directory Layout

```
AI Agent /
├── CLAUDE.md
├── brand/
│   ├── company_profile.json         (default/agency profile)
│   ├── brand_config.json
│   └── clients/
│       └── <client_slug>/
│           ├── profile.json         (includes optional drive_folder_id)
│           └── brand_config.json
├── output/                          (PDFs and deliverables)
├── .tmp/                            (disposable intermediates)
├── workflows/
│   ├── agency_routing_workflow.md        ← NEW
│   ├── campaign_kickoff_workflow.md      ← NEW
│   ├── content_production_workflow.md    ← NEW
│   ├── social_media_workflow.md          ← NEW
│   ├── email_campaign_workflow.md        ← NEW
│   ├── seo_audit_workflow.md             ← NEW
│   ├── media_plan_workflow.md            ← NEW
│   ├── performance_report_workflow.md    ← NEW
│   ├── client_onboarding_workflow.md     ← NEW
│   ├── influencer_research_workflow.md   ← NEW
│   ├── competitor_analysis_workflow.md   (existing, unchanged)
│   └── research_workflow.md              (existing, unchanged)
└── tools/
    ├── content_writer.py            ← NEW
    ├── social_poster.py             ← NEW
    ├── email_sender.py              ← NEW
    ├── seo_analyzer.py              ← NEW
    ├── analytics_puller.py          ← NEW
    ├── media_planner.py             ← NEW
    ├── ad_brief_creator.py          ← NEW
    ├── client_reporter.py           ← NEW
    ├── audience_analyzer.py         ← NEW
    ├── generate_pdf.py              ← EXTENDED (--input, --template, --output, --client)
    ├── save_company_profile.py      ← EXTENDED (--output-dir)
    └── (all other existing tools unchanged)
```

---

## Error Handling

| Scenario | Handling |
|---|---|
| Ambiguous request | Orchestrator asks one clarifying question before routing |
| Multi-agent task partial failure | Each agent writes output to `.tmp/` before passing context; orchestrator reports which steps succeeded/failed and allows resume from last checkpoint |
| API rate limit | Workflow documents known limits; wait once and retry; surface to user if second attempt fails |
| Analytics platform not connected | `analytics_puller.py` returns empty dict; agent flags "no data — manual entry required" in report |
| Client profile missing | Orchestrator blocks and prompts to run `client_onboarding_workflow.md` first |
| Paid AI call about to repeat | Check with user before re-running any LLM step (matches existing WAT convention) |
| Social posting credentials missing | `social_poster.py` exits with clear error listing the specific missing `.env` keys |
| DuckDuckGo SERP scraping fails | `seo_analyzer.py` returns keyword suggestions from LLM only, flags "SERP data unavailable — results are AI-generated estimates, not live rankings" |
| `analyze_competitors.py` called without prior scrape | Agent detects missing `.tmp/extract_*.json`, notes omission in brief, continues without competitive context |

---

## Environment Variables (additions)

| Variable | Purpose |
|---|---|
| `ACTIVE_CLIENT` | Slug of the active client profile (optional; defaults to agency profile) |
| `SOCIAL_PLATFORMS` | Comma-separated list of enabled platforms (`twitter,linkedin,instagram`) |
| `TWITTER_API_KEY` / `TWITTER_API_SECRET` / `TWITTER_ACCESS_TOKEN` | Twitter/X posting |
| `LINKEDIN_ACCESS_TOKEN` | LinkedIn posting |
| `INSTAGRAM_ACCESS_TOKEN` | Instagram posting |
| `GA4_PROPERTY_ID` / `GA4_CREDENTIALS_PATH` | Google Analytics 4 |
| `META_ADS_ACCESS_TOKEN` / `META_ADS_ACCOUNT_ID` | Meta Ads analytics |
| `DRIVE_FOLDER_ID` | Default Google Drive folder for all uploads (overridden per-client by `profile.json → drive_folder_id`) |
| `TEST_MODE` | Set to `true` to activate `--dry-run` on `email_sender.py` and `social_poster.py` automatically |

All existing variables (`OPENAI_API_KEY`, `TWILIO_*`, `SMTP_*`) are unchanged.

---

## Testing Approach

- Each tool script includes a `if __name__ == "__main__":` block runnable with a sample brief
- `client_onboarding_workflow.md` must be run once per client before any client-scoped workflow
- Workflow end-to-end tests use the agency's own profile (already in `brand/`) as the test client
- `email_sender.py` and `social_poster.py` must be tested with `--dry-run` flag (or `TEST_MODE=true` in `.env`) — never send live in automated tests
- `analytics_puller.py` tested with `--platform csv` using a fixture CSV file — no live API call needed
- `pytest` unit tests for pure-function utilities (slug generation, report formatting, metric calculations, date range parsing)
- Before running any paid LLM step in tests, confirm with user

---

## Files Changed

| File | Change |
|---|---|
| `workflows/agency_routing_workflow.md` | New |
| `workflows/campaign_kickoff_workflow.md` | New |
| `workflows/content_production_workflow.md` | New |
| `workflows/social_media_workflow.md` | New |
| `workflows/email_campaign_workflow.md` | New |
| `workflows/seo_audit_workflow.md` | New |
| `workflows/media_plan_workflow.md` | New |
| `workflows/performance_report_workflow.md` | New |
| `workflows/client_onboarding_workflow.md` | New |
| `workflows/influencer_research_workflow.md` | New |
| `tools/content_writer.py` | New |
| `tools/social_poster.py` | New |
| `tools/email_sender.py` | New |
| `tools/seo_analyzer.py` | New |
| `tools/analytics_puller.py` | New |
| `tools/media_planner.py` | New |
| `tools/ad_brief_creator.py` | New |
| `tools/client_reporter.py` | New |
| `tools/audience_analyzer.py` | New |
| `tools/generate_pdf.py` | Extended: add `--input`, `--template`, `--output`, `--client` flags |
| `tools/save_company_profile.py` | Extended: add `--output-dir` flag |
| `brand/clients/` | New directory structure for multi-client support |
