# Imperium Markets — Redbelly → Hedera Migration Blueprint (Path A First)

**Version:** 1.0  
**Date:** 2026-03-03  
**Authors:** Imperium Markets Engineering  
**Scope:** Replicate current Redbelly tokenization features on Hedera while preserving business behavior and minimizing delivery risk.

---

## 1) Executive Summary

This blueprint defines a **phased migration strategy** to replicate Imperium Markets tokenization flows from Redbelly to Hedera.

### Recommended approach

- **Phase 1 (Path A):** Use Hedera Smart Contract Service (EVM-compatible) to port existing Solidity + API orchestration with minimal behavioral change.
- **Phase 2 (optional):** Evaluate Hedera-native optimization (HTS + SDK) once feature parity and production stability are achieved.

### Why Path A first

- Fastest time-to-parity.
- Preserves existing contract and test semantics.
- Reduces delivery risk by avoiding immediate architecture rewrite.
- Enables side-by-side parity validation against Redbelly.

---

## 2) Current Project Baseline (as-is)

### Core assets

- Contract: `contracts/AnnuityToken.sol`
- Token mocks: `contracts/MockStablecoin.sol`, `contracts/MaliciousStablecoin.sol`
- Deploy tooling: `truffle-config.js`, `migrations/2_deploy_contracts.js`
- Tests: `test/annuity/*.test.js`
- API gateway prototype: `mocks/mock-api.js`
- Artifacts: `build/contracts/*.json`

### Current functional lifecycle in contract

1. `acceptAndIssue(address investor)`
2. `payCoupon(uint256 index)`
3. `transferAnnuity(address newOwner, uint256 price)`
4. `redeemMaturity()`

### Important contract mechanics to preserve

- Coupon schedule arrays:
  - `uint256[] public couponDates`
  - `uint256[] public couponValues`
- Approval-driven ERC-20 pull model (`safeTransferFrom`) in:
  - `acceptAndIssue`
  - `payCoupon`
  - `transferAnnuity`
- Maturity redemption via direct transfer (`safeTransfer`) in:
  - `redeemMaturity`

---

## 3) Migration Goals

### Primary goals

- Replicate current Redbelly tokenization features on Hedera.
- Keep business behavior consistent across chains.
- Minimize code divergence and operational complexity.

### Success criteria

- Same lifecycle outcomes on both chains for core scenarios.
- No regression in financial invariants or ownership transitions.
- Production-grade API operation with persistence, observability, and security controls.
- Clear deployment and rollback procedures for both networks.

---

## 4) Non-Goals (Phase 1)

- Full immediate redesign to Hedera-native HTS model.
- Rewriting all tooling at once (Truffle replacement can be staged).
- Introducing cross-chain atomic settlement in Phase 1.

---

## 5) Architecture Strategy

### 5.1 Chain Adapter Pattern (target)

Introduce a network abstraction boundary:

- `DealService` (business orchestration, chain-agnostic)
- `RedbellyAdapter` (existing behavior)
- `HederaEvmAdapter` (new)
- Optional future `HederaNativeAdapter` (Phase 2+)

All external endpoints call `DealService`; adapters encapsulate network-specific deploy/call/receipt/event handling.

### 5.2 Environment Model

- `local` (Ganache): unit + fast integration dev loop
- `hedera-testnet`: integration and parity gate
- `redbelly-testnet` (or current test env): parity gate
- `production`: controlled rollout

---

## 6) Testing Strategy (required)

### Keep Ganache? Yes.

Ganache remains required for fast local deterministic development, but **cannot be the only release gate**.

### 3-tier test model

1. **Tier 1 — Local deterministic (Ganache)**
   - Unit tests and business logic regression.
2. **Tier 2 — Hedera integration**
   - Real RPC/provider behavior, receipts/finality, gas/fee realism.
3. **Tier 3 — Cross-chain parity**
   - Same scenario suite on Redbelly and Hedera; compare outcomes.

### Release gating rule

- Ganache pass = logic confidence
- Hedera integration pass = network confidence
- Redbelly/Hedera parity pass = release confidence

---

## 7) File-by-File Migration Blueprint

### 7.1 Contracts

#### `contracts/AnnuityToken.sol`
**Action:** Keep in Phase 1, validate on Hedera EVM.  
**Checks:**
- Compiler + OZ compatibility on Hedera deployment toolchain.
- Timestamp assumptions (`block.timestamp`) under test.
- Event parity and revert messages across networks.

**Potential Phase 2 changes:**
- HTS-native integration adaptations (if chosen).
- Additional role controls and pausable admin safeguards.

#### `contracts/MockStablecoin.sol`
**Action:** Keep for local tests; replace with Hedera-compatible test token strategy in integration environments.  
**Checks:** Decimals and allowance semantics consistency.

#### `contracts/MaliciousStablecoin.sol`
**Action:** Keep for adversarial testing in local network.

---

### 7.2 API / Gateway

#### `mocks/mock-api.js`
**Action:** Refactor into production-ready API service with chain adapters.  
**Required upgrades:**
- Externalized config (`.env`) per chain.
- Deal persistence in DB (remove in-memory-only state).
- Request schema validation.
- Idempotency keys for execute actions.
- Structured logs + correlation IDs.
- Retry policy and receipt polling with timeouts.
- Health checks per dependency (RPC + DB).

