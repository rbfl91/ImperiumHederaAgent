# Imperium Markets — Hedera Testnet Deployment Plan

**Version:** 6.0
**Date:** 2026-03-20
**Target:** Deploy multi-asset tokenised instruments (Annuity, Term Deposit, NCD) to Hedera Testnet + HOL Registry Broker agent demo + CLI Agent v0.6 (LLM-powered, multi-asset) + Conversational RFQ Web UI in 7 days
**Authors:** Imperium Markets Engineering

---

## 1) Objective

Deploy tokenised Australian fixed-income instruments (Annuity, Term Deposit, NCD) to **Hedera Testnet**, migrate build tooling from Truffle to **Hardhat**, register the agent on the **HOL Registry Broker** (HCS-10), upgrade the CLI agent with multi-asset intelligence, and run a live demo against Hedera infrastructure.

### Success criteria

- Three smart contracts deployed to Hedera Testnet: AnnuityToken, TermDepositToken, NCDToken + ImperiumStableCoin.
- Full lifecycle executable on-chain for each asset type.
- CLI agent registered on HOL Registry Broker with published skills.
- Agent-to-agent communication working via HCS-10 on Hedera Testnet.
- CLI agent v0.6 with 33+ tools: annuity (9), term deposit (5), NCD (6), RFQ quotes (3), HCS-10 (6), Hedera queries (7+).
- Smart asset recommendation: agent analyses investor goals and recommends the most suitable product.
- Browser-based conversational RFQ flow with multi-asset support.
- Real-time LLM streaming via WebSocket.
- On-chain deal execution from the web UI (Hedera Testnet or local Hardhat).

---

## 2) Current State (what we have)

| Asset | Status |
|-------|--------|
| `contracts/AnnuityToken.sol` | ✅ Production-ready Solidity ^0.8.21 — coupon-bearing, tradeable |
| `contracts/TermDepositToken.sol` | ✅ Non-tradeable fixed deposit — issue + redeem with interest at maturity |
| `contracts/NCDToken.sol` | ✅ Tradeable discount instrument — issue at discount, secondary transfer, redeem at face value |
| `contracts/ImperiumStableCoin.sol` | ✅ ERC-20 stablecoin (ImperiumAUD / eAUD) |
| `api/imperium-api.js` | ✅ ImperiumAPI — 25+ endpoints (annuity + TD + NCD), full lifecycle for all 3 asset types, `--network` flag, Hedera finality/gas handling, `dotenv` + wallet loading for testnet single-account mode, WebSocket server (`/ws/chat`), CORS, structured response parsing, static file serving (`web/dist/`) |
| `agent/cli-agent.js` | ✅ v0.5, 17 intents (11 annuity/system + 6 HCS-10), HCS-10 listener mode, agent discovery, connection management, skill invocation, dual mode (LLM + regex fallback) |
| `hardhat.config.js` | ✅ Solidity 0.8.21, Hardhat Network + localhost + `hederaTestnet` (chainId 296) |
| `scripts/deploy.js` | ✅ Deploys ImperiumStableCoin + AnnuityToken, saves to `deployments/`, short maturity for Hedera |
| `config/networks.js` | ✅ Network config loader — local + hedera-testnet, deployment save/load, explorer URLs |
| `test/annuity/01–05*.test.js` | ✅ 5 annuity contract test files (migrated to ethers.js v6) |
| `test/term-deposit/*.test.js` | ✅ 2 test files, 6 tests: lifecycle (issue→mature→redeem), security (double-issue, access control, double-redeem, pre-issue) |
| `test/ncd/*.test.js` | ✅ 3 test files, 10 tests: lifecycle (with/without secondary trade), transfers (4 edge cases), security (double-issue, access control, double-redeem, pre-issue) |
| `web/src/components/Sidebar/WalletPanel.jsx` | ✅ WalletPanel — displays HBAR/ETH, stablecoins (eAUD), annuity assets, auto-refresh, network indicator |
| `web/` | ✅ Web UI improvements — 3-column layout, real-time chat, investment details, Imperium branding, auto-refresh wallet balances |
| `test/annuity/01-annuity.api.flow.test.js` | ✅ API integration test (fetch-based, uses 127.0.0.1) |
| `test/annuity/06-smoke.fullcycle.test.js` | ✅ 27 tests (API + agent parser, migrated to describe()) |
| `test/annuity/demo-bot.js` | ✅ Visual demo bot — `--network` flag, 3-min testnet timeouts |
| `start.sh` | ✅ Full stack launcher — `./start.sh` (local) or `./start.sh --network hedera-testnet` |
| `.env.example` | ✅ Template for Hedera credentials with setup instructions |
| `.gitignore` | ✅ Excludes node_modules, .env, cache/, artifacts/, deployments/ |
| `package.json` | ✅ Scripts: `deploy:hedera`, `start:hedera`, `demo`, `demo:hedera`, `build:web`, `dev:web`; deps include `ws`, `cors` |
| `agent/hol-registry.js` | ✅ HOL Registry Broker module — `create`, `status`, `connect`, `listen`, `register-index` commands, skill-to-API mapping (7 skills), inbound polling, auto-accept connections, skill execution + response, auto key type detection, low-level ledger auth (challenge → base64 sign → verify) |
| `agent/test-a2a.js` | ✅ Agent-to-agent communication test — creates Test Requester agent (cached), connects via HCS-10, invokes skill, reads response |
| `agent/llm-agent.js` | ✅ LLM agent module — `@langchain/anthropic` (Claude Haiku 4.5), custom plugins, session factory (`createSession()`) for per-WebSocket sessions, streaming support, backward-compatible singleton for CLI |
| `agent/plugins/term-deposit-plugin.js` | ✅ 5 term deposit tools: create, execute, redeem, status, balances |
| `agent/plugins/ncd-plugin.js` | ✅ 6 NCD tools: create, execute, transfer, redeem, status, balances |
| `agent/plugins/rfq-plugin.js` | ✅ 3 quote tools (`get_annuity_quotes`, `get_term_deposit_quotes`, `get_ncd_quotes`) + multi-asset system prompt — agent recommends best product based on investor goals |
| `web/` | ✅ React + Vite frontend — 3-column layout (deal progress stepper, conversational chat, investment details), ~15 files |
| `web/src/context/RfqContext.jsx` | ✅ React state management — messages, stage, quotes, streaming state |
| `web/src/hooks/useWebSocket.js` | ✅ WebSocket connection + streaming handler for real-time LLM token delivery |
| `deployments/hol-agent.json` | ✅ Agent identity state — account `0.0.8218785`, inbound/outbound/profile topic IDs, 7 skills |
| `truffle-config.js` + `migrations/` | ✅ **Deleted** — fully replaced by Hardhat |
| `build/` (Truffle artifacts) | ✅ **Deleted** — replaced by `artifacts/` (gitignored) |
| Hedera Testnet account | ✅ Account `0.0.7974882`, funded with testnet HBAR |

---

## 3) Migration Plan (7-day schedule)

### Day 1 — Hardhat Setup + Local Parity ✅ COMPLETED

**Goal:** Replace Truffle with Hardhat, all existing tests pass on Hardhat Network.

| Task | Status | Details |
|------|--------|---------|
| Install Hardhat + plugins | ✅ | `hardhat@^2.28.6`, `@nomicfoundation/hardhat-toolbox@^5.0.0`, `dotenv` |
| Create `hardhat.config.js` | ✅ | Solidity 0.8.21, Hardhat Network, Mocha 60s timeout |
| Write Hardhat deploy script | ✅ | `scripts/deploy.js` — deploys ImperiumStableCoin + AnnuityToken |
| Migrate tests to ethers.js v6 | ✅ | Full rewrite: `contract()`→`describe()`, `artifacts.require`→`ethers.getContractFactory`, `web3.utils`→`ethers` utils, `expectRevert`→`chai-matchers`, `BN`→`BigInt` |
| Verify local parity | ✅ | All 10 contract tests pass on Hardhat Network (799ms) |
| Remove Truffle | ✅ | Deleted `truffle-config.js`, `migrations/`, `build/` |
| Update `start.sh` | ✅ | `npx hardhat node` + `npx hardhat run scripts/deploy.js --network localhost` |
| Update `imperium-api.js` | ✅ | ABI paths: `build/contracts/` → `artifacts/contracts/*.sol/` |
| Update `package.json` | ✅ | Added npm scripts: `compile`, `test`, `test:contracts`, `deploy:local`, `node`, `start` |
| Create `.env.example` | ✅ | Template for Hedera credentials (Day 2+) |
| Update `.gitignore` | ✅ | Added `cache/`, `artifacts/`, `.env`, `.DS_Store` |

**Gate:** ✅ `npx hardhat test` — all 10 contract tests green. `start.sh` → full stack works.

#### Day 1 — Key decisions made

1. **Hardhat 2 (not 3):** Hardhat 3 requires ESM (`"type": "module"`) and Node.js v22.10+. Since the entire project is CommonJS, we chose Hardhat 2.28.6 to avoid a massive ESM conversion.
2. **Full ethers.js rewrite (not hardhat-web3 plugin):** `@nomiclabs/hardhat-web3` targets web3 v1.x, but the project uses web3 v4. Full ethers.js v6 rewrite was cleaner.
3. **web3 v4 kept in imperium-api.js only:** The API server talks JSON-RPC directly — works with any node (Hardhat, Ganache, Hedera).

---

### Day 2 — Hedera Testnet Deployment + API + Demo Polish (merged Day 2+3+4) ✅ COMPLETED

**Goal:** Deploy contracts to Hedera Testnet, connect the API + agent, and polish the demo — all in one day.

#### Phase A — Hedera Testnet Account + Deployment (~1–2 hours)

| Task | Status | Details |
|------|--------|---------|
| Create Hedera Testnet account | ✅ | Account ID `0.0.7974882`, EVM `0xd166aEd05c6d6987ec00f9e49d55420b590c47b6` |
| Fund account | ✅ | 1000 ℏ testnet HBAR via portal faucet |
| Configure `.env` | ✅ | ECDSA hex private key + Hashio RPC URL |
| Add Hedera network to `hardhat.config.js` | ✅ | `hederaTestnet` network with chainId 296, 120s timeout |
| Deploy to Hedera Testnet | ✅ | ImperiumStableCoin `0xC44f...Af13`, AnnuityToken `0x6e5A...99d0` |
| Record deployed addresses | ✅ | Auto-saved to `deployments/hedera-testnet.json` |
| Verify contracts | ✅ | Visible on HashScan testnet explorer |

