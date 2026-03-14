# Manual Test Plan — CLI Agent v0.4 + HOL Registry Agent

**Pre-requisites:**
- `.env` configured with `HEDERA_TESTNET_ACCOUNT_ID` and `HEDERA_TESTNET_PRIVATE_KEY`
- HOL agent registered (`deployments/hol-agent.json` exists)
- Agent account: `0.0.8218785`, Inbound topic: `0.0.8218788`

---

## Part A — CLI Agent: Annuity Lifecycle (Local Hardhat)

Start the local stack: `./start.sh`

| # | Step | Command / Action | Expected Result |
|---|------|-----------------|-----------------|
| 1 | Health check | Type `health` | Output includes `API Health: OK` and `RPC Listening: true` |
| 2 | Help menu | Type `help` | Output shows four sections: **Lifecycle**, **Inspection**, **HCS-10 Agent Network**, **System** |
| 3 | Create deal | Type `create a deal with 3 coupons and face value 1000000` | Output shows a Correlation ID (e.g. `deal-17...`), an Annuity Contract address, a Stablecoin address, and Status: `created` |
| 4 | Execute deal | Type `execute the deal` | Output shows 3 coupon payment confirmations and final status `executed` |
| 5 | Transfer deal | Type `transfer the deal` | Output shows a secondary buyer address, a transfer price, and status `transferred` |
| 6 | Redeem deal | Type `redeem the deal` | Output shows redemption complete and status `redeemed` |
| 7 | List deals | Type `list deals` | The deal from step 3 appears with its correlation ID, current status, face value, and coupon count |
| 8 | Show transactions | Type `show transactions` | Tx log lists entries with hashes for create, execute, transfer, and redeem operations |

---

## Part B — HOL Registry Agent (Hedera Testnet)

| # | Step | Command / Action | Expected Result |
|---|------|-----------------|-----------------|
| 9 | Agent status | Run `node agent/hol-registry.js status` | Output shows account `0.0.8218785`, inbound topic `0.0.8218788`, outbound topic ID, profile topic ID, and 7 registered skills |
| 10 | Agent on-chain verification | Run `node agent/hol-registry.js status` and confirm the inbound topic exists on HashScan: `https://hashscan.io/testnet/topic/0.0.8218788` | HashScan shows the topic with messages (profile, skills). Note: the HOL Portal REST search does not index on-chain HCS-10 registrations — our agent won't appear there. |

---

## Part C — CLI Agent: HCS-10 Commands (Hedera Testnet)

Start the CLI agent: `node agent/cli-agent.js --network hedera-testnet`

| # | Step | Command / Action | Expected Result |
|---|------|-----------------|-----------------|
| 11 | Verify banner | Observe the startup banner | Banner shows `v0.4`, `HCS-10 Agent: 0.0.8218785`, and `Inbound: 0.0.8218788` |
| 12 | List all agents | Type `list agents` | Output shows a table of agents from the HOL Registry (default query `agent`), each with name, registry source, and description |
| 13 | Search agents | Type `list agents imperium` | Output shows agents matching "imperium" (results from moltbook registry) with name, registry, and description. Note: our on-chain agent won't appear — the REST index doesn't crawl HCS-10 registrations. |
| 14 | Start listener | Type `listen` | Output shows `HCS-10 listener started` with 5-second polling interval |
| 15 | Stop listener | Type `stop listening` | Output shows `HCS-10 listener stopped` |

**Note:** The `connect to` and `show connections` commands are tested end-to-end in Part D, which requires a second terminal running the test requester agent to accept the connection.

---

## Part D — Agent-to-Agent Round-Trip (Hedera Testnet)

Open **two terminals** (T1 and T2).

| # | Step | Command / Action | Expected Result |
|---|------|-----------------|-----------------|
| 16 | Start CLI listener | **T1:** Run `node agent/cli-agent.js --network hedera-testnet`, then type `listen` | T1 shows `HCS-10 listener started` |
| 17 | Run test requester | **T2:** Run `node agent/test-a2a.js` | T2 shows it is connecting to the Imperium agent and sending a skill request |
| 18 | Verify inbound reception | **T1:** Watch the listener output | T1 shows: (1) `Connection request from ...` auto-accepted, (2) `Skill request: annuity.status` received, (3) execution result displayed, (4) response sent confirmation |
| 19 | Verify requester response | **T2:** Watch the output | T2 shows the skill response received with status and result data |
| 20 | Send outbound skill | **T1:** Type `send annuity.status` | T1 sends the skill request and shows `Skill request sent. Polling for response...`. Note: the test requester has already exited, so no response will arrive — verify the message was submitted successfully, then Ctrl+C the poll. A full bidirectional test requires two CLI agent instances (future). |
| 21 | Show connections | **T1:** Type `show connections` | The connection from step 17 appears with its Connection Topic ID and remote agent account |

---

## Quick Smoke (4 tests, < 5 min)

1. **Step 1** — Health check (local API works)
2. **Step 3** — Create deal (core lifecycle works)
3. **Step 9** — Agent status (HOL registration intact)
4. **Step 12** — List agents (HCS-10 discovery works)
