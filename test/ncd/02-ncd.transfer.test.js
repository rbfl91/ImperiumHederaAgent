const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("NCD Transfer Tests", function () {
  let stablecoinIssuer, ncdIssuer, investor, secondary;

  before(async function () {
    [stablecoinIssuer, ncdIssuer, investor, secondary] = await ethers.getSigners();
  });

  async function deployAndIssueNCD() {
    const ImperiumStableCoin = await ethers.getContractFactory("ImperiumStableCoin", stablecoinIssuer);
    const stablecoin = await ImperiumStableCoin.deploy();
    await stablecoin.waitForDeployment();

    await stablecoin.connect(stablecoinIssuer).transfer(investor.address, ethers.parseEther("2000"));
    await stablecoin.connect(stablecoinIssuer).transfer(secondary.address, ethers.parseEther("2000"));

    const startDate = Math.floor(Date.now() / 1000);
    const maturityDate = startDate + 5 * 24 * 60 * 60;
    const faceValue = ethers.parseEther("1000");
    const discountedValue = ethers.parseEther("970");

    const NCDToken = await ethers.getContractFactory("NCDToken", ncdIssuer);
    const ncd = await NCDToken.deploy(
      ncdIssuer.address, startDate, maturityDate, faceValue,
      300, discountedValue, await stablecoin.getAddress()
    );
    await ncd.waitForDeployment();

    await stablecoin.connect(investor).approve(await ncd.getAddress(), discountedValue);
    await ncd.connect(investor).acceptAndIssue(investor.address);

    return { stablecoin, ncd, faceValue };
  }

  it("reverts if buyer has not approved enough stablecoins", async function () {
    const { ncd } = await deployAndIssueNCD();
    const salePrice = ethers.parseEther("980");

    // No approval
    await expect(
      ncd.connect(investor).transferNCD(secondary.address, salePrice)
    ).to.be.reverted;
  });

  it("reverts if non-owner tries to transfer", async function () {
    const { ncd } = await deployAndIssueNCD();
    const salePrice = ethers.parseEther("980");

    await expect(
      ncd.connect(secondary).transferNCD(secondary.address, salePrice)
    ).to.be.revertedWith("Only current owner can transfer");
  });

  it("reverts on transfer to zero address", async function () {
    const { ncd } = await deployAndIssueNCD();

    await expect(
      ncd.connect(investor).transferNCD(ethers.ZeroAddress, ethers.parseEther("980"))
    ).to.be.revertedWith("Invalid new owner");
  });

  it("reverts on zero price transfer", async function () {
    const { ncd } = await deployAndIssueNCD();

    await expect(
      ncd.connect(investor).transferNCD(secondary.address, 0)
    ).to.be.revertedWith("Price must be > 0");
  });
});
