const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("AnnuityToken - coupon payments", function () {
  let issuer, investor;

  before(async function () {
    [issuer, investor] = await ethers.getSigners();
  });

  it("should prevent paying the same coupon twice", async function () {
    // Deploy mock stablecoin
    const MockStablecoin = await ethers.getContractFactory("MockStablecoin", issuer);
    const stablecoin = await MockStablecoin.deploy();
    await stablecoin.waitForDeployment();
    await stablecoin.connect(issuer).transfer(investor.address, ethers.parseEther("2000"));

    // Define annuity parameters with one coupon
    const startDate = Math.floor(Date.now() / 1000);
    const maturityDate = startDate + 365 * 24 * 60 * 60;
    const faceValue = ethers.parseEther("1000");
    const couponValue = ethers.parseEther("100");

    const AnnuityToken = await ethers.getContractFactory("AnnuityToken", issuer);
    const annuity = await AnnuityToken.deploy(
      issuer.address,
      startDate,
      maturityDate,
      faceValue,
      500,
      [startDate + 30 * 24 * 60 * 60],
      [couponValue],
      await stablecoin.getAddress()
    );
    await annuity.waitForDeployment();

    // Investor accepts annuity
    await stablecoin.connect(investor).approve(await annuity.getAddress(), faceValue);
    await annuity.connect(investor).acceptAndIssue(investor.address);

    // Issuer approves enough stablecoins for coupon payments
    await stablecoin.connect(issuer).approve(await annuity.getAddress(), couponValue);

    // First payment succeeds
    await annuity.connect(issuer).payCoupon(0);

    // Second payment of same coupon should revert
    await expect(
      annuity.connect(issuer).payCoupon(0)
    ).to.be.revertedWith("Coupon already paid");
  });

  it("should revert if coupon index is invalid", async function () {
    // Deploy mock stablecoin
    const MockStablecoin = await ethers.getContractFactory("MockStablecoin", issuer);
    const stablecoin = await MockStablecoin.deploy();
    await stablecoin.waitForDeployment();
    await stablecoin.connect(issuer).transfer(investor.address, ethers.parseEther("2000"));

    // Define annuity with only one coupon
    const startDate = Math.floor(Date.now() / 1000);
    const maturityDate = startDate + 365 * 24 * 60 * 60;
    const faceValue = ethers.parseEther("1000");
    const couponValue = ethers.parseEther("100");

    const AnnuityToken = await ethers.getContractFactory("AnnuityToken", issuer);
    const annuity = await AnnuityToken.deploy(
      issuer.address,
      startDate,
      maturityDate,
      faceValue,
      500,
      [startDate + 30 * 24 * 60 * 60],
      [couponValue],
      await stablecoin.getAddress()
    );
    await annuity.waitForDeployment();

    await stablecoin.connect(investor).approve(await annuity.getAddress(), faceValue);
    await annuity.connect(investor).acceptAndIssue(investor.address);

    await stablecoin.connect(issuer).approve(await annuity.getAddress(), couponValue);

    // Invalid index (1) should revert
    await expect(
      annuity.connect(issuer).payCoupon(1)
    ).to.be.revertedWith("Invalid coupon index");
  });
});
