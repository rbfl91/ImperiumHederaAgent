# Imperium Markets — Hedera Testnet Deployment Plan

**Version:** 3.2
**Date:** 2026-03-12
**Target:** Deploy AnnuityToken to Hedera Testnet + HOL Registry Broker agent demo in 5 days
**Authors:** Imperium Markets Engineering

---

## 1) Objective

Deploy the existing AnnuityToken smart contract to **Hedera Testnet**, migrate build tooling from Truffle to **Hardhat**, register the agent on the **HOL Registry Broker** (HCS-10), and run a live demo against Hedera infrastructure.

### Success criteria

- AnnuityToken + MockStablecoin deployed to Hedera Testnet.
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
| `contracts/MockStablecoin.sol` | ✅ ERC-20 mock for testing |
| `mocks/mock-api.js` | ✅ 10 endpoints, full lifecycle, `--network` flag, Hedera finality/gas handling, `dotenv` + wallet loading for testnet single-account mode |
| `agent/cli-agent.js` | ✅ v0.3, 10 intents, HashScan links, network-aware banner |
| `hardhat.config.js` | ✅ Solidity 0.8.21, Hardhat Network + localhost + `hederaTestnet` (chainId 296) |
| `scripts/deploy.js` | ✅ Deploys MockStablecoin + AnnuityToken, saves to `deployments/`, short maturity for Hedera |
| `config/networks.js` | ✅ Network config loader — local + hedera-testnet, deployment save/load, explorer URLs |
| `test/annuity/01–05*.test.js` | ✅ 5 contract test files (migrated to ethers.js v6) |
| `test/annuity/01-annuity.api.flow.test.js` | ✅ API integration test (fetch-based, uses 127.0.0.1) |
| `test/annuity/06-smoke.fullcycle.test.js` | ✅ 27 tests (API + agent parser, migrated to describe()) |
| `test/annuity/demo-bot.js` | ✅ Visual demo bot — `--network` flag, 3-min testnet timeouts |
| `start.sh` | ✅ Full stack launcher — `./start.sh` (local) or `./start.sh --network hedera-testnet` |
| `.env.example` | ✅ Template for Hedera credentials with setup instructions |
| `.gitignore` | ✅ Excludes node_modules, .env, cache/, artifacts/, deployments/ |
| `package.json` | ✅ Scripts: `deploy:hedera`, `start:hedera`, `demo`, `demo:hedera` |
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
| Write Hardhat deploy script | ✅ | `scripts/deploy.js` — deploys MockStablecoin + AnnuityToken |
| Migrate tests to ethers.js v6 | ✅ | Full rewrite: `contract()`→`describe()`, `artifacts.require`→`ethers.getContractFactory`, `web3.utils`→`ethers` utils, `expectRevert`→`chai-matchers`, `BN`→`BigInt` |
| Verify local parity | ✅ | All 10 contract tests pass on Hardhat Network (799ms) |
| Remove Truffle | ✅ | Deleted `truffle-config.js`, `migrations/`, `build/` |
| Update `start.sh` | ✅ | `npx hardhat node` + `npx hardhat run scripts/deploy.js --network localhost` |
| Update `mock-api.js` | ✅ | ABI paths: `build/contracts/` → `artifacts/contracts/*.sol/` |
| Update `package.json` | ✅ | Added npm scripts: `compile`, `test`, `test:contracts`, `deploy:local`, `node`, `start` |
| Create `.env.example` | ✅ | Template for Hedera credentials (Day 2+) |
| Update `.gitignore` | ✅ | Added `cache/`, `artifacts/`, `.env`, `.DS_Store` |

**Gate:** ✅ `npx hardhat test` — all 10 contract tests green. `start.sh` → full stack works.

#### Day 1 — Key decisions made

1. **Hardhat 2 (not 3):** Hardhat 3 requires ESM (`"type": "module"`) and Node.js v22.10+. Since the entire project is CommonJS, we chose Hardhat 2.28.6 to avoid a massive ESM conversion.
2. **Full ethers.js rewrite (not hardhat-web3 plugin):** `@nomiclabs/hardhat-web3` targets web3 v1.x, but the project uses web3 v4. Full ethers.js v6 rewrite was cleaner.
3. **web3 v4 kept in mock-api.js only:** The API server talks JSON-RPC directly — works with any node (Hardhat, Ganache, Hedera).

---

### Day 2 — Hedera Testnet Deployment + API + Demo Polish (merged Day 2+3+4) — IN PROGRESS

**Goal:** Deploy contracts to Hedera Testnet, connect the API + agent, and polish the demo — all in one day.

#### Phase A — Hedera Testnet Account + Deployment (~1–2 hours)

