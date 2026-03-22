
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

// NOTE: Static file serving is mounted at the bottom of this file,
// after all API routes, so API endpoints take priority over index.html.

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
const tdArtifact = JSON.parse(fs.readFileSync(path.join(__dirname, '../artifacts/contracts/TermDepositToken.sol/TermDepositToken.json')));
const ncdArtifact = JSON.parse(fs.readFileSync(path.join(__dirname, '../artifacts/contracts/NCDToken.sol/NCDToken.json')));

// Prepare web3 Contract constructors (use ABI + bytecode)
const AnnuityAbi = annuityArtifact.abi;
const AnnuityBytecode = annuityArtifact.bytecode;
const StablecoinAbi = stablecoinArtifact.abi;
const StablecoinBytecode = stablecoinArtifact.bytecode;
const TDAbi = tdArtifact.abi;
const TDBytecode = tdArtifact.bytecode;
const NCDAbi = ncdArtifact.abi;
const NCDBytecode = ncdArtifact.bytecode;

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
 * Build tx options with gasPrice for Hedera Testnet.
 * Hedera's JSON-RPC relay needs explicit gasPrice to avoid INSUFFICIENT_TX_FEE.
 */
function txOpts(from, gas) {
  const opts = { from, gas };
  if (!NET.usePrefundedAccounts) {
    opts.gasPrice = '2000000000000'; // 2000 Gwei for Hedera relay
  }
  return opts;
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
        err.message?.includes('rate limit') ||
        err.message?.includes('INSUFFICIENT_TX_FEE');
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
    const stablecoinInstance = await StablecoinContract.deploy({ data: StablecoinBytecode }).send(txOpts(accounts[0], gasLimit(6_000_000)));
    await waitForFinality();
    const stablecoinAddress = stablecoinInstance.options.address;

    // Transfer funds from deployer to investor & secondary (mock balance)
    await sendWithRetry(stablecoinInstance.methods.transfer(investor, faceValue), txOpts(accounts[0], gasLimit(200000)));
    await waitForFinality();
    await sendWithRetry(stablecoinInstance.methods.transfer(secondary, faceValue), txOpts(accounts[0], gasLimit(200000)));
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
    }).send(txOpts(annuityIssuer, gasLimit(8_000_000)));
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
    const approveReceipt = await sendWithRetry(stablecoin.methods.approve(deal.annuityAddress, faceValueStr), txOpts(deal.investor, gasLimit(200000)));
    await waitForFinality();
    txs.push({ type: 'investorApprove', tx: approveReceipt.transactionHash });

    const acceptReceipt = await sendWithRetry(annuity.methods.acceptAndIssue(deal.investor), txOpts(deal.investor, gasLimit(500000)));
    await waitForFinality();
    txs.push({ type: 'acceptAndIssue', tx: acceptReceipt.transactionHash });

    // Issuer approves coupons (approve annuity contract to spend coupons)
    const totalCoupons = deal.couponValues.reduce((a, b) => a + Number(b), 0);
    const totalCouponsStr = String(totalCoupons);
    const issuerApprove = await sendWithRetry(stablecoin.methods.approve(deal.annuityAddress, totalCouponsStr), txOpts(deal.annuityIssuer, gasLimit(200000)));
    await waitForFinality();
    txs.push({ type: 'issuerApproveCoupons', tx: issuerApprove.transactionHash });

    // Pay all coupons
    for (let i = 0; i < deal.couponValues.length; i++) {
      const payReceipt = await sendWithRetry(annuity.methods.payCoupon(i), txOpts(deal.annuityIssuer, gasLimit(200000)));
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
    const approveReceipt = await sendWithRetry(stablecoin.methods.approve(deal.annuityAddress, String(price)), txOpts(newOwner, gasLimit(200000)));
    await waitForFinality();
    txs.push({ type: 'buyerApprove', tx: approveReceipt.transactionHash });

    // Current owner initiates transfer
    const currentOwner = await annuity.methods.currentOwner().call();
    const transferReceipt = await sendWithRetry(annuity.methods.transferAnnuity(newOwner, String(price)), txOpts(currentOwner, gasLimit(500000)));
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
        await sendWithRetry(stablecoin.methods.transfer(deal.annuityIssuer, String(deficit)), txOpts(accounts[0], gasLimit(200000)));
        await waitForFinality();
      }
      await sendWithRetry(stablecoin.methods.transfer(deal.annuityAddress, String(deficit)), txOpts(deal.annuityIssuer, gasLimit(200000)));
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

    const redeemReceipt = await sendWithRetry(annuity.methods.redeemMaturity(), txOpts(deal.annuityIssuer, gasLimit(500000)));
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

