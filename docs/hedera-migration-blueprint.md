# Imperium Markets — Hedera Testnet Deployment Plan

**Version:** 3.6
**Date:** 2026-03-13
**Target:** Deploy AnnuityToken to Hedera Testnet + HOL Registry Broker agent demo in 5 days
**Authors:** Imperium Markets Engineering

---

## 1) Objective

Deploy the existing AnnuityToken smart contract to **Hedera Testnet**, migrate build tooling from Truffle to **Hardhat**, register the agent on the **HOL Registry Broker** (HCS-10), and run a live demo against Hedera infrastructure.

### Success criteria

- AnnuityToken + ImperiumStableCoin deployed to Hedera Testnet.
- Full lifecycle executable on-chain: issue → coupons → transfer → redeem.
- CLI agent registered on HOL Registry Broker with published skills.
- Agent-to-agent communication working via HCS-10 on Hedera Testnet.
- CLI agent and demo bot running against Hedera Testnet (not Ganache).
- All existing Ganache-based tests still pass locally.

---

## 2) Current State (what we have)

| Asset | Status |
|-------|--------|
| `contracts/AnnuityToken.sol` | ✅ Production-ready Solidity ^0.8.21 |
| `contracts/ImperiumStableCoin.sol` | ✅ ERC-20 stablecoin (ImperiumUSD / iUSD) |
| `api/imperium-api.js` | ✅ ImperiumAPI — 10 endpoints, full lifecycle, `--network` flag, Hedera finality/gas handling, `dotenv` + wallet loading for testnet single-account mode |
| `agent/cli-agent.js` | ✅ v0.3, 10 intents, HashScan links, network-aware banner |
| `hardhat.config.js` | ✅ Solidity 0.8.21, Hardhat Network + localhost + `hederaTestnet` (chainId 296) |
| `scripts/deploy.js` | ✅ Deploys ImperiumStableCoin + AnnuityToken, saves to `deployments/`, short maturity for Hedera |
| `config/networks.js` | ✅ Network config loader — local + hedera-testnet, deployment save/load, explorer URLs |
| `test/annuity/01–05*.test.js` | ✅ 5 contract test files (migrated to ethers.js v6) |
| `test/annuity/01-annuity.api.flow.test.js` | ✅ API integration test (fetch-based, uses 127.0.0.1) |
| `test/annuity/06-smoke.fullcycle.test.js` | ✅ 27 tests (API + agent parser, migrated to describe()) |
| `test/annuity/demo-bot.js` | ✅ Visual demo bot — `--network` flag, 3-min testnet timeouts |
| `start.sh` | ✅ Full stack launcher — `./start.sh` (local) or `./start.sh --network hedera-testnet` |
| `.env.example` | ✅ Template for Hedera credentials with setup instructions |
| `.gitignore` | ✅ Excludes node_modules, .env, cache/, artifacts/, deployments/ |
| `package.json` | ✅ Scripts: `deploy:hedera`, `start:hedera`, `demo`, `demo:hedera` |
| `agent/hol-registry.js` | ✅ HOL Registry Broker module — `create`, `status`, `connect`, `listen` commands, skill-to-API mapping (7 skills), inbound polling, auto-accept connections, skill execution + response, auto key type detection |
| `agent/test-a2a.js` | ✅ Agent-to-agent communication test — creates Test Requester agent (cached), connects via HCS-10, invokes skill, reads response |
| `deployments/hol-agent.json` | ✅ Agent identity state — account `0.0.8196762`, inbound/outbound/profile topic IDs, 7 skills |
| `truffle-config.js` + `migrations/` | ✅ **Deleted** — fully replaced by Hardhat |
| `build/` (Truffle artifacts) | ✅ **Deleted** — replaced by `artifacts/` (gitignored) |
| Hedera Testnet account | ✅ Account `0.0.7974882`, funded with testnet HBAR |

---

