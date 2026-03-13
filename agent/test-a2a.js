#!/usr/bin/env node
/**
 * agent/test-a2a.js — Agent-to-Agent Communication Test
 *
 * Creates a lightweight "Test Requester" agent (HCS-10 compliant with
 * HCS-11 profile), connects it to the Imperium Annuity Agent, invokes
 * a skill, and reads the response — all on Hedera Testnet.
 *
 * The test requester agent is created once and cached in
 * deployments/test-requester.json for reuse.
 *
 * Prerequisites:
 *   1. ImperiumAPI running on port 4000   (node api/imperium-api.js --network hedera-testnet)
 *   2. Agent listener running             (node agent/hol-registry.js listen)
 *
 * Usage:
 *   node agent/test-a2a.js
 *   node agent/test-a2a.js --skill annuity.analytics --params '{"correlationId":"deal-123"}'
 */

'use strict';

require('dotenv').config();

const fs   = require('fs');
const path = require('path');
const {
  HCS10Client,
  AgentBuilder,
  AIAgentCapability,
} = require('@hashgraphonline/standards-sdk');
const { loadState } = require('./hol-registry');

// ── Config ──────────────────────────────────────────────────────────

const OPERATOR_ID  = process.env.HEDERA_TESTNET_ACCOUNT_ID;
const OPERATOR_KEY = process.env.HEDERA_TESTNET_PRIVATE_KEY;
const NETWORK      = 'testnet';
const REQUESTER_STATE_FILE = path.join(__dirname, '..', 'deployments', 'test-requester.json');

// Parse CLI args
const args = process.argv.slice(2);
function getArg(name, defaultVal) {
  const idx = args.indexOf(`--${name}`);
  return idx !== -1 && args[idx + 1] ? args[idx + 1] : defaultVal;
}

const SKILL  = getArg('skill', 'annuity.issue');
const PARAMS = JSON.parse(getArg('params', '{}'));
const RESPONSE_TIMEOUT = 120000;  // 2 min max wait for response
const POLL_INTERVAL    = 3000;    // 3s between polls

// ── Helpers ─────────────────────────────────────────────────────────

function loadRequesterState() {
  if (fs.existsSync(REQUESTER_STATE_FILE)) {
    return JSON.parse(fs.readFileSync(REQUESTER_STATE_FILE, 'utf-8'));
  }
  return null;
}

function saveRequesterState(state) {
  const dir = path.dirname(REQUESTER_STATE_FILE);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(REQUESTER_STATE_FILE, JSON.stringify(state, null, 2));
}

function createOperatorClient() {
  const keyStr = OPERATOR_KEY.startsWith('0x') ? OPERATOR_KEY.slice(2) : OPERATOR_KEY;
  return new HCS10Client({
    network: NETWORK,
    operatorId: OPERATOR_ID,
    operatorPrivateKey: keyStr,
    keyType: 'ecdsa',
    logLevel: 'warn',
  });
}

function createRequesterClient(accountId, privateKey) {
  const keyStr = privateKey.startsWith('0x') ? privateKey.slice(2) : privateKey;
  // Detect key type: DER-encoded ED25519 starts with 302e, ECDSA hex is typically 64 chars
  const keyType = keyStr.startsWith('302e') ? 'ed25519' : 'ecdsa';
  return new HCS10Client({
    network: NETWORK,
    operatorId: accountId,
    operatorPrivateKey: keyStr,
    keyType,
    logLevel: 'warn',
  });
}

// ── Create test requester agent (one-time) ──────────────────────────

async function ensureRequesterAgent() {
  const existing = loadRequesterState();
  if (existing && existing.accountId) {
    console.log(`  Using cached test requester: ${existing.accountId}`);
    return existing;
  }

  console.log('  Creating test requester agent (one-time setup)...');

  const client  = createOperatorClient();
  const builder = new AgentBuilder();
  builder
    .setName('Test Requester Agent')
    .setAlias('test-requester')
    .setBio('Lightweight test agent for verifying agent-to-agent communication.')
    .setType('autonomous')
    .setModel('test-v1')
    .setCreator('Imperium Markets (test)')
    .setCapabilities([AIAgentCapability.MULTI_AGENT_COORDINATION])
    .setNetwork(NETWORK);

  const result = await client.createAndRegisterAgent(builder, {
    initialBalance: 20,
    progressCallback: (data) => {
      const pct = data.progressPercent ? `${data.progressPercent}%` : '';
      console.log(`    [${data.stage}] ${data.message} ${pct}`);
    },
  });

  if (!result.success) {
    throw new Error(`Failed to create test requester: ${result.error}`);
  }

  const state = {
    accountId:      result.metadata?.accountId,
    privateKey:     result.metadata?.privateKey,
    inboundTopicId: result.metadata?.inboundTopicId  || result.state?.inboundTopicId,
    outboundTopicId: result.metadata?.outboundTopicId || result.state?.outboundTopicId,
    profileTopicId: result.metadata?.profileTopicId  || result.state?.profileTopicId,
    createdAt:      new Date().toISOString(),
  };

  saveRequesterState(state);
  console.log(`  ✅ Test requester created: ${state.accountId}`);
  return state;
}

// ── Main ────────────────────────────────────────────────────────────

