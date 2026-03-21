# Imperium Markets — Hedera Agent

An LLM-powered agent for tokenised fixed-income asset lifecycle management on Hedera Network. Supports **Annuities**, **Term Deposits**, and **NCDs** (Negotiable Certificates of Deposit). Built with Claude (via LangChain), hedera-agent-kit, and HCS-10 agent-to-agent communication.

> **v0.6** — Multi-asset agent: three tokenised instruments + conversational RFQ web UI.

---

## What It Does

Imperium Agent manages three types of tokenised Australian Capital Markets instruments on Hedera:

- **Annuity** — Regular coupon payments + face value at maturity. Tradeable on secondary market. Issuers: Challenger, Resolution Life, Generation Life, Allianz Retire+.
- **Term Deposit** — Locked funds returned with interest at maturity. NOT tradeable. Issuers: Westpac, NAB, CBA, ANZ.
- **NCD** — Bought at a discount to face value, redeemed at full face value at maturity. Tradeable. Issuers: BOQ, Macquarie, Suncorp, Bendigo.

Key capabilities:
- **Natural language interface** — Ask in plain English: *"I want a term deposit with NAB for $500,000"*
- **33+ tools** across five domains: annuity, term deposit, NCD, Hedera-native queries, and agent-to-agent networking
- **Smart asset recommendation** — The agent analyses investor goals and recommends the most suitable product
- **HCS-10 (OpenConvAI)** — Discover, connect, and exchange skill requests with other agents on Hedera
- **Hedera Testnet deployment** — Live agent registered on-chain with 7 skills

### Tool Inventory

| Domain | Tools | Examples |
|--------|-------|---------|
| **Annuity Lifecycle** | 9 tools | Create, execute, transfer, redeem, status, balances, list, transactions, health |
| **Term Deposit** | 5 tools | Create, execute, redeem, status, balances |
| **NCD** | 6 tools | Create, execute, transfer, redeem, status, balances |
| **RFQ Quotes** | 3 tools | Annuity quotes, TD quotes, NCD quotes |
| **Hedera Queries** | 7+ tools (via hedera-agent-kit) | HBAR balance, account info, token balances, topic info, transaction details |
| **HCS-10 Networking** | 6 tools | List agents, connect, send skill requests, manage connections, start/stop listener |

---

## Quick Start

```bash
# Install dependencies
npm install

# Copy env and add your keys
cp .env.example .env
# Edit .env: add HEDERA_TESTNET_ACCOUNT_ID, HEDERA_TESTNET_PRIVATE_KEY, ANTHROPIC_API_KEY

# Launch full stack (Hardhat node + deploy + API + agent)
./start.sh
```

### LLM Mode (recommended)

Requires `ANTHROPIC_API_KEY` in `.env`.

```bash
# Local Hardhat — annuity lifecycle via natural language
node agent/cli-agent.js

# Hedera Testnet — annuity + Hedera-native queries + HCS-10
node agent/cli-agent.js --network hedera-testnet
```

**Try these:**
```
> I want to issue a new bond with 5 coupon payments and a face value of 2 million
> what's the status of my deal?
> settle and pay the coupons
> what's my HBAR balance?
> find me some agents on the network
> start listening for incoming requests
```

### Regex Mode (no API key needed)

```bash
node agent/cli-agent.js --no-llm
# or simply omit ANTHROPIC_API_KEY from .env
```

All 21 structured commands work in regex mode (`create`, `execute`, `transfer`, `redeem`, `status`, `balances`, `list deals`, `show transactions`, `list agents`, `connect to`, `listen`, etc.).

---

## Web UI — Conversational RFQ

A browser-based chat interface where the Imperium Agent guides investors through a Request for Quote flow across all three asset types.

```bash
# Build the frontend (React + Vite)
npm run build:web

# Start the server (serves UI + API + WebSocket on port 4000)
node api/imperium-api.js --network hedera-testnet

# Open http://localhost:4000
```

### How It Works

The agent walks the user through four stages via natural conversation:

