#!/usr/bin/env node
/**
 * Imperium Markets — Interactive CLI Agent (v0.2)
 *
 * A rule-based AI agent that orchestrates AnnuityToken smart-contract
 * operations via the mock API gateway.  No LLM / API key required.
 *
 * Usage:
 *   node agent/cli-agent.js
 *
 * Prerequisites:
 *   1. Hardhat node running on port 8545  (npx hardhat node)
 *   2. Contracts deployed                 (npx hardhat run scripts/deploy.js --network localhost)
 *   3. mock-api.js running on port 4000   (node mocks/mock-api.js)
 *
 *   Or simply:  ./start.sh
 */

const readline = require('readline');
const fetch = require('node-fetch');

const API_BASE = process.env.API_BASE || 'http://127.0.0.1:4000';
const NETWORK = process.env.NETWORK || 'local';

// HashScan explorer base for Hedera Testnet
const EXPLORER_BASE = NETWORK === 'hedera-testnet'
  ? 'https://hashscan.io/testnet'
  : null;

// ── state ───────────────────────────────────────────────────────────
let lastCorrelationId = null;

// ── helpers ─────────────────────────────────────────────────────────
function uid() {
  return 'deal-' + Date.now();
}

function short(addr) {
  if (!addr) return '—';
  return addr.slice(0, 6) + '...' + addr.slice(-4);
}

function txLink(hash) {
  if (!hash || !EXPLORER_BASE) return short(hash);
  return `${short(hash)}  ${EXPLORER_BASE}/tx/${hash}`;
}

function contractLink(addr) {
  if (!addr || !EXPLORER_BASE) return short(addr);
  return `${short(addr)}  ${EXPLORER_BASE}/contract/${addr}`;
}

function fmtNum(n) {
  return Number(n).toLocaleString();
}

function printAgent(lines) {
  console.log();
  if (Array.isArray(lines)) {
    lines.forEach((l) => console.log('  🤖 ' + l));
  } else {
    console.log('  🤖 ' + lines);
  }
  console.log();
}

// ── intent parser ───────────────────────────────────────────────────
function parseIntent(input) {
  const lower = input.toLowerCase().trim();

  // CREATE
  if (lower.match(/(?:create|new|submit|deploy).*(?:deal|annuity)/)) {
    const couponMatch = lower.match(/(\d+)\s*coupon/);
    const faceMatch = lower.match(/(?:face\s*value|fv|amount)\s*(\d+)/);
    const termDays = couponMatch ? parseInt(couponMatch[1]) : 5;
    const faceValue = faceMatch ? parseInt(faceMatch[1]) : 1000000;
    return { intent: 'CREATE', termDays, faceValue };
  }

  // TRANSFER — must check before EXECUTE (both could match "run")
  if (lower.match(/(?:transfer|sell|assign)/)) {
    const priceMatch = lower.match(/(?:price|for)\s*(\d+)/);
    const price = priceMatch ? parseInt(priceMatch[1]) : null;
    const idMatch = lower.match(/deal[- ]?(\S+)/);
    const correlationId =
      idMatch && idMatch[1] !== 'the'
        ? 'deal-' + idMatch[1].replace(/^deal-/, '')
        : lastCorrelationId;
    return { intent: 'TRANSFER', correlationId, price };
  }

  // REDEEM
  if (lower.match(/(?:redeem|mature|maturity)/)) {
    const idMatch = lower.match(/deal[- ]?(\S+)/);
    const correlationId =
      idMatch && idMatch[1] !== 'the'
        ? 'deal-' + idMatch[1].replace(/^deal-/, '')
        : lastCorrelationId;
    return { intent: 'REDEEM', correlationId };
  }

  // EXECUTE
  if (lower.match(/(?:execute|settle|run|process)/)) {
    const idMatch = lower.match(/deal[- ]?(\S+)/);
    const correlationId =
      idMatch && idMatch[1] !== 'the'
        ? 'deal-' + idMatch[1].replace(/^deal-/, '')
        : lastCorrelationId;
    return { intent: 'EXECUTE', correlationId };
  }

  // BALANCES
  if (lower.match(/(?:balance|balances|funds|wallet|how much)/)) {
    const idMatch = lower.match(/deal[- ]?(\S+)/);
    const correlationId =
      idMatch && idMatch[1] !== 'the'
        ? 'deal-' + idMatch[1].replace(/^deal-/, '')
        : lastCorrelationId;
    return { intent: 'BALANCES', correlationId };
  }

  // LIST DEALS
  if (lower.match(/(?:list|all|show)\s*(?:deal|deals)/)) {
    return { intent: 'LIST' };
  }

  // TRANSACTIONS LOG
  if (lower.match(/(?:tx|transaction|transactions|log|history)/)) {
    const idMatch = lower.match(/deal[- ]?(\S+)/);
    const correlationId =
      idMatch && idMatch[1] !== 'the'
        ? 'deal-' + idMatch[1].replace(/^deal-/, '')
        : null;
    return { intent: 'TXLOG', correlationId };
  }

  // STATUS / CHECK
  if (lower.match(/(?:status|check|get|info|details)/)) {
    const idMatch = lower.match(/deal[- ]?(\S+)/);
    const correlationId =
      idMatch && idMatch[1] !== 'the'
        ? 'deal-' + idMatch[1].replace(/^deal-/, '')
        : lastCorrelationId;
    return { intent: 'STATUS', correlationId };
  }

  // HEALTH
  if (lower.match(/health|ping|alive/)) {
    return { intent: 'HEALTH' };
  }

  // HELP
  if (lower.match(/help|commands|what can you/)) {
    return { intent: 'HELP' };
  }

  // EXIT
  if (lower.match(/^(exit|quit|bye|q)$/)) {
    return { intent: 'EXIT' };
  }

  return { intent: 'UNKNOWN' };
}

