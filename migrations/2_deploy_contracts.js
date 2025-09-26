const MockStablecoin = artifacts.require("MockStablecoin");
const AnnuityToken = artifacts.require("AnnuityToken");

module.exports = async function (deployer, network, accounts) {
  const [issuer, investor] = accounts;

  //Deploy MockStablecoin
  await deployer.deploy(MockStablecoin);
  const stablecoin = await MockStablecoin.deployed();

  //Annuity parameters
  const startDate = Math.floor(Date.now() / 1000);
  const maturityDate = startDate + 365 * 24 * 60 * 60; // 1 year
  const faceValue = web3.utils.toWei("1000", "ether");
  const interestRate = 500; // 5%
  const couponDates = [
    startDate + 30 * 24 * 60 * 60,   // 1 month
    startDate + 60 * 24 * 60 * 60    // 2 months
  ];
  const couponValues = [
    web3.utils.toWei("100", "ether"),
    web3.utils.toWei("100", "ether")
  ];

  //Deploy AnnuityToken
  await deployer.deploy(
    AnnuityToken,
    issuer,
    startDate,
    maturityDate,
    faceValue,
    interestRate,
    couponDates,
    couponValues,
    stablecoin.address
  );
};
