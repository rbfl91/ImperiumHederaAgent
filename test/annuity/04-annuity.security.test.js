const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("AnnuityToken - security and access control", function () {
  let issuer, investor, attacker;

  before(async function () {
    [issuer, investor, attacker] = await ethers.getSigners();
  });

  it("should not allow acceptAndIssue to run twice", async function () {
    // Deploy mock stablecoin and annuity
    const MockStablecoin = await ethers.getContractFactory("MockStablecoin", issuer);
    const stablecoin = await MockStablecoin.deploy();
    await stablecoin.waitForDeployment();
    await stablecoin.connect(issuer).transfer(investor.address, ethers.parseEther("2000"));

    const startDate = Math.floor(Date.now() / 1000);
    const maturityDate = startDate + 365 * 24 * 60 * 60;
    const faceValue = ethers.parseEther("1000");

    const AnnuityToken = await ethers.getContractFactory("AnnuityToken", issuer);
    const annuity = await AnnuityToken.deploy(
      issuer.address,
      startDate,
      maturityDate,
      faceValue,
      500,
      [startDate + 30 * 24 * 60 * 60],
      [ethers.parseEther("100")],
      await stablecoin.getAddress()
    );
    await annuity.waitForDeployment();

    await stablecoin.connect(investor).approve(await annuity.getAddress(), faceValue);
    await annuity.connect(investor).acceptAndIssue(investor.address);

    // Second call should revert
    await expect(
      annuity.connect(investor).acceptAndIssue(investor.address)
    ).to.be.revertedWith("Already issued");
  });

  it("should not allow non-issuer to pay coupons", async function () {
    // Deploy mock stablecoin and annuity
    const MockStablecoin = await ethers.getContractFactory("MockStablecoin", issuer);
    const stablecoin = await MockStablecoin.deploy();
    await stablecoin.waitForDeployment();
    await stablecoin.connect(issuer).transfer(investor.address, ethers.parseEther("2000"));

    const startDate = Math.floor(Date.now() / 1000);
    const maturityDate = startDate + 365 * 24 * 60 * 60;
    const faceValue = ethers.parseEther("1000");

    const AnnuityToken = await ethers.getContractFactory("AnnuityToken", issuer);
    const annuity = await AnnuityToken.deploy(
      issuer.address,
      startDate,
      maturityDate,
      faceValue,
      500,
      [startDate + 30 * 24 * 60 * 60],
      [ethers.parseEther("100")],
      await stablecoin.getAddress()
    );
    await annuity.waitForDeployment();

    await stablecoin.connect(investor).approve(await annuity.getAddress(), faceValue);
    await annuity.connect(investor).acceptAndIssue(investor.address);

    // Attacker tries to pay coupon
    await expect(
      annuity.connect(attacker).payCoupon(0)
    ).to.be.revertedWith("Only issuer can pay coupons");
  });
});
