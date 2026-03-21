require("@nomicfoundation/hardhat-toolbox");
require("dotenv").config();

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: "0.8.21",
  networks: {
    hardhat: {},
    localhost: {
      url: "http://127.0.0.1:8545"
    },
    hederaTestnet: {
      url: process.env.HEDERA_TESTNET_RPC_URL || "https://testnet.hashio.io/api",
      accounts: process.env.HEDERA_TESTNET_PRIVATE_KEY
        ? [process.env.HEDERA_TESTNET_PRIVATE_KEY]
        : [],
      chainId: 296,
      timeout: 120000,  // Hedera finality is slower (~3-5s per tx)
    }
  },
  mocha: {
    timeout: 60000,
    spec: "test/**/*.test.js"
  }
};
