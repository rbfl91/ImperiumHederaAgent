# Imperium Markets — AnnuityToken

A Solidity smart contract project for creating, issuing, and trading tokenized annuities using an ERC20 stablecoin on Hedera Network. Built with Hardhat + ethers.js v6, including a full-lifecycle CLI agent, mock API gateway, and automated demo bot.

## Quick Start

```bash
# Install dependencies
npm install

# Run all contract tests
npm test

# Launch full stack (Hardhat node + deploy + API + agent)
./start.sh

# Run demo bot (start backend separately, then in another terminal)
node test/annuity/demo-bot.js --fast
```

## Features

- **Issue Annuities:** Investors accept and fund annuities using a stablecoin.
- **Coupon Payments:** Issuer pays periodic coupon payments to the current owner.
- **Transferable Ownership:** Annuities can be sold or transferred to new owners for a stablecoin price.
- **Maturity Redemption:** Face value returned to current owner at maturity.
- **Secure Payments:** OpenZeppelin SafeERC20 for all fund transfers.
- **Reentrancy Protection:** All critical functions protected with OpenZeppelin ReentrancyGuard.
- **CLI Agent (v0.2):** Interactive rule-based agent with 10 intents for full lifecycle management.
- **Mock API Gateway:** Express server with 10 endpoints for contract orchestration.
- **Demo Bot:** Visual walkthrough bot for screen recordings and presentations.

## Project Structure

```
contracts/
  AnnuityToken.sol          # Core annuity smart contract
  MockStablecoin.sol        # ERC-20 mock for testing
  MaliciousStablecoin.sol   # Adversarial mock for reentrancy tests
scripts/
  deploy.js                 # Hardhat deploy script
mocks/
  mock-api.js               # Express API gateway (10 endpoints)
agent/
  cli-agent.js              # Interactive CLI agent (10 intents)
test/annuity/
  01-annuity.flow.test.js       # Lifecycle + secondary trading
  02-annuity.payments.test.js   # Coupon payments
  03-annuity.transfer.test.js   # Secondary transfers
  04-annuity.security.test.js   # Access control
  05-annuity.reentrancy.test.js # Reentrancy guard
  06-smoke.fullcycle.test.js    # API + agent parser smoke test
  01-annuity.api.flow.test.js   # API integration test
  demo-bot.js                   # Visual demo bot
docs/
  hedera-migration-blueprint.md # Deployment roadmap
```

## Contract Details

**State Variables:**
- `issuer`: Address of the annuity issuer.
- `investor`: Original investor.
- `currentOwner`: Current owner of the annuity.
- `startDate` / `maturityDate`: Start and maturity timestamps.
- `faceValue`: Principal amount of the annuity.
- `interestRate`: Interest rate (basis points).
- `couponDates` / `couponValues`: Arrays defining coupon schedule and values.
- `stablecoin`: ERC20 token used for payments.
- `issued`: Tracks whether the annuity has been issued.
- `couponPaid`: Tracks which coupons have been paid.

**Events:**
- `Issued`: Emitted when annuity is issued.
- `CouponPaid`: Emitted when a coupon is paid.
- `AnnuityTransferred`: Emitted when annuity is transferred to a new owner.
- `Redeemed`: Emitted when annuity reaches maturity.
- `Expired`: Emitted when annuity expires after redemption.

**Functions:**
- `acceptAndIssue(address _investor)`: Investor accepts the annuity and pays the face value.
- `payCoupon(uint256 index)`: Issuer pays a coupon to the current owner.
- `transferAnnuity(address newOwner, uint256 price)`: Transfer annuity to a new owner for a stablecoin price.
- `redeemMaturity()`: Redeems the annuity at maturity.
- `getCouponCount()`: Returns the total number of coupons.
- `isCouponPaid(uint256 index)`: Returns whether a coupon has been paid.

## NPM Scripts

| Command | Description |
|---------|-------------|
| `npm test` | Run all contract tests |
| `npm run test:contracts` | Run only the 5 contract test files |
| `npm run compile` | Compile Solidity contracts |
| `npm run deploy:local` | Deploy to local Hardhat node |
| `npm run node` | Start Hardhat node |
| `npm start` | Launch full stack via start.sh |

## Dependencies

- [OpenZeppelin Contracts](https://github.com/OpenZeppelin/openzeppelin-contracts) — SafeERC20, ReentrancyGuard
- [Hardhat](https://hardhat.org/) — Build, test, deploy
- [ethers.js v6](https://docs.ethers.org/v6/) — Contract interaction in tests
- [web3.js v4](https://web3js.org/) — API gateway runtime
- [Express](https://expressjs.com/) — Mock API server

## License

ISC
