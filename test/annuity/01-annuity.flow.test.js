const { expectEvent, BN, expectRevert } = require("@openzeppelin/test-helpers");

const MockStablecoin = artifacts.require("MockStablecoin");
const AnnuityToken = artifacts.require("AnnuityToken");

contract("Annuity Lifecycle - secondary trading & coupons", (accounts) => {
  const [stablecoinIssuer, annuityIssuer, investor, secondary] = accounts;

  it("issue -> coupon to investor -> transfer to secondary -> coupon to secondary", async () => {
    // Deploy mock stablecoin (Catena simulation)
    const stablecoin = await MockStablecoin.new({ from: stablecoinIssuer });

    // Prefund both investor and secondary buyer with stablecoins
    await stablecoin.transfer(investor, web3.utils.toWei("2000", "ether"), { from: stablecoinIssuer });
    await stablecoin.transfer(secondary, web3.utils.toWei("2000", "ether"), { from: stablecoinIssuer });

    // Define annuity parameters (face value, interest rate, coupons, dates)
    const startDate = Math.floor(Date.now() / 1000);
    const maturityDate = startDate + 365 * 24 * 60 * 60; // 1 year maturity
    const faceValue = web3.utils.toWei("1000", "ether");
    const interestRate = 500; // 5% for illustration
    const couponDates = [
      startDate + 30 * 24 * 60 * 60,   // 1 month from now
      startDate + 60 * 24 * 60 * 60    // 2 months from now
    ];
    const couponValues = [
      web3.utils.toWei("100", "ether"),
      web3.utils.toWei("100", "ether")
    ];

    // Deploy annuity contract with separate issuer
    const annuity = await AnnuityToken.new(
      annuityIssuer,
      startDate,
      maturityDate,
      faceValue,
      interestRate,
      couponDates,
      couponValues,
      stablecoin.address,
      { from: annuityIssuer }
    );

    // Investor approves annuity contract to deduct faceValue
    await stablecoin.approve(annuity.address, faceValue, { from: investor });

    // Investor accepts annuity → face value transferred to annuity issuer, investor becomes currentOwner
    await annuity.acceptAndIssue(investor, { from: investor });

    // Annuity issuer approves the annuity contract to deduct coupon payments
    const totalCoupons = web3.utils.toBN(couponValues[0]).add(web3.utils.toBN(couponValues[1]));
    await stablecoin.approve(annuity.address, totalCoupons.toString(), { from: annuityIssuer });

    // Coupon 0: Issuer pays first coupon → should go to currentOwner (investor)
    await annuity.payCoupon(0, { from: annuityIssuer });
    const investorBalAfterCoupon0 = await stablecoin.balanceOf(investor);
    assert.equal(
      web3.utils.fromWei(investorBalAfterCoupon0, "ether"),
      "1100",
      "Investor should have received coupon 0"
    );

    // Secondary buyer approves annuity contract to pay purchase price
    const salePrice = web3.utils.toWei("1050", "ether");
    await stablecoin.approve(annuity.address, salePrice, { from: secondary });

    // Investor transfers annuity ownership to secondary buyer
    await annuity.transferAnnuity(secondary, salePrice, { from: investor });
    const ownerAfterSale = await annuity.currentOwner();
    assert.equal(ownerAfterSale, secondary, "Current owner should now be the secondary buyer");

    // Investor receives sale proceeds
    const investorBalAfterSale = await stablecoin.balanceOf(investor);
    assert.equal(
      web3.utils.fromWei(investorBalAfterSale, "ether"),
      "2150",
      "Investor should have received sale proceeds"
    );

    // Coupon 1: Issuer pays second coupon → should go to new currentOwner (secondary buyer)
    await annuity.payCoupon(1, { from: annuityIssuer });
    const secondaryBalAfterCoupon = await stablecoin.balanceOf(secondary);
    assert.equal(
      web3.utils.fromWei(secondaryBalAfterCoupon, "ether"),
      "1050",
      "Secondary buyer should have received coupon 1"
    );
  });
});