#### Phase B — API + Agent on Hedera Testnet (~2–3 hours)

| Task | Status | Details |
|------|--------|---------|
| Add `--network` flag to `imperium-api.js` | ✅ | `node api/imperium-api.js --network hedera-testnet` or `NETWORK=hedera-testnet` |
| Create `config/networks.js` | ✅ | Maps `local` → Hardhat Network, `hedera-testnet` → Hashio RPC + deployed addresses |
| Handle Hedera differences | ✅ | Gas multiplier (1.2x), finality delay (5s), no time-travel → real-time wait |
| Redeem workaround | ✅ | On testnet, deploy with 120s maturity + 30s coupon intervals for demo |
| HashScan explorer links in API responses | ✅ | `explorerUrl` field in deal creation + tx history |
| Fund test wallets | ✅ | Handled automatically by deploy script (deployer funds wallets via ImperiumStableCoin) |
| Test API endpoints on Hedera | ✅ | Full stack launched: deploy → API (port 4000) → agent, all against Hashio RPC |
| Run agent against testnet | ✅ | `./start.sh --network hedera-testnet` — banner shows `Network: hedera-testnet` |

#### Phase C — Testing + Demo Polish (~2–3 hours)

| Task | Status | Details |
|------|--------|---------|
| Add HashScan links to agent output | ✅ | `txLink()` + `contractLink()` helpers in `cli-agent.js` |
| Update demo bot for testnet | ✅ | `--network` flag, 3-min timeouts, network label in header |
| Update `start.sh` | ✅ | `./start.sh --network hedera-testnet` — skips local node, validates `.env` |
| Add npm scripts for testnet | ✅ | `deploy:hedera`, `start:hedera`, `demo`, `demo:hedera` |
| Agent version bump | ✅ | v0.2 → v0.3, shows network in banner |
| Local parity verified | ✅ | All 10 contract tests pass, no regressions |
| Run smoke test on testnet | ✅ | 27/27 passing (~3 min): deal creation 53s, execute 67s, transfer 23s, redeem 32s |
| Run demo bot on testnet | ✅ | `node test/annuity/demo-bot.js --network hedera-testnet --fast` — full lifecycle completed |
| Dry-run the recording | ✅ | Demo bot full-lifecycle run on testnet served as dry run — timing confirmed, all phases clean |

**Gate:** ✅ Full lifecycle works via agent on Hedera Testnet. Demo bot runs clean end-to-end. **Day 2 fully complete.**

#### Day 2 — Key decisions made

1. **Single-account mode on testnet:** Hedera's Hashio RPC relay doesn't support `eth_getAccounts` — returns `[]`. Solution: load the private key into `web3.eth.accounts.wallet` via `dotenv`, and use the single funded account for all roles (deployer, issuer, investor, secondary). On local Hardhat, the 20 prefunded accounts are used as before.
2. **Short maturity for demo:** Since `evm_increaseTime` is not available on Hedera, contracts deploy with 120s maturity and ~30s coupon intervals. The API detects the network and either time-travels (local) or waits real-time (testnet).
3. **5-minute smoke test timeout:** Testnet full lifecycle takes ~3 minutes (vs <1s locally). The smoke test suite timeout was increased to 300s and individual test timeouts removed.

---

### Day 2.5 — Black-Box Verification + Bug Fixes ✅ COMPLETED

**Goal:** Systematically verify every blueprint claim against the actual implementation (black-box testing), fix any discrepancies.

#### Verification Results

48 claims verified. 45 passed. 3 discrepancies found and fixed:

| # | Issue | Severity | Root Cause | Fix |
|---|-------|----------|------------|-----|
| 1 | Local smoke test: `redeemMaturity()` reverts "Not yet matured" — 24/27 passing (not 27/27) | 🔴 HIGH | `web3.currentProvider.request()` in web3.js v4 **silently fails** to relay Hardhat-specific RPC methods (`evm_increaseTime`, `evm_mine`). Calls returned no error but had no effect on blockchain timestamp. | Replaced with raw `fetch()` JSON-RPC calls to the RPC URL. |
| 2 | Testnet smoke test: `execute` endpoint fails sporadically with `FetchError: invalid json response` | 🟡 MEDIUM | Hashio RPC relay returns HTML 503/429 pages instead of JSON-RPC during rapid-fire transactions (6 sequential txs in execute). | Added `sendWithRetry()` wrapper with 3 retries and exponential back-off (5s, 10s, 15s). |
| 3 | Agent JSDoc comment says `v0.2`, banner shows `v0.3` | 🟡 LOW | Version bump missed the file header comment. | Updated JSDoc to `v0.3`. |

#### Additional fixes applied during verification

| Fix | File | Details |
|-----|------|---------|
| Redeem `getAccounts()` wallet fallback | `api/imperium-api.js` | Added single-account fallback in redeem endpoint (was only in deal creation) |
| `node-fetch` import for time-travel | `api/imperium-api.js` | Added `require('node-fetch')` for raw JSON-RPC time-travel calls |
| Testing runbook | `docs/hedera-migration-blueprint.md` | Added Section 4.4 — step-by-step local + testnet testing commands |

#### Verified Test Results (post-fix)

| Suite | Local (Hardhat) | Hedera Testnet |
|-------|-----------------|----------------|
| Contract tests (5 files) | **10/10** ✅ (334ms) | N/A (Hardhat only) |
| API integration test | **1/1** ✅ | N/A |
| Smoke test (API + agent) | **27/27** ✅ (115ms) | **27/27** ✅ (~3 min) |
| **Total** | **38/38** ✅ | **27/27** ✅ |

Testnet smoke timing: deal creation ~48s, execute ~73s, transfer ~24s, redeem ~25s.

#### Day 2.5 — Key decisions made

1. **Raw `fetch()` over web3.js provider for dev-mode RPC:** `web3.currentProvider.request()` and `web3.provider.request()` both fail to relay non-standard JSON-RPC methods (`evm_increaseTime`, `evm_mine`) in web3.js v4. Raw `fetch()` to the RPC URL works correctly. This only affects local dev-mode time-travel — testnet uses real-time waiting.
2. **Retry with back-off for Hashio:** The Hashio JSON-RPC relay can return HTML error pages (503/429) during rapid sequential calls. A `sendWithRetry()` wrapper with 3 attempts and 5s/10s/15s delays makes the execute endpoint resilient without changing the API contract.

---

### Day 3 — HOL Registry Broker: Research + Agent Registration ✅ COMPLETED

**Goal:** Register the Imperium Annuity agent on the HOL Registry Broker using HCS-10 (OpenConvAI standard).

| # | Task | Status | Details |
|---|------|--------|---------|
| 1 | Install SDK & validate CJS import | ✅ | `npm install @hashgraphonline/standards-sdk@0.1.165` — CJS dist at `dist/cjs/standards-sdk.cjs`. `HCS10Client` and `AgentBuilder` both available via `require()`. |
| 2 | Research HCS-10 standard | ✅ | Full API mapped: `AgentBuilder` fluent API, `HCS10Client.createAndRegisterAgent()`, `submitConnectionRequest()`, `handleConnectionRequest()`, `sendMessage()`, `getMessages()`, `ConnectionsManager`. |
| 3 | Create HCS-10 agent identity | ✅ | Agent account `0.0.8218785`, inbound `0.0.8218788`, outbound `0.0.8218786`, profile `0.0.8218794`. First run failed at profile inscription (timeout); resumed from checkpoint successfully. |
| 4 | Publish agent skills | ✅ | 7 skills embedded in HCS-11 profile properties: `annuity.issue`, `.settle`, `.transfer`, `.redeem`, `.compliance`, `.analytics`, `.audit`. Plus AusCM metadata: currency AUD, dayCount ACT/365, settlement T+2. |
| 5 | Create `agent/hol-registry.js` | ✅ | CLI module with `create`, `status`, `connect` commands. Supports resumable registration via `existingState`. State persisted to `deployments/hol-agent.json`. |
| 6 | Verify registration | ✅ | Profile retrievable via `client.retrieveProfile('0.0.8218785')` — returns full profile with all skills, capabilities, and topic IDs. |
| 7 | Add env vars | ✅ | `REGISTRY_URL` added to `.env.example`. Agent state stored in `deployments/hol-agent.json` (not `.env`) for cleaner separation. |

#### Day 3 — Key decisions made

1. **ECDSA key type for HCS-10:** The SDK supports both ED25519 and ECDSA keys. Since our Hedera account uses ECDSA (same key for EVM/Hardhat), we pass `keyType: 'ecdsa'` to `HCS10Client`.
2. **Skills in HCS-11 profile properties (not HCS-26):** Embedded skills as a `properties.skills` array in the HCS-11 profile rather than using a separate HCS-26 Skill Registry. Simpler, sufficient for demo and discoverability.
3. **Resumable registration:** The SDK's `createAndRegisterAgent()` supports `existingState` for resuming from checkpoints. First run created account + topics but timed out on profile inscription. Resume picked up from profile stage and completed successfully.
4. **State in `deployments/` (not `.env`):** Agent state (account ID, topic IDs, private key) is stored in `deployments/hol-agent.json` rather than `.env` — keeps credentials separate from config, supports structured data, and aligns with how contract deployments are already stored.

#### Registered Agent Resources

| Resource | Hedera ID | HashScan |
|----------|-----------|----------|
| Agent Account | `0.0.8218785` | `https://hashscan.io/testnet/account/0.0.8218785` |
| Inbound Topic | `0.0.8218788` | `https://hashscan.io/testnet/topic/0.0.8218788` |
| Outbound Topic | `0.0.8218786` | `https://hashscan.io/testnet/topic/0.0.8218786` |
| Profile Topic | `0.0.8218794` | `https://hashscan.io/testnet/topic/0.0.8218794` |

**Gate:** ✅ Agent registered on HOL Registry Broker, skills visible and discoverable on Hedera Testnet. Agent account ID + topic IDs persisted.

---

### Day 4 — HOL Registry Broker: Agent-to-Agent Communication + Integration ✅ COMPLETED

