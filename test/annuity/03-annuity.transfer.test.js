const { expectEvent, BN, expectRevert } = require("@openzeppelin/test-helpers");
const MockStablecoin = artifacts.require("MockStablecoin");
const AnnuityToken = artifacts.require("AnnuityToken");

contract("AnnuityToken - secondary transfers", (accounts) => {
  const [issuer, investor, secondary, attacker] = accounts;

  async function deployAndIssueAnnuity() {
    const stablecoin = await MockStablecoin.new({ from: issuer });
    await stablecoin.transfer(investor, web3.utils.toWei("2000", "ether"), { from: issuer });
    await stablecoin.transfer(secondary, web3.utils.toWei("500", "ether"), { from: issuer });

    const startDate = Math.floor(Date.now() / 1000);
    const maturityDate = startDate + 365 * 24 * 60 * 60;
    const faceValue = web3.utils.toWei("1000", "ether");

    const annuity = await AnnuityToken.new(
      issuer,
      startDate,
      maturityDate,
      faceValue,
      500,
      [startDate + 30 * 24 * 60 * 60],
      [web3.utils.toWei("100", "ether")],
      stablecoin.address,
      { from: issuer }
    );

    await stablecoin.approve(annuity.address, faceValue, { from: investor });
    await annuity.acceptAndIssue(investor, { from: investor });

    return { stablecoin, annuity, faceValue };
  }

  it("should revert if buyer has not approved enough stablecoins", async () => {
    const { stablecoin, annuity } = await deployAndIssueAnnuity();

    const salePrice = web3.utils.toWei("800", "ether");
    // Approve less than sale price
    await stablecoin.approve(annuity.address, web3.utils.toWei("500", "ether"), { from: secondary });

    // Match the **actual low-level revert** from ERC20 transferFrom
    await expectRevert.unspecified(
      annuity.transferAnnuity(secondary, salePrice, { from: investor })
    );
  });

  it("should prevent transfer initiated by non-owner", async () => {
    const { annuity, faceValue } = await deployAndIssueAnnuity();

    await expectRevert(
      annuity.transferAnnuity(secondary, faceValue, { from: attacker }),
      "Only current owner can initiate transfer"
    );
  });

  it("should prevent transfer to zero address", async () => {
    const { annuity, faceValue } = await deployAndIssueAnnuity();

    await expectRevert(
      annuity.transferAnnuity("0x0000000000000000000000000000000000000000", faceValue, { from: investor }),
      "Invalid new owner"
    );
  });
});