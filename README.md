# Everclaw

**Enables Private Local AI Agents for Solana & Ethereum with OpenClaw-Style Persistence**

## Demo Videos

- [3-min Product Demo](https://youtu.be/bb-4OV3lBL8)
- [2-min Presentation](https://youtu.be/1O0-WISvY6s)

## Overview

Everclaw is an Electron-based desktop application that transforms your computer into a local AI wallet operating system for Solana and Ethereum.

It enables natural language control of local AI agents that can manage portfolios, execute on-chain transactions, and automate Web3 workflows — all with full transparency and user control.

Powered by Tether’s QVAC (local AI inference) and WDK (self-custodial wallet operations), Everclaw runs entirely on-device. There are no AI subscriptions, and your keys, data, and AI reasoning never leave your machine.

## Highlights

- **QVAC SDK** — Local AI inference on desktop. No subscriptions, fully private, offline-capable.
- **Supported Models** — Qwen3-1.7B for standard desktop, Qwen3-4B for high-performance PC.
- **WDK Wallet** — Single wallet for Solana + 20+ chains. Self-custodial, battle-tested.
- **Curated Tools** — 20+ custom Solana tools (Jupiter, Sanctum, Solayer, Lulo) + WDK official tools.
- **Workspaces** — OpenClaw-style multi-agent with custom context, rules, identity, and persistent sessions.

## System Requirements

### Required

| Requirement | Notes |
|-------------|-------|
| **Node.js >= 22.17** | Prefer Node 22+ for QVAC SDK compatibility |
| **npm >= 10.9** | Package manager |
| **Total RAM >= 2GB** (recommended 4GB+) | Below 4GB, most LLMs will fail to load |

### Recommended

| Requirement | When it is needed |
|-------------|-------------------|
| **Available RAM >= 2GB** | Needed when loading a model |
| **GPU acceleration** | Metal (macOS), Vulkan (Linux/Windows) |
| **Free disk >= 5GB** | Model artifacts are typically multi-GB per model |

## Quick Start

### Windows
Download the installer from the [Releases](https://github.com/tamago-labs/everclaw/releases) page and run the `.exe` file.

### Other Platforms
Clone the repository and build from source:

```bash
git clone https://github.com/tamago-labs/everclaw
cd everclaw
npm install

# Run preview
npm start

# Build for your platform
npm run build:unpack
```

### AI Model Selection
On every startup, the app displays a model selection screen. Choose the AI model that matches your hardware:

| Model | Requirements | Use Case |
|-------|--------------|----------|
| **Qwen3-1.7B** | ~2GB disk, 8GB+ RAM | Standard desktops, tool-calling for Web3 |
| **Qwen3-4B** | ~4GB disk, 16GB+ RAM | High-performance PCs, complex tasks |

Models are downloaded on first selection and cached locally for subsequent runs.

> **Note:** The application package requires ~4GB for QVAC. AI models add an additional 2-4GB depending on selection.

### Wallet Setup
After selecting the AI model, you can chat with the agent immediately. For on-chain actions or running autonomous tasks, you'll need a wallet:

1. Click **Setup Wallet** on the welcome card
2. Choose to **Create New Wallet** or **Import Existing Wallet** (via seed phrase)
3. Your wallet is secured by WDK SDK — seed phrase is encrypted and stored locally
4. Access all supported chains: Solana, Ethereum and other EVMs, Bitcoin

> **Note:** No data leaves your device. Wallet keys are always under your control.

### Token Registry
To help the agent recognize tokens, register tokens in the settings page. Default tokens included: SOL, USDT, USDC. All registered tokens become part of the agent's base knowledge for Web3 operations.

## Curated Tools

Everclaw combines official WDK tools with custom-built Solana DeFi tools for comprehensive Web3 coverage.

### WDK Official Tools
Secure wallet operations powered by WDK SDK:
- **Wallet**: Get address, get balance, approve, transfer, send native tokens
- **Price Feeds**: Real-time token pricing

### Custom Solana Tools
Since WDK doesn't support Solana DeFi, Everclaw provides custom tools:
- **Jupiter** — Token swaps on Solana
- **Sanctum** — Liquid staking (quote/execute swaps, LST info, owned positions)
- **Solayer** — SOL staking
- **Lulo** — Supply and withdraw liquidity

### EVM Support
- **Velora** — Token swaps on Ethereum and other EVMs

## Persistent Workspaces

Inspired by OpenClaw, Everclaw uses a minimal workspace system designed for low-end models. Each agent has its own workspace with 3 markdown files:

- **context.md** — Agent's knowledge base and reference data
- **core.md** — Behavioral rules and guidelines
- **identity.md** — Agent's identity and personality

These files are compiled into the system prompt, keeping the AI focused and organized. Multiple agents can be created for different purposes.

### Multi-Session Support
Each agent supports multiple chat sessions, allowing you to:
- Maintain separate conversation threads for different tasks
- Keep history organized across sessions
- Resume previous conversations anytime

## Automated Tasks

Schedule autonomous AI tasks to run on a cron schedule:

- Create recurring prompts (e.g., "Check my portfolio every 6 hours")
- Set custom schedules using cron expressions
- Each task runs in its own session with the agent's full context
- Enable/disable tasks anytime
- Run tasks immediately on demand

Example: Schedule a daily check of Sanctum LST positions or weekly portfolio rebalancing.

## Available Tools

### Wallet Operations

| Tool | Description |
|------|-------------|
| `getAddress` | Get wallet addresses |
| `getBalance` | Get token balances |
| `approve` | Approve token spending |
| `transfer` | Transfer tokens |
| `sendNative` | Send native blockchain tokens |

### Price Feeds

| Tool | Description |
|------|-------------|
| `getPrice` | Get real-time token prices |

### Decentralized Exchanges (DEX)

| Chain | DEX | Tools |
|-------|-----|-------|
| EVM | Velora | Quote swap, Execute swap |
| Solana | Jupiter | Quote swap, Execute swap |

### Liquid Staking (LST)

| Protocol | Tools |
|----------|-------|
| **Sanctum** | Quote/Execute swaps, Get LST info, Get owned LSTs |

### Staking

| Protocol | Tools |
|----------|-------|
| **Solayer** | Stake SOL |

### Lending

| Protocol | Tools |
|----------|-------|
| **Lulo** | Supply/Withdraw liquidity |

## Supported Blockchains

- **Solana** — SPL tokens, Jupiter DEX, Sanctum LST, Solayer staking, Lulo lending
- **Ethereum** — ERC-20 tokens, Velora DEX aggregator


## License

This project is licensed under the Business Source License (BSL). See the [LICENSE](LICENSE) file for details.
