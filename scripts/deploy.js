const hre = require("hardhat");
const { saveDeployment } = require("../config/networks");

async function main() {
  const [issuer] = await hre.ethers.getSigners();
  const networkName = hre.network.name;

  // Detect if deploying to Hedera Testnet
  const isHedera = networkName === "hederaTestnet";

  console.log(`Deploying to network: ${networkName}`);
  console.log(`Deployer account: ${issuer.address}`);

  // Hedera relay needs explicit gas overrides (estimateGas fails with INSUFFICIENT_TX_FEE)
  const deployOverrides = isHedera ? { gasLimit: 5_000_000 } : {};

  // Deploy ImperiumStableCoin
  const ImperiumStableCoin = await hre.ethers.getContractFactory("ImperiumStableCoin");
  const stablecoin = await ImperiumStableCoin.deploy(deployOverrides); // Now eAUD/ImperiumAUD
  await stablecoin.waitForDeployment();
  const stablecoinAddress = await stablecoin.getAddress();
  console.log("ImperiumStableCoin deployed to:", stablecoinAddress);

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
    stablecoinAddress,
    deployOverrides
  );
  await annuity.waitForDeployment();
  const annuityAddress = await annuity.getAddress();
  console.log("AnnuityToken deployed to:", annuityAddress);

  // Deploy TermDepositToken
  const tdInterestRate = 450; // 4.50%
  const tdTermDays = isHedera ? 120 : 90 * 24 * 60 * 60; // seconds
  const tdMaturityDate = startDate + tdTermDays;
  const tdInterestAmount = faceValue * BigInt(tdInterestRate) / 10000n * BigInt(tdTermDays) / BigInt(365 * 24 * 60 * 60);

  const TermDepositToken = await hre.ethers.getContractFactory("TermDepositToken");
  const termDeposit = await TermDepositToken.deploy(
    issuer.address,
    startDate,
    tdMaturityDate,
    faceValue,
    tdInterestRate,
    tdInterestAmount,
    stablecoinAddress,
    deployOverrides
  );
  await termDeposit.waitForDeployment();
  const termDepositAddress = await termDeposit.getAddress();
  console.log("TermDepositToken deployed to:", termDepositAddress);

  // Deploy NCDToken
  const ncdInterestRate = 480; // 4.80%
  const ncdTermDays = isHedera ? 120 : 180 * 24 * 60 * 60; // seconds
  const ncdMaturityDate = startDate + ncdTermDays;
  const ncdDiscount = faceValue * BigInt(ncdInterestRate) / 10000n * BigInt(ncdTermDays) / BigInt(365 * 24 * 60 * 60);
  const ncdDiscountedValue = faceValue - ncdDiscount;

  const NCDToken = await hre.ethers.getContractFactory("NCDToken");
  const ncd = await NCDToken.deploy(
    issuer.address,
    startDate,
    ncdMaturityDate,
    faceValue,
    ncdInterestRate,
    ncdDiscountedValue,
    stablecoinAddress,
    deployOverrides
  );
  await ncd.waitForDeployment();
  const ncdAddress = await ncd.getAddress();
  console.log("NCDToken deployed to:", ncdAddress);

  // Save deployed addresses for the API / agent to reference
  const deploymentName = isHedera ? "hedera-testnet" : networkName;
  const deployPath = saveDeployment(deploymentName, {
    network: networkName,
    deployer: issuer.address,
    stablecoinAddress,
    annuityAddress,
    termDepositAddress,
    ncdAddress,
    maturityDate,
    deployedAt: new Date().toISOString(),
  });
  console.log(`Deployment addresses saved to: ${deployPath}`);

  if (isHedera) {
    console.log("\n--- Hedera Testnet Deployment Info ---");
    console.log(`Maturity in: 120 seconds (demo mode)`);
    console.log(`Coupon dates: +30s, +60s from now`);
    console.log(`Explorer: https://hashscan.io/testnet/contract/${annuityAddress}`);
    console.log(`Term Deposit: https://hashscan.io/testnet/contract/${termDepositAddress}`);
    console.log(`NCD: https://hashscan.io/testnet/contract/${ncdAddress}`);
    console.log(`Stablecoin: https://hashscan.io/testnet/contract/${stablecoinAddress}`);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
