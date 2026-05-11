# Everclaw

**Your Sovereign AI Wallet Operating System for Solana & Ethereum**

[![License](https://img.shields.io/badge/License-BSL-blue.svg)](LICENSE)

Local intelligence. Real on-chain actions. Complete privacy.

## Overview

Everclaw is a local-first AI Wallet OS powered by Tether's QVAC that lets users manage their entire Solana and Ethereum financial life through natural language and voice — autonomously executing trades, rebalancing portfolios, handling recurring payments, and splitting bills — all while keeping data, keys, and intelligence fully on-device.

## Problem

Crypto users face constant challenges:

- Monitoring and managing portfolios 24/7 across fragmented dApps
- Forgetting recurring payments, yield opportunities, or bill splits
- Switching between dozens of tools and wallets
- Growing privacy and security concerns when using cloud AI agents with their money and data

Most AI agents today rely on centralized clouds, creating single points of failure and surveillance risks. Everclaw solves this by bringing sovereign, on-device intelligence directly to Solana and Ethereum.

## Solution

Everclaw turns your desktop into a complete AI Wallet Operating System. Users open the app, speak or type a natural language prompt (e.g., "Manage my portfolio with moderate risk and auto-compound yields" or "Send 30 USDC to my girlfriend every Friday"), and the local AI agent handles the rest — from planning to secure on-chain execution — with full transparency and control.

QVAC powers the entire intelligence layer, enabling true sovereignty: offline capability, private memory, and no data leaving the user's device.

## How It Works

1. **Install & Setup** — Download the app, create or import your wallet
2. **Natural Language** — Type or speak your financial intent
3. **AI Planning** — Everclaw analyzes and plans the optimal action
4. **On-Chain Execution** — Executes transactions securely with your approval
5. **Privacy First** — All intelligence stays on your device

## Features

- 🤖 **Local AI Agent** — Powered by QVAC for on-device intelligence
- 🌐 **Multi-Chain Support** — Solana and Ethereum ecosystems
- 💬 **Natural Language** — Control your finances with plain text or voice
- 🔐 **Self-Custodial** — Your keys, your coins, always
- 📊 **Portfolio Management** — Track and rebalance across chains
- 🔄 **DEX Swaps** — Trade via Jupiter (Solana) and Velora (Ethereum)
- 🥩 **Liquid Staking** — Sanctum LST support
- 🏦 **Lending** — Lulo supply and withdraw
- 💰 **Price Feeds** — Real-time token prices
- ⚙️ **Modular Tools** — Enable/disable tools based on your needs

## Available Tools

### 🔐 Wallet Operations

| Tool | Description |
|------|-------------|
| `getAddress` | Get wallet addresses |
| `getBalance` | Get token balances |
| `approve` | Approve token spending |
| `transfer` | Transfer tokens |
| `sendNative` | Send native blockchain tokens |

### 💰 Price Feeds

| Tool | Description |
|------|-------------|
| `getPrice` | Get real-time token prices |

### 🔄 Decentralized Exchanges (DEX)

| Chain | DEX | Tools |
|-------|-----|-------|
| EVM | Velora | Quote swap, Execute swap |
| Solana | Jupiter | Quote swap, Execute swap |

### 📊 Liquid Staking (LST)

| Protocol | Tools |
|----------|-------|
| **Sanctum** | Quote/Execute swaps, Get LST info, Get owned LSTs |

### 🥩 Staking

| Protocol | Tools |
|----------|-------|
| **Solayer** | Stake SOL |

### 🏦 Lending

| Protocol | Tools |
|----------|-------|
| **Lulo** | Supply/Withdraw liquidity |

## Supported Blockchains

- **Solana** — SPL tokens, Jupiter DEX, Sanctum LST, Solayer staking, Lulo lending
- **Ethereum** — ERC-20 tokens, Velora DEX

## Getting Started

### Prerequisites

- Node.js 22+ (recommended Node 24)
- npm, pnpm, or bun

### Install

```bash
npm install
```

### Development

```bash
npm run dev
```

### Build

```bash
# For Windows
npm run build:win

# For macOS
npm run build:mac

# For Linux
npm run build:linux
```

## Development

### Recommended IDE Setup

- [VSCode](https://code.visualstudio.com/) + [ESLint](https://marketplace.visualstudio.com/items?itemName=dbaeumer.vscode-eslint) + [Prettier](https://marketplace.visualstudio.com/items?itemName=esbenp.prettier-vscode)

### Type Checking

```bash
# Check all
npm run typecheck

# Check Node only
npm run typecheck:node

# Check Web only
npm run typecheck:web
```

## Tech Stack

- **Framework**: Electron + Electron Vite
- **Frontend**: React 19 + TypeScript + TailwindCSS
- **AI**: Tether QVAC SDK
- **Blockchain**: Solana Web3.js, Ethers.js compatible
- **Build**: electron-builder

## License

This project is licensed under the Business Source License (BSL). See the [LICENSE](LICENSE) file for details.
