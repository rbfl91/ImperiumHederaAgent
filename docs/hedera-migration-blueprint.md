# Imperium Markets — Hedera Testnet Deployment Plan

**Version:** 2.1
**Date:** 2026-03-12
**Target:** Deploy AnnuityToken to Hedera Testnet + agent demo in 5 days
**Authors:** Imperium Markets Engineering

---

## 1) Objective

Deploy the existing AnnuityToken smart contract to **Hedera Testnet**, migrate build tooling from Truffle to **Hardhat**, and run the CLI agent against live Hedera infrastructure for a management demo.

### Success criteria

- AnnuityToken + MockStablecoin deployed to Hedera Testnet.
- Full lifecycle executable on-chain: issue → coupons → transfer → redeem.
- CLI agent and demo bot running against Hedera Testnet (not Ganache).
- All existing Ganache-based tests still pass locally.

---

## 2) Current State (what we have)

| Asset | Status |
|-------|--------|
| `contracts/AnnuityToken.sol` | ✅ Production-ready Solidity ^0.8.21 |
| `contracts/MockStablecoin.sol` | ✅ ERC-20 mock for testing |
| `mocks/mock-api.js` | ✅ 10 endpoints, full lifecycle, Hardhat artifact paths |
| `agent/cli-agent.js` | ✅ v0.2, 10 intents, calls API |
| `hardhat.config.js` | ✅ Solidity 0.8.21, Hardhat Network + localhost |
| `scripts/deploy.js` | ✅ Hardhat deploy script (MockStablecoin + AnnuityToken) |
| `test/annuity/01–05*.test.js` | ✅ 5 contract test files (migrated to ethers.js v6) |
| `test/annuity/01-annuity.api.flow.test.js` | ✅ API integration test (fetch-based, uses 127.0.0.1) |
| `test/annuity/06-smoke.fullcycle.test.js` | ✅ 27 tests (API + agent parser, migrated to describe()) |
| `test/annuity/demo-bot.js` | ✅ Visual demo bot for recordings |
| `start.sh` | ✅ Single-command launcher (Hardhat node + deploy) |
| `.env.example` | ✅ Template for Hedera credentials |
| `.gitignore` | ✅ Excludes node_modules, .env, cache/, artifacts/ |
| `truffle-config.js` + `migrations/` | ✅ **Deleted** — fully replaced by Hardhat |
| `build/` (Truffle artifacts) | ✅ **Deleted** — replaced by `artifacts/` (gitignored) |
| Hedera Testnet account | ❌ Needed |

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

### Day 2 — Hedera Testnet Account + Deployment

**Goal:** Deploy contracts to Hedera Testnet.

| Task | Details |
|------|---------|
| Create Hedera Testnet account | [portal.hedera.com](https://portal.hedera.com) — get Account ID + private key |
| Fund account | Testnet HBAR via faucet |
| Configure `.env` | `HEDERA_TESTNET_ACCOUNT_ID`, `HEDERA_TESTNET_PRIVATE_KEY`, `HEDERA_TESTNET_RPC_URL` |
| Add Hedera network to `hardhat.config.js` | URL: `https://testnet.hashio.io/api` (Hashio JSON-RPC Relay) |
| Deploy to Hedera Testnet | `npx hardhat run scripts/deploy.js --network hederaTestnet` |
| Record deployed addresses | Save to `deployments/hedera-testnet.json` |
| Verify contracts | Check on [hashscan.io/testnet](https://hashscan.io/testnet) |

**Gate:** Both contracts visible on HashScan, ABI matches.

---

### Day 3 — API + Agent on Hedera Testnet

**Goal:** Agent executes full lifecycle against Hedera Testnet.

| Task | Details |
|------|---------|
| Add `--network` flag to `mock-api.js` | Load RPC URL + deployed addresses from config/env |
| Create `config/networks.js` | Maps `local` → Hardhat Network, `hedera-testnet` → Hashio RPC + deployed addresses |
| Fund test wallets | Transfer testnet HBAR + stablecoins to issuer/investor/secondary accounts |
| Test API endpoints | `POST /deal`, `GET /deal/:id`, `POST /deal/:id/execute` on Hedera |
| Handle Hedera differences | Longer finality (~3-5s), gas estimation, `evm_increaseTime` not available |
| Redeem workaround | On testnet, skip time-travel — deploy with short maturity (e.g., 60s) for demo |
| Run agent against testnet | `API_BASE=http://127.0.0.1:4000 node agent/cli-agent.js` |

**Gate:** Full lifecycle works via agent on Hedera Testnet.

---

### Day 4 — Testing + Demo Polish

**Goal:** Reliable demo, polished output.

| Task | Details |
|------|---------|
| Run smoke test on testnet | Adapt `06-smoke.fullcycle.test.js` for Hedera (longer timeouts, no time-travel) |
| Run demo bot | `node test/annuity/demo-bot.js` against Hedera Testnet |
| Add HashScan links to agent output | Show `https://hashscan.io/testnet/tx/{hash}` for each tx |
| Update demo bot header | Confirm branding, remove any Ganache references |
| Update `start.sh` | Add `--network hedera-testnet` option |
| Dry-run the recording | Full screen recording pass, check timing |

**Gate:** Demo bot runs clean end-to-end on Hedera Testnet. Recording looks professional.

---

### Day 5 — Buffer + Recording

**Goal:** Record final demo, prepare materials.

| Task | Details |
|------|---------|
| Final dry run | Fresh deploy → full agent lifecycle |
| Record demo video | Screen recording of `demo-bot.js` on Hedera Testnet |
| Write demo summary | 1-page doc: what was shown, contract addresses, tx hashes |
| Commit + push | All changes committed, clean repo |
| Prepare Q&A notes | Common questions: costs, mainnet readiness, HTS migration path |

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
| `config/networks.js` | **Create** — Network config loader | 3 |
| `deployments/hedera-testnet.json` | **Create** — Deployed addresses | 2 |
| `agent/cli-agent.js` | **Modify** — Minor: HashScan links in output | 4 |
| `test/annuity/demo-bot.js` | **Modify** — Longer timeouts for testnet | 4 |

---

## 7) Risks & Mitigations

| Risk | Impact | Mitigation | Status |
|------|--------|------------|--------|
| Hardhat migration breaks existing tests | Blocks progress | Run tests after each change, keep Ganache as fallback | ✅ Mitigated — all 10 tests pass |
| Hedera gas costs differ from Ganache estimates | Deploy may fail | Use generous gas limits, check Hashio docs | Pending (Day 2) |
| Finality delay (3-5s per tx) | Demo feels slow | Set expectations, show HashScan confirmation | Pending (Day 3) |
| No `evm_increaseTime` on testnet | Can't redeem with long maturity | Deploy with 60-120s maturity for demo | Pending (Day 3) |
| Testnet faucet limits | Can't fund wallets | Request HBAR early, reuse accounts | Pending (Day 2) |

---

## 8) Future Milestones (post-demo)

| Milestone | Timeline | Scope |
|-----------|----------|-------|
| **Production Hardening** | 3-6 weeks | DB persistence, idempotency, observability, security |
| **HOL Registry Broker Agent** | 2-4 weeks | HCS-10 agent registration, agent-to-agent communication, ClawHub skill publishing |
| **Hedera-Native Optimization** | 4-8 weeks | Evaluate HTS token migration, SDK-based flows |
| **Mainnet Deployment** | TBD | After production hardening + security audit |

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
