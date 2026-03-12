
const express = require('express');
const bodyParser = require('body-parser');
const Web3 = require('web3').default;
const fs = require('fs');
const path = require('path');

const app = express();
const port = process.env.PORT || 4000;
app.use(bodyParser.json());

// Connect to local node (Hardhat Network)
const web3 = new Web3('http://127.0.0.1:8545');
// Load contract artifacts (Hardhat format)
const annuityArtifact = JSON.parse(fs.readFileSync(path.join(__dirname, '../artifacts/contracts/AnnuityToken.sol/AnnuityToken.json')));
const stablecoinArtifact = JSON.parse(fs.readFileSync(path.join(__dirname, '../artifacts/contracts/MockStablecoin.sol/MockStablecoin.json')));

// Prepare web3 Contract constructors (use ABI + bytecode)
const AnnuityAbi = annuityArtifact.abi;
const AnnuityBytecode = annuityArtifact.bytecode;
const StablecoinAbi = stablecoinArtifact.abi;
const StablecoinBytecode = stablecoinArtifact.bytecode;

// In-memory deal store
const deals = {};
// In-memory transaction history
const txHistory = [];

function recordTxs(correlationId, action, txs) {
  if (!txs) return;
  const ts = new Date().toISOString();
  txs.forEach((tx) => {
    txHistory.push({
      time: ts,
      correlationId,
      action,
      type: tx.type,
      tx: tx.tx || null,
      index: tx.index !== undefined ? tx.index : null,
      seconds: tx.seconds || null,
    });
  });
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

    const accounts = await web3.eth.getAccounts();
    const annuityIssuer = accounts[1];
    const investor = accounts[2];
    const secondary = accounts[3];

    // Deploy stablecoin using web3
    const StablecoinContract = new web3.eth.Contract(StablecoinAbi);
    const stablecoinInstance = await StablecoinContract.deploy({ data: StablecoinBytecode }).send({ from: accounts[0], gas: 6_000_000 });
    const stablecoinAddress = stablecoinInstance.options.address;

    // Transfer funds from deployer to investor & secondary (mock balance)
    await stablecoinInstance.methods.transfer(investor, faceValue).send({ from: accounts[0] });
    await stablecoinInstance.methods.transfer(secondary, faceValue).send({ from: accounts[0] });

    const now = Math.floor(Date.now() / 1000);
    const maturityDate = now + termDays * 24 * 60 * 60;
    const couponDates = [];
    const couponValues = [];
    for (let i = 1; i <= termDays; i++) {
      couponDates.push(now + i * 24 * 60 * 60);
      couponValues.push(couponValue);
    }

    // Deploy annuity
    const AnnuityContract = new web3.eth.Contract(AnnuityAbi);
    const annuityInstance = await AnnuityContract.deploy({
      data: AnnuityBytecode,
      arguments: [annuityIssuer, now, maturityDate, faceValue, interestRate, couponDates, couponValues, stablecoinAddress]
    }).send({ from: annuityIssuer, gas: 8_000_000 });
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
    res.json({ correlationId, annuityAddress, stablecoinAddress, status: 'created' });
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
    const approveReceipt = await stablecoin.methods.approve(deal.annuityAddress, faceValueStr).send({ from: deal.investor, gas: 200000 });
    txs.push({ type: 'investorApprove', tx: approveReceipt.transactionHash });

    const acceptReceipt = await annuity.methods.acceptAndIssue(deal.investor).send({ from: deal.investor, gas: 500000 });
    txs.push({ type: 'acceptAndIssue', tx: acceptReceipt.transactionHash });

    // Issuer approves coupons (approve annuity contract to spend coupons)
    const totalCoupons = deal.couponValues.reduce((a, b) => a + Number(b), 0);
    const totalCouponsStr = String(totalCoupons);
    const issuerApprove = await stablecoin.methods.approve(deal.annuityAddress, totalCouponsStr).send({ from: deal.annuityIssuer, gas: 200000 });
    txs.push({ type: 'issuerApproveCoupons', tx: issuerApprove.transactionHash });

    // Pay all coupons
    for (let i = 0; i < deal.couponValues.length; i++) {
      const payReceipt = await annuity.methods.payCoupon(i).send({ from: deal.annuityIssuer, gas: 200000 });
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
    const approveReceipt = await stablecoin.methods.approve(deal.annuityAddress, String(price)).send({ from: newOwner, gas: 200000 });
    txs.push({ type: 'buyerApprove', tx: approveReceipt.transactionHash });

    // Current owner initiates transfer
    const currentOwner = await annuity.methods.currentOwner().call();
    const transferReceipt = await annuity.methods.transferAnnuity(newOwner, String(price)).send({ from: currentOwner, gas: 500000 });
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
      const accounts = await web3.eth.getAccounts();
      // Fund the issuer first if needed, then issuer sends to the annuity contract
      const issuerBal = await stablecoin.methods.balanceOf(deal.annuityIssuer).call();
      if (BigInt(issuerBal) < deficit) {
        await stablecoin.methods.transfer(deal.annuityIssuer, String(deficit)).send({ from: accounts[0], gas: 200000 });
      }
      await stablecoin.methods.transfer(deal.annuityAddress, String(deficit)).send({ from: deal.annuityIssuer, gas: 200000 });
    }

    // Advance block timestamp past maturity for local testing (Ganache evm_increaseTime)
    const maturityDate = Number(await annuity.methods.maturityDate().call());
    const currentBlock = await web3.eth.getBlock('latest');
    const currentTime = Number(currentBlock.timestamp);
    if (currentTime < maturityDate) {
      const timeToAdvance = maturityDate - currentTime + 60; // +60s buffer
      await web3.currentProvider.request({ method: 'evm_increaseTime', params: [timeToAdvance] });
      await web3.currentProvider.request({ method: 'evm_mine', params: [] });
      txs.push({ type: 'timeTravel', seconds: timeToAdvance });
    }

    const redeemReceipt = await annuity.methods.redeemMaturity().send({ from: deal.annuityIssuer, gas: 500000 });
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

app.listen(port, () => {
  console.log(`Mock API listening at http://localhost:${port}`);
});

module.exports = app;

// Add simple health and root endpoints for quick checks
app.get('/health', async (req, res) => {
  try {
    const rpcListening = await web3.eth.net.isListening();
    res.json({ ok: true, rpcListening });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

app.get('/', (req, res) => {
  res.json({
    service: 'Mock API',
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
