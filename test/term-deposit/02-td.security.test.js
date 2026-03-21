const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("Term Deposit Security", function () {
  let stablecoinIssuer, tdIssuer, investor, attacker;

  before(async function () {
    [stablecoinIssuer, tdIssuer, investor, attacker] = await ethers.getSigners();
  });

  async function deployTD() {
    const ImperiumStableCoin = await ethers.getContractFactory("ImperiumStableCoin", stablecoinIssuer);
    const stablecoin = await ImperiumStableCoin.deploy();
    await stablecoin.waitForDeployment();

    await stablecoin.connect(stablecoinIssuer).transfer(investor.address, ethers.parseEther("2000"));
    await stablecoin.connect(stablecoinIssuer).transfer(tdIssuer.address, ethers.parseEther("2000"));

    const startDate = Math.floor(Date.now() / 1000);
    const maturityDate = startDate + 3 * 24 * 60 * 60;
    const faceValue = ethers.parseEther("1000");
    const interestAmount = ethers.parseEther("50");

    const TermDepositToken = await ethers.getContractFactory("TermDepositToken", tdIssuer);
    const td = await TermDepositToken.deploy(
      tdIssuer.address, startDate, maturityDate, faceValue,
      500, interestAmount, await stablecoin.getAddress()
    );
    await td.waitForDeployment();
    return { stablecoin, td, faceValue, interestAmount };
  }

  it("prevents double issuance", async function () {
    const { stablecoin, td, faceValue } = await deployTD();

    await stablecoin.connect(investor).approve(await td.getAddress(), faceValue);
    await td.connect(investor).acceptAndIssue(investor.address);

    await stablecoin.connect(investor).approve(await td.getAddress(), faceValue);
    await expect(td.connect(investor).acceptAndIssue(investor.address)).to.be.revertedWith("Already issued");
  });

  it("only issuer can redeem", async function () {
    const { stablecoin, td, faceValue } = await deployTD();

    await stablecoin.connect(investor).approve(await td.getAddress(), faceValue);
    await td.connect(investor).acceptAndIssue(investor.address);

    await ethers.provider.send("evm_increaseTime", [4 * 24 * 60 * 60]);
    await ethers.provider.send("evm_mine");

    await expect(td.connect(attacker).redeemMaturity()).to.be.revertedWith("Only issuer can redeem");
  });

  it("prevents redemption after expiry", async function () {
    const { stablecoin, td, faceValue, interestAmount } = await deployTD();

    await stablecoin.connect(investor).approve(await td.getAddress(), faceValue);
    await td.connect(investor).acceptAndIssue(investor.address);

    await ethers.provider.send("evm_increaseTime", [4 * 24 * 60 * 60]);
    await ethers.provider.send("evm_mine");

    const totalPayout = faceValue + interestAmount;
    await stablecoin.connect(tdIssuer).approve(await td.getAddress(), totalPayout);
    await td.connect(tdIssuer).redeemMaturity();

    await stablecoin.connect(tdIssuer).approve(await td.getAddress(), totalPayout);
    await expect(td.connect(tdIssuer).redeemMaturity()).to.be.revertedWith("Term deposit expired");
  });

  it("cannot redeem before issuance", async function () {
    const { td } = await deployTD();

    await ethers.provider.send("evm_increaseTime", [4 * 24 * 60 * 60]);
    await ethers.provider.send("evm_mine");

    await expect(td.connect(tdIssuer).redeemMaturity()).to.be.revertedWith("Not yet issued");
  });
});