// ── API calls ───────────────────────────────────────────────────────
async function apiPost(path, body) {
  const res = await fetch(`${API_BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
  return res.json();
}

async function apiGet(path) {
  const res = await fetch(`${API_BASE}${path}`);
  return res.json();
}

// ── command handlers ────────────────────────────────────────────────
async function handleCreate(termDays, faceValue) {
  printAgent(`Creating a new annuity deal — ${termDays} coupons, face value ${fmtNum(faceValue)}...`);
  try {
    const correlationId = uid();
    const result = await apiPost('/deal', {
      correlationId,
      participants: {
        buyer: { wallet: '0x0000000000000000000000000000000000000001' },
        seller: {
          wallet: {
            bidAmount: faceValue,
            tokenMetaData: { term: String(termDays), interestRate: '500' },
          },
        },
      },
    });
    lastCorrelationId = result.correlationId;
    printAgent([
      '✅ Deal created successfully!',
      `📋 Correlation ID : ${result.correlationId}`,
      `📄 Annuity Contract : ${contractLink(result.annuityAddress)}`,
      `💰 Stablecoin       : ${contractLink(result.stablecoinAddress)}`,
      `📊 Status           : ${result.status}`,
      '',
      'Next: "check status", "execute the deal", or "show balances".',
    ]);
  } catch (err) {
    printAgent(`❌ Failed to create deal: ${err.message}`);
  }
}

async function handleStatus(correlationId) {
  if (!correlationId) {
    printAgent('⚠️  No deal ID provided. Create a deal first or specify an ID.');
    return;
  }
  printAgent(`Checking status of ${correlationId}...`);
  try {
    const result = await apiGet(`/deal/${correlationId}`);
    if (result.error) { printAgent(`❌ ${result.error}`); return; }
    const cs = result.contractState || {};
    printAgent([
      `📊 Deal: ${correlationId}`,
      `   Status    : ${result.status}`,
      `   Issued    : ${cs.issued}`,
      `   Expired   : ${cs.expired}`,
      `   Annuity   : ${short(result.annuityAddress)}`,
      `   Stablecoin: ${short(result.stablecoinAddress)}`,
    ]);
  } catch (err) {
    printAgent(`❌ Failed to get status: ${err.message}`);
  }
}

async function handleExecute(correlationId) {
  if (!correlationId) {
    printAgent('⚠️  No deal ID provided. Create a deal first or specify an ID.');
    return;
  }
  printAgent(`Executing settlement for ${correlationId}...`);
  try {
    const result = await apiPost(`/deal/${correlationId}/execute`);
    if (result.error) { printAgent(`❌ ${result.error}`); return; }
    const lines = [
      `✅ Deal executed! ${result.txs ? result.txs.length : 0} transactions completed:`,
    ];
    if (result.txs) {
      result.txs.forEach((tx, i) => {
        const label = tx.type.replace(/([A-Z])/g, ' $1').trim();
        const idx = tx.index !== undefined ? ` #${tx.index}` : '';
        lines.push(`   ${i + 1}. ${label}${idx}  → ${txLink(tx.tx)}`);
      });
    }
    lines.push('');
    lines.push('Next: "show balances", "transfer the deal", or "check status".');
    printAgent(lines);
  } catch (err) {
    printAgent(`❌ Failed to execute deal: ${err.message}`);
  }
}

