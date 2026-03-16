
require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const Web3 = require('web3').default;
const fs = require('fs');
const path = require('path');
const fetch = require('node-fetch');
const { getNetwork, explorerTxUrl } = require('../config/networks');

const app = express();
const port = process.env.PORT || 4000;
app.use(cors());
app.use(bodyParser.json());

// Serve built frontend (production)
const webDistPath = path.join(__dirname, '../web/dist');
if (fs.existsSync(webDistPath)) {
  app.use(express.static(webDistPath));
}

// ── Network selection ────────────────────────────────────────────────
// Usage:  node api/imperium-api.js --network hedera-testnet
//         NETWORK=hedera-testnet node api/imperium-api.js
const networkArg = (() => {
  const idx = process.argv.indexOf('--network');
  if (idx !== -1 && process.argv[idx + 1]) return process.argv[idx + 1];
  return process.env.NETWORK || 'local';
})();

const NET = getNetwork(networkArg);
console.log(`Network: ${NET.name} | RPC: ${NET.rpcUrl}`);

// Connect to the selected network
const web3 = new Web3(NET.rpcUrl);

// On testnet, add private key to web3 wallet so it can sign transactions
if (!NET.usePrefundedAccounts && process.env.HEDERA_TESTNET_PRIVATE_KEY) {
  const acct = web3.eth.accounts.privateKeyToAccount(process.env.HEDERA_TESTNET_PRIVATE_KEY);
  web3.eth.accounts.wallet.add(acct);
  console.log(`Wallet loaded: ${acct.address}`);
}

// Load contract artifacts (Hardhat format)
const annuityArtifact = JSON.parse(fs.readFileSync(path.join(__dirname, '../artifacts/contracts/AnnuityToken.sol/AnnuityToken.json')));
const stablecoinArtifact = JSON.parse(fs.readFileSync(path.join(__dirname, '../artifacts/contracts/ImperiumStableCoin.sol/ImperiumStableCoin.json')));

// Prepare web3 Contract constructors (use ABI + bytecode)
const AnnuityAbi = annuityArtifact.abi;
const AnnuityBytecode = annuityArtifact.bytecode;
const StablecoinAbi = stablecoinArtifact.abi;
const StablecoinBytecode = stablecoinArtifact.bytecode;

// In-memory deal store
const deals = {};
// In-memory transaction history
const txHistory = [];

// ── helpers ──────────────────────────────────────────────────────────
function recordTxs(correlationId, action, txs) {
  if (!txs) return;
  const ts = new Date().toISOString();
  txs.forEach((tx) => {
    const entry = {
      time: ts,
      correlationId,
      action,
      type: tx.type,
      tx: tx.tx || null,
      index: tx.index !== undefined ? tx.index : null,
      seconds: tx.seconds || null,
    };
    // Add explorer link for testnet transactions
    if (tx.tx && NET.explorer) {
      entry.explorerUrl = explorerTxUrl(NET.name, tx.tx);
    }
    txHistory.push(entry);
  });
}

/**
 * Estimate gas with network multiplier.
 */
function gasLimit(base) {
  return Math.ceil(base * NET.gasMultiplier);
}

/**
 * Optional delay after tx to wait for finality on slower networks.
 */
function waitForFinality() {
  if (NET.txConfirmationDelay > 0) {
    return new Promise((r) => setTimeout(r, NET.txConfirmationDelay));
  }
  return Promise.resolve();
}

/**
 * Retry wrapper for web3 transaction sends on flaky RPC relays (e.g. Hashio).
 * Hashio can sporadically return HTML 503/429 pages instead of JSON-RPC,
 * which causes web3.js to throw a FetchError. This wrapper retries with
 * exponential back-off.
 */