**Goal:** Enable agent-to-agent communication via HCS-10 and integrate with the existing CLI agent.

| # | Task | Status | Details |
|---|------|--------|---------|
| 1 | Implement inbound message handler | ✅ | `listen` command in `hol-registry.js` — polls inbound topic every 5s for `connection_request` ops, auto-accepts via `handleConnectionRequest()`, creates Connection Topic, tracks active connections. |
| 2 | Implement outbound messaging | ✅ | Sends skill responses via `client.sendMessage(connectionTopicId, data, memo)` on established Connection Topics. Response format: `{skill, requestId, status, result}`. |
| 3 | Skill-to-API mapping | ✅ | 7 skills mapped to ImperiumAPI endpoints: `annuity.issue` → `POST /deal`, `annuity.settle` → `POST /deal/:id/execute`, `annuity.transfer` → `POST /deal/:id/transfer`, `annuity.redeem` → `POST /deal/:id/redeem`, `annuity.compliance` → `GET /deal/:id`, `annuity.analytics` → `GET /deal/:id/balances`, `annuity.audit` → `GET /deal/:id/transactions`. |
| 4 | Test agent-to-agent flow | ✅ | `agent/test-a2a.js` — creates a Test Requester agent (HCS-10 compliant, cached in `deployments/test-requester.json`), connects to Imperium agent, invokes `annuity.issue`, receives on-chain deal result. Full flow: **55.9s** on Hedera Testnet. |
| 5 | Handle error cases | ✅ | Unknown skill returns `{error: "Unknown skill: ..."}`, missing `correlationId` returns descriptive error, non-JSON messages skipped, API failures wrapped in error response. |
| 6 | Auto-detect key type | ✅ | `createClient()` detects ED25519 (DER prefix `302e`) vs ECDSA keys automatically — resolves `INVALID_SIGNATURE` errors when agent account uses ED25519. |

#### Day 4 — Key decisions made

1. **Polling-based listener:** The `listen` command polls the inbound topic every 5s using `getMessages()`. This is simpler and more reliable than WebSocket-based approaches for a demo. The `ConnectionsManager` loads existing connections on startup.
2. **Skill invocation protocol:** Requesting agents send `{skill, requestId, params}` as JSON on the Connection Topic. The listener parses this, maps it to the ImperiumAPI, and responds with `{skill, requestId, status, result}`. This is a lightweight RPC-over-HCS-10 pattern.
3. **Test requester as a proper HCS-10 agent:** The SDK requires both parties to have valid HCS-11 profiles. The test script creates a lightweight "Test Requester Agent" on first run, cached in `deployments/test-requester.json` for reuse.
4. **Auto key type detection:** The SDK-created agent accounts use ED25519 keys (DER-encoded), while the operator account uses ECDSA. `createClient()` now auto-detects the key type from the key prefix to avoid `INVALID_SIGNATURE` errors.
5. **Non-critical outbound recording error:** `handleConnectionRequest()` throws `INVALID_SIGNATURE` when recording the confirmation on the outbound topic. The connection itself is established and functional — this is a topic submit-key mismatch that doesn't affect messaging.

#### Agent-to-Agent Test Results

| Metric | Value |
|--------|-------|
| Test requester account | `0.0.8199239` |
| Connection Topic | `0.0.8199300` |
| Skill invoked | `annuity.issue` |
| Deal created on-chain | `a2a-1773379545798` |
| Annuity contract | `0x577e1A6Af35a8688A14298ea656B7C423E9d5702` |
| Total time | **55.9s** |

**Gate:** ✅ Agent receives a request from another agent via HCS-10, executes the annuity operation on-chain, and returns the result.

---

### Day 5 — CLI Agent v0.4–v0.5: HCS-10 Integration + AusCM Enhancements

**Goal:** Upgrade the interactive CLI agent with HCS-10 awareness and AusCM domain intelligence — bridge the human operator into the agent-to-agent network directly from the terminal, then layer on LLM-powered natural language and Australian Capital Markets analytics.

#### Phase 1 — HCS-10 Integration (v0.4) ✅

| # | Task | Status | Details |
|---|------|--------|---------|
| 1 | Evaluate external packages | ✅ | **hedera-agent-kit**: LLM-powered framework (LangChain, plugins). Does NOT integrate with HCS-10/HOL Registry — separate concern. Not needed for Day 5; evaluate for future LLM-powered agent upgrades. **@hol-org/ai-sdk-registry-broker**: Package does not exist (404 GitHub, 403 npm). HOL Registry Broker functionality already provided by `@hashgraphonline/standards-sdk`. No action. |
| 2 | Import HOL registry module into CLI agent | ✅ | `require('./hol-registry')` — reuse `loadState()`, `createClient()`, `executeSkill()`, `SKILL_ROUTES` from `hol-registry.js`. No duplication. |
| 3 | Add `"list agents"` / `"discover agents"` intent | ✅ | Queries HOL Registry REST API (`/registry/api/v1/search?q=...&limit=10`). Displays agent name, account ID, inbound topic. |
| 4 | Add `"connect to <agent>"` intent | ✅ | Uses `hcsClient.submitConnectionRequest()` + `waitForConnectionConfirmation()`. Tracks connections in `hcsConnections` Map. |
| 5 | Add `"send skill <skill> to <agent>"` intent | ✅ | Sends `{skill, requestId, params}` JSON on Connection Topic. Polls for response up to 120s (24×5s). Displays result. |
| 6 | Add `"show connections"` intent | ✅ | Displays active HCS-10 connections: Connection Topic ID, remote agent account, name. |
| 7 | Update CLI banner + help | ✅ | v0.4 banner with HCS-10 section in help. Shows agent account ID + inbound topic when HOL state available. |
| 8 | Add HCS-10 listener mode to CLI agent | ✅ | `setInterval(pollOnce, 5000)` alongside readline REPL. Auto-accepts connections, executes inbound skill requests, sends responses. `processedRequests`/`processedMessages` Sets for deduplication. |
| 9 | Test CLI ↔ HOL agent flow | ✅ | All 27 smoke tests pass (13 API lifecycle + 14 parseIntent). HCS-10 intents not yet covered by automated tests — validated manually via CLI. Manual end-to-end testing pending for Day 6 demo. |

#### Deferred — HOL REST Search Index Registration (Mainnet Only)

The agent is registered **on-chain** (HCS-10 Guarded Registry on Hedera testnet) ✅ but is NOT in the HOL REST search index (`hol.org/registry/api/v1/search`). The `register-index` command (`node agent/hol-registry.js register-index`) is implemented and ready.

**Finding:** The HOL credit purchase API executes HBAR transfers via **mainnet-only** Hedera nodes (e.g. `0.0.23`, `0.0.27`). Testnet accounts fail with `PAYER_ACCOUNT_NOT_FOUND`. Authentication (ledger challenge → base64 signature → verify) works correctly on testnet and returns a valid API key. Credit purchase is the blocker.

**Resolution:** Search index registration is deferred to mainnet deployment. The `register-index` command is production-ready — when run with a mainnet account + funded HBAR wallet it will: authenticate → purchase 10 credits (~1.12 HBAR) → submit agent profile to the index. The `list agents` CLI command works now for discovering any agents already in the index.

**On-chain registration (working today):**
- Account `0.0.8218785` on Hedera testnet ✅
- Inbound/outbound/profile topics confirmed via Mirror Node ✅
- Agent-to-agent connections + skill execution verified ✅

#### Phase 2 — AusCM Enhancements (v0.5)

| # | Task | Status | Details |
|---|------|--------|---------|
| 10 | LLM integration via `hedera-agent-kit` | ✅ | Hybrid architecture: `@langchain/anthropic` (Claude Haiku 4.5) for NLU + `hedera-agent-kit` for Hedera-native queries. Custom LangChain plugins: `annuity-plugin.js` (9 tools wrapping ImperiumAPI), `hcs10-plugin.js` (6 HCS-10 tools). Kit provides account/token/consensus/EVM query tools. Dual mode: LLM when `ANTHROPIC_API_KEY` set, regex fallback otherwise. `--no-llm` flag to force regex. CLI bumped to v0.5. |
| 11 | Yield Calculator | | `"calculate yield"` — Yield-to-maturity, current yield, accrued interest for the active deal. Australian ACT/365 day-count convention. |
| 12 | AUD Formatting | | Automatic — Display all values in AUD with proper formatting (`A$1,000,000.00`). Applied across all CLI output. |
| 13 | Compliance Summary | | `"compliance report"` — Formatted summary: issuer details, investor eligibility, coupon schedule, regulatory flags for ASIC/AFSL. |
| 14 | Deal Analytics | | `"analytics"` / `"risk summary"` — Duration, convexity, price sensitivity, coupon coverage ratio. |
| 15 | Export Audit Log | | `"export audit"` — Generate structured JSON/CSV audit trail suitable for compliance review. |
| 16 | Settlement Context | | Show T+2 settlement context in tx output, business day calculations (Australian calendar). |
| 17 | Regulatory Checkpoints | | Automatic warnings when operations might trigger ASIC disclosure thresholds or AML reporting. |

#### Day 5 — Key decisions to make

1. **Agent discovery method:** HOL Registry Broker REST API (`/registry/api/v1/agents`) vs HCS-10 registry topic scan via SDK. REST API is faster and simpler for a demo.
2. **Connection lifecycle in CLI:** Should connections persist across CLI sessions (save to `deployments/cli-connections.json`) or be session-only? Session-only is simpler for Day 5.
3. **Skill invocation UX:** Free-form (`"send annuity.issue"`) vs guided prompt that asks for parameters step by step. Free-form with sensible defaults matches the existing CLI style.
4. **Listener mode architecture:** The CLI agent needs to poll HCS-10 topics in the background while still accepting stdin input. Use `setInterval()` for background polling alongside the readline REPL — no separate process needed. The operator sees both their own commands and incoming agent-to-agent traffic in a single terminal.

#### External Package Evaluation Summary

