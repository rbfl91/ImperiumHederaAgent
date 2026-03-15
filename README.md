# Imperium Markets — Hedera Agent

An LLM-powered CLI agent for tokenized annuity lifecycle management on Hedera Network. Built with Claude (via LangChain), hedera-agent-kit, and HCS-10 agent-to-agent communication.

> **v0.5** — Dual-mode agent: natural language (Claude + hedera-agent-kit) or regex fallback.

---

## What It Does

Imperium Agent manages structured annuity products (AnnuityToken smart contracts) on Hedera, combining:

- **Natural language interface** — Ask in plain English: *"create a bond with 5 coupons and face value 2 million"*
- **22+ tools** across three domains: annuity lifecycle, Hedera-native queries, and agent-to-agent networking
- **HCS-10 (OpenConvAI)** — Discover, connect, and exchange skill requests with other agents on Hedera
- **Hedera Testnet deployment** — Live agent registered on-chain with 7 skills

### Tool Inventory

| Domain | Tools | Examples |
|--------|-------|---------|
| **Annuity Lifecycle** | 9 tools | Create, execute, transfer, redeem, status, balances, list, transactions, health |
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

## Architecture

```
User input
  │
  ├─ LLM Mode ──→ LangChain Agent (Claude Haiku 4.5 via @langchain/anthropic)
  │                  │
  │                  ├─ Annuity Plugin (9 tools → ImperiumAPI → Solidity contracts)
  │                  ├─ HCS-10 Plugin (6 tools → Hedera Consensus Service)
  │                  └─ hedera-agent-kit Plugins (7+ tools → Mirror Node / SDK)
  │
  └─ Regex Mode ──→ parseIntent() → 21 pattern-matched handlers
```

### Key Components

| Component | Description |
|-----------|-------------|
| **AnnuityToken.sol** | ERC-20 annuity contract — issue, coupon payments, transfer, redeem |
| **ImperiumStableCoin.sol** | ERC-20 stablecoin (iUSD) for all payments |
| **ImperiumAPI** | Express gateway with 10 REST endpoints for contract orchestration |
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
  AnnuityToken.sol              # Core annuity smart contract
  ImperiumStableCoin.sol        # ERC-20 stablecoin (iUSD)
agent/
  cli-agent.js                  # Dual-mode CLI agent (v0.5)
  llm-agent.js                  # LangChain + Claude agent core
  hol-registry.js               # HCS-10 on-chain agent registration
  test-a2a.js                   # Agent-to-agent round-trip test
  plugins/
    annuity-plugin.js           # 9 annuity tools (LangChain plugin)
    hcs10-plugin.js             # 6 HCS-10 tools (LangChain plugin)
api/
  imperium-api.js               # ImperiumAPI gateway (10 endpoints)
scripts/
  deploy.js                     # Hardhat deploy script
test/annuity/
  01–05-*.test.js               # Contract unit tests (lifecycle, payments, transfers, security, reentrancy)
  06-smoke.fullcycle.test.js    # Full smoke test: API + regex parser + LLM (31 tests)
  demo-bot.js                   # Visual demo bot for presentations
docs/
  hedera-migration-blueprint.md # Migration roadmap and task tracker
  manual-test-plan.md           # 40-step manual test plan (Parts A–G)
deployments/
  hol-agent.json                # On-chain agent credentials and topic IDs
```

---

## Testing

```bash
# Contract unit tests (5 suites)
npm run test:contracts

# Full smoke test (API + agent parser + LLM)
# Requires: Hardhat node + ImperiumAPI running
npx hardhat test test/annuity/06-smoke.fullcycle.test.js --network localhost

# All tests
npm test
```

**Test coverage:** 31 automated tests across contract lifecycle, API endpoints, regex intent parsing, and LLM classification. Plus a 40-step manual test plan covering all 7 parts (local lifecycle, HOL registry, HCS-10 commands, agent-to-agent, LLM natural language, Hedera-native queries, HCS-10 via NL).

---

## NPM Scripts

| Command | Description |
|---------|-------------|
| `npm test` | Run all contract tests |
| `npm run test:contracts` | Run only the 5 contract test suites |
| `npm run compile` | Compile Solidity contracts |
| `npm run deploy:local` | Deploy to local Hardhat node |
| `npm run node` | Start Hardhat node |
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

---

## License

ISC
