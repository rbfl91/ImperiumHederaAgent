const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("NCD Security", function () {
  let stablecoinIssuer, ncdIssuer, investor, attacker;

  before(async function () {
    [stablecoinIssuer, ncdIssuer, investor, attacker] = await ethers.getSigners();
  });

  async function deployNCD() {
    const ImperiumStableCoin = await ethers.getContractFactory("ImperiumStableCoin", stablecoinIssuer);
    const stablecoin = await ImperiumStableCoin.deploy();
    await stablecoin.waitForDeployment();

    await stablecoin.connect(stablecoinIssuer).transfer(investor.address, ethers.parseEther("2000"));
    await stablecoin.connect(stablecoinIssuer).transfer(ncdIssuer.address, ethers.parseEther("2000"));

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
    return { stablecoin, ncd, faceValue, discountedValue };
  }

  it("prevents double issuance", async function () {
    const { stablecoin, ncd, discountedValue } = await deployNCD();

    await stablecoin.connect(investor).approve(await ncd.getAddress(), discountedValue);
    await ncd.connect(investor).acceptAndIssue(investor.address);

    await stablecoin.connect(investor).approve(await ncd.getAddress(), discountedValue);
    await expect(ncd.connect(investor).acceptAndIssue(investor.address)).to.be.revertedWith("Already issued");
  });

  it("only issuer can redeem", async function () {
    const { stablecoin, ncd, discountedValue } = await deployNCD();

    await stablecoin.connect(investor).approve(await ncd.getAddress(), discountedValue);
    await ncd.connect(investor).acceptAndIssue(investor.address);

    await ethers.provider.send("evm_increaseTime", [6 * 24 * 60 * 60]);
    await ethers.provider.send("evm_mine");

    await expect(ncd.connect(attacker).redeemMaturity()).to.be.revertedWith("Only issuer can redeem");
  });

  it("prevents redemption after expiry", async function () {
    const { stablecoin, ncd, faceValue, discountedValue } = await deployNCD();

    await stablecoin.connect(investor).approve(await ncd.getAddress(), discountedValue);
    await ncd.connect(investor).acceptAndIssue(investor.address);

    await ethers.provider.send("evm_increaseTime", [6 * 24 * 60 * 60]);
    await ethers.provider.send("evm_mine");

    await stablecoin.connect(ncdIssuer).approve(await ncd.getAddress(), faceValue);
    await ncd.connect(ncdIssuer).redeemMaturity();

    await stablecoin.connect(ncdIssuer).approve(await ncd.getAddress(), faceValue);
    await expect(ncd.connect(ncdIssuer).redeemMaturity()).to.be.revertedWith("NCD expired");
  });

  it("cannot redeem before issuance", async function () {
    const { ncd } = await deployNCD();

    await ethers.provider.send("evm_increaseTime", [6 * 24 * 60 * 60]);
    await ethers.provider.send("evm_mine");

    await expect(ncd.connect(ncdIssuer).redeemMaturity()).to.be.revertedWith("Not yet issued");
  });
});