// ══════════════════════════════════════════════════════════════════════
// ── Term Deposit endpoints ─────────────────────────────────────────
// ══════════════════════════════════════════════════════════════════════

app.post('/term-deposit', async (req, res) => {
  try {
    const payload = req.body;
    const correlationId = payload.correlationId;
    const faceValue = payload.faceValue || 1000000;
    const interestRate = payload.interestRate || 500; // basis points
    const termDays = payload.termDays || 3;

    let accounts = await web3.eth.getAccounts();
    if (accounts.length === 0 && web3.eth.accounts.wallet.length > 0) {
      accounts = [web3.eth.accounts.wallet[0].address];
    }
    const tdIssuer = accounts[1] || accounts[0];
    const investor = accounts[2] || accounts[0];

    // Deploy stablecoin
    const StablecoinContract = new web3.eth.Contract(StablecoinAbi);
    const stablecoinInstance = await StablecoinContract.deploy({ data: StablecoinBytecode }).send(txOpts(accounts[0], gasLimit(6_000_000)));
    await waitForFinality();
    const stablecoinAddress = stablecoinInstance.options.address;

    // Fund investor and issuer
    await sendWithRetry(stablecoinInstance.methods.transfer(investor, faceValue), txOpts(accounts[0], gasLimit(200000)));
    await waitForFinality();
    await sendWithRetry(stablecoinInstance.methods.transfer(tdIssuer, faceValue * 2), txOpts(accounts[0], gasLimit(200000)));
    await waitForFinality();

    const now = Math.floor(Date.now() / 1000);
    const maturityDate = NET.supportsTimeTravel
      ? now + termDays * 24 * 60 * 60
      : now + NET.deployMaturitySeconds;

    // Interest = faceValue * rate / 10000
    const interestAmount = Math.floor(faceValue * interestRate / 10000);

    const TDContract = new web3.eth.Contract(TDAbi);
    const tdInstance = await TDContract.deploy({
      data: TDBytecode,
      arguments: [tdIssuer, now, maturityDate, faceValue, interestRate, interestAmount, stablecoinAddress]
    }).send(txOpts(tdIssuer, gasLimit(8_000_000)));
    await waitForFinality();
    const tdAddress = tdInstance.options.address;

    deals[correlationId] = {
      assetType: 'term-deposit',
      contractAddress: tdAddress,
      stablecoinAddress,
      investor,
      tdIssuer,
      faceValue,
      interestRate,
      interestAmount,
      maturityDate,
      status: 'created',
      payload
    };
    console.log(`Term Deposit created ${correlationId} -> ${tdAddress}`);

    const response = { correlationId, contractAddress: tdAddress, stablecoinAddress, assetType: 'term-deposit', status: 'created' };
    if (NET.explorer) response.explorerUrl = `${NET.explorer}/contract/${tdAddress}`;
    res.json(response);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/term-deposit/:correlationId/execute', async (req, res) => {
  try {
    const deal = deals[req.params.correlationId];
    if (!deal || deal.assetType !== 'term-deposit') return res.status(404).json({ error: 'Term deposit not found' });

    const td = new web3.eth.Contract(TDAbi, deal.contractAddress);
    const stablecoin = new web3.eth.Contract(StablecoinAbi, deal.stablecoinAddress);
    console.log(`Executing term deposit ${req.params.correlationId}`);
    const txs = [];

    // Investor approves and issues
    const approveReceipt = await sendWithRetry(stablecoin.methods.approve(deal.contractAddress, String(deal.faceValue)), txOpts(deal.investor, gasLimit(200000)));
    await waitForFinality();
    txs.push({ type: 'investorApprove', tx: approveReceipt.transactionHash });

    const acceptReceipt = await sendWithRetry(td.methods.acceptAndIssue(deal.investor), txOpts(deal.investor, gasLimit(500000)));
    await waitForFinality();
    txs.push({ type: 'acceptAndIssue', tx: acceptReceipt.transactionHash });

    deal.status = 'executed';
    recordTxs(req.params.correlationId, 'execute', txs);
    res.json({ correlationId: req.params.correlationId, assetType: 'term-deposit', status: 'executed', txs });
  } catch (err) {
    console.error('TD Execute error', err);
    res.status(500).json({ error: err.message });
  }
});

app.post('/term-deposit/:correlationId/redeem', async (req, res) => {
  try {
    const deal = deals[req.params.correlationId];
    if (!deal || deal.assetType !== 'term-deposit') return res.status(404).json({ error: 'Term deposit not found' });

    const td = new web3.eth.Contract(TDAbi, deal.contractAddress);
    const stablecoin = new web3.eth.Contract(StablecoinAbi, deal.stablecoinAddress);
    console.log(`Redeeming term deposit ${req.params.correlationId}`);
    const txs = [];

    // Time-travel or wait for maturity
    if (NET.supportsTimeTravel) {
      const maturityDate = Number(await td.methods.maturityDate().call());
      const currentBlock = await web3.eth.getBlock('latest');
      const currentTime = Number(currentBlock.timestamp);
      if (currentTime < maturityDate) {
        const timeToAdvance = maturityDate - currentTime + 60;
        await fetch(NET.rpcUrl, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ jsonrpc: '2.0', method: 'evm_increaseTime', params: [timeToAdvance], id: Date.now() }) });
        await fetch(NET.rpcUrl, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ jsonrpc: '2.0', method: 'evm_mine', params: [], id: Date.now() + 1 }) });
        txs.push({ type: 'timeTravel', seconds: timeToAdvance });
      }
    } else {
      const maturityDate = Number(await td.methods.maturityDate().call());
      const now = Math.floor(Date.now() / 1000);
      if (now < maturityDate) {
        const waitSec = maturityDate - now + 5;
        console.log(`Waiting ${waitSec}s for TD maturity (real-time on ${NET.name})...`);
        txs.push({ type: 'waitForMaturity', seconds: waitSec });
        await new Promise((r) => setTimeout(r, waitSec * 1000));
      }
    }

    // Issuer approves total payout (face value + interest)
    const totalPayout = String(Number(deal.faceValue) + Number(deal.interestAmount));
    const issuerApprove = await sendWithRetry(stablecoin.methods.approve(deal.contractAddress, totalPayout), txOpts(deal.tdIssuer, gasLimit(200000)));
    await waitForFinality();
    txs.push({ type: 'issuerApproveRedemption', tx: issuerApprove.transactionHash });

    const redeemReceipt = await sendWithRetry(td.methods.redeemMaturity(), txOpts(deal.tdIssuer, gasLimit(500000)));
    await waitForFinality();
    txs.push({ type: 'redeemMaturity', tx: redeemReceipt.transactionHash });

    deal.status = 'redeemed';
    recordTxs(req.params.correlationId, 'redeem', txs);
    res.json({ correlationId: req.params.correlationId, assetType: 'term-deposit', status: 'redeemed', txs });
  } catch (err) {
    console.error('TD Redeem error', err);
    res.status(500).json({ error: err.message });
  }
});