## 3) Migration Plan (5-day schedule)

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
| 3 | Create HCS-10 agent identity | ✅ | Agent account `0.0.8196762`, inbound `0.0.8196678`, outbound `0.0.8196675`, profile `0.0.8196782`. First run failed at profile inscription (timeout); resumed from checkpoint successfully. |
| 4 | Publish agent skills | ✅ | 7 skills embedded in HCS-11 profile properties: `annuity.issue`, `.settle`, `.transfer`, `.redeem`, `.compliance`, `.analytics`, `.audit`. Plus AusCM metadata: currency AUD, dayCount ACT/365, settlement T+2. |
| 5 | Create `agent/hol-registry.js` | ✅ | CLI module with `create`, `status`, `connect` commands. Supports resumable registration via `existingState`. State persisted to `deployments/hol-agent.json`. |
| 6 | Verify registration | ✅ | Profile retrievable via `client.retrieveProfile('0.0.8196762')` — returns full profile with all skills, capabilities, and topic IDs. |
| 7 | Add env vars | ✅ | `REGISTRY_URL` added to `.env.example`. Agent state stored in `deployments/hol-agent.json` (not `.env`) for cleaner separation. |

#### Day 3 — Key decisions made

1. **ECDSA key type for HCS-10:** The SDK supports both ED25519 and ECDSA keys. Since our Hedera account uses ECDSA (same key for EVM/Hardhat), we pass `keyType: 'ecdsa'` to `HCS10Client`.
2. **Skills in HCS-11 profile properties (not HCS-26):** Embedded skills as a `properties.skills` array in the HCS-11 profile rather than using a separate HCS-26 Skill Registry. Simpler, sufficient for demo and discoverability.
3. **Resumable registration:** The SDK's `createAndRegisterAgent()` supports `existingState` for resuming from checkpoints. First run created account + topics but timed out on profile inscription. Resume picked up from profile stage and completed successfully.
4. **State in `deployments/` (not `.env`):** Agent state (account ID, topic IDs, private key) is stored in `deployments/hol-agent.json` rather than `.env` — keeps credentials separate from config, supports structured data, and aligns with how contract deployments are already stored.

#### Registered Agent Resources

| Resource | Hedera ID | HashScan |
|----------|-----------|----------|
| Agent Account | `0.0.8196762` | `https://hashscan.io/testnet/account/0.0.8196762` |
| Inbound Topic | `0.0.8196678` | `https://hashscan.io/testnet/topic/0.0.8196678` |
| Outbound Topic | `0.0.8196675` | `https://hashscan.io/testnet/topic/0.0.8196675` |
| Profile Topic | `0.0.8196782` | `https://hashscan.io/testnet/topic/0.0.8196782` |

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

### Day 5 — Demo Recording + Buffer

**Goal:** Record final demo showcasing agent on Hedera Testnet with HOL Registry Broker integration.

| Task | Details |
|------|---------|
| Final dry run | Fresh deploy → agent registration (HCS-10 `create()`) → skill discovery → full lifecycle via HCS-10 connection |
| Record demo video | Screen recording: (1) agent registration on HOL Registry Broker, (2) skill discovery via `RegistryBrokerClient.search()`, (3) agent-to-agent lifecycle on Hedera Testnet via Connection Topics |
| Write demo summary | 1-page doc: what was shown, contract addresses, agent account ID, inbound/outbound topic IDs, tx hashes, HOL Registry entries |
| Commit + push | All changes committed, clean repo |
| Prepare Q&A notes | Common questions: costs, mainnet readiness, HTS migration path, HCS-10 production considerations |

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

### CLI Agent Enhancements (v0.3 → v0.4)

These features enhance the current CLI agent with AusCM domain intelligence:

