# Manual Test Plan — Imperium Agent v0.6 + HOL Registry Agent + LLM Mode + Web UI

**Pre-requisites:**
- `.env` configured with `HEDERA_TESTNET_ACCOUNT_ID` and `HEDERA_TESTNET_PRIVATE_KEY`
- `.env` configured with `ANTHROPIC_API_KEY` (for Parts E, F, G, and H)
- HOL agent registered (`deployments/hol-agent.json` exists)
- Agent account: `0.0.8218785`, Inbound topic: `0.0.8218788`

---

## Part A — CLI Agent: Annuity Lifecycle (Local Hardhat, Regex Mode)

Start the local stack: `./start.sh`

| # | Step | Command / Action | Expected Result |
|---|------|-----------------|-----------------|
| 1 | Health check | Type `health` | Output includes `API Health: OK` and `RPC Listening: true` |
| 2 | Help menu | Type `help` | Output shows four sections: **Lifecycle**, **Inspection**, **HCS-10 Agent Network**, **System** — plus a mode indicator at the bottom |
| 3 | Create deal | Type `create a deal with 3 coupons and face value 1000000` | Output shows a Correlation ID (e.g. `deal-17...`), an Annuity Contract address, a Stablecoin address, and Status: `created` |
| 4 | Execute deal | Type `execute the deal` | Output shows 3 coupon payment confirmations and final status `executed` |
| 5 | Transfer deal | Type `transfer the deal` | Output shows a secondary buyer address, a transfer price, and status `transferred` |
| 6 | Redeem deal | Type `redeem the deal` | Output shows redemption complete and status `redeemed` |
| 7 | List deals | Type `list deals` | The deal from step 3 appears with its correlation ID, current status, face value, and coupon count |
| 8 | Show transactions | Type `show transactions` | Tx log lists entries with hashes for create, execute, transfer, and redeem operations |

---

## Part B — CLI Agent: Term Deposit Lifecycle (Local Hardhat, Regex Mode)

Continue from Part A (local stack running).

| # | Step | Command / Action | Expected Result |
|---|------|-----------------|-----------------|
| 9 | Create TD | Type `create term deposit with face value 500000 and rate 450 for 90 days` | Output shows Correlation ID, Term Deposit Contract address, Stablecoin address, status `created` |
| 10 | Execute TD | Type `execute term deposit` | Output shows issuance confirmation, investor pays face value, status `executed` |
| 11 | Check TD status | Type `check status` | Output shows term deposit details: face value, interest rate, term, maturity date |
| 12 | Redeem TD | Type `redeem term deposit` | Output shows redemption with interest, face value + interest returned to investor |
| 13 | Show TD balances | Type `show balances` | Balances reflect the TD settlement — investor received principal + interest |

---

## Part C — CLI Agent: NCD Lifecycle (Local Hardhat, Regex Mode)

Continue from Part B (local stack running).

| # | Step | Command / Action | Expected Result |
|---|------|-----------------|-----------------|
| 14 | Create NCD | Type `create ncd with face value 1000000 and rate 480 for 180 days` | Output shows Correlation ID, NCD Contract address, Stablecoin address, status `created` |
| 15 | Execute NCD | Type `execute ncd` | Output shows issuance confirmation, investor pays discounted price, status `executed` |
| 16 | Transfer NCD | Type `transfer ncd for price 950000` | Output shows secondary market transfer, buyer pays price to current owner |
| 17 | Redeem NCD | Type `redeem ncd` | Output shows redemption, issuer pays full face value to current owner |
| 18 | Show NCD balances | Type `show balances` | Balances reflect NCD settlement — new owner received face value |

---

## Part D — HOL Registry Agent (Hedera Testnet)

| # | Step | Command / Action | Expected Result |
|---|------|-----------------|-----------------|
| 19 | Agent status | Run `node agent/hol-registry.js status` | Output shows account `0.0.8218785`, inbound topic `0.0.8218788`, outbound topic ID, profile topic ID, and 7 registered skills |
| 20 | Agent on-chain verification | Run `node agent/hol-registry.js status` and confirm the inbound topic exists on HashScan: `https://hashscan.io/testnet/topic/0.0.8218788` | HashScan shows the topic with messages (profile, skills). Note: the HOL Portal REST search does not index on-chain HCS-10 registrations — our agent won't appear there. |

---

## Part E — CLI Agent: HCS-10 Commands (Hedera Testnet, Regex Mode)

Start the CLI agent: `node agent/cli-agent.js --network hedera-testnet --no-llm`

| # | Step | Command / Action | Expected Result |
|---|------|-----------------|-----------------|
| 21 | Verify banner | Observe the startup banner | Banner shows `v0.6`, `HCS-10 Agent: 0.0.8218785`, `Inbound: 0.0.8218788`, and `Mode: regex` |
| 22 | List all agents | Type `list agents` | Output shows a table of agents from the HOL Registry (default query `agent`), each with name, registry source, and description |
| 23 | Search agents | Type `list agents imperium` | Output shows agents matching "imperium" (results from moltbook registry) with name, registry, and description |
| 24 | Start listener | Type `listen` | Output shows `HCS-10 listener started` with 5-second polling interval |
| 25 | Stop listener | Type `stop listening` | Output shows `HCS-10 listener stopped` |

---

## Part F — Agent-to-Agent Round-Trip (Hedera Testnet)

Open **two terminals** (T1 and T2).

