const hre = require("hardhat");
const { saveDeployment } = require("../config/networks");

async function main() {
  const [issuer] = await hre.ethers.getSigners();
  const networkName = hre.network.name;

  // Detect if deploying to Hedera Testnet
  const isHedera = networkName === "hederaTestnet";

  console.log(`Deploying to network: ${networkName}`);
  console.log(`Deployer account: ${issuer.address}`);

  // Deploy MockStablecoin
  const MockStablecoin = await hre.ethers.getContractFactory("MockStablecoin");
  const stablecoin = await MockStablecoin.deploy();
  await stablecoin.waitForDeployment();
  const stablecoinAddress = await stablecoin.getAddress();
  console.log("MockStablecoin deployed to:", stablecoinAddress);

  // Annuity parameters
  const startDate = Math.floor(Date.now() / 1000);

  // On Hedera Testnet: short maturity (120s) since evm_increaseTime is not available.
  // On local: 1 year maturity (time-travel is available).
  const maturityDate = isHedera
    ? startDate + 120            // 2 minutes for demo
    : startDate + 365 * 24 * 60 * 60;  // 1 year

  const faceValue = hre.ethers.parseEther("1000");
  const interestRate = 500; // 5%

  // Coupon schedule: on Hedera use short intervals (30s apart)
  const couponDates = isHedera
    ? [startDate + 30, startDate + 60]
    : [startDate + 30 * 24 * 60 * 60, startDate + 60 * 24 * 60 * 60];

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
  const annuityAddress = await annuity.getAddress();
  console.log("AnnuityToken deployed to:", annuityAddress);

  // Save deployed addresses for the API / agent to reference
  const deploymentName = isHedera ? "hedera-testnet" : networkName;
  const deployPath = saveDeployment(deploymentName, {
    network: networkName,
    deployer: issuer.address,
    stablecoinAddress,
    annuityAddress,
    maturityDate,
    deployedAt: new Date().toISOString(),
  });
  console.log(`Deployment addresses saved to: ${deployPath}`);

  if (isHedera) {
    console.log("\n--- Hedera Testnet Deployment Info ---");
    console.log(`Maturity in: 120 seconds (demo mode)`);
    console.log(`Coupon dates: +30s, +60s from now`);
    console.log(`Explorer: https://hashscan.io/testnet/contract/${annuityAddress}`);
    console.log(`Stablecoin: https://hashscan.io/testnet/contract/${stablecoinAddress}`);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
