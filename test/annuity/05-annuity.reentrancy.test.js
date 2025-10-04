const { BN, expectRevert } = require("@openzeppelin/test-helpers");

const AnnuityToken = artifacts.require("AnnuityToken");
const MaliciousERC20 = artifacts.require("MaliciousStablecoin");

contract("AnnuityToken Reentrancy Protection", (accounts) => {
  const [annuityIssuer, attacker, other] = accounts;

  let annuity, token;
  const faceValue = web3.utils.toWei("1000", "ether");

  beforeEach(async () => {
    // Deploy malicious token
    token = await MaliciousERC20.new({ from: other });

    // Mint faceValue to attacker
    await token.mint(attacker, faceValue, { from: other });

    // Deploy AnnuityToken
    const startDate = Math.floor(Date.now() / 1000);
    const maturityDate = startDate + 365 * 24 * 60 * 60; // 1 year

    annuity = await AnnuityToken.new(
      annuityIssuer, // issuer
      startDate,
      maturityDate,
      faceValue,
      0, // interestRate
      [], // couponDates
      [], // couponValues
      token.address,
      { from: annuityIssuer }
    );

    // Approve annuity contract to spend attacker's tokens
    await token.approve(annuity.address, faceValue, { from: attacker });

    // Configure malicious token to attack the annuity
    await token.setVictim(annuity.address, { from: other });
    await token.setAttacker(attacker, { from: other });
  });

  it("should block reentrancy: acceptAndIssue cannot be called twice", async () => {
    // Capture balances before
    const issuerBalBefore = await token.balanceOf(annuityIssuer);
    const attackerBalBefore = await token.balanceOf(attacker);

    // Attempt to acceptAndIssue: malicious token will try re-entry
    await annuity.acceptAndIssue(attacker, { from: attacker });

    // Check contract state
    const issued = await annuity.issued();
    const currentOwner = await annuity.currentOwner();
    assert.equal(issued, true, "Annuity should be marked as issued");
    assert.equal(currentOwner, attacker, "Attacker should be currentOwner");

    // Balances should reflect **single transfer** only
    const issuerBalAfter = await token.balanceOf(annuityIssuer);
    const attackerBalAfter = await token.balanceOf(attacker);

    const issuerDelta = new BN(issuerBalAfter).sub(new BN(issuerBalBefore));
    const attackerDelta = new BN(attackerBalBefore).sub(new BN(attackerBalAfter));

    assert(issuerDelta.eq(new BN(faceValue)), "Issuer should receive exactly faceValue once");
    assert(attackerDelta.eq(new BN(faceValue)), "Attacker should pay exactly faceValue once");

    // If reentrancy succeeded, balances would double (failing this assertion)
    assert(!issuerDelta.eq(new BN(faceValue).mul(new BN(2))), "Reentrancy did not occur");
  });
});