| Task | Status | Details |
|------|--------|---------|
| Create Hedera Testnet account | ✅ | Account ID `0.0.7974882`, EVM `0xd166aEd05c6d6987ec00f9e49d55420b590c47b6` |
| Fund account | ✅ | 1000 ℏ testnet HBAR via portal faucet |
| Configure `.env` | ✅ | ECDSA hex private key + Hashio RPC URL |
| Add Hedera network to `hardhat.config.js` | ✅ | `hederaTestnet` network with chainId 296, 120s timeout |
| Deploy to Hedera Testnet | ✅ | MockStablecoin `0xC44f...Af13`, AnnuityToken `0x6e5A...99d0` |
| Record deployed addresses | ✅ | Auto-saved to `deployments/hedera-testnet.json` |
| Verify contracts | ✅ | Visible on HashScan testnet explorer |

#### Phase B — API + Agent on Hedera Testnet (~2–3 hours)

| Task | Status | Details |
|------|--------|---------|
| Add `--network` flag to `mock-api.js` | ✅ | `node mocks/mock-api.js --network hedera-testnet` or `NETWORK=hedera-testnet` |
| Create `config/networks.js` | ✅ | Maps `local` → Hardhat Network, `hedera-testnet` → Hashio RPC + deployed addresses |
| Handle Hedera differences | ✅ | Gas multiplier (1.2x), finality delay (5s), no time-travel → real-time wait |
| Redeem workaround | ✅ | On testnet, deploy with 120s maturity + 30s coupon intervals for demo |
| HashScan explorer links in API responses | ✅ | `explorerUrl` field in deal creation + tx history |
| Fund test wallets | ✅ | Handled automatically by deploy script (deployer funds wallets via MockStablecoin) |
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
| Run demo bot on testnet | ❌ | `npm run demo:hedera` |
| Dry-run the recording | ❌ | Full screen recording pass, check timing |

**Gate:** Full lifecycle works via agent on Hedera Testnet. Demo bot runs clean end-to-end.

#### Day 2 — Key decisions made

1. **Single-account mode on testnet:** Hedera's Hashio RPC relay doesn't support `eth_getAccounts` — returns `[]`. Solution: load the private key into `web3.eth.accounts.wallet` via `dotenv`, and use the single funded account for all roles (deployer, issuer, investor, secondary). On local Hardhat, the 20 prefunded accounts are used as before.
2. **Short maturity for demo:** Since `evm_increaseTime` is not available on Hedera, contracts deploy with 120s maturity and ~30s coupon intervals. The API detects the network and either time-travels (local) or waits real-time (testnet).
3. **5-minute smoke test timeout:** Testnet full lifecycle takes ~3 minutes (vs <1s locally). The smoke test suite timeout was increased to 300s and individual test timeouts removed.

---

### Day 3 — HOL Registry Broker: Research + Agent Registration

**Goal:** Register the Imperium Annuity agent on the HOL Registry Broker using HCS-10.

| Task | Details |
|------|---------|
| Research HCS-10 standard | Review Hedera docs for agent registration protocol, message format, topic IDs |
| Install Hedera SDK | Add `@hashgraph/sdk` to project dependencies |
| Create HCS-10 agent identity | Generate agent DID or account, register on the HOL Registry Broker topic |
| Publish agent skills | Define and publish skill descriptors (annuity lifecycle: issue, coupon, transfer, redeem) |
| Create `agent/hol-registry.js` | Module for HCS-10 registration, skill publishing, and message handling |
| Verify registration | Confirm agent appears in HOL Registry Broker, skills are discoverable |

**Gate:** Agent registered on HOL Registry Broker, skills visible and discoverable on Hedera Testnet.

---

### Day 4 — HOL Registry Broker: Agent-to-Agent Communication + Integration

**Goal:** Enable agent-to-agent communication via HCS-10 and integrate with the existing CLI agent.

| Task | Details |
|------|---------|
| Implement inbound message handler | Listen for HCS-10 messages on agent's topic, parse skill invocation requests |
| Implement outbound messaging | Send skill responses and status updates via HCS-10 |
| Integrate with CLI agent | Connect `cli-agent.js` to `hol-registry.js` — agent can receive and execute requests from other agents |
| Test agent-to-agent flow | Simulate a second agent requesting an annuity lifecycle operation |
| Handle error cases | Timeout, invalid requests, skill not found |
| Update `config/networks.js` | Add HOL Registry Broker topic IDs for testnet |

**Gate:** Agent receives a request from another agent via HCS-10, executes the annuity operation on-chain, and returns the result.

---

### Day 5 — Demo Recording + Buffer

**Goal:** Record final demo showcasing agent on Hedera Testnet with HOL Registry Broker integration.

