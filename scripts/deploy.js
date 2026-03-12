const hre = require("hardhat");

async function main() {
  const [issuer] = await hre.ethers.getSigners();

  // Deploy MockStablecoin
  const MockStablecoin = await hre.ethers.getContractFactory("MockStablecoin");
  const stablecoin = await MockStablecoin.deploy();
  await stablecoin.waitForDeployment();
  const stablecoinAddress = await stablecoin.getAddress();
  console.log("MockStablecoin deployed to:", stablecoinAddress);

  // Annuity parameters
  const startDate = Math.floor(Date.now() / 1000);
  const maturityDate = startDate + 365 * 24 * 60 * 60; // 1 year
  const faceValue = hre.ethers.parseEther("1000");
  const interestRate = 500; // 5%
  const couponDates = [
    startDate + 30 * 24 * 60 * 60,  // 1 month
    startDate + 60 * 24 * 60 * 60   // 2 months
  ];
  const couponValues = [
    hre.ethers.parseEther("100"),
    hre.ethers.parseEther("100")
  ];

  // Deploy AnnuityToken
  const AnnuityToken = await hre.ethers.getContractFactory("AnnuityToken");
  const annuity = await AnnuityToken.deploy(
    issuer.address,
    startDate,
    maturityDate,
    faceValue,
    interestRate,
    couponDates,
    couponValues,
    stablecoinAddress
  );
  await annuity.waitForDeployment();
  console.log("AnnuityToken deployed to:", await annuity.getAddress());
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
