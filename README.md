# Everclaw

[![npm version](https://img.shields.io/npm/v/@tamago-labs/everclaw.svg)](https://www.npmjs.com/package/@tamago-labs/everclaw)
[![License: Apache-2.0](https://img.shields.io/badge/License-Apache_2.0-blue.svg)](https://opensource.org/licenses/Apache-2.0)

**Enables Private Local AI + Browser Automation with kane-cli**

Everclaw is a local-first application that combines **on-device AI inference via the Tether QVAC SDK** with **browser automation through kane-cli**. The web UI runs at http://localhost:3001, while all Everclaw data is stored locally under ~/.everclaw.

**No cloud AI APIs. No per-token billing. Your data stays on your machine.**

<img width="1863" height="807" alt="Screenshot 2026-08-21 232953" src="https://github.com/user-attachments/assets/3264e108-76b1-445b-9040-92f4bb7573c2" />

## Overview

Everclaw connects two capabilities that are usually separated: local AI inference and browser automation. QVAC runs the intelligence on-device, while kane-cli gives that intelligence access to a real browser. Together, they enable private AI workflows that can interact with websites, persist across sessions, and run automatically on a schedule.

Use Everclaw to chat with local models, delegate browser tasks, create persistent agents, or schedule recurring workflows with Cron. Tasks can handle everything from app testing and website checks to product monitoring and other repetitive browser work, while credentials and Variables remain stored locally on your machine.

## Quick Links

- [YouTube Demo (3 mins)](https://youtu.be/SHJBV1mG5f0)

## Highlights

- **QVAC SDK** — Run AI models locally on-device with private, offline-capable inference and no cloud AI subscription.
- **Built-in Models** — Qwen 1.7B, Qwen 4B, Gemma 4B, and Gemma 31B, with support for importing custom models from HuggingFace (https://) or local files.
- **Persistent Sessions** — Create multiple named conversations with per-session history stored locally in `sessions/<id>/messages.json`.
- **Kane CLI Integration** — Control a real browser directly from chat or scheduled jobs. Status, Variables, ask_user, generate, and testmd are integrated into Everclaw.
- **Cron Jobs** — Schedule `kane testmd` workflows to run once, every 5 minutes, hourly, daily, or using a custom Cron expression. Jobs execute through a serial queue and create `Cron: <name>` sessions.
- **Local Variables** — Store values such as `{{username}}`, `{{password}}`, and `{{api_key}}` in `variables.json`. Values are injected through `--variables-file` and masked as `****` in the UI.

## System Requirements

### Required

| Requirement | Notes |
|-------------|-------|
| **Node.js >= 22.17** | Required for QVAC SDK and kane-cli |
| **npm >= 10.9** | Package manager |
| **kane-cli** | Install separately if you use browser automation (`kane-cli whoami` should report Authenticated) |

### Recommended

| Requirement | When it is needed |
|-------------|-------------------|
| **Available RAM >= 2GB** | Needed when loading a model |
| **GPU acceleration** | Metal (macOS), Vulkan (Linux/Windows) for faster inference |
| **Free disk >= 5GB** | Model artifacts are multi-GB per model |
| **Credits > 5** | kane-cli balance checked before runs |

## Quick Start

### Install and run

```bash
npx @tamago-labs/everclaw
```

Then open `http://localhost:3001`, load a model, and start chatting.

### Other Platforms (from source)

```bash
git clone https://github.com/tamago-labs/everclaw
cd everclaw
npm install

# Dev (CLI on :3001 + Vite frontend on :3000)
npm run dev

# Production build (frontend/out served by CLI)
npm run build
npm start
```

### Using Chat + Kane

Chat lives on the `Chat` page. Type normally to talk to the local model. To drive a browser, ensure Kane CLI is installed and has available credits (check Overview), then start the message with `/kane` — a URL modal appears. Fill the URL separately, then send.

Typical 2-step workflow — collect with Kane, ask the local AI, then post or call an API:

**Step 1 — Collect data from a website with Kane:**

```
/kane search for 'headphones' on https://www.ebay.com, store the first result title as 'first_title'
# URL: https://www.ebay.com

/kane navigate to https://www.thailandstarterkit.com/moving/living-in-phra-khanong/, assert the page loads, store the first paragraph text as 'first_paragraph'
# URL: https://www.thailandstarterkit.com/moving/living-in-phra-khanong/
```

Kane returns a result card with the stored variables (`first_title`, `first_paragraph`) and a `View details` link.

**Step 2 — Ask the local AI (normal chat, no Kane):**

```
Summarize {{first_paragraph}} into a one-line post. Keep it short.
```

The local model replies in the same session. No browser involved.

**Step 3 — Post or call an API with the AI result:**

```
/kane click New Post, type '{{summary}}', click the Post button, save the post url as 'post_url'
# URL: https://bsky.app — requires {{username}} / {{password}} via Variables

/kane Call GET https://api.openweathermap.org/data/2.5/weather?q=Bangkok&appid={{api_key}}, save the response as weather, assert {{weather.status}} is 200
# URL: https://api.openweathermap.org — requires {{api_key}} via Variables
```

Keep each Kane task self-contained — include the URL and any `{{variables}}` up front. Kane runs headlessly and cannot ask for input while running.

### Variables

Manage credentials on the `Variables` page. Each entry has `name`, `value`, and `secret` flag.

- Reference in prompts as `{{username}}`, `{{password}}`, `{{api_key}}`.
- Secrets are masked as `****` in the Kane modal and logs.
- Stored at `~/.everclaw/variables.json` and injected via a temp `--variables-file`.

Example prompts:

```
/kane sign in with username {{username}} and password {{password}}, save the login result as 'login_result'
/kane Call GET https://api.openweathermap.org/data/2.5/weather?q=Bangkok&appid={{api_key}}, save the response as weather, assert {{weather.status}} is 200
```

### AI Model Selection

On first open, the app shows available models. Choose the one that matches your hardware. Models download on first selection and are cached locally.

| Model | Disk / RAM | Use Case |
|-------|------------|----------|
| **Qwen 1.7B** | ~1GB disk, 4-8GB RAM | Standard desktops, lightweight and fast |
| **Qwen 4B** | ~2.5GB disk, 8GB+ RAM | Balanced performance |
| **Gemma 4B** | ~5GB disk, 8-16GB RAM | Google Gemma, stronger reasoning |
| **Gemma 31B** | ~19GB disk, 32GB+ RAM | Maximum quality, high-end PCs |
| **Custom** | Varies | HuggingFace `https://huggingface.co/.../model.gguf` or local file path — add via `POST /api/ai/models` or the model picker |

Models are loaded via `POST /api/ai/load`. A model must be loaded to use Chat. Switching models unloads the previous one.

> **Note:** The application shell needs ~4GB for QVAC. Models add 1-4GB depending on selection. Progress is streamed via SSE at `POST /api/ai/load`.

### Verify kane-cli

```bash
kane-cli --version
kane-cli whoami        # should report Authenticated
kane-cli balance       # Available / Total credits
```

Everclaw surfaces this in Overview (Kane CLI card). If not installed or not authenticated, `/kane` returns 503/401 with a clear error.

## Kane CLI Integration

Everclaw does not bundle kane-cli. It detects the local install, polls status, and wraps `generate` and `testmd run` for chat and Cron Jobs. All runs are headless.

For `ask_user`, behavior differs by context. In chat, Kane shows a prompt in the UI with a 20s countdown — auto-filled from Variables when available, otherwise the user can answer or cancel. In Cron Jobs there is no user present, so `ask_user` is auto-answered from Variables when possible and otherwise cancelled after 30s to avoid freezing.

| Feature | What it does | Where in code |
|---------|--------------|---------------|
| **Status polling** | Checks `kane-cli --version`, `whoami`, `balance` every 30s, caches result, serves at `GET /api/kane/status` | [`src/kaneCli.ts:3-58`](https://github.com/tamago-labs/everclaw/blob/main/src/kaneCli.ts#L3-L58), [`src/index.ts:1112`](https://github.com/tamago-labs/everclaw/blob/main/src/index.ts#L1112) |
| **Overview card** | Shows Installed, Authenticated, Balance with green/red checks | [`frontend/src/pages/OverviewPage.tsx:92-110`](https://github.com/tamago-labs/everclaw/blob/main/frontend/src/pages/OverviewPage.tsx#L92-L110), [`frontend/src/api.ts:389`](https://github.com/tamago-labs/everclaw/blob/main/frontend/src/api.ts#L389) |
| **/kane in chat** | `/kane <task>` slash triggers URL modal, runs `kane-cli run --agent --headless --url <site> --variables-file <tmp>` | [`frontend/src/components/chat/ChatContainer.tsx`](https://github.com/tamago-labs/everclaw/blob/main/frontend/src/components/chat/ChatContainer.tsx), [`src/index.ts:891-1030`](https://github.com/tamago-labs/everclaw/blob/main/src/index.ts#L891-L1030), [`src/variableStore.ts`](https://github.com/tamago-labs/everclaw/blob/main/src/variableStore.ts) |
| **Variables** | `{{name}}` resolved to values, written to temp `kane-vars-*.json`, passed via `--variables-file` | [`src/variableStore.ts`](https://github.com/tamago-labs/everclaw/blob/main/src/variableStore.ts), [`src/index.ts:910-920`](https://github.com/tamago-labs/everclaw/blob/main/src/index.ts#L910-L920), [`src/index.ts:750-760`](https://github.com/tamago-labs/everclaw/blob/main/src/index.ts#L750-L760) |
| **ask_user bridge** | Intercepts `ask_user` prompts, auto-fills `username`+`password` from Variables, otherwise cancels after 30s | [`src/index.ts:940-990`](https://github.com/tamago-labs/everclaw/blob/main/src/index.ts#L940-L990) (chat), [`src/index.ts:760-820`](https://github.com/tamago-labs/everclaw/blob/main/src/index.ts#L760-L820) (cron) |
| **Ask_user modal** | For chat runs, shows WS `kane_ask` modal with 20s countdown and Send/Cancel to `POST /api/kane/respond` | [`frontend/src/components/chat/ChatContainer.tsx`](https://github.com/tamago-labs/everclaw/blob/main/frontend/src/components/chat/ChatContainer.tsx), [`src/index.ts:1057`](https://github.com/tamago-labs/everclaw/blob/main/src/index.ts#L1057) |
| **Markdown generation** | `AI Generate` runs `kane-cli generate "<prompt>" --agent` then `generate --save --req <id> --agent`, picks suite by `suite_dir` then folder name containing request id, then newest mtime | [`src/index.ts:621-810`](https://github.com/tamago-labs/everclaw/blob/main/src/index.ts#L621-L810), [`frontend/src/pages/CronPage.tsx:256-278`](https://github.com/tamago-labs/everclaw/blob/main/frontend/src/pages/CronPage.tsx#L256-L278) |
| **Progress streaming** | `generate_progress` pct and thinking streamed via WS `cron_generate_*` to drawer bar | [`src/index.ts:698`](https://github.com/tamago-labs/everclaw/blob/main/src/index.ts#L698), [`src/index.ts:640-660`](https://github.com/tamago-labs/everclaw/blob/main/src/index.ts#L640-L660), [`frontend/src/pages/CronPage.tsx:237-252`](https://github.com/tamago-labs/everclaw/blob/main/frontend/src/pages/CronPage.tsx#L237-L252) |
| **testmd run** | `kane testmd run <tmpMd> --agent --url <runUrl> --timeout 600 --headless --variables-file <tmp>`; tmp filename must end `_test.md` | [`src/index.ts:730-770`](https://github.com/tamago-labs/everclaw/blob/main/src/index.ts#L730-L770), [`scripts/1-everclaw-chat_test.md`](https://github.com/tamago-labs/everclaw/blob/main/scripts/1-everclaw-chat_test.md) |
| **runUrl resolution** | Frontmatter `url:` in markdown takes precedence, then job `url`, then `http://localhost:3001` | [`src/index.ts:740-750`](https://github.com/tamago-labs/everclaw/blob/main/src/index.ts#L740-L750) |
| **Suite picking** | Filters to candidates from this generate only; prefers primary scenario tokens (`sid`, `scode`, `title`) | [`src/index.ts:751-790`](https://github.com/tamago-labs/everclaw/blob/main/src/index.ts#L751-L790) |
| **Cron queue** | Serial execution: one `running`, rest `queue`; enqueue on `POST /api/cron/:id/run` | [`src/index.ts:588-603`](https://github.com/tamago-labs/everclaw/blob/main/src/index.ts#L588-L603), [`src/cronStore.ts`](https://github.com/tamago-labs/everclaw/blob/main/src/cronStore.ts) |
| **Cron sessions** | Each run creates `Cron: <name>` session with kane `summary`/`one_liner` plus `kaneMeta` (`share_url`/`test_url`) | [`src/index.ts:560-586`](https://github.com/tamago-labs/everclaw/blob/main/src/index.ts#L560-L586) |
| **Result card** | Chat and cron sessions render Kane result card with `test_url` or `file://` run-folder fallback | [`frontend/src/components/chat/ChatContainer.tsx:392-410`](https://github.com/tamago-labs/everclaw/blob/main/frontend/src/components/chat/ChatContainer.tsx#L392-L410) |
| **Summarization** | kane's own `summary`/`one_liner` plus optional local AI refine via `POST /api/ai/summarize` | [`src/index.ts:570-585`](https://github.com/tamago-labs/everclaw/blob/main/src/index.ts#L570-L585) |
| **Self-contained guard** | Drawer warns jobs run on their own and can't ask for input — if they do, they'll freeze | [`frontend/src/pages/CronPage.tsx:389`](https://github.com/tamago-labs/everclaw/blob/main/frontend/src/pages/CronPage.tsx#L389) |

All kane runs set `KANE_CLI_USER_AGENT=everclaw`.

## Sessions

Each session is a named conversation with its own message history. Sessions persist under `~/.everclaw/sessions/<id>/messages.json`.

- Create and switch sessions from the sidebar.
- Click a `Cron: <name>` session to view its Kane result card and `View details` link.
- Clearing a session removes its messages but keeps the session entry.

## Cron Jobs

Schedule browser tests to run automatically. Open `Cron Jobs` and use `New Job`.

| Schedule | Behavior |
|----------|----------|
| **Once** | No auto-run. Use `Run now` to execute on demand. |
| **Every 5m** | Runs every 5 minutes |
| **Every 1h** | Runs every hour |
| **Daily** | Runs once per day |
| **Custom cron** | Cron expression, e.g. `*/5 * * * *` |

Details:

- **New/Edit drawer** — Fields: Name, URL (`http://localhost:3001` default), Prompt / Objective, Schedule pills, Markdown (`_test.md`).
- **AI Generate** — Converts Prompt to structured testmd via `kane-cli generate`. Shows `Generating… 14% → 97%` then `Saving suite… 100%`. Preview then edit.
- **Execution** — Serial queue: one running at a time, others queued. `Run now` enqueues immediately. `{{uuid}}` in markdown is replaced with `crypto.randomUUID()` so testmd does not fail on unknown vars.
- **Result** — `Last` column shows `done` plus `passed`/`failed` badge, duration, and truncated `detail`; `Cron: <name>` session holds the full Kane summary and link.

> **Note:** Jobs run on their own and can't ask for input — if they do, they'll freeze and cancel after 30s. Include URL and logins up front via the URL field and Variables.

## Project Structure

```
src/                 # CLI: Express server, QVAC model loading, stores, kane
  kaneCli.ts         # kane-cli status + version checks (polling, cache)
  cronStore.ts       # cron jobs (schedule + markdown + queue + lastRun)
  variableStore.ts   # Variables ({{name}} -> value, secret flag)
  sessionStore.ts    # sessions/<id>/messages.json
  index.ts           # API + WebSocket + kane/testmd/generate + static UI serving
frontend/            # React + Vite UI (built to frontend/out, served by CLI in prod)
  pages/
    CronPage.tsx     # Cron Jobs table + New/Edit drawer (generate preview + schedule pills)
    OverviewPage.tsx # Status cards (Kane CLI / Local AI) + Prompt Cookbook
  components/
    chat/ChatContainer.tsx  # /kane slash, URL modal, ask_user modal, kane result card
```

### API

```
GET    /api/cron                         # { jobs, running, queue }
POST   /api/cron                         # create (name, objective, url, markdown, schedule)
GET    /api/cron/:id
PUT    /api/cron/:id
DELETE /api/cron/:id
POST   /api/cron/:id/run                 # enqueue (serial, 1 running)
POST   /api/cron/generate                # AI Generate preview (no id) — streams cron_generate_* via WS
POST   /api/cron/:id/generate            # AI Generate for existing job
GET    /api/cron/:id
POST   /api/kane/run                     # one-shot kane run (variables + ask_user)
POST   /api/kane/respond                 # answer/cancel for ask_user
GET    /api/variables                    # CRUD Variables
GET    /api/sessions                     # CRUD Sessions
GET    /api/ai/status                    # local model status (loaded, modelName, loadedAt)
GET    /api/kane/status                  # kane-cli status (available, version, authenticated, balance)
```

## Stack

- **Backend** — Node + Express + QVAC SDK (local models)
- **Frontend** — React + Vite + Tailwind
- **Browser agent** — kane-cli (status surfaced in UI, runs externally)

## License

This project is licensed under the Apache License 2.0. See the [LICENSE](LICENSE) file for details.

---

Published as [`@tamago-labs/everclaw`](https://www.npmjs.com/package/@tamago-labs/everclaw)