| Task | Details |
|------|---------|
| Final dry run | Fresh deploy → agent registration → full lifecycle via HCS-10 |
| Record demo video | Screen recording: (1) agent registration, (2) skill discovery, (3) agent-to-agent lifecycle on Hedera Testnet |
| Write demo summary | 1-page doc: what was shown, contract addresses, agent DID, tx hashes, HOL Registry entries |
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

**Kept:** `web3@^4.16.0` (for `mock-api.js` runtime), `@openzeppelin/contracts@^5.4.0`, `express@^4.18.2`, `node-fetch@^2.6.7`

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
| `mocks/mock-api.js` | **Modified** — ABI paths: `build/contracts/` → `artifacts/contracts/*.sol/` | 1 |
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
| `mocks/mock-api.js` | **Modified** — `--network` flag, config loader, gas multiplier, finality delay, real-time maturity wait, explorer links, `dotenv` require, wallet loading for testnet (single-account mode via `web3.eth.accounts.wallet`) | 2 |
| `agent/cli-agent.js` | **Modified** — v0.3, `txLink()`/`contractLink()` helpers, HashScan links, network banner, `waitForMaturity` display | 2 |
| `test/annuity/demo-bot.js` | **Modified** — `--network` flag, 3-min testnet timeouts, network label, NETWORK env passthrough | 2 |
| `test/annuity/06-smoke.fullcycle.test.js` | **Modified** — 5-min suite timeout, service name `Imperium Markets API`, removed individual timeouts | 2 |
| `start.sh` | **Modified** — `--network` arg, local/testnet branching, `.env` validation for testnet mode | 2 |
| `package.json` | **Modified** — Added `deploy:hedera`, `start:hedera`, `demo`, `demo:hedera` scripts | 2 |
| `.gitignore` | **Modified** — Added `deployments/` | 2 |
| `.env.example` | **Modified** — Expanded with setup instructions | 2 |
| `agent/hol-registry.js` | **Create** — HCS-10 registration, skill publishing, message handling | 3 |

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
| HCS-10 standard unfamiliarity | Slows Days 3-4 | Allocate Day 3 morning to research + prototyping before coding | Pending (Day 3) |
| HOL Registry Broker testnet availability | Blocks agent registration | Verify broker is live early Day 3; fallback: mock broker locally | Pending (Day 3) |

---

## 8) Future Milestones (post-demo)

| Milestone | Timeline | Scope |
|-----------|----------|-------|
| **AusCM Agent Intelligence (v0.4)** | 1-2 weeks | Yield calculator, compliance summaries, AUD formatting, regulatory checkpoints, audit export |
| **Production Hardening** | 3-6 weeks | DB persistence, idempotency, observability, security |
| **ClawHub Skill Publishing** | 1-2 weeks | Publish annuity skills to ClawHub marketplace, discovery UX |
| **ASX/CHESS Integration Design** | 2-4 weeks | Settlement bridge design, T+2 workflow, NPP/PayTo payment rails |
| **Hedera-Native Optimization** | 4-8 weeks | Evaluate HTS token migration, SDK-based flows |
| **White Paper Draft** | 2-3 weeks | Leverage demo findings, agent differentiation analysis, regulatory framework |
| **Mainnet Deployment** | TBD | After production hardening + security audit |

> **Note:** HOL Registry Broker agent (HCS-10 registration + agent-to-agent communication) was promoted from post-demo to the 5-day schedule (Days 3–4) in v3.0.
>
> **Note (v3.1):** Agent differentiation strategy added — see Section 3.1. Imperium agents must offer Australian Capital Markets domain intelligence beyond what Hedera's free portal tools provide (Contract Builder, Playground). This shapes both the 5-day demo scope and the post-demo white paper.

---

## 9) Contract Functions (Parity Reference)

| Function | Type | Approval Required | Notes |
|----------|------|-------------------|-------|
| `acceptAndIssue(address)` | State-changing | Investor approves faceValue | `safeTransferFrom` |
| `payCoupon(uint256)` | State-changing | Issuer approves coupon | `safeTransferFrom` |
| `transferAnnuity(address, uint256)` | State-changing | Buyer approves price | `safeTransferFrom` |
| `redeemMaturity()` | State-changing | None | `safeTransfer` from contract |
| `issued()`, `expired()` | View | — | Boolean getters |
| `couponDates(uint256)`, `couponValues(uint256)` | View | — | Array getters |
| `isCouponPaid(uint256)` | View | — | Mapping lookup |
| `getCouponCount()` | View | — | Array length |
| `getCouponValue(uint256)` | View | — | Returns coupon value by index |
| `getCouponDate(uint256)` | View | — | Returns coupon date by index |
