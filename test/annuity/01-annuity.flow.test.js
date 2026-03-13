const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("Annuity Lifecycle - secondary trading & coupons", function () {
  let stablecoinIssuer, annuityIssuer, investor, secondary;

  before(async function () {
    [stablecoinIssuer, annuityIssuer, investor, secondary] = await ethers.getSigners();
  });

  it("issue -> coupon to investor -> transfer to secondary -> coupon to secondary", async function () {
    // Deploy mock stablecoin (ether simulation)
    const ImperiumStableCoin = await ethers.getContractFactory("ImperiumStableCoin", stablecoinIssuer);
    const stablecoin = await ImperiumStableCoin.deploy();
    await stablecoin.waitForDeployment();

    // Prefund both investor and secondary buyer with stablecoins
    await stablecoin.connect(stablecoinIssuer).transfer(investor.address, ethers.parseEther("2000"));
    await stablecoin.connect(stablecoinIssuer).transfer(secondary.address, ethers.parseEther("2000"));

    // Define annuity parameters
    const startDate = Math.floor(Date.now() / 1000);
    const maturityDate = startDate + 365 * 24 * 60 * 60; // 1 year maturity
    const faceValue = ethers.parseEther("1000");
    const interestRate = 500;
    const couponDates = [
      startDate + 30 * 24 * 60 * 60,   // 1 month from now
      startDate + 60 * 24 * 60 * 60    // 2 months from now
    ];
    const couponValues = [
      ethers.parseEther("100"),
      ethers.parseEther("100")
    ];

    // Deploy annuity contract with separate issuer
    const AnnuityToken = await ethers.getContractFactory("AnnuityToken", annuityIssuer);
    const annuity = await AnnuityToken.deploy(
      annuityIssuer.address,
      startDate,
      maturityDate,
      faceValue,
      interestRate,
      couponDates,
      couponValues,
      await stablecoin.getAddress()
    );
    await annuity.waitForDeployment();

    // Investor approves annuity contract to deduct faceValue
    await stablecoin.connect(investor).approve(await annuity.getAddress(), faceValue);

    // Investor accepts annuity, face value transferred to annuity issuer, investor becomes currentOwner
    await annuity.connect(investor).acceptAndIssue(investor.address);

    // Annuity issuer approves the annuity contract to deduct coupon payments
    const totalCoupons = couponValues[0] + couponValues[1];
    await stablecoin.connect(annuityIssuer).approve(await annuity.getAddress(), totalCoupons);

    // Coupon 0: Issuer pays first coupon, should go to currentOwner (investor)
    await annuity.connect(annuityIssuer).payCoupon(0);
    const investorBalAfterCoupon0 = await stablecoin.balanceOf(investor.address);
    expect(investorBalAfterCoupon0).to.equal(ethers.parseEther("1100"),
      "Investor should have received coupon 0");

    // Secondary buyer approves annuity contract to pay purchase price
    const salePrice = ethers.parseEther("1050");
    await stablecoin.connect(secondary).approve(await annuity.getAddress(), salePrice);

    // Investor transfers annuity ownership to secondary buyer
    await annuity.connect(investor).transferAnnuity(secondary.address, salePrice);
    const ownerAfterSale = await annuity.currentOwner();
    expect(ownerAfterSale).to.equal(secondary.address, "Current owner should now be the secondary buyer");

    // Secondary's balance after purchase (before coupons)
    let secondaryBal = await stablecoin.balanceOf(secondary.address);
    expect(secondaryBal).to.equal(ethers.parseEther("950"),
      "Secondary should have 950 after buying for 1050");

    // Investor receives sale proceeds
    const investorBalAfterSale = await stablecoin.balanceOf(investor.address);
    expect(investorBalAfterSale).to.equal(ethers.parseEther("2150"),
      "Investor should have received sale proceeds");

    // Coupon 1: Issuer pays second coupon, should go to new currentOwner (secondary buyer)
    await annuity.connect(annuityIssuer).payCoupon(1);
    const secondaryBalAfterCoupon = await stablecoin.balanceOf(secondary.address);
    expect(secondaryBalAfterCoupon).to.equal(ethers.parseEther("1050"),
      "Secondary buyer should have received coupon 1");
  });

  it("5-day coupon roll: 3 to investor, transfer, 2 to secondary", async function () {
    const ImperiumStableCoin = await ethers.getContractFactory("ImperiumStableCoin", stablecoinIssuer);
    const stablecoin = await ImperiumStableCoin.deploy();
    await stablecoin.waitForDeployment();

    // Prefund both investor and secondary buyer with stablecoins
    await stablecoin.connect(stablecoinIssuer).transfer(investor.address, ethers.parseEther("2000"));
    await stablecoin.connect(stablecoinIssuer).transfer(secondary.address, ethers.parseEther("2000"));

    // 5 daily coupons
    const now = Math.floor(Date.now() / 1000);
    const startDate = now;
    const maturityDate = startDate + 5 * 24 * 60 * 60; // 5 days
    const faceValue = ethers.parseEther("1000");
    const interestRate = 500;
    const couponDates = [
      startDate + 1 * 24 * 60 * 60,
      startDate + 2 * 24 * 60 * 60,
      startDate + 3 * 24 * 60 * 60,
      startDate + 4 * 24 * 60 * 60,
      startDate + 5 * 24 * 60 * 60
    ];
    const couponValues = [
      ethers.parseEther("10"),
      ethers.parseEther("10"),
      ethers.parseEther("10"),
      ethers.parseEther("10"),
      ethers.parseEther("10")
    ];

    const AnnuityToken = await ethers.getContractFactory("AnnuityToken", annuityIssuer);
    const annuity = await AnnuityToken.deploy(
      annuityIssuer.address,
      startDate,
      maturityDate,
      faceValue,
      interestRate,
      couponDates,
      couponValues,
      await stablecoin.getAddress()
    );
    await annuity.waitForDeployment();

    await stablecoin.connect(investor).approve(await annuity.getAddress(), faceValue);
    await annuity.connect(investor).acceptAndIssue(investor.address);

    // Approve enough for all coupons
    const totalCoupons = couponValues.reduce((acc, v) => acc + v, 0n);
    await stablecoin.connect(annuityIssuer).approve(await annuity.getAddress(), totalCoupons);

    // Pay first 3 coupons to original investor
    for (let i = 0; i < 3; i++) {
      await annuity.connect(annuityIssuer).payCoupon(i);
    }
    let investorBal = await stablecoin.balanceOf(investor.address);
    expect(investorBal).to.equal(ethers.parseEther("1030"),
      "Investor should have received 3 coupons (10 each) after paying face value");

    // Secondary buyer approves annuity contract to pay purchase price
    const salePrice = ethers.parseEther("1050");
    await stablecoin.connect(secondary).approve(await annuity.getAddress(), salePrice);

    // Investor transfers annuity ownership to secondary buyer
    await annuity.connect(investor).transferAnnuity(secondary.address, salePrice);
    const ownerAfterSale = await annuity.currentOwner();
    expect(ownerAfterSale).to.equal(secondary.address, "Current owner should now be the secondary buyer");

    // Investor receives sale proceeds
    investorBal = await stablecoin.balanceOf(investor.address);
    expect(investorBal).to.equal(ethers.parseEther("2080"),
      "Investor should have received sale proceeds and 3 coupons");

    // Pay last 2 coupons to secondary
    for (let i = 3; i < 5; i++) {
      await annuity.connect(annuityIssuer).payCoupon(i);
    }
    const secondaryBal = await stablecoin.balanceOf(secondary.address);
    expect(secondaryBal).to.equal(ethers.parseEther("970"),
      "Secondary should have received 2 coupons (10 each) after buying for 1050");
  });
});