---

### 7.3 Tests

#### `test/annuity/01-annuity.flow.test.js`
#### `test/annuity/02-annuity.payments.test.js`
#### `test/annuity/03-annuity.transfer.test.js`
#### `test/annuity/04-annuity.security.test.js`
#### `test/annuity/05-annuity.reentrancy.test.js`
**Action:** Keep as baseline and ensure chain-parameterized execution.

#### `test/annuity/01-annuity.api.flow.test.js`
**Action:** Expand to run against both adapters and environments.  
**Add assertions:**
- Receipt status + tx hash persistence.
- Eventual consistency checks (`GET /deal/:id`).
- Error-path/idempotency behavior.

---

### 7.4 Tooling / Deploy

#### `truffle-config.js`
**Action:** Add Hedera network profile in Phase 1, or prepare staged migration to Hardhat if plugin ecosystem is preferable.

#### `migrations/2_deploy_contracts.js`
**Action:** Parameterize by network/env config; avoid hardcoded assumptions and addresses.

#### `package.json`
**Action:** Add scripts for:
- Local tests.
- Hedera integration tests.
- Parity suite.
- Lint/type/security checks.

---

## 8) Data and API Contracts

Define canonical API payload schema and persistence model:

- Deal identity: `correlationId` (unique + indexed).
- Network metadata: `chain`, `network`, `rpcProfile`.
- On-chain refs: contract addresses, tx hashes, block numbers.
- Status model: `created`, `pending_execution`, `executed`, `failed`, `reconciled`.
- Error envelope: code, message, retriable flag, original chain error.

---

## 9) Security & Compliance Hardening

Required before production rollout:

- Secret management for keys (never plaintext in repo).
- Access control for API endpoints.
- Input validation and rate limiting.
- Audit logging and retention policy.
- Static analysis in CI (Slither + dependency scanning).
- Incident response runbook and rollback procedure.
- Multi-sig controls for privileged production operations (if applicable).

---

## 10) Observability & Operations

Minimum production controls:

- Structured logs (JSON) with `correlationId`.
- Metrics: tx latency, failure rate, retry count, queue depth.
- Alerts for RPC downtime, execution failures, reconciliation drift.
- Dashboard per chain and environment.
- Runbook for manual replay/reconciliation.

---

## 11) Risk Register (Top Items)

| # | Risk | Mitigation |
|---|------|------------|
| 1 | False parity confidence from Ganache-only testing | Enforce Hedera integration + parity gates |
| 2 | Network-specific receipt/finality differences | Adapter-level polling, retries, timeout controls |
| 3 | Duplicate execution from retries/user resubmission | Idempotency keys + persisted execution state machine |
| 4 | Config drift between Redbelly and Hedera environments | Centralized typed config + environment validation |
| 5 | Operational blind spots in production | Logs/metrics/alerts before launch |

---

## 12) Delivery Plan & Milestones

### Milestone 0 — Design & Readiness (1–2 weeks)
- Finalize adapter interfaces.
- Define schemas and status model.
- Finalize environment and key-management policy.

### Milestone 1 — Hedera Path A Parity (2–4 weeks)
- Hedera adapter + deployment profile.
- API wired to adapter boundary.
- Hedera integration tests green.

### Milestone 2 — Production Hardening (3–6 weeks)
- DB persistence, idempotency, observability, security controls.
- CI/CD multi-network gates.
- Runbooks and operational readiness.

### Milestone 3 — Optional Hedera-native Optimization (4–8+ weeks)
- HTS-focused redesign feasibility and pilot.

---

## 13) Acceptance Criteria (Go-Live Checklist)

- [ ] Core lifecycle parity verified on Redbelly and Hedera.
- [ ] API persistence and idempotency validated.
- [ ] Security checks and static analysis pass.
- [ ] Monitoring/alerting operational.
- [ ] Deployment + rollback rehearsed.
- [ ] Documentation/runbooks approved.
- [ ] Stakeholder sign-off complete.

---

## 14) Immediate Next Actions (No code changes yet)

1. Confirm Path A scope and target Hedera environment(s).
2. Approve adapter interface and status model.
3. Approve test gating policy (Ganache + Hedera + parity).
4. Start implementation in a dedicated migration branch with milestone tracking.

---

## Appendix A — Contract Functions to Preserve (Behavioral Parity)

| Function | Type | Approval Required | Notes |
|----------|------|-------------------|-------|
| `acceptAndIssue(address _investor)` | State-changing | Investor approves faceValue | Pulls faceValue via `safeTransferFrom` |
| `payCoupon(uint256 index)` | State-changing | Issuer approves coupon amount | Pulls coupon via `safeTransferFrom` |
| `transferAnnuity(address newOwner, uint256 price)` | State-changing | Buyer approves price | Pulls price via `safeTransferFrom` |
| `redeemMaturity()` | State-changing | None | Direct `safeTransfer` from issuer |
| `issued()` | View (getter) | — | Boolean |
| `expired()` | View (getter) | — | Boolean |
| `couponDates(uint256)` | View (getter) | — | Array element |
| `couponValues(uint256)` | View (getter) | — | Array element |
| `isCouponPaid(uint256)` | View | — | Mapping lookup |
| `getCouponCount()` | View | — | Array length |

These functions define the minimum parity surface for Redbelly ↔ Hedera replication.
