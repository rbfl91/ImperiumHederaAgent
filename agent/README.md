# Imperium Markets — CLI Agent (v0.2)

Rule-based interactive agent that orchestrates AnnuityToken smart contract operations via the mock API gateway. No LLM or API key required.

## Prerequisites

1. **Hardhat node** running on port 8545
2. **Contracts compiled and deployed**
3. **Mock API** running on port 4000

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
node mocks/mock-api.js
# Terminal 3
node agent/cli-agent.js
```

## Available Commands

### Lifecycle
| Command | Example |
|---------|---------|
| Create deal | `create a deal with 5 coupons and face value 1000000` |
| Execute deal | `execute the deal` |
| Transfer deal | `transfer the deal` or `transfer for price 800000` |
| Redeem at maturity | `redeem the deal` |

### Inspection
| Command | Example |
|---------|---------|
| Check status | `check status` or `status of deal-123456` |
| Show balances | `show balances` — all wallet balances + coupon status |
| List deals | `list deals` — all deals in this session |
| Transaction log | `show transactions` — full tx log with hashes |

### System
| Command | Example |
|---------|---------|
| Health check | `health` |
| Help | `help` |
| Exit | `exit` |

## How It Works

```
User input → Intent Parser (regex) → Tool Router → API call → Response Formatter
```

The agent parses natural language commands, maps them to REST calls against `mock-api.js`, and presents results conversationally. After creating a deal, the agent remembers the correlation ID so you can say "execute" or "check status" without repeating it.

## Full Demo Flow

```
create a deal with 5 coupons     → deploys contracts, funds wallets
execute the deal                  → investor buys, issuer pays 5 coupons
show balances                     → stablecoin balances + coupon status
transfer the deal                 → sell to secondary buyer at 90% FV
show balances                     → verify transfer settled correctly
redeem the deal                   → time-travel to maturity, redeem face value
check status                      → verify expired=true
show transactions                 → full tx log with hashes
list deals                        → all deals in session
```

## Architecture

- **No LLM required** — intent detection via pattern matching
- **Calls existing API** — 10 endpoints on `mock-api.js`
- **Stateful session** — remembers last deal ID
- **Extensible** — swap the intent parser for a LangChain LLM agent later (Milestone 2.5)
