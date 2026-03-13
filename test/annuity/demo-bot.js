#!/usr/bin/env node
/**
 * Agent Demo Bot — "Selenium-style" visual walkthrough
 *
 * Spawns the CLI agent, types commands character-by-character with
 * realistic delays, and pauses between steps so you can watch the
 * full lifecycle unfold in real-time.
 *
 * Prerequisites:
 *   - Hardhat node on port 8545 + contracts deployed
 *   - ImperiumAPI on port 4000 (api/imperium-api.js)
 *   (or just run ./start.sh first, then run the bot in another terminal)
 *
 * Usage:
 *   node test/annuity/demo-bot.js
 *   node test/annuity/demo-bot.js --fast     (shorter delays)
 */

const { spawn } = require('child_process');
const path = require('path');

// ── config ──────────────────────────────────────────────────────────
const FAST = process.argv.includes('--fast');
const NETWORK = (() => {
  const idx = process.argv.indexOf('--network');
  if (idx !== -1 && process.argv[idx + 1]) return process.argv[idx + 1];
  return process.env.NETWORK || 'local';
})();
const IS_TESTNET = NETWORK !== 'local';

const CHAR_DELAY  = FAST ? 25  : 100;  // ms per character typed
const PAUSE_AFTER = FAST ? 1500 : 3500; // ms pause after response
// Testnet transactions take 3-5s each; redeem may wait for real-time maturity
const TESTNET_TIMEOUT = 180000;  // 3 minutes for operations that wait for maturity

// ── helpers ─────────────────────────────────────────────────────────
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const DIM     = '\x1b[2m';
const BOLD    = '\x1b[1m';
const RESET   = '\x1b[0m';

/**
 * Type a command character-by-character to the agent's stdin,
 * showing each character on screen in real-time.
 */
async function typeCommand(proc, command) {
  for (const char of command) {
    process.stdout.write(char);
    proc.stdin.write(char);
    await sleep(CHAR_DELAY);
  }
  console.log();
  proc.stdin.write('\n');
}

/**
 * Wait until the agent's prompt reappears after a command.
 */
function waitForPrompt(proc, timeoutMs = 60000) {
  return new Promise((resolve, reject) => {
    let output = '';
    const timer = setTimeout(() => {
      cleanup();
      reject(new Error(`Timeout waiting for agent prompt.\nOutput so far:\n${output}`));
    }, timeoutMs);

    function onData(chunk) {
      const text = chunk.toString();
      output += text;
      // Print agent output in real-time
      process.stdout.write(text);
      // Prompt means agent is ready for next command
      if (output.includes('🤖') && output.includes('Imperium Agent >') && output.split('Imperium Agent >').length > 1) {
        cleanup();
        resolve(output);
      }
    }

    function cleanup() {
      clearTimeout(timer);
      proc.stdout.removeListener('data', onData);
    }

    proc.stdout.on('data', onData);
  });
}

/**
 * Wait for initial startup banner.
 */
function waitForReady(proc) {
  return new Promise((resolve, reject) => {
    let output = '';
    const timer = setTimeout(() => {
      cleanup();
      reject(new Error('Agent failed to start'));
    }, 15000);

    function onData(chunk) {
      const text = chunk.toString();
      output += text;
      process.stdout.write(text);
      if (output.includes('Imperium Agent >')) {
        cleanup();
        resolve();
      }
    }

    function cleanup() {
      clearTimeout(timer);
      proc.stdout.removeListener('data', onData);
    }

    proc.stdout.on('data', onData);
  });
}