async function sendWithRetry(txCall, opts, retries = 3) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const receipt = await txCall.send(opts);
      return receipt;
    } catch (err) {
      const isTransient =
        err.message?.includes('invalid json response') ||
        err.message?.includes('FetchError') ||
        err.message?.includes('ECONNRESET') ||
        err.message?.includes('rate limit');
      if (isTransient && attempt < retries) {
        const delay = attempt * 5000; // 5s, 10s, 15s
        console.log(`  ⚠️  Tx attempt ${attempt}/${retries} failed (${err.message?.slice(0, 60)}), retrying in ${delay / 1000}s...`);
        await new Promise((r) => setTimeout(r, delay));
        continue;
      }
      throw err; // non-transient or exhausted retries
    }
  }
}

// 1) Submitting a Deal
app.post('/deal', async (req, res) => {
  try {
    const payload = req.body;
    const correlationId = payload.correlationId;
    const buyer = payload.participants.buyer.wallet;
    const seller = payload.participants.seller.wallet;
    const termDays = parseInt(payload.participants.seller.wallet.tokenMetaData.term);
    const interestRate = parseInt(payload.participants.seller.wallet.tokenMetaData.interestRate);
    const faceValue = seller.bidAmount;
    const couponValue = Math.floor(faceValue / termDays);

    let accounts = await web3.eth.getAccounts();
    // On Hedera testnet, getAccounts() returns [] — use wallet instead
    if (accounts.length === 0 && web3.eth.accounts.wallet.length > 0) {
      accounts = [web3.eth.accounts.wallet[0].address];
    }
    // On Hedera testnet we only have 1 funded account — it plays all roles
    const annuityIssuer = accounts[1] || accounts[0];
    const investor = accounts[2] || accounts[0];
    const secondary = accounts[3] || accounts[0];

    // Deploy stablecoin using web3
    const StablecoinContract = new web3.eth.Contract(StablecoinAbi);
    const stablecoinInstance = await StablecoinContract.deploy({ data: StablecoinBytecode }).send({ from: accounts[0], gas: gasLimit(6_000_000) });
    await waitForFinality();
    const stablecoinAddress = stablecoinInstance.options.address;

    // Transfer funds from deployer to investor & secondary (mock balance)
    await sendWithRetry(stablecoinInstance.methods.transfer(investor, faceValue), { from: accounts[0], gas: gasLimit(200000) });
    await waitForFinality();
    await sendWithRetry(stablecoinInstance.methods.transfer(secondary, faceValue), { from: accounts[0], gas: gasLimit(200000) });
    await waitForFinality();

    const now = Math.floor(Date.now() / 1000);

    // On Hedera: use short maturity + short coupon intervals for demo
    const maturityDate = NET.supportsTimeTravel
      ? now + termDays * 24 * 60 * 60
      : now + NET.deployMaturitySeconds;

    const couponDates = [];
    const couponValues = [];
    for (let i = 1; i <= termDays; i++) {
      if (NET.supportsTimeTravel) {
        couponDates.push(now + i * 24 * 60 * 60);
      } else {
        // Space coupons evenly within maturity window (e.g., every 30s for 120s maturity)
        const interval = Math.floor(NET.deployMaturitySeconds / (termDays + 1));
        couponDates.push(now + i * interval);
      }
      couponValues.push(couponValue);
    }

    // Deploy annuity
    const AnnuityContract = new web3.eth.Contract(AnnuityAbi);
    const annuityInstance = await AnnuityContract.deploy({
      data: AnnuityBytecode,
      arguments: [annuityIssuer, now, maturityDate, faceValue, interestRate, couponDates, couponValues, stablecoinAddress]
    }).send({ from: annuityIssuer, gas: gasLimit(8_000_000) });
    await waitForFinality();
    const annuityAddress = annuityInstance.options.address;

  // Store deal info
    deals[correlationId] = {
      annuityAddress,
      stablecoinAddress,
      investor,
      secondary,
      annuityIssuer,
      faceValue,
      interestRate,
      couponDates,
      couponValues,
      status: 'created',
      payload
    };
    console.log(`Deal created ${correlationId} -> annuity ${annuityAddress} stablecoin ${stablecoinAddress}`);

    const response = { correlationId, annuityAddress, stablecoinAddress, status: 'created' };
    if (NET.explorer) {
      response.explorerUrl = `${NET.explorer}/contract/${annuityAddress}`;
    }
    res.json(response);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 2) Getting Deal Status
app.get('/deal/:correlationId', async (req, res) => {
  try {
    const deal = deals[req.params.correlationId];
    if (!deal) return res.status(404).json({ error: 'Deal not found' });
    // Optionally, fetch contract state
    const annuity = new web3.eth.Contract(AnnuityAbi, deal.annuityAddress);
    const issuedRaw = await annuity.methods.issued().call();
    const expiredRaw = await annuity.methods.expired().call();
    const issued = (issuedRaw === true || issuedRaw === 'true' || issuedRaw === '1' || issuedRaw === 1);
    const expired = (expiredRaw === true || expiredRaw === 'true' || expiredRaw === '1' || expiredRaw === 1);
    res.json({
      ...deal,
      contractState: { issued, expired }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 3) Execute Deal (swap/settlement)
app.post('/deal/:correlationId/execute', async (req, res) => {
  try {
    const deal = deals[req.params.correlationId];
    if (!deal) return res.status(404).json({ error: 'Deal not found' });

    const annuity = new web3.eth.Contract(AnnuityAbi, deal.annuityAddress);
    const stablecoin = new web3.eth.Contract(StablecoinAbi, deal.stablecoinAddress);
    console.log(`Executing deal ${req.params.correlationId}`);
    const txs = [];

    // Approve and accept: Investor must approve transfer of faceValue to issuer
    const faceValueStr = String(deal.faceValue);
    const approveReceipt = await sendWithRetry(stablecoin.methods.approve(deal.annuityAddress, faceValueStr), { from: deal.investor, gas: gasLimit(200000) });
    await waitForFinality();
    txs.push({ type: 'investorApprove', tx: approveReceipt.transactionHash });

    const acceptReceipt = await sendWithRetry(annuity.methods.acceptAndIssue(deal.investor), { from: deal.investor, gas: gasLimit(500000) });
    await waitForFinality();
    txs.push({ type: 'acceptAndIssue', tx: acceptReceipt.transactionHash });

    // Issuer approves coupons (approve annuity contract to spend coupons)
    const totalCoupons = deal.couponValues.reduce((a, b) => a + Number(b), 0);
    const totalCouponsStr = String(totalCoupons);
    const issuerApprove = await sendWithRetry(stablecoin.methods.approve(deal.annuityAddress, totalCouponsStr), { from: deal.annuityIssuer, gas: gasLimit(200000) });
    await waitForFinality();
    txs.push({ type: 'issuerApproveCoupons', tx: issuerApprove.transactionHash });

    // Pay all coupons
    for (let i = 0; i < deal.couponValues.length; i++) {
      const payReceipt = await sendWithRetry(annuity.methods.payCoupon(i), { from: deal.annuityIssuer, gas: gasLimit(200000) });
      await waitForFinality();
      txs.push({ type: 'payCoupon', index: i, tx: payReceipt.transactionHash });
    }

    deal.status = 'executed';
    recordTxs(req.params.correlationId, 'execute', txs);
    res.json({ correlationId: req.params.correlationId, status: 'executed', txs });
  } catch (err) {
    console.error('Execute error', err);
    res.status(500).json({ error: err.message, stack: err.stack });
  }
});

// 4) Transfer Annuity to secondary buyer
app.post('/deal/:correlationId/transfer', async (req, res) => {
  try {
    const deal = deals[req.params.correlationId];
    if (!deal) return res.status(404).json({ error: 'Deal not found' });

    const price = req.body.price || Math.floor(deal.faceValue * 0.9);
    const newOwner = req.body.newOwner || deal.secondary;

    const annuity = new web3.eth.Contract(AnnuityAbi, deal.annuityAddress);
    const stablecoin = new web3.eth.Contract(StablecoinAbi, deal.stablecoinAddress);
    console.log(`Transferring deal ${req.params.correlationId} to ${newOwner} for ${price}`);
    const txs = [];

    // Buyer (newOwner) approves the annuity contract to pull `price`
    const approveReceipt = await sendWithRetry(stablecoin.methods.approve(deal.annuityAddress, String(price)), { from: newOwner, gas: gasLimit(200000) });
    await waitForFinality();
    txs.push({ type: 'buyerApprove', tx: approveReceipt.transactionHash });

    // Current owner initiates transfer
    const currentOwner = await annuity.methods.currentOwner().call();
    const transferReceipt = await sendWithRetry(annuity.methods.transferAnnuity(newOwner, String(price)), { from: currentOwner, gas: gasLimit(500000) });
    await waitForFinality();
    txs.push({ type: 'transferAnnuity', tx: transferReceipt.transactionHash });

    deal.status = 'transferred';
    recordTxs(req.params.correlationId, 'transfer', txs);
    res.json({ correlationId: req.params.correlationId, status: 'transferred', newOwner, price, txs });
  } catch (err) {
    console.error('Transfer error', err);
    res.status(500).json({ error: err.message });
  }
});

// 5) Redeem at maturity
app.post('/deal/:correlationId/redeem', async (req, res) => {
  try {
    const deal = deals[req.params.correlationId];
    if (!deal) return res.status(404).json({ error: 'Deal not found' });

    const annuity = new web3.eth.Contract(AnnuityAbi, deal.annuityAddress);
    const stablecoin = new web3.eth.Contract(StablecoinAbi, deal.stablecoinAddress);
    console.log(`Redeeming deal ${req.params.correlationId}`);
    const txs = [];

    // The AnnuityToken contract calls stablecoin.safeTransfer(currentOwner, faceValue),
    // so the contract itself must hold enough stablecoin balance.
    const contractBalance = await stablecoin.methods.balanceOf(deal.annuityAddress).call();
    if (BigInt(contractBalance) < BigInt(deal.faceValue)) {
      const deficit = BigInt(deal.faceValue) - BigInt(contractBalance);
      let accounts = await web3.eth.getAccounts();
      if (accounts.length === 0 && web3.eth.accounts.wallet.length > 0) {
        accounts = [web3.eth.accounts.wallet[0].address];
      }
      // Fund the issuer first if needed, then issuer sends to the annuity contract
      const issuerBal = await stablecoin.methods.balanceOf(deal.annuityIssuer).call();
      if (BigInt(issuerBal) < deficit) {
        await sendWithRetry(stablecoin.methods.transfer(deal.annuityIssuer, String(deficit)), { from: accounts[0], gas: gasLimit(200000) });
        await waitForFinality();
      }
      await sendWithRetry(stablecoin.methods.transfer(deal.annuityAddress, String(deficit)), { from: deal.annuityIssuer, gas: gasLimit(200000) });
      await waitForFinality();
    }

    // Time-travel: only on networks that support it (local Hardhat)
    // Note: web3.js v4's provider.request() does not correctly relay
    // Hardhat-specific JSON-RPC methods (evm_increaseTime, evm_mine).
    // We use raw fetch() JSON-RPC calls instead.
    if (NET.supportsTimeTravel) {
      const maturityDate = Number(await annuity.methods.maturityDate().call());
      const currentBlock = await web3.eth.getBlock('latest');
      const currentTime = Number(currentBlock.timestamp);
      if (currentTime < maturityDate) {
        const timeToAdvance = maturityDate - currentTime + 60; // +60s buffer
        await fetch(NET.rpcUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ jsonrpc: '2.0', method: 'evm_increaseTime', params: [timeToAdvance], id: Date.now() }),
        });
        await fetch(NET.rpcUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ jsonrpc: '2.0', method: 'evm_mine', params: [], id: Date.now() + 1 }),
        });
        txs.push({ type: 'timeTravel', seconds: timeToAdvance });
      }
    } else {
      // On Hedera Testnet: wait for real time to pass maturity
      const maturityDate = Number(await annuity.methods.maturityDate().call());
      const now = Math.floor(Date.now() / 1000);
      if (now < maturityDate) {
        const waitSec = maturityDate - now + 5; // +5s buffer
        console.log(`Waiting ${waitSec}s for maturity (real-time on ${NET.name})...`);
        txs.push({ type: 'waitForMaturity', seconds: waitSec });
        await new Promise((r) => setTimeout(r, waitSec * 1000));
      }
    }

    const redeemReceipt = await sendWithRetry(annuity.methods.redeemMaturity(), { from: deal.annuityIssuer, gas: gasLimit(500000) });
    await waitForFinality();
    txs.push({ type: 'redeemMaturity', tx: redeemReceipt.transactionHash });

    deal.status = 'redeemed';
    recordTxs(req.params.correlationId, 'redeem', txs);
    res.json({ correlationId: req.params.correlationId, status: 'redeemed', txs });
  } catch (err) {
    console.error('Redeem error', err);
    res.status(500).json({ error: err.message });
  }
});

