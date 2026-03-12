/**
 * Imperium Markets — Network Configuration
 *
 * Maps network names to RPC URLs, deployed contract addresses, and
 * network-specific settings (gas, finality, time-travel support).
 *
 * Usage:
 *   const { getNetwork } = require('./config/networks');
 *   const net = getNetwork('hedera-testnet');
 */

const path = require('path');
const fs = require('fs');

// ── network definitions ──────────────────────────────────────────────
const NETWORKS = {
  local: {
    name: 'local',
    rpcUrl: 'http://127.0.0.1:8545',
    chainId: 31337,
    explorer: null,
    supportsTimeTravel: true,
    // On local, accounts come from Hardhat node — no private keys needed
    usePrefundedAccounts: true,
    gasMultiplier: 1,
    txConfirmationDelay: 0,  // ms to wait after tx for finality
    deployMaturitySeconds: 365 * 24 * 60 * 60,  // 1 year (time-travel available)
  },

  'hedera-testnet': {
    name: 'hedera-testnet',
    rpcUrl: process.env.HEDERA_TESTNET_RPC_URL || 'https://testnet.hashio.io/api',
    chainId: 296,
    explorer: 'https://hashscan.io/testnet',
    supportsTimeTravel: false,
    usePrefundedAccounts: false,
    gasMultiplier: 1.2,  // Hedera gas estimation can differ
    txConfirmationDelay: 5000,  // ~3-5s finality on Hedera
    deployMaturitySeconds: 120,  // 2 minutes for demo (no time-travel)
  },
};

// ── helpers ──────────────────────────────────────────────────────────

/**
 * Load deployed contract addresses for a given network.
 * Returns { annuityAddress, stablecoinAddress } or null if not found.
 */
function loadDeployment(networkName) {
  const deployPath = path.join(__dirname, '..', 'deployments', `${networkName}.json`);
  if (fs.existsSync(deployPath)) {
    return JSON.parse(fs.readFileSync(deployPath, 'utf8'));
  }
  return null;
}

/**
 * Save deployed contract addresses for a given network.
 */
function saveDeployment(networkName, data) {
  const deployDir = path.join(__dirname, '..', 'deployments');
  if (!fs.existsSync(deployDir)) {
    fs.mkdirSync(deployDir, { recursive: true });
  }
  const deployPath = path.join(deployDir, `${networkName}.json`);
  fs.writeFileSync(deployPath, JSON.stringify(data, null, 2) + '\n');
  return deployPath;
}

/**
 * Get network configuration by name.
 * Falls back to 'local' if the name is not recognized.
 */
function getNetwork(name) {
  const net = NETWORKS[name] || NETWORKS.local;
  const deployment = loadDeployment(net.name);
  return { ...net, deployment };
}

/**
 * Build an explorer URL for a transaction hash.
 * Returns null for local network.
 */
function explorerTxUrl(networkName, txHash) {
  const net = NETWORKS[networkName];
  if (!net || !net.explorer) return null;
  return `${net.explorer}/tx/${txHash}`;
}

/**
 * Build an explorer URL for a contract address.
 * Returns null for local network.
 */
function explorerAddressUrl(networkName, address) {
  const net = NETWORKS[networkName];
  if (!net || !net.explorer) return null;
  return `${net.explorer}/contract/${address}`;
}

module.exports = {
  NETWORKS,
  getNetwork,
  loadDeployment,
  saveDeployment,
  explorerTxUrl,
  explorerAddressUrl,
};