1. **Introduction** — Collects investment goals, age, and amount
2. **Investment Summary** — Recommends the best product (annuity, TD, or NCD) based on goals. Fetches live quotes from Australian providers, presents a comparison table with SELECT buttons
3. **Beneficiary Info** — Gathers beneficiary details and product-specific preferences
4. **Final Review** — Summarises the deal, then executes on-chain: deploys contracts, settles, and runs the full lifecycle on Hedera Testnet (or local Hardhat)

### Features

- **Streaming responses** — LLM tokens stream to the browser in real time via WebSocket
- **Structured data blocks** — Agent emits fenced `~~~rfq-*~~~` blocks that the frontend parses into rich UI: quotes tables, progress updates, suggestion chips, investment success cards
- **Per-session isolation** — Each browser tab gets its own agent session with independent conversation history
- **Three-column layout** — Deal progress stepper (left), chat (center), investment details (right)
- **Imperium Markets branding** — Dark navy theme, orange/gold accents, Roboto font

### Development Mode

```bash
# Terminal 1: API + WebSocket server
node api/imperium-api.js

# Terminal 2: Vite dev server with hot reload (port 5173, proxies to 4000)
cd web && npm run dev
```

---

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

### Smart Contracts

| Contract | Description | Tradeable |
|----------|-------------|-----------|
| **AnnuityToken.sol** | Coupon-bearing instrument — issue, pay coupons, transfer, redeem | Yes |
| **TermDepositToken.sol** | Fixed deposit — issue, redeem with interest at maturity | No |
| **NCDToken.sol** | Discount instrument — issue at discount, transfer, redeem at face value | Yes |
| **ImperiumStableCoin.sol** | ERC-20 stablecoin (eAUD) for all settlements | — |

### Key Components

| Component | Description |
|-----------|-------------|
| **ImperiumAPI** | Express gateway with 25+ REST endpoints across 3 asset types |
| **CLI Agent** | Dual-mode interactive agent (LLM or regex) |
| **LLM Agent** | Claude + LangChain tool-calling loop with conversation memory |
| **HOL Registry Agent** | On-chain HCS-10 agent (account `0.0.8218785`, 7 skills) |

---

## HCS-10 Agent Network

The Imperium agent is registered on Hedera Testnet via HCS-10 (OpenConvAI protocol):

| Property | Value |
|----------|-------|
| Agent Account | `0.0.8218785` |
| Inbound Topic | `0.0.8218788` |
| Registered Skills | `annuity.create`, `annuity.execute`, `annuity.transfer`, `annuity.redeem`, `annuity.status`, `annuity.list`, `annuity.health` |

Other agents can discover Imperium via the HOL Registry, establish a connection, and request annuity operations over HCS topics.

```bash
# Check agent status
node agent/hol-registry.js status

# Run agent-to-agent test (requires two terminals)
# T1: node agent/cli-agent.js --network hedera-testnet --no-llm → then type "listen"
# T2: node agent/test-a2a.js
```

---

## Project Structure