app.get('/term-deposit/:correlationId', async (req, res) => {
  try {
    const deal = deals[req.params.correlationId];
    if (!deal || deal.assetType !== 'term-deposit') return res.status(404).json({ error: 'Term deposit not found' });
    const td = new web3.eth.Contract(TDAbi, deal.contractAddress);
    const issuedRaw = await td.methods.issued().call();
    const expiredRaw = await td.methods.expired().call();
    const issued = (issuedRaw === true || issuedRaw === 'true');
    const expired = (expiredRaw === true || expiredRaw === 'true');
    res.json({ ...deal, contractState: { issued, expired } });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/term-deposit/:correlationId/balances', async (req, res) => {
  try {
    const deal = deals[req.params.correlationId];
    if (!deal || deal.assetType !== 'term-deposit') return res.status(404).json({ error: 'Term deposit not found' });
    const stablecoin = new web3.eth.Contract(StablecoinAbi, deal.stablecoinAddress);
    const issuerBal = await stablecoin.methods.balanceOf(deal.tdIssuer).call();
    const investorBal = await stablecoin.methods.balanceOf(deal.investor).call();
    const contractBal = await stablecoin.methods.balanceOf(deal.contractAddress).call();
    res.json({
      correlationId: req.params.correlationId,
      assetType: 'term-deposit',
      balances: {
        issuer: { address: deal.tdIssuer, stablecoin: issuerBal.toString() },
        investor: { address: deal.investor, stablecoin: investorBal.toString() },
        contract: { address: deal.contractAddress, stablecoin: contractBal.toString() },
      },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ══════════════════════════════════════════════════════════════════════
// ── NCD (Negotiable Certificate of Deposit) endpoints ──────────────
// ══════════════════════════════════════════════════════════════════════

app.post('/ncd', async (req, res) => {
  try {
    const payload = req.body;
    const correlationId = payload.correlationId;
    const faceValue = payload.faceValue || 1000000;
    const interestRate = payload.interestRate || 300; // basis points
    const termDays = payload.termDays || 5;
    // Discounted value = faceValue * (1 - rate/10000)
    const discountedValue = payload.discountedValue || Math.floor(faceValue * (1 - interestRate / 10000));

    let accounts = await web3.eth.getAccounts();
    if (accounts.length === 0 && web3.eth.accounts.wallet.length > 0) {
      accounts = [web3.eth.accounts.wallet[0].address];
    }
    const ncdIssuer = accounts[1] || accounts[0];
    const investor = accounts[2] || accounts[0];
    const secondary = accounts[3] || accounts[0];

    // Deploy stablecoin
    const StablecoinContract = new web3.eth.Contract(StablecoinAbi);
    const stablecoinInstance = await StablecoinContract.deploy({ data: StablecoinBytecode }).send(txOpts(accounts[0], gasLimit(6_000_000)));
    await waitForFinality();
    const stablecoinAddress = stablecoinInstance.options.address;

    // Fund all parties
    await sendWithRetry(stablecoinInstance.methods.transfer(investor, faceValue), txOpts(accounts[0], gasLimit(200000)));
    await waitForFinality();
    await sendWithRetry(stablecoinInstance.methods.transfer(secondary, faceValue), txOpts(accounts[0], gasLimit(200000)));
    await waitForFinality();
    await sendWithRetry(stablecoinInstance.methods.transfer(ncdIssuer, faceValue * 2), txOpts(accounts[0], gasLimit(200000)));
    await waitForFinality();

    const now = Math.floor(Date.now() / 1000);
    const maturityDate = NET.supportsTimeTravel
      ? now + termDays * 24 * 60 * 60
      : now + NET.deployMaturitySeconds;

    const NCDContract = new web3.eth.Contract(NCDAbi);
    const ncdInstance = await NCDContract.deploy({
      data: NCDBytecode,
      arguments: [ncdIssuer, now, maturityDate, faceValue, interestRate, discountedValue, stablecoinAddress]
    }).send(txOpts(ncdIssuer, gasLimit(8_000_000)));
    await waitForFinality();
    const ncdAddress = ncdInstance.options.address;

    deals[correlationId] = {
      assetType: 'ncd',
      contractAddress: ncdAddress,
      stablecoinAddress,
      investor,
      secondary,
      ncdIssuer,
      faceValue,
      interestRate,
      discountedValue,
      maturityDate,
      status: 'created',
      payload
    };
    console.log(`NCD created ${correlationId} -> ${ncdAddress}`);

    const response = { correlationId, contractAddress: ncdAddress, stablecoinAddress, assetType: 'ncd', status: 'created' };
    if (NET.explorer) response.explorerUrl = `${NET.explorer}/contract/${ncdAddress}`;
    res.json(response);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/ncd/:correlationId/execute', async (req, res) => {
  try {
    const deal = deals[req.params.correlationId];
    if (!deal || deal.assetType !== 'ncd') return res.status(404).json({ error: 'NCD not found' });

    const ncd = new web3.eth.Contract(NCDAbi, deal.contractAddress);
    const stablecoin = new web3.eth.Contract(StablecoinAbi, deal.stablecoinAddress);
    console.log(`Executing NCD ${req.params.correlationId}`);
    const txs = [];

    // Investor approves discounted value and issues
    const approveReceipt = await sendWithRetry(stablecoin.methods.approve(deal.contractAddress, String(deal.discountedValue)), txOpts(deal.investor, gasLimit(200000)));
    await waitForFinality();
    txs.push({ type: 'investorApprove', tx: approveReceipt.transactionHash });

    const acceptReceipt = await sendWithRetry(ncd.methods.acceptAndIssue(deal.investor), txOpts(deal.investor, gasLimit(500000)));
    await waitForFinality();
    txs.push({ type: 'acceptAndIssue', tx: acceptReceipt.transactionHash });

    deal.status = 'executed';
    recordTxs(req.params.correlationId, 'execute', txs);
    res.json({ correlationId: req.params.correlationId, assetType: 'ncd', status: 'executed', txs });
  } catch (err) {
    console.error('NCD Execute error', err);
    res.status(500).json({ error: err.message });
  }
});

app.post('/ncd/:correlationId/transfer', async (req, res) => {
  try {
    const deal = deals[req.params.correlationId];
    if (!deal || deal.assetType !== 'ncd') return res.status(404).json({ error: 'NCD not found' });

    const price = req.body.price || Math.floor(deal.faceValue * 0.95);
    const newOwner = req.body.newOwner || deal.secondary;

    const ncd = new web3.eth.Contract(NCDAbi, deal.contractAddress);
    const stablecoin = new web3.eth.Contract(StablecoinAbi, deal.stablecoinAddress);
    console.log(`Transferring NCD ${req.params.correlationId} to ${newOwner} for ${price}`);
    const txs = [];

    const approveReceipt = await sendWithRetry(stablecoin.methods.approve(deal.contractAddress, String(price)), txOpts(newOwner, gasLimit(200000)));
    await waitForFinality();
    txs.push({ type: 'buyerApprove', tx: approveReceipt.transactionHash });

    const currentOwner = await ncd.methods.currentOwner().call();
    const transferReceipt = await sendWithRetry(ncd.methods.transferNCD(newOwner, String(price)), txOpts(currentOwner, gasLimit(500000)));
    await waitForFinality();
    txs.push({ type: 'transferNCD', tx: transferReceipt.transactionHash });

    deal.status = 'transferred';
    recordTxs(req.params.correlationId, 'transfer', txs);
    res.json({ correlationId: req.params.correlationId, assetType: 'ncd', status: 'transferred', newOwner, price, txs });
  } catch (err) {
    console.error('NCD Transfer error', err);
    res.status(500).json({ error: err.message });
  }
});

app.post('/ncd/:correlationId/redeem', async (req, res) => {
  try {
    const deal = deals[req.params.correlationId];
    if (!deal || deal.assetType !== 'ncd') return res.status(404).json({ error: 'NCD not found' });

    const ncd = new web3.eth.Contract(NCDAbi, deal.contractAddress);
    const stablecoin = new web3.eth.Contract(StablecoinAbi, deal.stablecoinAddress);
    console.log(`Redeeming NCD ${req.params.correlationId}`);
    const txs = [];

    // Time-travel or wait for maturity
    if (NET.supportsTimeTravel) {
      const maturityDate = Number(await ncd.methods.maturityDate().call());
      const currentBlock = await web3.eth.getBlock('latest');
      const currentTime = Number(currentBlock.timestamp);
      if (currentTime < maturityDate) {
        const timeToAdvance = maturityDate - currentTime + 60;
        await fetch(NET.rpcUrl, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ jsonrpc: '2.0', method: 'evm_increaseTime', params: [timeToAdvance], id: Date.now() }) });
        await fetch(NET.rpcUrl, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ jsonrpc: '2.0', method: 'evm_mine', params: [], id: Date.now() + 1 }) });
        txs.push({ type: 'timeTravel', seconds: timeToAdvance });
      }
    } else {
      const maturityDate = Number(await ncd.methods.maturityDate().call());
      const now = Math.floor(Date.now() / 1000);
      if (now < maturityDate) {
        const waitSec = maturityDate - now + 5;
        console.log(`Waiting ${waitSec}s for NCD maturity (real-time on ${NET.name})...`);
        txs.push({ type: 'waitForMaturity', seconds: waitSec });
        await new Promise((r) => setTimeout(r, waitSec * 1000));
      }
    }

    // Issuer approves face value payout
    const issuerApprove = await sendWithRetry(stablecoin.methods.approve(deal.contractAddress, String(deal.faceValue)), txOpts(deal.ncdIssuer, gasLimit(200000)));
    await waitForFinality();
    txs.push({ type: 'issuerApproveRedemption', tx: issuerApprove.transactionHash });

    const redeemReceipt = await sendWithRetry(ncd.methods.redeemMaturity(), txOpts(deal.ncdIssuer, gasLimit(500000)));
    await waitForFinality();
    txs.push({ type: 'redeemMaturity', tx: redeemReceipt.transactionHash });

    deal.status = 'redeemed';
    recordTxs(req.params.correlationId, 'redeem', txs);
    res.json({ correlationId: req.params.correlationId, assetType: 'ncd', status: 'redeemed', txs });
  } catch (err) {
    console.error('NCD Redeem error', err);
    res.status(500).json({ error: err.message });
  }
});

app.get('/ncd/:correlationId', async (req, res) => {
  try {
    const deal = deals[req.params.correlationId];
    if (!deal || deal.assetType !== 'ncd') return res.status(404).json({ error: 'NCD not found' });
    const ncd = new web3.eth.Contract(NCDAbi, deal.contractAddress);
    const issuedRaw = await ncd.methods.issued().call();
    const expiredRaw = await ncd.methods.expired().call();
    const currentOwner = await ncd.methods.currentOwner().call();
    const issued = (issuedRaw === true || issuedRaw === 'true');
    const expired = (expiredRaw === true || expiredRaw === 'true');
    res.json({ ...deal, currentOwner, contractState: { issued, expired } });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/ncd/:correlationId/balances', async (req, res) => {
  try {
    const deal = deals[req.params.correlationId];
    if (!deal || deal.assetType !== 'ncd') return res.status(404).json({ error: 'NCD not found' });
    const stablecoin = new web3.eth.Contract(StablecoinAbi, deal.stablecoinAddress);
    const ncd = new web3.eth.Contract(NCDAbi, deal.contractAddress);
    const currentOwner = await ncd.methods.currentOwner().call();
    const issuerBal = await stablecoin.methods.balanceOf(deal.ncdIssuer).call();
    const investorBal = await stablecoin.methods.balanceOf(deal.investor).call();
    const secondaryBal = await stablecoin.methods.balanceOf(deal.secondary).call();
    const contractBal = await stablecoin.methods.balanceOf(deal.contractAddress).call();
    res.json({
      correlationId: req.params.correlationId,
      assetType: 'ncd',
      currentOwner,
      balances: {
        issuer: { address: deal.ncdIssuer, stablecoin: issuerBal.toString() },
        investor: { address: deal.investor, stablecoin: investorBal.toString() },
        secondary: { address: deal.secondary, stablecoin: secondaryBal.toString() },
        contract: { address: deal.contractAddress, stablecoin: contractBal.toString() },
      },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 10) Wallet overview — native balance, stablecoins, issued assets
app.get('/wallet', async (req, res) => {
  try {
    let accounts = await web3.eth.getAccounts();
    if (accounts.length === 0 && web3.eth.accounts.wallet.length > 0) {
      accounts = [web3.eth.accounts.wallet[0].address];
    }
    if (accounts.length === 0) {
      return res.status(503).json({ error: 'No wallet available' });
    }

    const address = accounts[0];
    const isHedera = NET.name === 'hedera-testnet';

    // Native balance (ETH on local, HBAR on Hedera)
    const nativeWei = await web3.eth.getBalance(address);
    const nativeBalance = web3.utils.fromWei(nativeWei, 'ether');
    const nativeSymbol = isHedera ? 'HBAR' : 'ETH';

    // Stablecoin balances across all deployed deals
    const stablecoins = new Map(); // address → { symbol, name, balance }
    const assets = []; // issued annuity contracts

    for (const [correlationId, deal] of Object.entries(deals)) {
      // Collect stablecoin balance (deduplicate by address)
      if (deal.stablecoinAddress && !stablecoins.has(deal.stablecoinAddress)) {
        try {
          const sc = new web3.eth.Contract(StablecoinAbi, deal.stablecoinAddress);
          const bal = await sc.methods.balanceOf(address).call();
          const symbol = await sc.methods.symbol().call().catch(() => 'iUSD');
          const name = await sc.methods.name().call().catch(() => 'ImperiumStableCoin');
          stablecoins.set(deal.stablecoinAddress, {
            address: deal.stablecoinAddress,
            symbol,
            name,
            balance: bal.toString(),
          });
        } catch { /* skip inaccessible contracts */ }
      }

      // Collect annuity asset info
      if (deal.annuityAddress) {
        try {
          const ann = new web3.eth.Contract(AnnuityAbi, deal.annuityAddress);
          const currentOwner = await ann.methods.currentOwner().call();
          const isIssued = await ann.methods.issued().call();
          const isExpired = await ann.methods.expired().call();

          assets.push({
            correlationId,
            address: deal.annuityAddress,
            faceValue: deal.faceValue?.toString(),
            interestRate: deal.interestRate,
            status: deal.status,
            currentOwner,
            issued: isIssued === true || isIssued === 'true',
            expired: isExpired === true || isExpired === 'true',
            coupons: deal.couponValues?.length || 0,
            explorerUrl: NET.explorer ? `${NET.explorer}/contract/${deal.annuityAddress}` : undefined,
          });
        } catch { /* skip inaccessible contracts */ }
      }
    }

    const walletData = {
      address,
      network: NET.name,
      chainId: NET.chainId,
      explorer: NET.explorer || null,
      native: {
        symbol: nativeSymbol,
        balance: nativeBalance,
      },
      stablecoins: Array.from(stablecoins.values()),
      assets,
    };

    if (NET.explorer) {
      walletData.explorerUrl = `${NET.explorer}/account/${address}`;
    }

    res.json(walletData);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
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

// ── Health & Root (API info) ─────────────────────────────────────────
app.get('/health', async (req, res) => {
  try {
    const rpcListening = await web3.eth.net.isListening();
    res.json({ ok: true, rpcListening, network: NET.name });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message, network: NET.name });
  }
});

app.get('/', (req, res, next) => {
  // If client wants JSON (curl, fetch, tests), return endpoint list.
  // Otherwise fall through to static middleware (browser gets index.html).
  if (req.accepts('html') && !req.accepts('json')) return next();
  if (req.headers['user-agent'] && /mozilla/i.test(req.headers['user-agent']) && !req.query.json) return next();
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
      { method: 'GET', path: '/wallet' },
      { method: 'GET', path: '/health' }
    ]
  });
});

// ── Static files + SPA fallback (must be AFTER all API routes) ──────
const webDistPath = path.join(__dirname, '../web/dist');
if (fs.existsSync(webDistPath)) {
  app.use(express.static(webDistPath));
  app.get('*', (req, res) => {
    res.sendFile(path.join(webDistPath, 'index.html'));
  });
}

module.exports = app;
