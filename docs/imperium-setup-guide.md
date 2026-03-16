# Imperium Markets — Full Stack Setup Guide

This guide describes the steps to compile, deploy, test, and run the Imperium Markets project. Each step includes the expected results.

---

## 1. Start Hardhat Node
**Terminal:** New terminal
```bash
npx hardhat node
```
**Expected:**
- "Hardhat node is running" message
- Block mining logs
- Accounts listed (each with 10,000 ETH)

---

## 2. Compile Contracts
**Terminal:** Any shell
```bash
npx hardhat compile
```
**Expected:**
- "Compiled X Solidity file(s) successfully"
- No errors

---

## 3. Deploy Contracts
**Terminal:** Any shell
```bash
npx hardhat run scripts/deploy.js --network localhost
```
**Expected:**
- Deployment addresses for ImperiumAUD (stablecoin) and AnnuityToken
- Console output: "ImperiumStableCoin deployed to: ...", "AnnuityToken deployed to: ..."

---

## 4. Start API Server
**Terminal:** New terminal
```bash
node api/imperium-api.js --network local
```
**Expected:**
- "ImperiumAPI listening at http://localhost:4000 (network: local)"
- No errors

---

## 5. Run Smoke Tests
**Terminal:** Any shell
```bash
npx hardhat test test/annuity/06-smoke.fullcycle.test.js --network localhost
```
**Expected:**
- "31 passing" (all tests pass)
- No failures

---

## 6. Build Web Frontend
**Terminal:** Any shell
```bash
cd web
npm run build
```
**Expected:**
- "vite build" completes
- "✓ built in ...ms" message
- No errors

---

## 7. Open Web UI
**Browser:**
- Go to [http://localhost:4000](http://localhost:4000)

**Expected:**
- Wallet sidebar shows address, native balance, stablecoins ("eAUD"), annuity tokens
- UI matches Imperium branding
- Chat and investment panels are functional

---

## Notes
- For development with hot reload, use `npm run dev` in the `web/` folder (dev server on :5173, proxies API calls to :4000).
- Always use separate terminals for Hardhat node and API server to avoid conflicts.
- Stablecoin symbol is now "eAUD" (ImperiumAUD).
- If you encounter errors, check logs in `/tmp/hardhat-node.log` and `/tmp/imperium-api.log`.

---

**End of Guide**
