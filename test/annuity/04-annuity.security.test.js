const { expectRevert } = require("@openzeppelin/test-helpers");
const MockStablecoin = artifacts.require("MockStablecoin");
const AnnuityToken = artifacts.require("AnnuityToken");

contract("AnnuityToken - security and access control", (accounts) => {
  const [issuer, investor, attacker] = accounts;

  it("should not allow acceptAndIssue to run twice", async () => {
    // Deploy mock stablecoin and annuity
    const stablecoin = await MockStablecoin.new({ from: issuer });
    await stablecoin.transfer(investor, web3.utils.toWei("2000", "ether"), { from: issuer });

    const startDate = Math.floor(Date.now() / 1000);
    const maturityDate = startDate + 365 * 24 * 60 * 60;
    const faceValue = web3.utils.toWei("1000", "ether");

    const annuity = await AnnuityToken.new(
      issuer,
      startDate,
      maturityDate,
      faceValue,
      500,
      [startDate + 30 * 24 * 60 * 60],
      [web3.utils.toWei("100", "ether")],
      stablecoin.address,
      { from: issuer }
    );

    await stablecoin.approve(annuity.address, faceValue, { from: investor });
    await annuity.acceptAndIssue(investor, { from: investor });

    // Second call should revert
    await expectRevert(
      annuity.acceptAndIssue(investor, { from: investor }),
      "Already issued"
    );
  });

  it("should not allow non-issuer to pay coupons", async () => {
    // Deploy mock stablecoin and annuity
    const stablecoin = await MockStablecoin.new({ from: issuer });
    await stablecoin.transfer(investor, web3.utils.toWei("2000", "ether"), { from: issuer });

    const startDate = Math.floor(Date.now() / 1000);
    const maturityDate = startDate + 365 * 24 * 60 * 60;
    const faceValue = web3.utils.toWei("1000", "ether");

    const annuity = await AnnuityToken.new(
      issuer,
      startDate,
      maturityDate,
      faceValue,
      500,
      [startDate + 30 * 24 * 60 * 60],
      [web3.utils.toWei("100", "ether")],
      stablecoin.address,
      { from: issuer }
    );

    await stablecoin.approve(annuity.address, faceValue, { from: investor });
    await annuity.acceptAndIssue(investor, { from: investor });

    // Attacker tries to pay coupon
    await expectRevert(
      annuity.payCoupon(0, { from: attacker }),
      "Only issuer can pay coupons"
    );
  });
});