// 6) Get balances for a deal
app.get('/deal/:correlationId/balances', async (req, res) => {
  try {
    const deal = deals[req.params.correlationId];
    if (!deal) return res.status(404).json({ error: 'Deal not found' });

    const stablecoin = new web3.eth.Contract(StablecoinAbi, deal.stablecoinAddress);
    const annuity = new web3.eth.Contract(AnnuityAbi, deal.annuityAddress);

    const currentOwner = await annuity.methods.currentOwner().call();

    const issuerBal = await stablecoin.methods.balanceOf(deal.annuityIssuer).call();
    const investorBal = await stablecoin.methods.balanceOf(deal.investor).call();
    const secondaryBal = await stablecoin.methods.balanceOf(deal.secondary).call();
    const contractBal = await stablecoin.methods.balanceOf(deal.annuityAddress).call();

    // Check which coupons are paid
    const couponStatus = [];
    for (let i = 0; i < deal.couponValues.length; i++) {
      const paid = await annuity.methods.couponPaid(i).call();
      couponStatus.push({ index: i, value: deal.couponValues[i], paid: paid === true || paid === 'true' });
    }

    res.json({
      correlationId: req.params.correlationId,
      currentOwner,
      balances: {
        issuer: { address: deal.annuityIssuer, stablecoin: issuerBal.toString() },
        investor: { address: deal.investor, stablecoin: investorBal.toString() },
        secondary: { address: deal.secondary, stablecoin: secondaryBal.toString() },
        contract: { address: deal.annuityAddress, stablecoin: contractBal.toString() },
      },
      coupons: couponStatus,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 7) List all deals
app.get('/deals', async (req, res) => {
  const list = Object.entries(deals).map(([id, d]) => ({
    correlationId: id,
    status: d.status,
    faceValue: d.faceValue,
    coupons: d.couponValues.length,
    annuityAddress: d.annuityAddress,
  }));
  res.json({ deals: list, count: list.length });
});

// 8) Transaction log — per deal
app.get('/deal/:correlationId/transactions', (req, res) => {
  const id = req.params.correlationId;
  const deal = deals[id];
  if (!deal) return res.status(404).json({ error: 'Deal not found' });
  const entries = txHistory.filter((t) => t.correlationId === id);
  res.json({ correlationId: id, transactions: entries, count: entries.length });
});

// 9) Transaction log — all deals
app.get('/transactions', (req, res) => {
  res.json({ transactions: txHistory, count: txHistory.length });
});

// ── WebSocket chat server ────────────────────────────────────────────
const { WebSocketServer } = require('ws');
const { createSession } = require('../agent/llm-agent');
const { rfqPlugin, RFQ_SYSTEM_PROMPT } = require('../agent/plugins/rfq-plugin');

/**
 * Parse structured ~~~rfq-*~~~ blocks from agent response text.
 * Returns { plainText, structured } where structured contains extracted data.
 */
function parseStructuredResponse(text) {
  const structured = {};
  // Support both ~~~rfq-*~~~ and ```rfq-*``` fences
  const plainText = text.replace(/(?:~~~|```)rfq-(\w[\w-]*)\n([\s\S]*?)(?:~~~|```)/g, (_, type, json) => {
    try {
      const key = type.replace(/-/g, '_').replace(/^rfq_/, '');
      structured[key] = JSON.parse(json.trim());
    } catch { /* ignore malformed blocks */ }
    return '';
  }).replace(/\n{3,}/g, '\n\n').trim();

  return { plainText, structured };
}

// Load HOL agent state if available (for Hedera tools)
let holAgentState = null;
try {
  const holPath = path.join(__dirname, '../deployments/hol-agent.json');
  if (fs.existsSync(holPath)) {
    holAgentState = JSON.parse(fs.readFileSync(holPath, 'utf8'));
  }
} catch { /* no HOL agent — continue without Hedera tools */ }

const server = app.listen(port, () => {
  console.log(`ImperiumAPI listening at http://localhost:${port} (network: ${NET.name})`);
});

// Attach WebSocket on /ws/chat
const wss = new WebSocketServer({ server, path: '/ws/chat' });

wss.on('connection', (ws) => {
  console.log('[WS] New chat session');

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    ws.send(JSON.stringify({ type: 'error', text: 'ANTHROPIC_API_KEY not configured on server.' }));
    ws.close();
    return;
  }

  const session = createSession({
    apiKey,
    agentState: holAgentState,
    systemPrompt: RFQ_SYSTEM_PROMPT,
    extraPlugins: [rfqPlugin],
  });

  /** Helper: process input with streaming tokens over WebSocket */
  async function processWithStreaming(inputText) {
    if (ws.readyState !== ws.OPEN) return;
    ws.send(JSON.stringify({ type: 'stream_start' }));

    try {
      const response = await session.processInput(inputText, {
        onToken: (token) => {
          if (ws.readyState === ws.OPEN) {
            ws.send(JSON.stringify({ type: 'stream_token', token }));
          }
        },
      });
      const { plainText, structured } = parseStructuredResponse(response.text);
      if (ws.readyState === ws.OPEN) {
        ws.send(JSON.stringify({ type: 'stream_end', text: plainText, structured }));
      }
    } catch (err) {
      console.error('[WS] Process error:', err.message);
      if (ws.readyState === ws.OPEN) {
        ws.send(JSON.stringify({ type: 'error', text: 'Something went wrong. Please try again.' }));
      }
    }
  }

  // Send initial greeting by triggering the agent
  processWithStreaming('The user has just opened the RFQ chat. Greet them and start Stage 1 (Introduction).');

  ws.on('message', async (raw) => {
    let msg;
    try {
      msg = JSON.parse(raw.toString());
    } catch {
      ws.send(JSON.stringify({ type: 'error', text: 'Invalid JSON message.' }));
      return;
    }

    const userText = msg.text || '';
    if (!userText.trim()) return;

    await processWithStreaming(userText);
  });

  ws.on('close', () => {
    console.log('[WS] Chat session closed');
  });
});

module.exports = app;

// Add simple health and root endpoints for quick checks
app.get('/health', async (req, res) => {
  try {
    const rpcListening = await web3.eth.net.isListening();
    res.json({ ok: true, rpcListening, network: NET.name });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message, network: NET.name });
  }
});

app.get('/', (req, res) => {
  res.json({
    service: 'ImperiumAPI',
    network: NET.name,
    explorer: NET.explorer || 'N/A (local)',
    endpoints: [
      { method: 'POST', path: '/deal' },
      { method: 'GET', path: '/deal/:correlationId' },
      { method: 'POST', path: '/deal/:correlationId/execute' },
      { method: 'POST', path: '/deal/:correlationId/transfer' },
      { method: 'POST', path: '/deal/:correlationId/redeem' },
      { method: 'GET', path: '/deal/:correlationId/balances' },
      { method: 'GET', path: '/deal/:correlationId/transactions' },
      { method: 'GET', path: '/deals' },
      { method: 'GET', path: '/transactions' },
      { method: 'GET', path: '/health' }
    ]
  });
});
