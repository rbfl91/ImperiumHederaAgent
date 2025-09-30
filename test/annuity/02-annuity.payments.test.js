const { expectRevert } = require("@openzeppelin/test-helpers");
const MockStablecoin = artifacts.require("MockStablecoin");
const AnnuityToken = artifacts.require("AnnuityToken");

contract("AnnuityToken - coupon payments", (accounts) => {
  const [issuer, investor] = accounts;

  it("should prevent paying the same coupon twice", async () => {
    // Deploy mock stablecoin
    const stablecoin = await MockStablecoin.new({ from: issuer });
    await stablecoin.transfer(investor, web3.utils.toWei("2000", "ether"), { from: issuer });

    // Define annuity parameters with one coupon
    const startDate = Math.floor(Date.now() / 1000);
    const maturityDate = startDate + 365 * 24 * 60 * 60;
    const faceValue = web3.utils.toWei("1000", "ether");
    const couponValue = web3.utils.toWei("100", "ether");

    const annuity = await AnnuityToken.new(
      issuer,
      startDate,
      maturityDate,
      faceValue,
      500,
      [startDate + 30 * 24 * 60 * 60],
      [couponValue],
      stablecoin.address,
      { from: issuer }
    );

    // Investor accepts annuity
    await stablecoin.approve(annuity.address, faceValue, { from: investor });
    await annuity.acceptAndIssue(investor, { from: investor });

    // Issuer approves enough stablecoins for coupon payments
    await stablecoin.approve(annuity.address, couponValue, { from: issuer });

    // First payment succeeds
    await annuity.payCoupon(0, { from: issuer });

    // Second payment of same coupon should revert
    await expectRevert(
      annuity.payCoupon(0, { from: issuer }),
      "Coupon already paid"
    );
  });

  it("should revert if coupon index is invalid", async () => {
    // Deploy mock stablecoin
    const stablecoin = await MockStablecoin.new({ from: issuer });
    await stablecoin.transfer(investor, web3.utils.toWei("2000", "ether"), { from: issuer });

    // Define annuity with only one coupon
    const startDate = Math.floor(Date.now() / 1000);
    const maturityDate = startDate + 365 * 24 * 60 * 60;
    const faceValue = web3.utils.toWei("1000", "ether");
    const couponValue = web3.utils.toWei("100", "ether");

    const annuity = await AnnuityToken.new(
      issuer,
      startDate,
      maturityDate,
      faceValue,
      500,
      [startDate + 30 * 24 * 60 * 60],
      [couponValue],
      stablecoin.address,
      { from: issuer }
    );

    await stablecoin.approve(annuity.address, faceValue, { from: investor });
    await annuity.acceptAndIssue(investor, { from: investor });

    await stablecoin.approve(annuity.address, couponValue, { from: issuer });

    // Invalid index (1) should revert
    await expectRevert(
      annuity.payCoupon(1, { from: issuer }),
      "Invalid coupon index"
    );
  });
});