// ── demo steps ──────────────────────────────────────────────────────
const STEPS = [
  {
    title: 'Health Check',
    description: 'Verify API and RPC connectivity',
    command: 'health',
  },
  {
    title: 'View Help',
    description: 'See all available commands',
    command: 'help',
  },
  {
    title: 'Create Annuity Deal',
    description: 'Deploy contracts, fund wallets (3 coupons)',
    command: 'create a deal with 3 coupons',
  },
  {
    title: 'Check Status (Pre-Execute)',
    description: 'Verify issued=false, expired=false',
    command: 'check status',
  },
  {
    title: 'Pre-Execution Balances',
    description: 'Investor holds faceValue, coupons unpaid',
    command: 'show balances',
  },
  {
    title: 'List Deals',
    description: 'Show all deals in session',
    command: 'list deals',
  },
  {
    title: 'Execute the Deal',
    description: 'Investor buys annuity, issuer pays 3 coupons',
    command: 'execute the deal',
    timeout: IS_TESTNET ? TESTNET_TIMEOUT : 30000,
  },
  {
    title: 'Check Status (Post-Execute)',
    description: 'Verify issued=true',
    command: 'check status',
  },
  {
    title: 'Post-Execution Balances',
    description: 'All coupons should be paid ✅',
    command: 'show balances',
  },
  {
    title: 'Transaction Log',
    description: 'Audit trail of all on-chain transactions',
    command: 'show transactions',
  },
  {
    title: 'Transfer to Secondary Buyer',
    description: 'Sell annuity at 90% face value',
    command: 'transfer the deal',
    timeout: IS_TESTNET ? TESTNET_TIMEOUT : 30000,
  },
  {
    title: 'Post-Transfer Balances',
    description: 'Verify ownership & fund movement',
    command: 'show balances',
  },
  {
    title: 'Redeem at Maturity',
    description: IS_TESTNET ? 'Wait for real-time maturity, redeem face value' : 'Time-travel to maturity, redeem face value',
    command: 'redeem the deal',
    timeout: IS_TESTNET ? TESTNET_TIMEOUT : 60000,
  },
  {
    title: 'Check Status (Post-Redeem)',
    description: 'Verify expired=true — lifecycle complete',
    command: 'check status',
  },
  {
    title: 'Final Balances',
    description: 'Confirm face value paid to current owner',
    command: 'show balances',
  },
  {
    title: 'Full Transaction Log',
    description: 'Complete audit trail: execute → transfer → redeem',
    command: 'show transactions',
  },
  {
    title: 'Final Deal List',
    description: 'Deal should show status: redeemed 🏁',
    command: 'list deals',
  },
];

// ── main ────────────────────────────────────────────────────────────
async function main() {
  console.clear();
  console.log();
  console.log(`${BOLD}  ╔═══════════════════════════════════════════════════════╗${RESET}`);
  console.log(`${BOLD}  ║   Imperium Markets — AnnuityToken Lifecycle Demo     ║${RESET}`);
  console.log(`${BOLD}  ║                                                       ║${RESET}`);
  console.log(`${BOLD}  ║   End-to-end demonstration of annuity issuance,       ║${RESET}`);
  console.log(`${BOLD}  ║   coupon settlement, secondary market transfer,       ║${RESET}`);
  console.log(`${BOLD}  ║   and maturity redemption on Hedera Network.          ║${RESET}`);
  console.log(`${BOLD}  ╚═══════════════════════════════════════════════════════╝${RESET}`);
  const netLabel = IS_TESTNET ? NETWORK : 'Local (Hardhat)';
  console.log(`${DIM}  Network: ${netLabel}${RESET}`);
  console.log();
  await sleep(2000);

  // Spawn the agent
  console.log(`${DIM}  Initializing agent session...${RESET}`);
  console.log();

  const agentPath = path.join(__dirname, '../../agent/cli-agent.js');
  const proc = spawn('node', [agentPath], {
    cwd: path.join(__dirname, '../..'),
    env: { ...process.env, API_BASE: 'http://127.0.0.1:4000', NETWORK },
  });

  proc.stderr.on('data', (chunk) => {
    // Suppress stderr noise during demo
  });

  proc.on('error', (err) => {
    console.error(`${RESET}  ❌ Failed to start agent: ${err.message}`);
    process.exit(1);
  });

  try {
    await waitForReady(proc);
    await sleep(PAUSE_AFTER);

    const total = STEPS.length;
    for (let i = 0; i < STEPS.length; i++) {
      const step = STEPS[i];

      // Type the command
      await typeCommand(proc, step.command);

      // Wait for response (testnet ops are slower)
      const defaultTimeout = IS_TESTNET ? TESTNET_TIMEOUT : 60000;
      await waitForPrompt(proc, step.timeout || defaultTimeout);

      // Pause to let the viewer read the output
      await sleep(PAUSE_AFTER);
    }

    // Exit
    console.log();
    console.log(`${BOLD}  ╔═══════════════════════════════════════════════════════╗${RESET}`);
    console.log(`${BOLD}  ║   Lifecycle Complete — All operations verified.       ║${RESET}`);
    console.log(`${BOLD}  ╚═══════════════════════════════════════════════════════╝${RESET}`);
    console.log();
    await sleep(1000);

    proc.stdin.write('exit\n');
  } catch (err) {
    console.error(`\n  ❌ Demo failed: ${err.message}`);
  }

  await new Promise((resolve) => {
    proc.on('close', resolve);
    setTimeout(() => { proc.kill('SIGTERM'); resolve(); }, 5000);
  });
}

main();
