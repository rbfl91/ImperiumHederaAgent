const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("AnnuityToken Reentrancy Protection", function () {
  let annuityIssuer, attacker, other;
  let annuity, token;
  const faceValue = ethers.parseEther("1000");

  beforeEach(async function () {
    [annuityIssuer, attacker, other] = await ethers.getSigners();

    // Deploy malicious token
    const MaliciousERC20 = await ethers.getContractFactory("MaliciousStablecoin", other);
    token = await MaliciousERC20.deploy();
    await token.waitForDeployment();

    // Mint faceValue to attacker
    await token.connect(other).mint(attacker.address, faceValue);

    // Deploy AnnuityToken
    const startDate = Math.floor(Date.now() / 1000);
    const maturityDate = startDate + 365 * 24 * 60 * 60; // 1 year

    const AnnuityToken = await ethers.getContractFactory("AnnuityToken", annuityIssuer);
    annuity = await AnnuityToken.deploy(
      annuityIssuer.address, // issuer
      startDate,
      maturityDate,
      faceValue,
      0, // interestRate
      [], // couponDates
      [], // couponValues
      await token.getAddress()
    );
    await annuity.waitForDeployment();

    // Approve annuity contract to spend attacker's tokens
    await token.connect(attacker).approve(await annuity.getAddress(), faceValue);

    // Configure malicious token to attack the annuity
    await token.connect(other).setVictim(await annuity.getAddress());
    await token.connect(other).setAttacker(attacker.address);
  });

  it("should block reentrancy: acceptAndIssue cannot be called twice", async function () {
    // Capture balances before
    const issuerBalBefore = await token.balanceOf(annuityIssuer.address);
    const attackerBalBefore = await token.balanceOf(attacker.address);

    // Attempt to acceptAndIssue: malicious token will try re-entry
    await annuity.connect(attacker).acceptAndIssue(attacker.address);

    // Check contract state
    const issued = await annuity.issued();
    const currentOwner = await annuity.currentOwner();
    expect(issued).to.equal(true, "Annuity should be marked as issued");
    expect(currentOwner).to.equal(attacker.address, "Attacker should be currentOwner");

    // Balances should reflect single transfer only
    const issuerBalAfter = await token.balanceOf(annuityIssuer.address);
    const attackerBalAfter = await token.balanceOf(attacker.address);

    const issuerDelta = issuerBalAfter - issuerBalBefore;
    const attackerDelta = attackerBalBefore - attackerBalAfter;

    expect(issuerDelta).to.equal(faceValue, "Issuer should receive exactly faceValue once");
    expect(attackerDelta).to.equal(faceValue, "Attacker should pay exactly faceValue once");

    // If reentrancy succeeded, balances would double (failing this assertion)
    expect(issuerDelta).to.not.equal(faceValue * 2n, "Reentrancy did not occur");
  });
});