| Feature | Intent/Command | Details |
|---------|---------------|---------|
| **Yield Calculator** | `"calculate yield"` | Yield-to-maturity, current yield, accrued interest for the active deal |
| **Compliance Summary** | `"compliance report"` | Formatted summary: issuer details, investor eligibility, coupon schedule, regulatory flags |
| **AUD Formatting** | Automatic | Display all values in AUD with proper formatting (`A$1,000,000.00`) |
| **Deal Analytics** | `"analytics"` / `"risk summary"` | Duration, convexity, price sensitivity, coupon coverage ratio |
| **Regulatory Checkpoints** | Automatic warnings | Flag when operations might trigger ASIC disclosure thresholds or AML reporting |
| **Export Audit Log** | `"export audit"` | Generate structured JSON/CSV audit trail suitable for compliance review |
| **Settlement Context** | In tx output | Show T+2 settlement context, business day calculations (Australian calendar) |

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
| `deployments/hol-agent.json` | **Auto-generated** — Agent identity: account `0.0.8196762`, inbound/outbound/profile topic IDs, 7 skills, capabilities | 3 |
| `package.json` | **Modified** — Added `@hashgraphonline/standards-sdk@0.1.165` | 3 |
| `.env.example` | **Modified** — Added `REGISTRY_URL`; agent state stored in `deployments/hol-agent.json` (not `.env`) | 3 |
| `agent/hol-registry.js` | **Modified** — Added `listen` command (inbound polling, auto-accept connections, skill execution, response messaging), `SKILL_ROUTES` mapping (7 skills → API endpoints), `executeSkill()`, `ConnectionsManager` integration, auto key type detection (ED25519 vs ECDSA) | 4 |
| `agent/test-a2a.js` | **Created** — Agent-to-agent communication test script, creates/caches Test Requester agent, connects via HCS-10, invokes skill, polls for response, displays results | 4 |
| `deployments/test-requester.json` | **Auto-generated** — Test requester agent identity: account `0.0.8199239`, inbound/outbound/profile topic IDs | 4 |

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

---

## 8) Future Milestones (post-demo)

| Milestone | Timeline | Scope |
|-----------|----------|-------|
| **AusCM Agent Intelligence (v0.4)** | 1-2 weeks | Yield calculator, compliance summaries, AUD formatting, regulatory checkpoints, audit export |
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
> **Note (v3.6):** Day 3 fully complete. Agent registered on HOL Registry Broker: account `0.0.8196762`, inbound topic `0.0.8196678`, outbound `0.0.8196675`, profile `0.0.8196782`. SDK CJS import validated — `require('@hashgraphonline/standards-sdk')` works cleanly. Skills embedded in HCS-11 profile (not HCS-26 — simpler, sufficient for demo). Registration resumed from checkpoint after mid-run profile inscription timeout. Agent state persisted to `deployments/hol-agent.json` (not `.env`). Day 2 heading updated to ✅ COMPLETED. All 5 Day 3 risks resolved in risks table. Key architectural decision: agent has its own Hedera account (`0.0.8196762`) separate from the operator account (`0.0.7974882`).
>
> **Note (v3.5):** Day 2 fully signed off. Renamed `mocks/mock-api.js` → `api/imperium-api.js` (directory restructure removing "mock" branding) and updated all references in `agent/cli-agent.js`, `test/annuity/demo-bot.js`, `start.sh`, and `test/annuity/06-smoke.fullcycle.test.js` (`ImperiumAPI` service name). Demo bot dry-run completed on Hedera Testnet (`--fast` flag, exit 0). All Day 2 Phase C tasks now ✅. Blueprint file-change table and testing runbook already reflected the new `api/imperium-api.js` path.

> **Note (v3.4):** Day 3 readiness research completed. HCS-10 standard fully documented at `hol.org/docs/standards/hcs-10` (not `docs.hedera.com` as previously assumed — those URLs return 404). Primary SDK is `@hashgraphonline/standards-sdk` (not `@hashgraph/sdk` alone). SDK is ESM-source but ships CJS dist — requires early validation. Added: Section 4.5 (HCS-10 Resource Reference with protocol architecture, operations, SDK quickstart), Section 4.6 (Day 3 Technical Risks), detailed Day 3 task breakdown with recommended sequence, expanded Day 4 tasks with HCS-10 operation specifics, 4 new risk entries in Section 7. Key finding: `HCS10Client.create()` creates 4 Hedera resources per agent (account, inbound topic, outbound topic, HCS-11 profile). HCS-26 Skill Registry identified as alternative to embedding skills in HCS-11 profile.

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
