# 🦅 Everclaw

**Your private local AI — chat with a model that runs entirely on your machine. Everclaw also shows your kane-cli browser-agent status at a glance.**

Everclaw pairs a **local AI model** (QVAC SDK) with **kane-cli** awareness, all on your own hardware. No cloud, no API keys, no per-token billing.

---

## Why Everclaw

- 🔒 **100% local** — AI inference never leaves your machine
- 💬 **Chat with your model** — talk to a local LLM through a clean web UI
- 🗂️ **Sessions** — keep separate, organized conversations, saved locally
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

- **Chat** — send messages to your loaded local model; streamed token-by-token
- **Sessions** — create named conversations; each keeps its own message history
- **Overview** — a dashboard showing AI + Kane CLI status

---

## Configuration

**Models.** Load local models via the UI (or `POST /api/ai/load`). Qwen 1.7B ships cached; larger models download on first use. A model must be loaded to use Chat.

**kane-cli.** Everclaw is aware of kane-cli and surfaces its status (installed / authenticated) in the Overview. Install and authenticate it separately if you use it:

```bash
kane-cli whoami     # should report "Authenticated"
```

**Data.** Everything lives under `~/.everclaw` (sessions, downloaded models). Nothing is sent off-machine.

**Env.** `KANE_CLI_USER_AGENT` is set automatically; you normally don't need to touch it.

---

## Project structure

```
src/                 # CLI: Express server, QVAC model loading,
                     # session store, kane-cli status
  kaneCli.ts         # kane-cli status + version checks
  index.ts           # API + chat WebSocket + static UI serving
frontend/            # React + Vite UI (built to frontend/out,
                     # served in production by the CLI)
```

---

## Stack

- **Backend** — Node + Express + QVAC SDK (local models)
- **Frontend** — React + Vite + Tailwind
- **Browser agent** — kane-cli (status surfaced in UI)

---

📦 Published as `@tamago-labs/everclaw`