async function handleTransfer(correlationId, price) {
  if (!correlationId) {
    printAgent('⚠️  No deal ID provided. Create a deal first or specify an ID.');
    return;
  }
  const priceLabel = price ? fmtNum(price) : 'default (90% face value)';
  printAgent(`Transferring ${correlationId} to secondary buyer for ${priceLabel}...`);
  try {
    const body = price ? { price } : {};
    const result = await apiPost(`/deal/${correlationId}/transfer`, body);
    if (result.error) { printAgent(`❌ ${result.error}`); return; }
    const lines = [
      '✅ Annuity transferred!',
      `   New Owner : ${short(result.newOwner)}`,
      `   Price     : ${fmtNum(result.price)}`,
    ];
    if (result.txs) {
      result.txs.forEach((tx, i) => {
        const label = tx.type.replace(/([A-Z])/g, ' $1').trim();
        lines.push(`   ${i + 1}. ${label}  → ${txLink(tx.tx)}`);
      });
    }
    lines.push('');
    lines.push('Next: "show balances", "redeem the deal", or "check status".');
    printAgent(lines);
  } catch (err) {
    printAgent(`❌ Failed to transfer: ${err.message}`);
  }
}

async function handleRedeem(correlationId) {
  if (!correlationId) {
    printAgent('⚠️  No deal ID provided. Create a deal first or specify an ID.');
    return;
  }
  printAgent(`Redeeming ${correlationId} at maturity...`);
  try {
    const result = await apiPost(`/deal/${correlationId}/redeem`);
    if (result.error) { printAgent(`❌ ${result.error}`); return; }
    const lines = ['✅ Annuity redeemed at maturity!'];
    if (result.txs) {
      result.txs.forEach((tx, i) => {
        const label = tx.type.replace(/([A-Z])/g, ' $1').trim();
        if (tx.type === 'timeTravel') {
          lines.push(`   ⏩ Time-travelled ${fmtNum(tx.seconds)}s to reach maturity`);
        } else if (tx.type === 'waitForMaturity') {
          lines.push(`   ⏳ Waited ${fmtNum(tx.seconds)}s for real-time maturity`);
        } else {
          lines.push(`   ${i + 1}. ${label}  → ${txLink(tx.tx)}`);
        }
      });
    }
    lines.push('');
    lines.push('Next: "show balances" or "check status" to verify expired=true.');
    printAgent(lines);
  } catch (err) {
    printAgent(`❌ Failed to redeem: ${err.message}`);
  }
}

async function handleBalances(correlationId) {
  if (!correlationId) {
    printAgent('⚠️  No deal ID provided. Create a deal first or specify an ID.');
    return;
  }
  printAgent(`Fetching balances for ${correlationId}...`);
  try {
    const result = await apiGet(`/deal/${correlationId}/balances`);
    if (result.error) { printAgent(`❌ ${result.error}`); return; }
    const b = result.balances;
    const lines = [
      `💰 Balances for deal ${correlationId}:`,
      `   Current Owner: ${short(result.currentOwner)}`,
      '',
      `   👔 Issuer     ${short(b.issuer.address)}   💵 ${fmtNum(b.issuer.stablecoin)}`,
      `   🧑 Investor   ${short(b.investor.address)}   💵 ${fmtNum(b.investor.stablecoin)}`,
      `   🤝 Secondary  ${short(b.secondary.address)}   💵 ${fmtNum(b.secondary.stablecoin)}`,
      `   📄 Contract   ${short(b.contract.address)}   💵 ${fmtNum(b.contract.stablecoin)}`,
      '',
      '   📅 Coupons:',
    ];
    result.coupons.forEach((c) => {
      const icon = c.paid ? '✅' : '⬜';
      lines.push(`      ${icon} Coupon #${c.index} — ${fmtNum(c.value)} ${c.paid ? '(paid)' : '(unpaid)'}`);
    });
    printAgent(lines);
  } catch (err) {
    printAgent(`❌ Failed to get balances: ${err.message}`);
  }
}

async function handleList() {
  printAgent('Fetching all deals...');
  try {
    const result = await apiGet('/deals');
    if (!result.deals || result.deals.length === 0) {
      printAgent('📋 No deals created yet. Say "create a deal" to get started.');
      return;
    }
    const lines = [`📋 ${result.count} deal(s) in session:`, ''];
    result.deals.forEach((d) => {
      const icon =
        d.status === 'redeemed' ? '🏁' :
        d.status === 'transferred' ? '🔄' :
        d.status === 'executed' ? '✅' : '📝';
      lines.push(`   ${icon} ${d.correlationId}  |  ${d.status}  |  FV: ${fmtNum(d.faceValue)}  |  ${d.coupons} coupons  |  ${short(d.annuityAddress)}`);
    });
    printAgent(lines);
  } catch (err) {
    printAgent(`❌ Failed to list deals: ${err.message}`);
  }
}