```
contracts/
  AnnuityToken.sol              # Coupon-bearing annuity (tradeable)
  TermDepositToken.sol          # Fixed deposit with interest (non-tradeable)
  NCDToken.sol                  # Negotiable Certificate of Deposit (tradeable, discount)
  ImperiumStableCoin.sol        # ERC-20 stablecoin (eAUD)
agent/
  cli-agent.js                  # Dual-mode CLI agent (v0.6)
  llm-agent.js                  # LangChain + Claude agent core (session factory + singleton)
  hol-registry.js               # HCS-10 on-chain agent registration
  test-a2a.js                   # Agent-to-agent round-trip test
  plugins/
    annuity-plugin.js           # 9 annuity tools (LangChain plugin)
    term-deposit-plugin.js      # 5 term deposit tools (LangChain plugin)
    ncd-plugin.js               # 6 NCD tools (LangChain plugin)
    rfq-plugin.js               # RFQ quotes (3 tools) + multi-asset system prompt
    hcs10-plugin.js             # 6 HCS-10 tools (LangChain plugin)
api/
  imperium-api.js               # ImperiumAPI gateway (25+ REST endpoints + WebSocket)
web/
  src/
    App.jsx                     # 3-column layout (stepper | chat | details + wallet)
    context/RfqContext.jsx      # React state: messages, stage, quotes, streaming
    hooks/useWebSocket.js       # WebSocket connection + streaming handler
    components/
      Header.jsx                # Imperium Markets branding + nav
      Chat/                     # ChatPanel, MessageBubble, QuotesTable, InvestmentCard, SuggestionChips
      Sidebar/                  # RfqProgress, InvestmentDetails, WalletPanel
scripts/
  deploy.js                     # Hardhat deploy script
test/
  annuity/                      # 10 annuity contract tests + smoke test + demo bot
  term-deposit/                 # 6 term deposit tests (lifecycle, security)
  ncd/                          # 10 NCD tests (lifecycle, transfer, security)
docs/
  hedera-migration-blueprint.md # Migration roadmap and task tracker
  complete-set-of-tokenized-assets.md # Asset specifications
deployments/
  hol-agent.json                # On-chain agent credentials and topic IDs
```

---

## Testing

```bash
# All contract tests (annuity + term deposit + NCD)
npm test

# Run by asset type
npx hardhat test test/annuity/*.test.js
npx hardhat test test/term-deposit/*.test.js
npx hardhat test test/ncd/*.test.js

# Full smoke test (API + agent parser + LLM)
# Requires: Hardhat node + ImperiumAPI running
npx hardhat test test/annuity/06-smoke.fullcycle.test.js --network localhost
```

**Test coverage:** 47+ automated tests across three asset types (annuity: 10 contract + smoke, term deposit: 6, NCD: 10), API endpoints, regex intent parsing, and LLM classification. Plus a 40-step manual test plan covering all 7 parts.

---

## NPM Scripts

| Command | Description |
|---------|-------------|
| `npm test` | Run all contract tests |
| `npm run test:contracts` | Run only the 5 contract test suites |
| `npm run compile` | Compile Solidity contracts |
| `npm run deploy:local` | Deploy to local Hardhat node |
| `npm run node` | Start Hardhat node |
| `npm run build:web` | Build React frontend to `web/dist/` |
| `npm run dev:web` | Start Vite dev server with hot reload |
| `npm start` | Launch full stack via start.sh |

---

## Domain Context

Imperium operates under Australian Capital Markets conventions:

- **Day-count:** ACT/365 (Australian standard)
- **Settlement:** T+2 AEST, Australian business days
- **Currency:** AUD (values in whole units, e.g. 1,000,000 = A$1,000,000)
- **Interest rate:** Basis points (e.g. 500 = 5.00%)
- **Regulatory:** ASIC/AFSL compliance, AML/CTF thresholds (A$10,000)

---

## Dependencies

| Package | Purpose |
|---------|---------|
| [hedera-agent-kit](https://github.com/hashgraph/hedera-agent-kit) | LangChain toolkit for Hedera — account, token, consensus, EVM queries |
| [@langchain/anthropic](https://www.npmjs.com/package/@langchain/anthropic) | Claude integration for LangChain |
| [@langchain/core](https://www.npmjs.com/package/@langchain/core) | LangChain core — tools, messages, schemas |
| [@hashgraph/sdk](https://github.com/hashgraph/hedera-sdk-js) | Hedera SDK for consensus and token operations |
| [OpenZeppelin](https://github.com/OpenZeppelin/openzeppelin-contracts) | SafeERC20, ReentrancyGuard |
| [Hardhat](https://hardhat.org/) | Build, test, deploy Solidity |
| [Express](https://expressjs.com/) | ImperiumAPI server |
| [ws](https://github.com/websockets/ws) | WebSocket server for real-time chat streaming |
| [React + Vite](https://vite.dev/) | Web UI frontend |

---

## License

ISC
