const { expectEvent, BN } = require("@openzeppelin/test-helpers");
const MockStablecoin = artifacts.require("MockStablecoin");
const AnnuityToken = artifacts.require("AnnuityToken");

contract("Annuity Lifecycle - secondary trading & coupons", (accounts) => {
  const [issuer, investor, secondary] = accounts;

  it("issue -> coupon to investor -> transfer to secondary -> coupon to secondary", async () => {
    // Deploy stablecoin and annuity
    const stablecoin = await MockStablecoin.new({ from: issuer });

    // Prefund investor and secondary
    await stablecoin.transfer(investor, web3.utils.toWei("2000", "ether"), { from: issuer });
    await stablecoin.transfer(secondary, web3.utils.toWei("2000", "ether"), { from: issuer });

    // Create annuity with 2 coupons
    const startDate = Math.floor(Date.now() / 1000);
    const maturityDate = startDate + 365 * 24 * 60 * 60;
    const faceValue = web3.utils.toWei("1000", "ether");
    const interestRate = 500;
    const couponDates = [
      startDate + 30 * 24 * 60 * 60,
      startDate + 60 * 24 * 60 * 60
    ];
    const couponValues = [
      web3.utils.toWei("100", "ether"),
      web3.utils.toWei("100", "ether")
    ];

    const annuity = await AnnuityToken.new(
      issuer,
      startDate,
      maturityDate,
      faceValue,
      interestRate,
      couponDates,
      couponValues,
      stablecoin.address,
      { from: issuer }
    );

    // Investor approves annuity contract to pull faceValue
    await stablecoin.approve(annuity.address, faceValue, { from: investor });

    // Investor accepts and issues the annuity
    const txIssue = await annuity.acceptAndIssue(investor, { from: investor });
    expectEvent(txIssue, "Issued", { investor, faceValue: faceValue });

    // Issuer approves contract for total coupons
    const totalCoupons = new BN(couponValues[0]).add(new BN(couponValues[1]));
    await stablecoin.approve(annuity.address, totalCoupons.toString(), { from: issuer });

    // PAY coupon 0 -> goes to currentOwner (investor)
    const txCoupon0 = await annuity.payCoupon(0, { from: issuer });
    expectEvent(txCoupon0, "CouponPaid", { 
      index: new BN(0),
      value: couponValues[0],
      to: investor
    });

    // Check investor balance
    const investorBal1 = await stablecoin.balanceOf(investor);
    const expectedInvestor1 = new BN(web3.utils.toWei("1100", "ether")); // 2000 - 1000 + 100
    assert(investorBal1.eq(expectedInvestor1), "Investor should have received first coupon");

    // Prepare secondary (buyer) to buy the annuity
    const salePrice = web3.utils.toWei("1050", "ether");
    await stablecoin.approve(annuity.address, salePrice, { from: secondary });

    // currentOwner (investor) initiates transferAnnuity to secondary
    const txTransfer = await annuity.transferAnnuity(secondary, salePrice, { from: investor });
    expectEvent(txTransfer, "AnnuityTransferred", {
      from: investor,
      to: secondary,
      price: salePrice
    });

    // Check currentOwner changed
    const owner = await annuity.currentOwner();
    assert.equal(owner, secondary, "Current owner should be secondary");

    // Check investor received sale proceeds
    const investorBalAfterSale = await stablecoin.balanceOf(investor);
    const expectedInvestorAfterSale = new BN(web3.utils.toWei("2150", "ether")); // 1100 + 1050
    assert(investorBalAfterSale.eq(expectedInvestorAfterSale), "Investor should have sale proceeds");

    // PAY coupon 1 -> goes to currentOwner (secondary)
    const txCoupon1 = await annuity.payCoupon(1, { from: issuer });
    expectEvent(txCoupon1, "CouponPaid", { 
      index: new BN(1),
      value: couponValues[1],
      to: secondary
    });

    // Check secondary balance
    const secondaryBalAfterCoupon = await stablecoin.balanceOf(secondary);
    const expectedSecondaryBal = new BN(web3.utils.toWei("1050", "ether")); // 2000 - 1050 + 100
    assert(secondaryBalAfterCoupon.eq(expectedSecondaryBal), "Secondary should have received second coupon");
  });
});