| Package | Verdict | Rationale |
|---------|---------|-----------|
| `hedera-agent-kit` | **Not for Day 5** | LLM-powered framework (LangChain). No HCS-10/HOL integration. Our CLI agent already orchestrates Hedera via ImperiumAPI. Introduces heavy LLM deps (LangChain, model providers) for capabilities we already have. Evaluate post-demo for LLM-powered natural language upgrade path. |
| `@hol-org/ai-sdk-registry-broker` | **N/A — does not exist** | Returns 404 on GitHub, 403 on npm. The HOL Registry Broker SDK is `@hashgraphonline/standards-sdk` (already installed at `0.1.165`). |
| `@hashgraphonline/standards-sdk` | **Already in use** | Provides `HCS10Client`, `AgentBuilder`, `ConnectionsManager`. Already powers `hol-registry.js` (Days 3–4). Day 5 extends its use into the CLI agent. |

---

### Day 6 — Conversational RFQ Web UI ✅ COMPLETED

**Goal:** Build a browser-based chat interface where the Imperium Agent guides investors through an annuity RFQ flow with real-time streaming and on-chain execution.

| # | Task | Status | Details |
|---|------|--------|---------|
| 1 | React + Vite scaffold in `web/` | ✅ | 3-column layout: deal progress stepper, conversational chat, investment details |
| 2 | WebSocket chat server on `/ws/chat` | ✅ | Per-connection agent sessions via `createSession()` factory |
| 3 | RFQ plugin with `get_annuity_quotes` tool | ✅ | 4 Australian providers with realistic rates |
| 4 | RFQ system prompt defining 4-stage flow | ✅ | Introduction → Investment Summary → Beneficiary Info → Final Review |
| 5 | Structured data blocks protocol | ✅ | `~~~rfq-*~~~` / `` ```rfq-*``` `` fences for rich UI rendering (stage, quotes, details, chips, investment card) |
| 6 | Session factory in `llm-agent.js` | ✅ | `createSession()` — independent sessions per WebSocket, backward-compatible singleton for CLI |
| 7 | LLM response streaming | ✅ | Tokens stream via WebSocket in real time |
| 8 | Typewriter effect for agent messages | ✅ | Smooth token-by-token rendering in the browser |
| 9 | Live quotes comparison table | ✅ | SELECT buttons for provider selection |
| 10 | Investment success card | ✅ | On-chain data display (contract addresses, tx count) |
| 11 | Suggestion chips | ✅ | LLM-generated contextual quick-reply buttons |
| 12 | Imperium Markets branding | ✅ | Logo, colors #f35d00/#f8c200/#0f101d, Roboto font |
| 13 | Performance optimizations | ✅ | Streaming (70% latency reduction), history trimming (20→50 messages), system prompt condensed (~60%) |
| 14 | Content block format handling | ✅ | String vs array handling for LangChain Anthropic streaming compatibility |
| 15 | Production + Development modes | ✅ | Production: Express serves `web/dist/` on port 4000. Development: Vite on 5173 with proxy |

**Gate:** ✅ Full RFQ flow working in browser — greet → collect details → show quotes → select provider → beneficiary → confirm → on-chain execution → success card.

---

### Day 6.5 — Multi-Asset Expansion (Term Deposits + NCDs) ✅ COMPLETED

**Goal:** Expand from annuity-only to three tokenised Australian Capital Markets instruments: Annuities, Term Deposits, and NCDs.

| # | Task | Status | Details |
|---|------|--------|---------|
| 1 | TermDepositToken.sol contract | ✅ | Non-tradeable. Constructor: issuer, dates, faceValue, interestRate, interestAmount, stablecoin. Lifecycle: `acceptAndIssue()` → `redeemMaturity()` (returns faceValue + interest). ReentrancyGuard + SafeERC20. |
| 2 | NCDToken.sol contract | ✅ | Tradeable. Bought at discountedValue, redeemed at full faceValue. Lifecycle: `acceptAndIssue()` → `transferNCD()` → `redeemMaturity()`. Secondary market transfer support. |
| 3 | Term Deposit API endpoints | ✅ | `POST /term-deposit`, `/term-deposit/:id/execute`, `/term-deposit/:id/redeem`, `GET /term-deposit/:id`, `/term-deposit/:id/balances` |
| 4 | NCD API endpoints | ✅ | `POST /ncd`, `/ncd/:id/execute`, `/ncd/:id/transfer`, `/ncd/:id/redeem`, `GET /ncd/:id`, `/ncd/:id/balances` |
| 5 | Term Deposit agent plugin | ✅ | `term-deposit-plugin.js` — 5 tools (create, execute, redeem, status, balances) |
| 6 | NCD agent plugin | ✅ | `ncd-plugin.js` — 6 tools (create, execute, transfer, redeem, status, balances) |
| 7 | RFQ plugin — multi-asset quotes | ✅ | Added `get_term_deposit_quotes` (WBC, NAB, CBA, ANZ) and `get_ncd_quotes` (BOQ, Macquarie, Suncorp, Bendigo) to existing RFQ plugin |
| 8 | RFQ system prompt — asset recommendation | ✅ | Agent recommends best product type based on investor goals. Routes to correct create/execute tools per asset type in Stage 4. |
| 9 | Plugin wiring (CLI + WebSocket) | ✅ | TD and NCD plugins registered in both `llm-agent.js` (CLI) and `imperium-api.js` (WebSocket chat) |
| 10 | Test suite — Term Deposits | ✅ | `test/term-deposit/` — 2 files, 6 tests: lifecycle (issue→mature→redeem, pre-maturity revert), security (double-issue, only-issuer, double-redeem, pre-issue) |
| 11 | Test suite — NCDs | ✅ | `test/ncd/` — 3 files, 10 tests: lifecycle (with/without trade), transfers (4 edge cases), security (double-issue, only-issuer, double-redeem, pre-issue) |
| 12 | Hardhat config update | ✅ | `spec: "test/**/*.test.js"` — runs all test folders (annuity, term-deposit, ncd) |
| 13 | Compile verification | ✅ | Both new contracts compile successfully alongside existing ones |

**Test Results:** 16/16 new tests passing (6 TD + 10 NCD). All 10 existing annuity tests still pass. Total: 26+ contract tests.

**Gate:** ✅ Three asset types fully operational — contracts, API, agent plugins, quotes, tests. Agent recommends the best product based on investor goals.

---

### Day 7 — Demo Recording + Buffer

**Goal:** Record final demo showcasing agent on Hedera Testnet with HOL Registry Broker integration, CLI v0.4 HCS-10 commands, and web UI RFQ flow.

| Task | Details |
|------|---------|
| Final dry run | Fresh deploy → agent registration (HCS-10 `create()`) → skill discovery → full lifecycle via HCS-10 connection → CLI agent HCS-10 commands → web UI RFQ flow |
| Record demo video | Screen recording: (1) agent registration on HOL Registry Broker, (2) skill discovery via `RegistryBrokerClient.search()`, (3) agent-to-agent lifecycle on Hedera Testnet via Connection Topics, (4) CLI agent v0.4 HCS-10 commands (discover, connect, send skill, show connections), (5) web UI conversational RFQ flow with multi-asset recommendation and streaming |
| Write demo summary | 1-page doc: what was shown, contract addresses, agent account ID, inbound/outbound topic IDs, tx hashes, HOL Registry entries |
| Commit + push | All changes committed, clean repo |
| Prepare Q&A notes | Common questions: costs, mainnet readiness, HTS migration path, HCS-10 production considerations, multi-asset strategy |

---

## 3.1) Agent Differentiation Strategy — Australian Capital Markets

### Context

Hedera's portal now offers free AI-assisted **Contract Builder** and **Playground** tools that allow anyone to deploy and interact with smart contracts. These are generic, developer-focused utilities. Our agents must demonstrate **domain-specific intelligence** that these tools cannot provide — tailored for Australian Capital Markets (AusCM).

This differentiation is critical for:
1. **Management demo** — showing unique value beyond what Hedera gives away for free.
2. **White paper** — articulating why Imperium's agent layer is necessary on top of Hedera's infrastructure.

### Differentiation Pillars

| Pillar | Hedera Portal (free) | Imperium Agents (our value) |
|--------|---------------------|-----------------------------|
| **Contract interaction** | Generic: deploy, call, read | Domain-aware: knows annuity lifecycle semantics, validates business logic |
| **Compliance** | None | Australian regulatory context: ASIC reporting hooks, AFSL considerations, AML/KYC checkpoints |
| **Market conventions** | None | AUD-denominated, Australian day-count conventions (ACT/365), ASX settlement cycles (T+2) |
| **Multi-party workflows** | Single user | Agent-to-agent: issuer, investor, custodian, regulator roles via HCS-10 |
| **Risk & analytics** | None | Yield-to-maturity, accrued interest, mark-to-market, duration calculations |
| **Audit trail** | Basic tx explorer | Structured compliance reports, exportable audit logs, regulatory disclosure formatting |
| **Integration readiness** | Standalone | Designed for ASX/CHESS integration, Australian payment rails (NPP/PayTo), custodian APIs |

### CLI Agent Enhancements (v0.4 → v0.5)

These features enhance the current CLI agent with AusCM domain intelligence. Moved to Day 5 (remaining time after HCS-10 integration).

| Feature | Intent/Command | Details | Status |
|---------|---------------|---------|--------|
| **LLM Integration** | Natural language | Integrate `hedera-agent-kit` (LangChain) to replace rule-based `parseIntent()` with LLM-powered natural language understanding. Freeform queries instead of regex patterns. Key differentiator vs Hedera's free portal tools. | ✅ Done (v0.5) |
| **Yield Calculator** | `"calculate yield"` | Yield-to-maturity, current yield, accrued interest for the active deal | |
| **Compliance Summary** | `"compliance report"` | Formatted summary: issuer details, investor eligibility, coupon schedule, regulatory flags | |
| **AUD Formatting** | Automatic | Display all values in AUD with proper formatting (`A$1,000,000.00`) | |
| **Deal Analytics** | `"analytics"` / `"risk summary"` | Duration, convexity, price sensitivity, coupon coverage ratio | |
| **Regulatory Checkpoints** | Automatic warnings | Flag when operations might trigger ASIC disclosure thresholds or AML reporting | |
| **Export Audit Log** | `"export audit"` | Generate structured JSON/CSV audit trail suitable for compliance review | |
| **Settlement Context** | In tx output | Show T+2 settlement context, business day calculations (Australian calendar) | |
| **HCS-10 Awareness** | `"list agents"`, `"connect to <agent>"`, `"send skill request"`, `"show connections"` | Discover HOL-registered agents, establish HCS-10 connections, invoke skills on remote agents, and view active connections — all from the interactive CLI. | ✅ Done (v0.4) |

