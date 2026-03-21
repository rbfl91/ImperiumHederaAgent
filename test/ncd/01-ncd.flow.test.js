const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("NCD Lifecycle - primary issuance & secondary trading", function () {
  let stablecoinIssuer, ncdIssuer, investor, secondary;

  before(async function () {
    [stablecoinIssuer, ncdIssuer, investor, secondary] = await ethers.getSigners();
  });

  it("issue at discount -> transfer to secondary -> redeem at full face value", async function () {
    const ImperiumStableCoin = await ethers.getContractFactory("ImperiumStableCoin", stablecoinIssuer);
    const stablecoin = await ImperiumStableCoin.deploy();
    await stablecoin.waitForDeployment();

    await stablecoin.connect(stablecoinIssuer).transfer(investor.address, ethers.parseEther("2000"));
    await stablecoin.connect(stablecoinIssuer).transfer(secondary.address, ethers.parseEther("2000"));
    await stablecoin.connect(stablecoinIssuer).transfer(ncdIssuer.address, ethers.parseEther("2000"));

    const startDate = Math.floor(Date.now() / 1000);
    const maturityDate = startDate + 5 * 24 * 60 * 60; // 5 days
    const faceValue = ethers.parseEther("1000");
    const interestRate = 300; // 3%
    const discountedValue = ethers.parseEther("970"); // bought at 97% of face value

    const NCDToken = await ethers.getContractFactory("NCDToken", ncdIssuer);
    const ncd = await NCDToken.deploy(
      ncdIssuer.address, startDate, maturityDate, faceValue,
      interestRate, discountedValue, await stablecoin.getAddress()
    );
    await ncd.waitForDeployment();

    // Day 1: Investor buys NCD at discounted price
    await stablecoin.connect(investor).approve(await ncd.getAddress(), discountedValue);
    await ncd.connect(investor).acceptAndIssue(investor.address);

    expect(await ncd.issued()).to.equal(true);
    expect(await ncd.currentOwner()).to.equal(investor.address);

    // Issuer received discounted value
    const issuerBal = await stablecoin.balanceOf(ncdIssuer.address);
    expect(issuerBal).to.equal(ethers.parseEther("2970")); // 2000 + 970

    // Investor paid discounted value
    const investorBal = await stablecoin.balanceOf(investor.address);
    expect(investorBal).to.equal(ethers.parseEther("1030")); // 2000 - 970

    // Day 3: Secondary buyer purchases NCD from primary investor
    const salePrice = ethers.parseEther("985"); // secondary pays more, still below face
    await stablecoin.connect(secondary).approve(await ncd.getAddress(), salePrice);
    await ncd.connect(investor).transferNCD(secondary.address, salePrice);

    expect(await ncd.currentOwner()).to.equal(secondary.address);

    // Investor profit from sale
    const investorAfterSale = await stablecoin.balanceOf(investor.address);
    expect(investorAfterSale).to.equal(ethers.parseEther("2015")); // 1030 + 985

    // Day 5: Maturity — issuer pays full face value to secondary (current owner)
    await ethers.provider.send("evm_increaseTime", [6 * 24 * 60 * 60]);
    await ethers.provider.send("evm_mine");

    await stablecoin.connect(ncdIssuer).approve(await ncd.getAddress(), faceValue);
    await ncd.connect(ncdIssuer).redeemMaturity();

    expect(await ncd.expired()).to.equal(true);

    // Secondary receives full face value (profit = 1000 - 985 = 15)
    const secondaryFinal = await stablecoin.balanceOf(secondary.address);
    expect(secondaryFinal).to.equal(ethers.parseEther("2015")); // 2000 - 985 + 1000
  });

  it("issue and redeem without secondary trade", async function () {
    const ImperiumStableCoin = await ethers.getContractFactory("ImperiumStableCoin", stablecoinIssuer);
    const stablecoin = await ImperiumStableCoin.deploy();
    await stablecoin.waitForDeployment();

    await stablecoin.connect(stablecoinIssuer).transfer(investor.address, ethers.parseEther("2000"));
    await stablecoin.connect(stablecoinIssuer).transfer(ncdIssuer.address, ethers.parseEther("2000"));

    const startDate = Math.floor(Date.now() / 1000);
    const maturityDate = startDate + 5 * 24 * 60 * 60;
    const faceValue = ethers.parseEther("1000");
    const discountedValue = ethers.parseEther("950"); // 5% discount

    const NCDToken = await ethers.getContractFactory("NCDToken", ncdIssuer);
    const ncd = await NCDToken.deploy(
      ncdIssuer.address, startDate, maturityDate, faceValue,
      500, discountedValue, await stablecoin.getAddress()
    );
    await ncd.waitForDeployment();

    await stablecoin.connect(investor).approve(await ncd.getAddress(), discountedValue);
    await ncd.connect(investor).acceptAndIssue(investor.address);

    await ethers.provider.send("evm_increaseTime", [6 * 24 * 60 * 60]);
    await ethers.provider.send("evm_mine");

    await stablecoin.connect(ncdIssuer).approve(await ncd.getAddress(), faceValue);
    await ncd.connect(ncdIssuer).redeemMaturity();

    // Investor profit = face value - discounted value = 50
    const investorFinal = await stablecoin.balanceOf(investor.address);
    expect(investorFinal).to.equal(ethers.parseEther("2050")); // 2000 - 950 + 1000
  });
});