async function handleTxLog(correlationId) {
  printAgent('Fetching transaction log...');
  try {
    const path = correlationId
      ? `/deal/${correlationId}/transactions`
      : '/transactions';
    const result = await apiGet(path);
    if (result.error) { printAgent(`❌ ${result.error}`); return; }

    const entries = result.transactions || [];
    if (entries.length === 0) {
      printAgent('📜 No transactions recorded yet.');
      return;
    }

    const label = correlationId ? `for ${correlationId}` : '(all deals)';
    const lines = [`📜 Transaction log ${label} — ${entries.length} entries:`, ''];
    entries.forEach((t, i) => {
      const typeLabel = t.type.replace(/([A-Z])/g, ' $1').trim();
      const idx = t.index !== null && t.index !== undefined ? ` #${t.index}` : '';
      const hash = t.tx ? txLink(t.tx) : '—';
      const time = t.time ? t.time.slice(11, 19) : '??:??:??';
      lines.push(`   ${i + 1}. [${time}] ${t.action} → ${typeLabel}${idx}  ${hash}`);
    });
    printAgent(lines);
  } catch (err) {
    printAgent(`❌ Failed to fetch tx log: ${err.message}`);
  }
}

async function handleHealth() {
  try {
    const result = await apiGet('/health');
    printAgent([
      `🏥 API Health: ${result.ok ? '✅ OK' : '❌ Down'}`,
      `   RPC Listening: ${result.rpcListening}`,
    ]);
  } catch (err) {
    printAgent(`❌ API unreachable: ${err.message}`);
  }
}

function handleHelp() {
  printAgent([
    '📖 Available commands:',
    '',
    '  ── Lifecycle ──────────────────────────────────────────',
    '   "create a deal with 5 coupons and face value 1000000"',
    '   "execute the deal"       — settle and pay coupons',
    '   "transfer the deal"      — sell to secondary buyer',
    '   "transfer for price 800000"  — sell at specific price',
    '   "redeem the deal"        — redeem at maturity',
    '',
    '  ── Inspection ─────────────────────────────────────────',
    '   "check status"           — on-chain state (issued/expired)',
    '   "show balances"          — stablecoin balances + coupon status',
    '   "list deals"             — all deals in this session',
    '   "show transactions"      — full tx log with hashes',
    '',
    '  ── System ─────────────────────────────────────────────',
    '   "health"                 — API + RPC health check',
    '   "help"                   — this message',
    '   "exit"                   — quit the agent',
    '',
    '  Tip: The agent remembers the last deal ID automatically.',
  ]);
}

// ── main loop ───────────────────────────────────────────────────────
async function main() {
  const netLabel = NETWORK === 'local' ? 'Local (Hardhat)' : NETWORK;
  console.log();
  console.log('  ╔═══════════════════════════════════════════════════╗');
  console.log('  ║   🦞  Imperium Markets — Annuity Agent  (v0.3)   ║');
  console.log('  ║                                                   ║');
  console.log('  ║   Rule-based agent for AnnuityToken operations.   ║');
  console.log('  ║   Type "help" for available commands.             ║');
  console.log('  ╚═══════════════════════════════════════════════════╝');
  console.log(`  Network: ${netLabel}`);
  console.log();

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    prompt: '  🦞 Imperium Agent > ',
  });

  rl.prompt();

  rl.on('line', async (line) => {
    const parsed = parseIntent(line);

    switch (parsed.intent) {
      case 'CREATE':
        await handleCreate(parsed.termDays, parsed.faceValue);
        break;
      case 'STATUS':
        await handleStatus(parsed.correlationId);
        break;
      case 'EXECUTE':
        await handleExecute(parsed.correlationId);
        break;
      case 'TRANSFER':
        await handleTransfer(parsed.correlationId, parsed.price);
        break;
      case 'REDEEM':
        await handleRedeem(parsed.correlationId);
        break;
      case 'BALANCES':
        await handleBalances(parsed.correlationId);
        break;
      case 'LIST':
        await handleList();
        break;
      case 'TXLOG':
        await handleTxLog(parsed.correlationId);
        break;
      case 'HEALTH':
        await handleHealth();
        break;
      case 'HELP':
        handleHelp();
        break;
      case 'EXIT':
        printAgent('👋 Goodbye!');
        process.exit(0);
        break;
      default:
        printAgent([
          "🤔 I didn't understand that.",
          '   Try "help" to see available commands.',
        ]);
    }

    rl.prompt();
  });

  rl.on('close', () => {
    printAgent('👋 Goodbye!');
    process.exit(0);
  });
}

// Only start the REPL when run directly (not when require()'d for testing)
if (require.main === module) {
  main();
}

// Export for testing
module.exports = { parseIntent };
