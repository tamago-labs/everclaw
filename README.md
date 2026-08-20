# 🦅 Everclaw

**Local AI with browser automation — your private agent that acts on the web.**

Everclaw pairs **kane-cli** (an autonomous browser agent) with a **local AI model** (QVAC SDK) to run real-world web tasks on a schedule — entirely on your machine. No cloud, no API keys, no per-token billing.

---

## Why Everclaw

- 🔒 **100% local** — browser automation *and* AI inference never leave your machine
- 🤖 **Two-stage pipeline** — kane-cli *does* the task, local AI *makes sense* of the result
- ⏰ **Cron-native** — agents run on a schedule or on demand
- 🧩 **Template-driven** — ship a new "agent in the wild" in one click
- 📜 **Auditable** — every run is saved as a readable session

---

## Quick start

```bash
npx @tamago-labs/everclaw
```

This launches the CLI + web UI. Then:

1. Open **http://localhost:3000**
2. Load a local model (Qwen 1.7B is ~1 GB and ships cached)
3. Click **New Job** → pick a template → **Save**
4. Hit **Run now**, or let the scheduler fire it on cron

To run from source:

```bash
npm install
npm run dev          # starts CLI (:3001) + frontend (:3000)
```

---

## The six "agents in the wild"

| Template | What it actually does |
|----------|------------------------|
| 📰 **News digest** | Pulls the top 3 headlines from a source (e.g. Hacker News) |
| 💰 **Price tracker** | Watches a product price and reports changes |
| 💼 **Job scanner** | Lists the top matches from a job board |
| 🛒 **Add to cart** | Searches eBay and adds an item to cart |
| 🔍 **Competitor watch** | Monitors a rival's pricing / features page |
| 🗑️ **Subscription killer** | Navigates cancellation flows so you don't have to |

Each template is a complete, runnable browser-agent job — pick one and it's live in seconds.

---

## How it works

```
┌─────────────┐     ┌──────────────┐     ┌─────────────┐
│  Schedule / │────▶│   kane-cli   │────▶│  Local AI   │
│   Run now   │     │  (browser)   │     │ (QVAC SDK)  │
└─────────────┘     └──────────────┘     └─────────────┘
                              │                    │
                              ▼                    ▼
                       run_end summary      analyzed result
                                                  │
                                                  ▼
                                            saved to a Session
```

- **Pipeline mode** — a fixed kane-cli objective runs, then local AI analyzes the result
- **Plan mode** — local AI *writes* the objective from your high-level goal, kane-cli runs it, then AI analyzes

---

## Stack

- **Backend** — Node + Express + QVAC SDK (local models)
- **Frontend** — React + Vite + Tailwind
- **Browser agent** — kane-cli

---

📦 Published as `@tamago-labs/everclaw`