| # | Step | Command / Action | Expected Result |
|---|------|-----------------|-----------------|
| 26 | Start CLI listener | **T1:** Run `node agent/cli-agent.js --network hedera-testnet --no-llm`, then type `listen` | T1 shows `HCS-10 listener started` |
| 27 | Run test requester | **T2:** Run `node agent/test-a2a.js` | T2 shows it is connecting to the Imperium agent and sending a skill request |
| 28 | Verify inbound reception | **T1:** Watch the listener output | T1 shows: (1) `Connection request from ...` auto-accepted, (2) `Skill request: annuity.status` received, (3) execution result displayed, (4) response sent confirmation |
| 29 | Verify requester response | **T2:** Watch the output | T2 shows the skill response received with status and result data |
| 30 | Send outbound skill | **T1:** Type `send annuity.status` | T1 sends the skill request and shows `Skill request sent. Polling for response...` |
| 31 | Show connections | **T1:** Type `show connections` | The connection from step 27 appears with its Connection Topic ID and remote agent account |

---

## Part G — LLM Mode: Natural Language Agent (Local Hardhat)

Start the local stack: `./start.sh`
Start the CLI agent **without** `--no-llm`: `node agent/cli-agent.js`

**Pre-requisite:** `ANTHROPIC_API_KEY` must be set in `.env`.

| # | Step | Command / Action | Expected Result |
|---|------|-----------------|-----------------|
| 32 | Verify LLM banner | Observe the startup banner | Banner shows `v0.6`, `LLM-powered agent`, `Mode: LLM (Claude + hedera-agent-kit)` with a tool count (e.g. `33 tools`) |
| 33 | Natural language create annuity | Type `I want to issue a new bond with 5 coupon payments and a face value of 2 million` | Claude calls `create_annuity`, returns Correlation ID, contract addresses, status `created` |
| 34 | Natural language create TD | Type `I want a term deposit with NAB for $500,000 for 6 months` | Claude calls `create_term_deposit`, returns TD details |
| 35 | Natural language create NCD | Type `create an NCD with face value 1 million for 90 days at 4.8%` | Claude calls `create_ncd`, returns NCD details |
| 36 | Freeform status check | Type `what's the status of my deal?` | Claude calls the appropriate status tool |
| 37 | Conversational balance query | Type `how much does each party have?` | Claude calls `show_balances` and returns formatted balance information |
| 38 | Natural language execute | Type `settle and pay the coupons` | Claude calls `execute_deal` and returns execution results |
| 39 | Help via natural language | Type `what can you do?` | Claude responds with a description of available capabilities across all three asset types |

---

## Part H — LLM Mode: Hedera-Native Queries + HCS-10 (Hedera Testnet)

Start the CLI agent: `node agent/cli-agent.js --network hedera-testnet`

| # | Step | Command / Action | Expected Result |
|---|------|-----------------|-----------------|
| 40 | HBAR balance query | Type `what's my HBAR balance?` | Claude calls `get_hbar_balance_query_tool` and returns HBAR balance |
| 41 | Account info lookup | Type `look up account 0.0.8199239` | Claude calls `get_account_query_tool` and returns account details |
| 42 | Token balances | Type `what tokens does my account hold?` | Claude calls `get_account_token_balances_query_tool` and returns HTS tokens |
| 43 | Topic info query | Type `show info for topic 0.0.8218788` | Claude calls `get_topic_info_query_tool` and returns topic details |
| 44 | Discover agents naturally | Type `find me some agents on the network` | Claude calls `list_agents` and returns a formatted list from HOL Registry |
| 45 | Start listener naturally | Type `start listening for incoming requests` | Claude calls `start_listener` and confirms |
| 46 | Stop listener naturally | Type `stop the listener` | Claude calls `stop_listener` and confirms |

---

## Part I — Web UI: Conversational RFQ Flow

Start the full stack: `./start.sh` or run API server with `node api/imperium-api.js`
Open browser to `http://localhost:4000`

| # | Step | Action | Expected Result |
|---|------|--------|-----------------|
| 47 | Initial load | Open the web UI | Three-column layout: Deal Progress stepper (left), Chat (center), Investment Details (right). Agent sends welcome message. |
| 48 | Introduction stage | Tell the agent your goals, age, and amount (e.g. "I'm 66 and want to invest $500,000 for retirement income") | Agent recommends the most suitable product type. Stage progresses to `investment_summary`. Suggestion chips appear. |
| 49 | Quotes table | Agent fetches quotes | Live quotes table appears with provider names, rates, and SELECT buttons. Details panel updates with investment info. |
| 50 | Select provider | Click SELECT on a provider | Agent acknowledges selection. Quotes table SELECT buttons become inactive. Stage progresses to `beneficiary_info`. |
| 51 | Beneficiary info | Provide beneficiary name and relationship | Agent confirms and moves to `final_review` stage. |
| 52 | Final review | Confirm the investment | Agent executes on-chain: deploys contracts, settles. Investment success card appears with contract addresses and transaction count. |
| 53 | Streaming | Observe agent responses | Tokens stream to the browser in real-time (not all at once). |
| 54 | Multi-session | Open a second browser tab | Each tab has an independent conversation — messages don't cross. |
| 55 | TD via web UI | New session — say "I want a safe investment for $500,000, capital preservation is my priority" | Agent recommends Term Deposit, fetches TD quotes from big-4 banks. |
| 56 | NCD via web UI | New session — say "I want short-term yield with liquidity, $1 million for 90 days" | Agent recommends NCD, fetches NCD quotes. |

---

## Quick Smoke (8 tests, < 10 min)

1. **Step 1** — Health check (local API works)
2. **Step 3** — Create annuity deal (annuity lifecycle, regex mode)
3. **Step 9** — Create term deposit (TD lifecycle, regex mode)
4. **Step 14** — Create NCD (NCD lifecycle, regex mode)
5. **Step 19** — Agent status (HOL registration intact)
6. **Step 22** — List agents (HCS-10 discovery works)
7. **Step 32** — LLM banner (LLM mode initializes with 33+ tools)
8. **Step 47** — Web UI loads (frontend + WebSocket working)
