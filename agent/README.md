# Imperium Markets — Agent (v0.6)

LLM-powered multi-asset agent for tokenised fixed-income lifecycle management on Hedera. Supports **Annuities**, **Term Deposits**, and **NCDs** via natural language or regex command parsing.

## Prerequisites

1. **Hardhat node** running on port 8545 (local mode) OR Hedera Testnet credentials
2. **Contracts compiled and deployed**
3. **ImperiumAPI** running on port 4000
4. **ANTHROPIC_API_KEY** in `.env` (for LLM mode)

## Quick Start

```bash
# Option A — One-shot launcher
./start.sh

# Option B — Manual
# Terminal 1
npx hardhat node
# Terminal 2
npx hardhat compile
npx hardhat run scripts/deploy.js --network localhost
node api/imperium-api.js
# Terminal 3
node agent/cli-agent.js
```

### LLM Mode (recommended)

```bash
# Local Hardhat — multi-asset lifecycle via natural language
node agent/cli-agent.js

# Hedera Testnet — full stack + HCS-10 agent networking
node agent/cli-agent.js --network hedera-testnet
```

### Regex Mode (no API key needed)

```bash
node agent/cli-agent.js --no-llm
```

## Architecture

```
Browser (React/Vite)  ←── WebSocket ──→  Express (port 4000)
                                              │
User input (CLI)  ──→  cli-agent.js  ──→  LangChain Agent (Claude Haiku 4.5)
                                              │
                    ┌─────────┬───────────┬───┴───┬────────────┬──────────┐
              Annuity    TD Plugin   NCD Plugin   RFQ      HCS-10    hedera-
              Plugin     (5 tools)   (6 tools)    Plugin   (6 tools)  agent-kit
              (9 tools)                           (3 tools)            (7+ tools)
                    │         │           │          │
                    └─────────┴───────────┴──────────┘
                                  │
                    ImperiumAPI (25+ REST endpoints)
                                  │
                    Solidity Contracts (Hedera / Hardhat)
```

## Tool Inventory (33+ tools)

| Domain | Tools | Key Operations |
|--------|-------|----------------|
| **Annuity Lifecycle** | 9 | Create, execute, transfer, redeem, status, balances, list, transactions, health |
| **Term Deposit** | 5 | Create, execute, redeem, status, balances |
| **NCD** | 6 | Create, execute, transfer, redeem, status, balances |
| **RFQ Quotes** | 3 | Annuity quotes, TD quotes, NCD quotes |
| **Hedera Queries** | 7+ | HBAR balance, account info, token balances, topic info, transaction details |
| **HCS-10 Networking** | 6 | List agents, connect, send skill requests, manage connections, start/stop listener |

## Available Commands (Regex Mode)

### Annuity Lifecycle
| Command | Example |
|---------|---------|
| Create deal | `create a deal with 5 coupons and face value 1000000` |
| Execute deal | `execute the deal` |
| Transfer deal | `transfer the deal` or `transfer for price 800000` |
| Redeem at maturity | `redeem the deal` |

### Term Deposit Lifecycle
| Command | Example |
|---------|---------|
| Create TD | `create term deposit with face value 500000 and rate 450 for 90 days` |
| Execute TD | `execute term deposit` |
| Redeem TD | `redeem term deposit` |

### NCD Lifecycle
| Command | Example |
|---------|---------|
| Create NCD | `create ncd with face value 1000000 and rate 480 for 180 days` |
| Execute NCD | `execute ncd` |
| Transfer NCD | `transfer ncd for price 950000` |
| Redeem NCD | `redeem ncd` |

### Inspection
| Command | Example |
|---------|---------|
| Check status | `check status` or `status of deal-123456` |
| Show balances | `show balances` — all wallet balances |
| List deals | `list deals` — all deals in this session |
| Transaction log | `show transactions` — full tx log with hashes |

### HCS-10 Agent Network
| Command | Example |
|---------|---------|
| List agents | `list agents` or `list agents imperium` |
| Connect to agent | `connect to 0.0.8218788` |
| Start listener | `listen` — monitor for incoming connection requests |
| Stop listener | `stop listening` |
| Show connections | `show connections` |
| Send skill request | `send annuity.status` |

### System
| Command | Example |
|---------|---------|
| Health check | `health` |
| Help | `help` |
| Exit | `exit` |

## How It Works

### Dual-Mode Processing

**LLM Mode** (default when `ANTHROPIC_API_KEY` is set):
```
User input → Claude (LangChain) → Tool selection → API call → Streaming response
```

**Regex Mode** (fallback):
```
User input → Intent Parser (regex) → Tool Router → API call → Response Formatter
```

### Session Factory

The LLM agent supports two modes:
1. **Singleton (CLI)**: `init()` + `processInput()` — single conversation per process
2. **Session factory (Web)**: `createSession()` — independent session per WebSocket connection, each with its own conversation history and tools

### Smart Asset Recommendation

In LLM mode, the agent analyses investor goals and recommends the most suitable product:
- **Annuity** — For retirees seeking steady income (regular coupon payments)
- **Term Deposit** — For conservative investors wanting capital preservation (locked, non-tradeable)
- **NCD** — For investors wanting short-term yield with liquidity (discount instrument, tradeable)

## Plugins

| Plugin | File | Tools |
|--------|------|-------|
| Annuity | `plugins/annuity-plugin.js` | 9 tools wrapping `/annuity/*` API endpoints |
| Term Deposit | `plugins/term-deposit-plugin.js` | 5 tools wrapping `/term-deposit/*` API endpoints |
| NCD | `plugins/ncd-plugin.js` | 6 tools wrapping `/ncd/*` API endpoints |
| RFQ | `plugins/rfq-plugin.js` | 3 quote tools + RFQ system prompt for web UI |
| HCS-10 | `plugins/hcs10-plugin.js` | 6 tools for agent-to-agent communication |

## Key Files

| File | Purpose |
|------|---------|
| `cli-agent.js` | Dual-mode CLI agent (v0.6) — LLM or regex |
| `llm-agent.js` | LangChain + Claude agent core (session factory + singleton) |
| `hol-registry.js` | HCS-10 on-chain agent registration |
| `test-a2a.js` | Agent-to-agent round-trip test |
| `plugins/` | LangChain tool plugins (annuity, TD, NCD, RFQ, HCS-10) |