### HOL Registry Broker Agent Enhancements (Days 3–4)

The HCS-10 registered agent should publish skills that reflect AusCM domain expertise:

| Skill | Description | Why it differentiates |
|-------|-------------|----------------------|
| `annuity.issue` | Issue a new AnnuityToken with AusCM parameters | Validates against Australian regulatory constraints |
| `annuity.settle` | Execute settlement with T+2 context | Settlement timing aware of ASX business calendar |
| `annuity.transfer` | Secondary market transfer with price discovery | Includes yield-based pricing, not just arbitrary price |
| `annuity.redeem` | Maturity redemption with compliance checks | Validates maturity conditions, generates redemption certificate |
| `annuity.compliance` | Generate compliance report for a deal | Structured for ASIC/AFSL reporting requirements |
| `annuity.analytics` | Risk analytics for a deal or portfolio | Yield curves, duration, convexity — Australian conventions |
| `annuity.audit` | Export full audit trail | Timestamped, immutable, suitable for regulatory audit |

### White Paper Hooks

Each feature above maps to a section in the future white paper:

| Blueprint Feature | White Paper Section |
|-------------------|-------------------|
| Hedera deployment + Hashio RPC | "Infrastructure: Why Hedera for AusCM" |
| Agent domain intelligence | "Smart Agents vs Generic Tools" |
| HCS-10 agent-to-agent | "Multi-Party Orchestration in Capital Markets" |
| Compliance & regulatory features | "Regulatory-Ready DLT for Australian Markets" |
| Yield/risk analytics | "On-Chain Analytics for Fixed Income" |
| ASX/CHESS integration design | "Integration Roadmap: Traditional ↔ DLT Settlement" |

---

## 4) Key Technical Decisions

### 4.1 Hardhat 2 over Truffle (and over Hardhat 3)

| Factor | Decision |
|--------|----------|
| Truffle sunset (Sept 2023) | Hardhat is the industry standard and actively maintained |
| Hedera docs/examples | All use Hardhat |
| Plugin ecosystem | `hardhat-verify`, gas reporter, coverage tools |
| Test compatibility | Same Mocha/Chai — full ethers.js v6 rewrite done |
| **Hardhat 2 vs 3** | Hardhat 3 requires ESM + Node 22.10+; project is CommonJS — chose Hardhat 2.28.6 |

### 4.2 Hedera JSON-RPC Relay (Hashio)

Hedera's Hashio provides a standard Ethereum JSON-RPC interface. Our existing Solidity contracts and web3.js calls work as-is — no Hedera SDK needed for Phase 1.

| RPC Method | Hardhat Network | Hedera (Hashio) |
|------------|-----------------|-----------------|
| `eth_sendTransaction` | ✅ | ✅ |
| `eth_call` | ✅ | ✅ |
| `eth_getTransactionReceipt` | ✅ | ✅ (slower finality) |
| `evm_increaseTime` | ✅ | ❌ Not supported |
| `evm_mine` | ✅ | ❌ Not supported |

### 4.3 Time-travel workaround

`evm_increaseTime` doesn't exist on Hedera. For the testnet demo:
- Deploy with a **short maturity** (60–120 seconds in the future).
- Wait real-time for maturity before calling `redeemMaturity()`.
- The API detects the network and either time-travels (local) or waits (testnet).

### 4.4 Testing Runbook

Step-by-step commands to verify the full test suite. All commands run from the project root.

#### Local Testing (Hardhat Network)

```bash
# ── 1. Contract tests (self-contained, no infra needed) ──────────
npx hardhat test test/annuity/01-annuity.flow.test.js \
  test/annuity/02-annuity.payments.test.js \
  test/annuity/03-annuity.transfer.test.js \
  test/annuity/04-annuity.security.test.js \
  test/annuity/05-annuity.reentrancy.test.js
# Expected: 10 passing

# ── 2. Start infra for API + smoke tests ──────────────────────────
npx hardhat node &                                           # Hardhat node on 8545
sleep 3                                                      # Wait for node
npx hardhat compile                                          # Compile contracts
npx hardhat run scripts/deploy.js --network localhost         # Deploy contracts
node api/imperium-api.js --network local &                     # API on port 4000
sleep 2                                                      # Wait for API

# ── 3. API integration test ──────────────────────────────────────
npx hardhat test test/annuity/01-annuity.api.flow.test.js --network localhost
# Expected: 1 passing

# ── 4. Full lifecycle smoke test ─────────────────────────────────
npx hardhat test test/annuity/06-smoke.fullcycle.test.js --network localhost
# Expected: 27 passing

# ── 5. Cleanup ───────────────────────────────────────────────────
kill %1 %2   # Stop Hardhat node and API
```

**Total: 38 tests (10 contract + 1 API integration + 27 smoke)**

#### Hedera Testnet Testing

```bash
# ── Prerequisites ────────────────────────────────────────────────
# .env must contain HEDERA_TESTNET_PRIVATE_KEY (funded account)

# ── 1. Deploy to Hedera Testnet ──────────────────────────────────
npx hardhat compile
npx hardhat run scripts/deploy.js --network hederaTestnet
# Saves addresses to deployments/hedera-testnet.json
# Maturity: 120s, coupon intervals: ~30s

# ── 2. Start API against testnet ─────────────────────────────────
node api/imperium-api.js --network hedera-testnet &
sleep 2

# ── 3. Full lifecycle smoke test (~3–5 min) ──────────────────────
npx hardhat test test/annuity/06-smoke.fullcycle.test.js --network localhost
# Note: test runner connects to localhost but the API proxies to Hedera
# Expected: 27 passing (slow — each tx takes 3-5s + real-time maturity wait)

# ── 4. Cleanup ───────────────────────────────────────────────────
kill %1   # Stop API
```

#### Quick Validation (all-in-one via start.sh)

```bash
./start.sh                            # Local: node + deploy + API + agent
./start.sh --network hedera-testnet   # Testnet: deploy + API + agent
```

### 4.5 HCS-10 Resource Reference

All HCS-10 documentation lives on **hol.org** (Hashgraph Online DAO), **not** on `docs.hedera.com`.

| Resource | URL |
|----------|-----|
| HCS-10 Standard (full spec) | `https://hol.org/docs/standards/hcs-10` |
| HCS-11 Profile Standard | `https://hol.org/docs/standards/hcs-11` |
| HCS-26 Skill Registry | `https://hol.org/docs/libraries/standards-sdk/hcs-26/` |
| SDK Documentation | `https://hol.org/docs/libraries/standards-sdk/hcs-10/` |
| SDK GitHub (monorepo) | `https://github.com/hashgraph-online/standards-sdk` |
| Demo code (agent creation, messaging) | `https://github.com/hashgraph-online/standards-sdk/tree/main/demo/hcs-10` |
| npm package | `@hashgraphonline/standards-sdk` (or `@hol-org/standards-sdk`) |
| Registry Broker API | `https://hol.org/registry/api/v1` |
| OpenAPI Spec | `https://hol.org/registry/api/v1/openapi.json` |
| Registry Broker Client docs | `https://hol.org/docs/libraries/standards-sdk/registry-broker-client/` |

#### HCS-10 Protocol Architecture (summary)

