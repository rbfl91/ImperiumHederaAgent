const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("AnnuityToken - secondary transfers", function () {
  let issuer, investor, secondary, attacker;

  before(async function () {
    [issuer, investor, secondary, attacker] = await ethers.getSigners();
  });

  async function deployAndIssueAnnuity() {
    const MockStablecoin = await ethers.getContractFactory("MockStablecoin", issuer);
    const stablecoin = await MockStablecoin.deploy();
    await stablecoin.waitForDeployment();
    await stablecoin.connect(issuer).transfer(investor.address, ethers.parseEther("2000"));
    await stablecoin.connect(issuer).transfer(secondary.address, ethers.parseEther("500"));

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

    return { stablecoin, annuity, faceValue };
  }

  it("should revert if buyer has not approved enough stablecoins", async function () {
    const { stablecoin, annuity } = await deployAndIssueAnnuity();

    const salePrice = ethers.parseEther("800");
    // Approve less than sale price
    await stablecoin.connect(secondary).approve(await annuity.getAddress(), ethers.parseEther("500"));

    // Match the actual low-level revert from ERC20 transferFrom
    await expect(
      annuity.connect(investor).transferAnnuity(secondary.address, salePrice)
    ).to.be.reverted;
  });

  it("should prevent transfer initiated by non-owner", async function () {
    const { annuity, faceValue } = await deployAndIssueAnnuity();

    await expect(
      annuity.connect(attacker).transferAnnuity(secondary.address, faceValue)
    ).to.be.revertedWith("Only current owner can initiate transfer");
  });

  it("should prevent transfer to zero address", async function () {
    const { annuity, faceValue } = await deployAndIssueAnnuity();

    await expect(
      annuity.connect(investor).transferAnnuity(ethers.ZeroAddress, faceValue)
    ).to.be.revertedWith("Invalid new owner");
  });
});
