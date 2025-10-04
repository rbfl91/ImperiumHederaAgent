# Imperium Markets AnnuityToken Smart Contract

A Solidity smart contract Truffle project for creating, issuing, and trading tokenized annuities using an ERC20 stablecoin. This contract was developed for Imperium Markets / Catena Annuity Use Case, allowing an issuer to offer fixed-income annuities to investors, pay periodic coupons, and enable secure secondary market transfers.

## Features

- **Issue Annuities: Investors can accept and fund annuities using a stablecoin.
  **Coupon Payments: Issuer can pay periodic coupon payments to the current owner.
  **Transferable Ownership: Annuities can be sold or transferred to new owners for a stablecoin price.
  **Secure Payments: Uses OpenZeppelin's SafeERC20 to securely transfer funds via a mock stablecoin.
  **Reentrancy Protection: All critical functions (acceptAndIssue, payCoupon, transferAnnuity, redeemMaturity) are protected with OpenZeppelin’s ReentrancyGuard.
  **Burn / Expire Annuities: Issuers can mark annuities as expired after redemption or maturity.

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
- `AnnuityRedeemed`: Emitted when annuity reaches it's maturity date.
- `Expired`: Emitted when annuity is burned.

## Functions

- `acceptAndIssue(address _investor)`: Investor accepts the annuity and pays the face value. Requires prior approval for the contract to spend `faceValue`.
- `payCoupon(uint256 index)`: Issuer pays a coupon to the current owner. Requires prior approval for the contract to spend the coupon amount.
- `transferAnnuity(address newOwner, uint256 price)`: Current owner transfers annuity to a new owner for a stablecoin price. Buyer must approve the contract for the price.
- `getCouponCount()`: Returns the total number of coupons.
- `getCouponValue(uint256 index)`: Returns the value of a specific coupon.
- `getCouponDate(uint256 index)`: Returns the date of a specific coupon. 
- `redeemMaturity()`: Redeems the annuity.

## Usage Example

1. Deploy the contract with issuer, start/maturity dates, face value, interest rate, coupon schedule, and stablecoin address.
2. Investor approves `faceValue` to the contract and calls `acceptAndIssue`.
3. Issuer pays coupons using `payCoupon`.
4. Annuity ownership can be transferred using `transferAnnuity`.

## Dependencies

- [OpenZeppelin Contracts](https://github.com/OpenZeppelin/openzeppelin-contracts) (`IERC20`, `SafeERC20`)