HCS-10 uses **4 types of HCS topics** per the [HCS-2 registry standard](https://hol.org/docs/standards/hcs-2/):

| Topic Type | Memo Format | Purpose |
|------------|-------------|---------|
| Registry (type=3) | `hcs-10:0:{ttl}:3:[metadataTopicId]` | Directory of registered agents. Public or fee-gated via HIP-991. |
| Inbound (type=0) | `hcs-10:0:{ttl}:0:{accountId}` | Receives connection requests from other agents. Public, submit-key-gated, or fee-gated. |
| Outbound (type=1) | `hcs-10:0:{ttl}:1` | Public log of agent's actions (connection requests sent/received, closures). Submit-key-gated (only agent writes). |
| Connection (type=2) | `hcs-10:1:{ttl}:2:{inboundTopicId}:{connectionId}` | Private channel between two agents. Threshold key (both can write). |

#### HCS-10 Operations (key ones for Day 3–4)

| Operation | Enum | Where | JSON `op` value | When |
|-----------|------|-------|-----------------|------|
| Register | 0 | Registry topic | `"register"` | Agent adds itself to the registry |
| Connection Request | 3 | Inbound topic | `"connection_request"` | Agent A asks to connect to Agent B |
| Connection Created | 4 | Inbound + Outbound | `"connection_created"` | Agent B confirms and creates a Connection Topic |
| Message | 6 | Connection topic | `"message"` | Normal message exchange between connected agents |
| Close Connection | 5 | Connection topic | `"close_connection"` | Either agent ends the conversation |
| Transaction | — | Connection topic | `"transaction"` | Propose a scheduled Hedera transaction for approval |

#### HCS-10 Agent Creation (what `client.create()` does)

Each agent requires **4 Hedera resources** (each is a separate transaction costing HBAR):

1. **New Hedera account** — separate from the operator, with its own ECDSA key pair
2. **Inbound topic** — for receiving connection requests
3. **Outbound topic** — for public activity log (submit-key-gated)
4. **HCS-11 profile** — agent metadata inscribed via HCS-1 (display name, bio, topic IDs, skills, `aiAgent` object)

The SDK supports **resumable creation**: if interrupted, it persists state to `.env` and resumes from the last successful step on next run.

#### HCS-10 SDK Quickstart (for `agent/hol-registry.js`)

```javascript
// CommonJS import (validate this works first!)
const { HCS10Client } = require('@hashgraphonline/standards-sdk');

const client = new HCS10Client({
  network: 'testnet',
  operatorId: process.env.HEDERA_ACCOUNT_ID,
  operatorPrivateKey: process.env.HEDERA_PRIVATE_KEY,
  guardedRegistryBaseUrl: process.env.REGISTRY_URL, // defaults to moonscape.tech
  logLevel: 'debug',
});

// Create agent (creates account, topics, profile, registers)
const agent = await client.create(agentBuilder);

// Submit connection request
const response = await client.submitConnectionRequest(targetInboundTopicId, memo);

// Wait for confirmation
const confirmation = await client.waitForConnectionConfirmation(
  targetInboundTopicId, response.topicSequenceNumber, timeoutSec, pollIntervalMs
);

// Send message on established connection
await client.sendMessage(connectionTopicId, JSON.stringify(data), memo);

// Retrieve messages
const messages = await client.getMessages(connectionTopicId);
```

### 4.6 Day 3 Technical Risks & Mitigations

| Risk | Severity | Details | Mitigation |
|------|----------|---------|------------|
| **ESM/CJS compatibility** | 🔴 HIGH | `@hashgraphonline/standards-sdk` has `"type": "module"` in source but ships CJS dist at `dist/cjs/standards-sdk.cjs` with `"require"` export. Must validate `require()` works in our CommonJS project. | **Gate test (Day 3, first 30 min):** `node -e "const sdk = require('@hashgraphonline/standards-sdk'); console.log(Object.keys(sdk))"`. If fails → use `await import(...)` wrapper or create `agent/hol-registry.mjs`. |
| **SDK dependency weight** | 🟡 MEDIUM | SDK pulls in heavy transitive deps: `@hashgraph/sdk ^2.78.0`, `ethers ^6.15.0`, `viem ^2.19.9`, `axios ^1.13.6`, `chalk`, `dotenv`, `bignumber.js`, etc. Significant `node_modules` growth. | Accept the weight for now. The `@hashgraph/sdk` comes for free (needed anyway for HCS-10). Monitor for version conflicts with our existing `ethers` (via `@nomicfoundation/hardhat-toolbox`). |
| **`@hashgraph/sdk` version conflict** | 🟡 MEDIUM | SDK requires `@hashgraph/sdk ^2.78.0`. Our project doesn't currently have it as a direct dep — it uses Hashio JSON-RPC via web3.js. The SDK brings it as transitive. | Run `npm ls @hashgraph/sdk` after install. Verify no duplicate/conflicting versions. If conflict → pin with `overrides` in `package.json`. |
| **SDK version instability** | 🟡 MEDIUM | Current version is `0.1.158-canary.0` — pre-1.0 with `canary` tag. API surface may shift. | Pin the exact installed version in `package.json` (use `--save-exact`). Check for stable releases before installing. |
| **HBAR cost for agent creation** | 🟡 MEDIUM | Agent creation = 4-6 Hedera transactions (account, 2 topics, profile inscription, registration). Testnet HBAR is free but account must have sufficient balance. | Check balance before starting (`hedera.portal` faucet). Agent creation is resumable — no double-spend on interruption. |
| **Registry URL configuration** | 🟢 LOW | Demo code defaults to `REGISTRY_URL=https://moonscape.tech`. The `guardedRegistryBaseUrl` parameter controls which registry the agent registers with. | Add `REGISTRY_URL` to `.env.example` with default. Document in `.env.example`. |
| **HCS-26 vs HCS-11 skills** | 🟢 LOW | Two options for publishing skills: embed in HCS-11 profile `properties` field (simpler, part of profile), or use dedicated HCS-26 Skill Registry standard (more discoverable, separate standard). | Start with HCS-11 profile properties (fewer transactions, simpler). Evaluate HCS-26 as stretch goal. |

---

## 5) Test Suite Migration (Truffle → Hardhat) ✅ COMPLETED

All 7 test files have been migrated from Truffle APIs to Hardhat/ethers.js v6.

### 5.1 Truffle APIs replaced

| Truffle API | Hardhat Replacement | Status |
|-------------|---------------------|--------|
| `artifacts.require("Name")` | `ethers.getContractFactory("Name")` | ✅ Done |
| `contract("desc", (accounts) => {})` | `describe("desc", function() {})` + `ethers.getSigners()` | ✅ Done |
| `web3.utils.toWei / fromWei / toBN` | `ethers.parseEther()` / `ethers.formatEther()` / `BigInt` | ✅ Done |
| `expectRevert(promise, "msg")` | `await expect(promise).to.be.revertedWith("msg")` | ✅ Done |
| `expectRevert.unspecified(promise)` | `await expect(promise).to.be.reverted` | ✅ Done |
| `new BN(x).sub(new BN(y))` | `BigInt(x) - BigInt(y)` (ethers v6 returns native BigInt) | ✅ Done |
| `{ from: address }` tx options | `contract.connect(signer).method()` | ✅ Done |
| `contract.address` | `await contract.getAddress()` | ✅ Done |

### 5.2 Dependencies swapped

| Removed | Added |
|---------|-------|
| `truffle@^5.11.5` | `hardhat@^2.28.6` |
| `@openzeppelin/test-helpers@^0.5.16` | `@nomicfoundation/hardhat-toolbox@^5.0.0` (includes ethers, chai-matchers, etc.) |
| — | `dotenv@^17.3.1` |

**Kept:** `web3@^4.16.0` (for `imperium-api.js` runtime), `@openzeppelin/contracts@^5.4.0`, `express@^4.18.2`, `node-fetch@^2.6.7`

### 5.3 Per-file migration checklist

#### `01-annuity.flow.test.js` (lifecycle + secondary trading)
- [x] `artifacts.require` → `ethers.getContractFactory` + `.deploy()`
- [x] `contract()` → `describe()` + `const [issuer, investor, secondary] = await ethers.getSigners()`
- [x] `web3.utils.toWei("1000", "ether")` → `ethers.parseEther("1000")`
- [x] `web3.utils.fromWei(bal, "ether")` → comparison via `ethers.parseEther()` (BigInt equality)
- [x] `web3.utils.toBN()` → native `BigInt` arithmetic
- [x] `{ from: investor }` → `contract.connect(investorSigner).method()`
- [x] `assert.equal` → `expect().to.equal()` (chai)
- [x] `stablecoin.address` → `await stablecoin.getAddress()`

#### `02-annuity.payments.test.js` (coupon payments)
- [x] Same base changes as 01
- [x] `expectRevert(promise, "msg")` → `await expect(promise).to.be.revertedWith("msg")`

#### `03-annuity.transfer.test.js` (secondary transfers)
- [x] Same base changes as 01
- [x] `expectRevert.unspecified(promise)` → `await expect(promise).to.be.reverted`
- [x] `expectRevert(promise, "msg")` → `await expect(promise).to.be.revertedWith("msg")`
- [x] Zero address: `"0x000..."` → `ethers.ZeroAddress`

#### `04-annuity.security.test.js` (access control)
- [x] Same base changes as 01
- [x] `expectRevert` — 2 instances converted

#### `05-annuity.reentrancy.test.js` (reentrancy guard)
- [x] `BN` arithmetic → native `BigInt` (`issuerBalAfter - issuerBalBefore`)
- [x] `MaliciousERC20 = artifacts.require("MaliciousStablecoin")` → `ethers.getContractFactory`
- [x] `assert` → `expect` (chai)

#### `06-smoke.fullcycle.test.js` (API smoke + agent parser)
- [x] `contract()` → `describe()` (function form for Mocha `this`)
- [x] Added `const { assert } = require('chai')` for explicit assert import
- [x] Updated header comment (Hardhat node reference)

#### `01-annuity.api.flow.test.js` (API integration)
- [x] `contract()` → `describe()`
- [x] Fixed `http://localhost:4000` → `http://127.0.0.1:4000` (4 instances)
- [x] Added `const { assert } = require('chai')`

#### `demo-bot.js` (visual demo)
- [x] No changes needed — uses `child_process.spawn` only

### 5.4 Migration approach decision

| Approach | Effort | Outcome |
|----------|--------|---------|
| ~~**hardhat-web3 plugin**~~ | N/A | ❌ Rejected — `@nomiclabs/hardhat-web3` targets web3 v1.x, incompatible with project's web3 v4 |
| **Full ethers.js v6 rewrite** | ~2 hours | ✅ Chosen — clean, modern, all 10 tests pass |

---

## 6) File Changes Summary

| File | Action | Day |
|------|--------|-----|
| `hardhat.config.js` | **Created** — Solidity 0.8.21, Hardhat Network + localhost, Mocha config | 1 |
| `scripts/deploy.js` | **Created** — Hardhat deploy script (ethers.js) | 1 |
| `.env.example` | **Created** — Template for Hedera credentials | 1 |
| `.gitignore` | **Updated** — Added cache/, artifacts/, .env, .DS_Store | 1 |
| `package.json` | **Modified** — Swapped deps (truffle→hardhat), added npm scripts | 1 |
| `api/imperium-api.js` | **Modified** — ABI paths: `build/contracts/` → `artifacts/contracts/*.sol/` | 1 |
| `start.sh` | **Modified** — Ganache → Hardhat node, truffle migrate → hardhat run | 1 |
| `test/annuity/01-annuity.flow.test.js` | **Rewritten** — Truffle → ethers.js v6 | 1 |
| `test/annuity/02-annuity.payments.test.js` | **Rewritten** — Truffle → ethers.js v6 | 1 |
| `test/annuity/03-annuity.transfer.test.js` | **Rewritten** — Truffle → ethers.js v6 | 1 |
| `test/annuity/04-annuity.security.test.js` | **Rewritten** — Truffle → ethers.js v6 | 1 |
| `test/annuity/05-annuity.reentrancy.test.js` | **Rewritten** — Truffle → ethers.js v6 | 1 |
| `test/annuity/06-smoke.fullcycle.test.js` | **Modified** — `contract()` → `describe()`, added chai assert | 1 |
| `test/annuity/01-annuity.api.flow.test.js` | **Modified** — `contract()` → `describe()`, fixed localhost | 1 |
| `truffle-config.js` | **Deleted** | 1 |
| `migrations/` | **Deleted** | 1 |
| `build/` | **Deleted** (Truffle artifacts) | 1 |
| `config/networks.js` | **Created** — Network config loader (local + hedera-testnet), deployment save/load, explorer URL helpers | 2 |
| `deployments/hedera-testnet.json` | **Auto-generated** — Created by deploy script on `--network hederaTestnet` | 2 |
| `hardhat.config.js` | **Modified** — Added `hederaTestnet` network (chainId 296, 120s timeout) | 2 |
| `scripts/deploy.js` | **Modified** — Saves addresses to `deployments/`, short maturity (120s) for Hedera, explorer output | 2 |
| `api/imperium-api.js` | **Modified** — `--network` flag, config loader, gas multiplier, finality delay, real-time maturity wait, explorer links, `dotenv` require, wallet loading for testnet (single-account mode via `web3.eth.accounts.wallet`) | 2 |
| `agent/cli-agent.js` | **Modified** — v0.3, `txLink()`/`contractLink()` helpers, HashScan links, network banner, `waitForMaturity` display | 2 |
| `test/annuity/demo-bot.js` | **Modified** — `--network` flag, 3-min testnet timeouts, network label, NETWORK env passthrough | 2 |
| `test/annuity/06-smoke.fullcycle.test.js` | **Modified** — 5-min suite timeout, service name `ImperiumAPI`, header updated | 2 |
| `start.sh` | **Modified** — `--network` arg, local/testnet branching, `.env` validation for testnet mode | 2 |
| `package.json` | **Modified** — Added `deploy:hedera`, `start:hedera`, `demo`, `demo:hedera` scripts | 2 |
| `.gitignore` | **Modified** — Added `deployments/` | 2 |
| `.env.example` | **Modified** — Expanded with setup instructions | 2 |
| `api/imperium-api.js` | **Modified** — Fixed time-travel: `web3.currentProvider.request()` → raw `fetch()` JSON-RPC for `evm_increaseTime`/`evm_mine`; added `sendWithRetry()` (3 retries, exponential back-off) for Hashio resilience; added `node-fetch` import; added `getAccounts()` wallet fallback in redeem endpoint | 2.5 |
| `agent/cli-agent.js` | **Modified** — Fixed JSDoc version comment: `v0.2` → `v0.3` | 2.5 |
| `docs/hedera-migration-blueprint.md` | **Modified** — Added Section 4.4 Testing Runbook, added Day 2.5 verification summary, bumped to v3.3 | 2.5 |
| `agent/hol-registry.js` | **Created** — HCS-10 registration, skill publishing, `connect` command, resumable registration via `existingState`, state persisted to `deployments/hol-agent.json` | 3 |
| `deployments/hol-agent.json` | **Auto-generated** — Agent identity: account `0.0.8218785`, inbound/outbound/profile topic IDs, 7 skills, capabilities | 3 |
| `package.json` | **Modified** — Added `@hashgraphonline/standards-sdk@0.1.165` | 3 |
| `.env.example` | **Modified** — Added `REGISTRY_URL`; agent state stored in `deployments/hol-agent.json` (not `.env`) | 3 |
| `agent/hol-registry.js` | **Modified** — Added `listen` command (inbound polling, auto-accept connections, skill execution, response messaging), `SKILL_ROUTES` mapping (7 skills → API endpoints), `executeSkill()`, `ConnectionsManager` integration, auto key type detection (ED25519 vs ECDSA) | 4 |
| `agent/test-a2a.js` | **Created** — Agent-to-agent communication test script, creates/caches Test Requester agent, connects via HCS-10, invokes skill, polls for response, displays results | 4 |
| `deployments/test-requester.json` | **Auto-generated** — Test requester agent identity: account `0.0.8199239`, inbound/outbound/profile topic IDs | 4 |
| `agent/cli-agent.js` | **Rewritten** — v0.3 → v0.4. Added HCS-10 agent network: 6 new intents (`HCS_LISTEN`, `HCS_STOP_LISTEN`, `HCS_LIST_AGENTS`, `HCS_CONNECT`, `HCS_SEND_SKILL`, `HCS_CONNECTIONS`), `initHCS()` lazy init, `handleListAgents()` via HOL Registry REST API, `handleConnect()` with connection confirmation polling, `handleSendSkill()` with 120s response polling, `handleStartListener()`/`handleStopListener()` with `setInterval(pollOnce, 5000)`, deduplication Sets, v0.4 banner with agent account ID display | 5 |
| `docs/hedera-migration-blueprint.md` | **Modified** — Extended to 6 days, new Day 5 (HCS-10 CLI integration), old Day 5 → Day 6, external package evaluation table, key decisions #1-4, updated milestones, bumped to v3.8 | 5 |
| `agent/hol-registry.js` | **Modified** — Fixed `register-index` auth: replaced broken `authenticateWithLedgerCredentials()` with low-level `createLedgerChallenge` → base64 sign → `verifyLedgerChallenge` (with `network` + `accountId`). Replaced direct API credit purchase with SDK `ensureCreditsForRegistration` + `purchaseCreditsWithHbar`. Added `profile.type: 1` (AI_AGENT). Clear mainnet-only error message for HBAR payments. | 5 |
| `docs/hedera-migration-blueprint.md` | **Modified** — Search index registration deferred to mainnet, v3.9 changelog, updated asset table for `hol-registry.js` | 5 |
| `agent/plugins/annuity-plugin.js` | **Created** — LangChain plugin: 9 annuity tools (create, execute, transfer, redeem, status, balances, list, transactions, health) wrapping ImperiumAPI endpoints | 5+ |
| `agent/plugins/hcs10-plugin.js` | **Created** — LangChain plugin: 6 HCS-10 tools (list agents, connect, send skill, show connections, start/stop listener) | 5+ |
| `agent/llm-agent.js` | **Created** — LLM agent module: `@langchain/anthropic` (Claude Haiku 4.5) + `hedera-agent-kit` query plugins + custom plugins. Tool-calling loop with conversation history. System prompt with AusCM domain context. | 5+ |
| `agent/cli-agent.js` | **Modified** — v0.4 → v0.5. Dual mode: LLM (Claude + hedera-agent-kit) when `ANTHROPIC_API_KEY` set, regex fallback otherwise. `--no-llm` flag. Updated banner, help text. | 5+ |
| `package.json` | **Modified** — Added `hedera-agent-kit`, `@langchain/anthropic`, `@langchain/core`, `langchain` | 5+ |
| `.env.example` | **Modified** — Added `ANTHROPIC_API_KEY` documentation | 5+ |
| `test/annuity/06-smoke.fullcycle.test.js` | **Modified** — Added conditional LLM agent test block (4 tests, skipped without API key) | 5+ |
| `agent/llm-agent.js` | **Modified** — Session factory (`createSession()`), streaming support, content block format handling (string vs array), history trim 20→50 messages | 6 |
| `agent/plugins/rfq-plugin.js` | **Created** — RFQ quotes tool (`get_annuity_quotes`) + 4-stage system prompt for web UI | 6 |
| `api/imperium-api.js` | **Modified** — WebSocket server (`/ws/chat`), CORS, structured response parser, static file serving (`web/dist/`), streaming handler | 6 |
| `web/` (entire directory) | **Created** — React + Vite app (~15 files): 3-column layout, chat, stepper, investment details, suggestion chips, quotes table, success card | 6 |
| `package.json` | **Modified** — Added `ws`, `cors` deps; added `build:web`, `dev:web` scripts | 6 |
| `.gitignore` | **Modified** — Added `web/dist/` | 6 |
| `start.sh` | **Modified** — Web UI info | 6 |
| `README.md` | **Modified** — Added Web UI section | 6 |

---

## 7) Risks & Mitigations

| Risk | Impact | Mitigation | Status |
|------|--------|------------|--------|
| Hardhat migration breaks existing tests | Blocks progress | Run tests after each change, keep Ganache as fallback | ✅ Mitigated — all 10 tests pass |
| Hedera gas costs differ from Ganache estimates | Deploy may fail | Use generous gas limits, check Hashio docs | ✅ Mitigated — 1.2x gas multiplier in `config/networks.js` |
| Finality delay (3-5s per tx) | Demo feels slow | Set expectations, show HashScan confirmation | ✅ Mitigated — 5s delay + HashScan links in output |
| No `evm_increaseTime` on testnet | Can't redeem with long maturity | Deploy with 60-120s maturity for demo | ✅ Mitigated — 120s maturity + real-time wait |
| Testnet faucet limits | Can't fund wallets | Request HBAR early, reuse accounts | ✅ Mitigated — single account plays all roles |
| Hashio `getAccounts()` returns empty | API can't find signers | Load private key into web3 wallet | ✅ Mitigated — `dotenv` + `web3.eth.accounts.wallet.add()` |
| Merged Day 2 is time-pressured (~6-8 hrs) | May not finish all phases | Phases are sequential with independent gates; Phase C can slip to Day 3 morning if needed | ✅ Mitigated — Phases A+B+C (automated) complete |
| web3.js v4 silently drops non-standard RPC calls | Time-travel fails locally, redeem breaks | Use raw `fetch()` JSON-RPC for `evm_increaseTime`/`evm_mine` | ✅ Mitigated — raw fetch in `imperium-api.js` (Day 2.5) |
| Hashio returns HTML 503/429 under rapid tx load | Execute endpoint fails sporadically on testnet | Retry wrapper with exponential back-off | ✅ Mitigated — `sendWithRetry()` with 3 attempts (Day 2.5) |
| HCS-10 standard unfamiliarity | Slows Days 3-4 | Full spec researched — see Section 4.5 for complete HCS-10 resource reference, protocol architecture, operations, and SDK quickstart | ✅ Mitigated — Day 2.5 research (v3.4) |
| HOL Registry Broker testnet availability | Blocks agent registration | Verify broker is live early Day 3; fallback: mock broker locally | ✅ Mitigated — broker live on testnet, registration succeeded (Day 3) |
| `@hashgraphonline/standards-sdk` ESM/CJS compat | Blocks `agent/hol-registry.js` | SDK ships CJS dist with `"require"` export — validate with gate test on Day 3 first 30 min. Fallback: `await import(...)` wrapper | ✅ Mitigated — `require('@hashgraphonline/standards-sdk')` works; `HCS10Client` + `AgentBuilder` available (Day 3) |
| SDK dependency weight + version conflicts | Unexpected breakage | SDK brings `@hashgraph/sdk`, `ethers`, `viem`, `axios` as transitive deps. Run `npm ls` after install, pin exact version | ✅ Mitigated — installed `@hashgraphonline/standards-sdk@0.1.165`, no conflicts (Day 3) |
| SDK pre-1.0 instability | API surface may shift | Current version `0.1.158-canary.0`. Pin with `--save-exact`. Check for stable tag before install | ✅ Mitigated — pinned `0.1.165`, API surface stable across Day 3 tasks (Day 3) |
| HBAR cost for agent creation | Agent registration fails | 4-6 txs per agent. Testnet HBAR is free — check balance via portal. SDK supports resumable creation | ✅ Mitigated — agent created successfully; resumable registration handled mid-run timeout (Day 3) |
| LLM streaming content format (array vs string) | Chat messages render incorrectly or crash | LangChain Anthropic streaming returns content blocks as array or string depending on context | ✅ Mitigated — `extractChunkText()` handles both formats (Day 6) |
| LLM not emitting structured blocks consistently | Web UI misses quotes/stage/chips data | LLM may use different fence styles or omit blocks | ✅ Mitigated — supports both `~~~` and `` ``` `` fences, strong prompt instruction (Day 6) |
| Stale suggestion chips | UI shows irrelevant quick-reply options | Hardcoded fallback chips become stale as conversation progresses | ✅ Mitigated — removed hardcoded fallbacks, LLM-only chips (Day 6) |
| Duplicate quotes table after selection | Confusing UI with repeated quote tables | Quotes block re-rendered on every message containing quotes data | ✅ Mitigated — only render quotes on first message with quotes (Day 6) |

---

## 8) Future Milestones (post-demo)

| Milestone | Timeline | Scope |
|-----------|----------|-------|
| **AusCM Agent Intelligence (v0.5)** | 1-2 weeks | Yield calculator, compliance summaries, AUD formatting, regulatory checkpoints, audit export. CLI agent HCS-10 awareness promoted to Day 5 (v0.4). Web RFQ flow is now the primary interface for investor interactions. |
| **LLM-Powered Agent** | — | ✅ DONE (v4.0) — `@langchain/anthropic` (Claude Haiku 4.5) + `hedera-agent-kit` + custom plugins. Dual mode (LLM + regex fallback). |
| **Response streaming optimization** | 1-2 weeks | Memoize markdown rendering, CSS animations for smoother typewriter effect |
| **Multi-session persistence** | 2-3 weeks | Database-backed session storage for conversation history across reconnections |
| **HBAR balance display in sidebar** | 1 week | Show connected wallet HBAR balance in the web UI sidebar |
| **Production Hardening** | 3-6 weeks | DB persistence, idempotency, observability, security |
| **ClawHub Skill Publishing** | 1-2 weeks | Publish annuity skills to ClawHub marketplace, discovery UX. Evaluate HCS-26 Skill Registry for on-chain skill discoverability. |
| **ASX/CHESS Integration Design** | 2-4 weeks | Settlement bridge design, T+2 workflow, NPP/PayTo payment rails |
| **Hedera-Native Optimization** | 4-8 weeks | Evaluate HTS token migration, SDK-based flows |
| **White Paper Draft** | 2-3 weeks | Leverage demo findings, agent differentiation analysis, regulatory framework |
| **Mainnet Deployment** | TBD | After production hardening + security audit |

> **Note:** HOL Registry Broker agent (HCS-10 registration + agent-to-agent communication) was promoted from post-demo to the 5-day schedule (Days 3–4) in v3.0.
>
> **Note (v3.1):** Agent differentiation strategy added — see Section 3.1. Imperium agents must offer Australian Capital Markets domain intelligence beyond what Hedera's free portal tools provide (Contract Builder, Playground). This shapes both the 5-day demo scope and the post-demo white paper.
>
> **Note (v3.3):** Black-box verification completed (Day 2.5). Found and fixed: (1) web3.js v4 silent failure on `evm_increaseTime`/`evm_mine` — replaced with raw `fetch()`, (2) Hashio transient failures — added `sendWithRetry()` with exponential back-off, (3) agent version comment mismatch. All 38 local tests and 27 testnet tests now pass. Testing runbook added (Section 4.4).
>
> **Note (v3.6):** Day 3 fully complete. Agent registered on HOL Registry Broker: account `0.0.8218785`, inbound topic `0.0.8218788`, outbound `0.0.8218786`, profile `0.0.8218794`. SDK CJS import validated — `require('@hashgraphonline/standards-sdk')` works cleanly. Skills embedded in HCS-11 profile (not HCS-26 — simpler, sufficient for demo). Registration resumed from checkpoint after mid-run profile inscription timeout. Agent state persisted to `deployments/hol-agent.json` (not `.env`). Day 2 heading updated to ✅ COMPLETED. All 5 Day 3 risks resolved in risks table. Key architectural decision: agent has its own Hedera account (`0.0.8218785`) separate from the operator account (`0.0.7974882`).
>
> **Note (v3.5):** Day 2 fully signed off. Renamed `mocks/mock-api.js` → `api/imperium-api.js` (directory restructure removing "mock" branding) and updated all references in `agent/cli-agent.js`, `test/annuity/demo-bot.js`, `start.sh`, and `test/annuity/06-smoke.fullcycle.test.js` (`ImperiumAPI` service name). Demo bot dry-run completed on Hedera Testnet (`--fast` flag, exit 0). All Day 2 Phase C tasks now ✅. Blueprint file-change table and testing runbook already reflected the new `api/imperium-api.js` path.

> **Note (v3.4):** Day 3 readiness research completed. HCS-10 standard fully documented at `hol.org/docs/standards/hcs-10` (not `docs.hedera.com` as previously assumed — those URLs return 404). Primary SDK is `@hashgraphonline/standards-sdk` (not `@hashgraph/sdk` alone). SDK is ESM-source but ships CJS dist — requires early validation. Added: Section 4.5 (HCS-10 Resource Reference with protocol architecture, operations, SDK quickstart), Section 4.6 (Day 3 Technical Risks), detailed Day 3 task breakdown with recommended sequence, expanded Day 4 tasks with HCS-10 operation specifics, 4 new risk entries in Section 7. Key finding: `HCS10Client.create()` creates 4 Hedera resources per agent (account, inbound topic, outbound topic, HCS-11 profile). HCS-26 Skill Registry identified as alternative to embedding skills in HCS-11 profile.
>
> **Note (v3.8):** Schedule extended to 6 days (later 7 in v5.0). Current Day 5 (Demo Recording + Buffer) moved to Day 6 (later Day 7). New Day 5: CLI Agent v0.4 — HCS-10 Integration. Adds `list agents`, `connect to <agent>`, `send skill <name>`, and `show connections` commands to the interactive CLI by bridging `hol-registry.js` into `cli-agent.js`. External package evaluation: (1) `hedera-agent-kit` — LLM-powered Hedera framework, does NOT integrate with HCS-10/HOL Registry, not needed for Day 5, deferred to Future Milestones as potential LLM upgrade path; (2) `@hol-org/ai-sdk-registry-broker` — package does not exist (404 GitHub, 403 npm), HOL Registry Broker functionality already provided by `@hashgraphonline/standards-sdk@0.1.165`. AusCM Agent Intelligence milestone bumped from v0.4 to v0.5 (v0.4 now used for HCS-10 CLI integration).
>
> **Note (v3.9):** HOL REST Search Index registration investigated and deferred to mainnet. Root cause: the `authenticateWithLedgerCredentials()` bundled method fails ("This operation was aborted"); fixed by using low-level `createLedgerChallenge` → base64-encoded signature → `verifyLedgerChallenge` (requires `network` + `accountId` params). Authentication succeeds and returns valid API key. Credit purchase via `purchaseCreditsWithHbar` fails because the HOL backend submits HBAR transfers through mainnet Hedera nodes only (e.g. `0.0.23`, `0.0.27`) — testnet accounts fail with `PAYER_ACCOUNT_NOT_FOUND`. The `register-index` command in `hol-registry.js` is production-ready for mainnet; on testnet it exits gracefully with an actionable error. Profile schema fix: added `type: 1` (AI_AGENT) required field.
>
> **Note (v4.0):** Phase 2 Task 10 complete — LLM integration. Hybrid architecture: `@langchain/anthropic` provides Claude Haiku 4.5 as the NLU layer; `hedera-agent-kit` provides Hedera-native query tools (account, token, consensus, EVM, Mirror Node); custom LangChain plugins (`annuity-plugin.js`, `hcs10-plugin.js`) wrap ImperiumAPI and HCS-10 operations. CLI agent v0.5 operates in dual mode: LLM-powered when `ANTHROPIC_API_KEY` is set (natural language for all commands + Hedera queries), regex fallback otherwise. `--no-llm` flag forces regex mode. System prompt embeds AusCM domain context (ACT/365, T+2, ASIC compliance). 4 new conditional LLM tests added (skipped without API key). Key decision: used `ChatAnthropic.bindTools()` + manual tool-call loop rather than full LangChain agent executor — simpler, more control over conversation flow.
>
> **Note (v5.0):** Web UI complete. React + Vite frontend with 3-column layout (deal progress stepper, conversational chat, investment details). WebSocket-based real-time chat with LLM streaming. Per-connection agent sessions via `createSession()` factory. Structured data protocol (`~~~rfq-*~~~`) enables rich UI: live quotes tables, suggestion chips, investment success cards. RFQ plugin provides `get_annuity_quotes` tool (4 Australian providers) and 4-stage system prompt. On-chain deal execution (create_annuity + execute_deal) triggered from chat on investment confirmation. Performance optimized: streaming reduces perceived latency ~70%, history trimming increased to 50 messages (~12-15 turns), system prompt condensed ~60%. Imperium Markets branding applied (logo, orange/gold/navy theme). README updated with Web UI section.

---

## 9) Contract Functions (Parity Reference)

| Function | Type | Approval Required | Notes |
|----------|------|-------------------|-------|
| `acceptAndIssue(address)` | State-changing | Investor approves faceValue | `safeTransferFrom` |
| `payCoupon(uint256)` | State-changing | Issuer approves coupon | `safeTransferFrom` |
| `transferAnnuity(address, uint256)` | State-changing | Buyer approves price | `safeTransferFrom` |
| `redeemMaturity()` | State-changing | None | `safeTransfer` from contract balance (API pre-funds contract with `faceValue` before calling) |
| `issued()`, `expired()` | View | — | Boolean getters |
| `couponDates(uint256)`, `couponValues(uint256)` | View | — | Array getters |
| `isCouponPaid(uint256)` | View | — | Mapping lookup |
| `getCouponCount()` | View | — | Array length |
| `getCouponValue(uint256)` | View | — | Returns coupon value by index |
| `getCouponDate(uint256)` | View | — | Returns coupon date by index |
