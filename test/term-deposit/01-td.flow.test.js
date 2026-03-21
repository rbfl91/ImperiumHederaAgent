const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("Term Deposit Lifecycle", function () {
  let stablecoinIssuer, tdIssuer, investor;

  before(async function () {
    [stablecoinIssuer, tdIssuer, investor] = await ethers.getSigners();
  });

  it("issue -> mature -> redeem (interest + face value returned)", async function () {
    const ImperiumStableCoin = await ethers.getContractFactory("ImperiumStableCoin", stablecoinIssuer);
    const stablecoin = await ImperiumStableCoin.deploy();
    await stablecoin.waitForDeployment();

    // Fund investor and issuer
    await stablecoin.connect(stablecoinIssuer).transfer(investor.address, ethers.parseEther("2000"));
    await stablecoin.connect(stablecoinIssuer).transfer(tdIssuer.address, ethers.parseEther("2000"));

    const startDate = Math.floor(Date.now() / 1000);
    const maturityDate = startDate + 3 * 24 * 60 * 60; // 3 days
    const faceValue = ethers.parseEther("1000");
    const interestRate = 500; // 5%
    const interestAmount = ethers.parseEther("50"); // 5% of 1000

    const TermDepositToken = await ethers.getContractFactory("TermDepositToken", tdIssuer);
    const td = await TermDepositToken.deploy(
      tdIssuer.address, startDate, maturityDate, faceValue,
      interestRate, interestAmount, await stablecoin.getAddress()
    );
    await td.waitForDeployment();

    // Investor approves and issues
    await stablecoin.connect(investor).approve(await td.getAddress(), faceValue);
    await td.connect(investor).acceptAndIssue(investor.address);

    expect(await td.issued()).to.equal(true);
    expect(await td.investor()).to.equal(investor.address);

    // Issuer balance should have increased by face value
    const issuerBal = await stablecoin.balanceOf(tdIssuer.address);
    expect(issuerBal).to.equal(ethers.parseEther("3000")); // 2000 + 1000

    // Investor balance should have decreased
    const investorBal = await stablecoin.balanceOf(investor.address);
    expect(investorBal).to.equal(ethers.parseEther("1000")); // 2000 - 1000

    // Fast-forward past maturity
    await ethers.provider.send("evm_increaseTime", [4 * 24 * 60 * 60]);
    await ethers.provider.send("evm_mine");

    // Issuer approves total payout (face value + interest)
    const totalPayout = faceValue + interestAmount;
    await stablecoin.connect(tdIssuer).approve(await td.getAddress(), totalPayout);

    // Redeem
    await td.connect(tdIssuer).redeemMaturity();

    expect(await td.expired()).to.equal(true);

    // Investor should have received face value + interest
    const investorFinal = await stablecoin.balanceOf(investor.address);
    expect(investorFinal).to.equal(ethers.parseEther("2050")); // 1000 + 1000 + 50
  });

  it("cannot redeem before maturity", async function () {
    const ImperiumStableCoin = await ethers.getContractFactory("ImperiumStableCoin", stablecoinIssuer);
    const stablecoin = await ImperiumStableCoin.deploy();
    await stablecoin.waitForDeployment();

    await stablecoin.connect(stablecoinIssuer).transfer(investor.address, ethers.parseEther("2000"));
    await stablecoin.connect(stablecoinIssuer).transfer(tdIssuer.address, ethers.parseEther("2000"));

    const startDate = Math.floor(Date.now() / 1000);
    const maturityDate = startDate + 365 * 24 * 60 * 60; // 1 year from now
    const faceValue = ethers.parseEther("1000");
    const interestAmount = ethers.parseEther("50");

    const TermDepositToken = await ethers.getContractFactory("TermDepositToken", tdIssuer);
    const td = await TermDepositToken.deploy(
      tdIssuer.address, startDate, maturityDate, faceValue,
      500, interestAmount, await stablecoin.getAddress()
    );
    await td.waitForDeployment();

    await stablecoin.connect(investor).approve(await td.getAddress(), faceValue);
    await td.connect(investor).acceptAndIssue(investor.address);

    const totalPayout = faceValue + interestAmount;
    await stablecoin.connect(tdIssuer).approve(await td.getAddress(), totalPayout);

    await expect(td.connect(tdIssuer).redeemMaturity()).to.be.revertedWith("Not yet matured");
  });
});
