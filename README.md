# 🦅 Everclaw

**Your private local AI — chat with a model that runs entirely on your machine. Everclaw also shows your kane-cli browser-agent status at a glance.**

Everclaw pairs a **local AI model** (QVAC SDK) with **kane-cli** awareness, all on your own hardware. No cloud, no API keys, no per-token billing.

---

## Why Everclaw

- 🔒 **100% local** — AI inference never leaves your machine
- 💬 **Chat with your model** — talk to a local LLM through a clean web UI
- 🗂️ **Sessions** — keep separate, organized conversations, saved locally
- 🤖 **/kane in chat** — drive a real browser from chat (`/kane <task> --url <site>`)
- 🕐 **Cron Jobs** — schedule `kane testmd` runs (Once / 5m / 1h / Daily / Cron) with a serial queue and `Cron:` sessions
- 🔑 **Variables** — `{{username}}` / `{{password}}` / `{{api_key}}` stored locally, injected via `--variables-file`
- 🕸️ **Kane CLI status** — see your browser-automation agent's install/auth state in the Overview
- 🧩 **Model flexibility** — load Qwen, Gemma, and more from the registry or your own files

---

## Quick start

```bash
npx @tamago-labs/everclaw
```

This launches the CLI + web UI. Then:

1. Open **http://localhost:3001**
2. Load a local model (Qwen 1.7B is ~1 GB and ships cached)
3. Start chatting, or open **Sessions** to organize conversations

To run from source:

```bash
npm install
npm run dev          # starts CLI (:3001) + frontend (Vite :3000) in dev
```

---

## How it works

```
┌─────────────┐     ┌──────────────┐
│   Web UI    │────▶│  Local AI    │
│ (chat /     │     │ (QVAC SDK)   │
│  sessions)  │     │  on-device   │
└─────────────┘     └──────────────┘
                            │
                            ▼
                  responses + sessions
                  saved under ~/.everclaw
```

- **Chat** — send messages to your loaded local model; streamed token-by-token. Use `/kane <task>` (with the Kane URL modal) to run a browser agent; Everclaw shows a Kane result card + a `Cron: <name>`-style session when relevant.
- **/kane in chat** — `kane-cli run --agent --headless --url <site>` under the hood; supports `{{variables}}` (injected via a temp `--variables-file`), `ask_user` auto-answer, and the standard kane result card with `test_url` (or `file://` run-folder fallback for `testmd`).
- **Variables** — `~/.everclaw/variables.json`; create `{{username}}` etc. on the Variables page. Secrets stay local; the chat Kane modal displays them as `****`.
- **Cron Jobs** — auto-generate a `_test.md` from a prompt via `kane-cli generate --agent` → `generate --save --req <id> --agent`, edit/preview it, then run `kane testmd run <md> --agent --headless --url <site> --timeout 600`. Each run creates a `Cron: <name>` session with kane's `summary`/`one_liner` + `kaneMeta` (including `test_url` / `share_url`).
- **Sessions** — create named conversations; each keeps its own message history. Click a `Cron: <name>` session to view its kane result card + dashboard link.
- **Overview** — a dashboard showing AI + Kane CLI status + the Prompt Cookbook (copy a `/kane` line, paste URL separately).

---

## Configuration

**Models.** Load local models via the UI (or `POST /api/ai/load`). Qwen 1.7B ships cached; larger models download on first use. A model must be loaded to use Chat.

**kane-cli.** Everclaw is aware of kane-cli and surfaces its status (installed / authenticated) in the Overview. Install and authenticate it separately if you use it:

```bash
kane-cli whoami     # should report "Authenticated"
```

**Variables.** `Variables` page → `{{username}}`, `{{password}}`, `{{api_key}}` etc. Injected via `--variables-file <tmp>`; secrets masked as `****` in the Kane modal. Use them in `/kane` objectives: `sign in with {{username}} and {{password}}`.

**Cron Jobs.** `Cron Jobs` page → `New Job` drawer (Name, URL, Prompt / Objective, Schedule, Markdown). Schedules: `Once` (no auto-run), `Every 5m`, `Every 1h`, `Daily`, `Custom cron` (expr). `AI Generate` streams `generate_progress` → `cron-preview-*.md` (also writes `cron-<id>_test.md`). Runs execute serially (1 running, rest queued) as `kane testmd run <md> --agent --headless --url <derived-from-markdown-frontmatter> --timeout 600 --variables-file <tmp>`. Markdown `_test.md` filename is required. The job's `url` defaults to `http://localhost:3001` if empty; the markdown's frontmatter `url:` takes precedence. `{{uuid}}` placeholders in generated markdown are resolved to `crypto.randomUUID()` so `testmd` doesn't fail on unknown vars.

**Data.** Everything lives under `~/.everclaw` (sessions in `sessions/<id>/messages.json`, cron jobs in `cronJobs.json`, variables in `variables.json`, downloaded models). Nothing is sent off-machine.

**Env.** `KANE_CLI_USER_AGENT` is set automatically; you normally don't need to touch it.

---

## Project structure

```
src/                 # CLI: Express server, QVAC model loading,
                     # session/cron/variable stores, kane-cli status
  kaneCli.ts         # kane-cli status + version checks
  cronStore.ts       # cron jobs (schedule + markdown + queue + lastRun detail)
  variableStore.ts   # Variables ({{name}} → value, secret flag)
  index.ts           # API + chat WebSocket + kane/testmd/generate + static UI serving
frontend/            # React + Vite UI (built to frontend/out,
                     # served in production by the CLI)
  pages/
    CronPage.tsx     # Cron Jobs table + New/Edit drawer (generate preview + schedule pills)
    OverviewPage.tsx # Prompt Cookbook (8 /kane examples, copy + URL pill)
  components/
    chat/ChatContainer.tsx  # /kane slash, URL modal, kane result card (test_url / file:// fallback)
```

### API (cron & kane)

```
GET    /api/cron                         # { jobs, running, queue }
POST   /api/cron                         # create (name, objective, url, markdown, schedule)
GET    /api/cron/:id
PUT    /api/cron/:id
DELETE /api/cron/:id
POST   /api/cron/:id/run                 # enqueue (serial, 1 running)
POST   /api/cron/generate                # AI Generate preview (no id) — streams cron_generate_* via WS
POST   /api/cron/:id/generate            # AI Generate for existing job
POST   /api/kane/run                     # one-shot kane run (variables + ask_user)
POST   /api/kane/respond                 # answer/cancel for ask_user
GET    /api/variables                    # CRUD Variables
GET    /api/kane/status
```

### Prompt Cookbook (Overview → Chat)

`Search + store` (ebay), `Check BTC price` (investing.com/crypto), `Bsky — sign in`, `Bsky — post gm` (`click the Post button`), `Health check` (localhost), `Amazon — product`, `Thailand — living guide` (thailandstarterkit.com), `OpenWeather — api_key` (GET + `{{weather.status}}`). All start with `/kane`; URL is a separate pill (no `go to` in code).

---

## Stack

- **Backend** — Node + Express + QVAC SDK (local models)
- **Frontend** — React + Vite + Tailwind
- **Browser agent** — kane-cli (status surfaced in UI)

---

📦 Published as `@tamago-labs/everclaw`