async function main() {
  if (!OPERATOR_ID || !OPERATOR_KEY) {
    console.error('❌ Missing HEDERA_TESTNET_ACCOUNT_ID or HEDERA_TESTNET_PRIVATE_KEY in .env');
    process.exit(1);
  }

  const agentState = loadState();
  if (!agentState || !agentState.inboundTopicId) {
    console.error('❌ Agent state not found. Register the agent first: node agent/hol-registry.js create');
    process.exit(1);
  }

  console.log();
  console.log('  ╔═══════════════════════════════════════════════════════╗');
  console.log('  ║  🧪  Agent-to-Agent Communication Test               ║');
  console.log('  ╚═══════════════════════════════════════════════════════╝');
  console.log();

  // 0. Ensure we have a test requester agent with HCS-11 profile
  const requester = await ensureRequesterAgent();
  const client = createRequesterClient(requester.accountId, requester.privateKey);

  console.log();
  console.log(`  Requester:  ${requester.accountId}`);
  console.log(`  Target:     ${agentState.agentAccountId}`);
  console.log(`  Inbound:    ${agentState.inboundTopicId}`);
  console.log(`  Skill:      ${SKILL}`);
  console.log(`  Params:     ${JSON.stringify(PARAMS)}`);
  console.log();

  // 1. Submit connection request to the Imperium agent's inbound topic
  console.log('  [1/5] Submitting connection request...');
  const receipt = await client.submitConnectionRequest(
    agentState.inboundTopicId,
    `Test connection from ${requester.accountId}`
  );

  const requestId = receipt.topicSequenceNumber
    ? (typeof receipt.topicSequenceNumber.toNumber === 'function'
        ? receipt.topicSequenceNumber.toNumber()
        : Number(receipt.topicSequenceNumber))
    : receipt.topicSequenceNumber;

  console.log(`         Request sent (sequence: ${requestId})`);

  // 2. Wait for connection confirmation
  console.log('  [2/5] Waiting for connection acceptance...');
  const confirmation = await client.waitForConnectionConfirmation(
    agentState.inboundTopicId,
    requestId,
    60,    // maxAttempts
    3000,  // delayMs
    true   // record on outbound
  );

  const connectionTopicId = confirmation.connectionTopicId;
  console.log(`         ✅ Connected! Topic: ${connectionTopicId}`);

  // 3. Send skill invocation on the connection topic
  console.log(`  [3/5] Invoking skill: ${SKILL}...`);

  const skillParams = Object.keys(PARAMS).length > 0 ? PARAMS : getDefaultParams(SKILL);

  const invocation = JSON.stringify({
    skill: SKILL,
    requestId: `test-${Date.now()}`,
    params: skillParams,
  });

  await client.sendMessage(connectionTopicId, invocation, `skill:${SKILL}:request`);
  console.log('         Message sent on connection topic');

  // 4. Poll for the response
  console.log('  [4/5] Waiting for skill response...');

  const startTime = Date.now();
  let response = null;

  while (Date.now() - startTime < RESPONSE_TIMEOUT) {
    await new Promise(r => setTimeout(r, POLL_INTERVAL));

    const { messages } = await client.getMessages(connectionTopicId);
    if (!messages) continue;

    for (const msg of messages) {
      if (msg.op !== 'message') continue;

      // Look for messages NOT from the requester (i.e., from the Imperium agent)
      const senderId = msg.operator_id || msg.payer || '';
      if (senderId.includes(requester.accountId)) continue;

      let payload;
      try {
        const content = typeof msg.data === 'string' ? msg.data : JSON.stringify(msg.data);
        payload = JSON.parse(content);
      } catch {
        continue;
      }

      if (payload.skill === SKILL && payload.status) {
        response = payload;
        break;
      }
    }

    if (response) break;
    process.stdout.write('.');
  }

  console.log();

  if (!response) {
    console.error('  ❌ Timeout — no response received within 2 minutes.');
    console.error('     Is the agent listener running? (node agent/hol-registry.js listen)');
    process.exit(1);
  }

  // 5. Print results
  console.log('  [5/5] Response received!');
  console.log();
  console.log('  ┌─── Skill Response ────────────────────────────────────');
  console.log(`  │  Skill:   ${response.skill}`);
  console.log(`  │  Status:  ${response.status}`);

  if (response.status === 'success') {
    const r = response.result;
    if (r.correlationId) console.log(`  │  Deal:    ${r.correlationId}`);
    if (r.annuityAddress) console.log(`  │  Annuity: ${r.annuityAddress}`);
    if (r.status) console.log(`  │  State:   ${r.status}`);
    if (r.txs) console.log(`  │  Txs:     ${r.txs.length} transaction(s)`);
    if (r.currentOwner) console.log(`  │  Owner:   ${r.currentOwner}`);
    if (r.balances) console.log(`  │  Balances: issuer=${r.balances.issuer?.stablecoin}, investor=${r.balances.investor?.stablecoin}`);
  } else {
    console.log(`  │  Error:   ${response.result?.error || 'Unknown'}`);
  }

  console.log('  └───────────────────────────────────────────────────────');
  console.log();

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(`  ✅ Agent-to-agent test completed in ${elapsed}s`);
  console.log();
}

// Default params for each skill when none provided
function getDefaultParams(skill) {
  switch (skill) {
    case 'annuity.issue':
      return {
        correlationId: `a2a-${Date.now()}`,
        participants: {
          buyer: { wallet: '0x0000000000000000000000000000000000000001' },
          seller: {
            wallet: {
              bidAmount: 1000000,
              tokenMetaData: { term: '3', interestRate: '500' },
            },
          },
        },
      };
    default:
      return {};
  }
}

// ── Run ─────────────────────────────────────────────────────────────

main().catch((err) => {
  console.error('❌ Error:', err.message || err);
  process.exit(1);
});
