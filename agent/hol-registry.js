/**
 * agent/hol-registry.js — HOL Registry Broker integration (HCS-10)
 *
 * Registers the Imperium Annuity agent on the Hashgraph Online Registry
 * using the HCS-10 OpenConvAI standard. Creates agent identity, publishes
 * skills, and handles agent-to-agent connections on Hedera Testnet.
 *
 * Usage:
 *   node agent/hol-registry.js create          # Create + register agent
 *   node agent/hol-registry.js status          # Show agent state
 *   node agent/hol-registry.js connect <topic> # Connect to another agent
 *   node agent/hol-registry.js listen          # Listen for connections + skill requests
 *
 * Requires .env:
 *   HEDERA_TESTNET_ACCOUNT_ID=0.0.xxxxx
 *   HEDERA_TESTNET_PRIVATE_KEY=0x...
 */

'use strict';

require('dotenv').config();

const fs   = require('fs');
const path = require('path');
const fetch = require('node-fetch');
const {
  HCS10Client,
  AgentBuilder,
  AIAgentCapability,
  ConnectionsManager,
  RegistryBrokerClient,
} = require('@hashgraphonline/standards-sdk');

// ── Config ──────────────────────────────────────────────────────────
const OPERATOR_ID  = process.env.HEDERA_TESTNET_ACCOUNT_ID;
const OPERATOR_KEY = process.env.HEDERA_TESTNET_PRIVATE_KEY;
const REGISTRY_URL = process.env.REGISTRY_URL || 'https://moonscape.tech';
const NETWORK      = 'testnet';
const STATE_FILE   = path.join(__dirname, '..', 'deployments', 'hol-agent.json');

// ── State persistence ───────────────────────────────────────────────

function loadState() {
  if (fs.existsSync(STATE_FILE)) {
    return JSON.parse(fs.readFileSync(STATE_FILE, 'utf-8'));
  }
  return null;
}

function saveState(state) {
  const dir = path.dirname(STATE_FILE);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));
  console.log(`\n✅ Agent state saved to ${STATE_FILE}`);
}

// ── HCS-10 Client ───────────────────────────────────────────────────

function createClient(operatorId, operatorKey) {
  const keyStr = operatorKey.startsWith('0x') ? operatorKey.slice(2) : operatorKey;
  // Detect key type: DER-encoded ED25519 starts with 302e, ECDSA hex is typically 64 chars
  const keyType = keyStr.startsWith('302e') ? 'ed25519' : 'ecdsa';
  return new HCS10Client({
    network: NETWORK,
    operatorId: operatorId,
    operatorPrivateKey: keyStr,
    keyType,
    guardedRegistryBaseUrl: REGISTRY_URL,
    logLevel: 'info',
    prettyPrint: true,
  });
}

// ── Agent Builder ───────────────────────────────────────────────────

function buildAgent() {
  const builder = new AgentBuilder();
  builder
    .setName('Imperium Annuity Agent')
    .setAlias('imperium-annuity')
    .setBio(
      'Australian Capital Markets annuity lifecycle agent by Imperium Markets. ' +
      'Issues, settles, transfers, and redeems structured annuity products on Hedera. ' +
      'Supports ASIC compliance checks, AUD formatting, ACT/365 day-count, and T+2 settlement.'
    )
    .setType('autonomous')
    .setModel('cli-agent-v0.3')
    .setCreator('Imperium Markets')
    .setCapabilities([
      AIAgentCapability.DATA_INTEGRATION,        // On-chain data reads
      AIAgentCapability.TRANSACTION_ANALYTICS,    // Yield, duration, analytics
      AIAgentCapability.COMPLIANCE_ANALYSIS,      // ASIC / AML compliance
      AIAgentCapability.WORKFLOW_AUTOMATION,       // Full annuity lifecycle
      AIAgentCapability.API_INTEGRATION,           // REST API orchestration
      AIAgentCapability.KNOWLEDGE_RETRIEVAL,       // AusCM domain knowledge
      AIAgentCapability.MULTI_AGENT_COORDINATION,  // Agent-to-agent via HCS-10
    ])
    .setNetwork(NETWORK)
    .addProperty('domain', 'Australian Capital Markets')
    .addProperty('product', 'Structured Annuities')
    .addProperty('skills', [
      'annuity.issue',
      'annuity.settle',
      'annuity.transfer',
      'annuity.redeem',
      'annuity.compliance',
      'annuity.analytics',
      'annuity.audit',
    ])
    .addProperty('version', '0.3.0')
    .addProperty('currency', 'AUD')
    .addProperty('dayCount', 'ACT/365')
    .addProperty('settlement', 'T+2');

  return builder;
}

// ── Commands ────────────────────────────────────────────────────────

async function cmdCreate() {
  if (!OPERATOR_ID || !OPERATOR_KEY) {
    console.error('❌ Missing HEDERA_TESTNET_ACCOUNT_ID or HEDERA_TESTNET_PRIVATE_KEY in .env');
    process.exit(1);
  }

  // Check for existing state (resumable)
  const existing = loadState();
  if (existing && existing.currentStage === 'complete' && existing.agentAccountId) {
    console.log('⚠️  Agent already registered. Current state:');
    printState(existing);
    console.log('\nTo re-register, delete', STATE_FILE, 'and run again.');
    return existing;
  }

  // Partial state from a previous interrupted run — resume from checkpoint
  const resumeState = (existing && existing.currentStage && existing.currentStage !== 'complete')
    ? existing
    : undefined;

  if (resumeState) {
    console.log(`🔄 Resuming from checkpoint (stage: ${resumeState.currentStage}, ${resumeState.completedPercentage}%)...\n`);
  } else {
    console.log('🚀 Creating Imperium Annuity Agent on Hedera Testnet...\n');
  }
  console.log(`   Operator:  ${OPERATOR_ID}`);
  console.log(`   Network:   ${NETWORK}`);
  console.log(`   Registry:  ${REGISTRY_URL}\n`);

  const client  = createClient(OPERATOR_ID, OPERATOR_KEY);
  const builder = buildAgent();

  const result = await client.createAndRegisterAgent(builder, {
    initialBalance: 50,
    existingState: resumeState || undefined,
    progressCallback: (data) => {
      const pct = data.progressPercent ? `${data.progressPercent}%` : '';
      console.log(`   [${data.stage}] ${data.message} ${pct}`);
    },
  });

  if (!result.success) {
    console.error(`\n❌ Registration failed: ${result.error}`);
    // Save partial state for resumability
    if (result.state) saveState(result.state);
    process.exit(1);
  }

  const state = {
    agentAccountId:   result.metadata?.accountId   || null,
    agentPrivateKey:  result.metadata?.privateKey   || null,
    operatorId:       result.metadata?.operatorId   || OPERATOR_ID,
    inboundTopicId:   result.metadata?.inboundTopicId  || result.state?.inboundTopicId,
    outboundTopicId:  result.metadata?.outboundTopicId || result.state?.outboundTopicId,
    profileTopicId:   result.metadata?.profileTopicId  || result.state?.profileTopicId,
    pfpTopicId:       result.metadata?.pfpTopicId      || result.state?.pfpTopicId || null,
    network:          NETWORK,
    registryUrl:      REGISTRY_URL,
    registeredAt:     new Date().toISOString(),
    capabilities: [
      'DATA_INTEGRATION',
      'TRANSACTION_ANALYTICS',
      'COMPLIANCE_ANALYSIS',
      'WORKFLOW_AUTOMATION',
      'API_INTEGRATION',
      'KNOWLEDGE_RETRIEVAL',
      'MULTI_AGENT_COORDINATION',
    ],
    skills: [
      'annuity.issue',
      'annuity.settle',
      'annuity.transfer',
      'annuity.redeem',
      'annuity.compliance',
      'annuity.analytics',
      'annuity.audit',
    ],
  };

  saveState(state);
  console.log('\n🎉 Agent registered successfully!\n');
  printState(state);
  return state;
}

async function cmdStatus() {
  const state = loadState();
  if (!state) {
    console.log('No agent state found. Run: node agent/hol-registry.js create');
    return;
  }
  printState(state);
}

async function cmdConnect(targetInboundTopic) {
  if (!targetInboundTopic) {
    console.error('Usage: node agent/hol-registry.js connect <inbound-topic-id>');
    process.exit(1);
  }

  const state = loadState();
  if (!state || !state.agentAccountId) {
    console.error('❌ Agent not registered yet. Run: node agent/hol-registry.js create');
    process.exit(1);
  }

  // Use the agent's own credentials for connections
  const agentKey = state.agentPrivateKey || OPERATOR_KEY;
  const agentId  = state.agentAccountId || OPERATOR_ID;
  const client   = createClient(agentId, agentKey);

  console.log(`🔗 Connecting to agent at inbound topic ${targetInboundTopic}...\n`);

  const receipt = await client.submitConnectionRequest(
    targetInboundTopic,
    'Connection request from Imperium Annuity Agent'
  );

  const requestId = receipt.topicSequenceNumber
    ? receipt.topicSequenceNumber.toNumber()
    : receipt.topicSequenceNumber;

  console.log(`   Connection request sent (sequence: ${requestId})`);
  console.log('   Waiting for confirmation...\n');

  const confirmation = await client.waitForConnectionConfirmation(
    targetInboundTopic,
    requestId,
    60,    // maxAttempts
    2000,  // delayMs
    true   // record on outbound
  );

  console.log('✅ Connection established!');
  console.log(`   Connection Topic: ${confirmation.connectionTopicId}`);
  console.log(`   Confirmed by:     ${confirmation.confirmedBy}`);

  return confirmation;
}

// ── Skill-to-API mapping ────────────────────────────────────────────

const API_BASE = process.env.API_BASE || 'http://127.0.0.1:4000';

const SKILL_ROUTES = {
  'annuity.issue':      { method: 'POST', path: '/deal',                       needsId: false },
  'annuity.settle':     { method: 'POST', path: '/deal/:id/execute',           needsId: true  },
  'annuity.transfer':   { method: 'POST', path: '/deal/:id/transfer',          needsId: true  },
  'annuity.redeem':     { method: 'POST', path: '/deal/:id/redeem',            needsId: true  },
  'annuity.compliance': { method: 'GET',  path: '/deal/:id',                   needsId: true  },
  'annuity.analytics':  { method: 'GET',  path: '/deal/:id/balances',          needsId: true  },
  'annuity.audit':      { method: 'GET',  path: '/deal/:id/transactions',      needsId: true  },
};

async function executeSkill(skill, params) {
  const route = SKILL_ROUTES[skill];
  if (!route) return { error: `Unknown skill: ${skill}` };

  let urlPath = route.path;
  if (route.needsId) {
    if (!params || !params.correlationId) return { error: `Skill ${skill} requires params.correlationId` };
    urlPath = urlPath.replace(':id', params.correlationId);
  }

  const url = `${API_BASE}${urlPath}`;
  const opts = { method: route.method, headers: { 'Content-Type': 'application/json' } };
  if (route.method === 'POST' && params) {
    opts.body = JSON.stringify(params);
  }

  const res = await fetch(url, opts);
  return res.json();
}

// ── Listen command ──────────────────────────────────────────────────

const POLL_INTERVAL = 5000;   // 5s between polls
const LISTEN_LOG_PREFIX = '  🔊';

async function cmdListen() {
  const state = loadState();
  if (!state || !state.agentAccountId) {
    console.error('❌ Agent not registered yet. Run: node agent/hol-registry.js create');
    process.exit(1);
  }

  const agentKey = state.agentPrivateKey || OPERATOR_KEY;
  const agentId  = state.agentAccountId;
  const client   = createClient(agentId, agentKey);

  const connMgr = new ConnectionsManager({ baseClient: client, logLevel: 'warn', silent: true });

  // Track which connection requests and messages we've already handled
  const processedRequests = new Set();
  const processedMessages = new Set();
  const activeConnections = new Map();  // connectionTopicId → { accountId }

  console.log();
  console.log('  ╔═══════════════════════════════════════════════════════╗');
  console.log('  ║  🔊  Imperium Agent — HCS-10 Listener                ║');
  console.log('  ║                                                       ║');
  console.log('  ║  Polling for connections and skill requests.          ║');
  console.log('  ║  Press Ctrl+C to stop.                               ║');
  console.log('  ╚═══════════════════════════════════════════════════════╝');
  console.log(`  Agent:    ${agentId}`);
  console.log(`  Inbound:  ${state.inboundTopicId}`);
  console.log(`  API:      ${API_BASE}`);
  console.log();

  // ── Poll loop ──────────────────────────────────────────────────

  async function pollOnce() {
    // 1. Check inbound topic for new connection requests
    try {
      const { messages } = await client.getMessages(state.inboundTopicId);
      if (messages && messages.length > 0) {
        for (const msg of messages) {
          const seqKey = `${state.inboundTopicId}:${msg.sequence_number}`;
          if (processedRequests.has(seqKey)) continue;

          if (msg.op === 'connection_request') {
            processedRequests.add(seqKey);
            const rawId = msg.operator_id || msg.payer;
            // operator_id format is "topicId@accountId" — extract the account ID
            const requesterId = rawId.includes('@') ? rawId.split('@')[1] : rawId;
            console.log(`${LISTEN_LOG_PREFIX} Connection request from ${requesterId} (seq: ${msg.sequence_number})`);

            try {
              const result = await client.handleConnectionRequest(
                state.inboundTopicId,
                requesterId,
                msg.sequence_number,
              );
              const connTopicId = result.connectionTopicId;
              activeConnections.set(connTopicId, { accountId: requesterId });
              console.log(`${LISTEN_LOG_PREFIX} ✅ Connection accepted → topic ${connTopicId}`);
            } catch (err) {
              console.error(`${LISTEN_LOG_PREFIX} ❌ Failed to accept connection: ${err.message}`);
            }
          } else if (msg.op === 'connection_created') {
            processedRequests.add(seqKey);
            if (msg.connection_topic_id && !activeConnections.has(msg.connection_topic_id)) {
              activeConnections.set(msg.connection_topic_id, { accountId: msg.operator_id || msg.payer });
              console.log(`${LISTEN_LOG_PREFIX} Connection confirmed → topic ${msg.connection_topic_id}`);
            }
          }
        }
      }
    } catch (err) {
      if (!err.message.includes('404')) {
        console.error(`${LISTEN_LOG_PREFIX} Inbound poll error: ${err.message}`);
      }
    }

    // 2. Check each active connection topic for skill invocation messages
    for (const [connTopicId] of activeConnections) {
      try {
        const { messages } = await client.getMessages(connTopicId);
        if (!messages || messages.length === 0) continue;

        for (const msg of messages) {
          const msgKey = `${connTopicId}:${msg.sequence_number}`;
          if (processedMessages.has(msgKey)) continue;
          if (msg.op !== 'message') continue;

          // Skip messages sent by this agent (our own responses)
          const senderId = msg.operator_id || msg.payer || '';
          if (senderId.includes(agentId)) continue;

          processedMessages.add(msgKey);

          // Parse the skill invocation from message data
          let payload;
          try {
            const content = typeof msg.data === 'string' ? msg.data : JSON.stringify(msg.data);
            payload = JSON.parse(content);
          } catch {
            console.log(`${LISTEN_LOG_PREFIX} Non-JSON message on ${connTopicId}, skipping`);
            continue;
          }

          if (!payload.skill) {
            console.log(`${LISTEN_LOG_PREFIX} Message without skill field on ${connTopicId}, skipping`);
            continue;
          }

          console.log(`${LISTEN_LOG_PREFIX} 📥 Skill request: ${payload.skill} from ${senderId}`);

          // Execute the skill via ImperiumAPI
          let result;
          try {
            result = await executeSkill(payload.skill, payload.params || {});
            console.log(`${LISTEN_LOG_PREFIX} ✅ Skill ${payload.skill} executed successfully`);
          } catch (err) {
            result = { error: err.message };
            console.error(`${LISTEN_LOG_PREFIX} ❌ Skill ${payload.skill} failed: ${err.message}`);
          }

          // Send result back on the connection topic
          const response = JSON.stringify({
            skill: payload.skill,
            requestId: payload.requestId || null,
            status: result.error ? 'error' : 'success',
            result,
          });

          try {
            await client.sendMessage(connTopicId, response, `skill:${payload.skill}:response`);
            console.log(`${LISTEN_LOG_PREFIX} 📤 Response sent on ${connTopicId}`);
          } catch (err) {
            console.error(`${LISTEN_LOG_PREFIX} ❌ Failed to send response: ${err.message}`);
          }
        }
      } catch (err) {
        if (!err.message.includes('404')) {
          console.error(`${LISTEN_LOG_PREFIX} Connection poll error (${connTopicId}): ${err.message}`);
        }
      }
    }
  }

  // Initial load of existing connections from outbound topic
  try {
    await connMgr.fetchConnectionData(agentId);
    const existing = connMgr.getActiveConnections();
    if (existing && existing.length > 0) {
      for (const conn of existing) {
        if (conn.connectionTopicId) {
          activeConnections.set(conn.connectionTopicId, { accountId: conn.targetAccountId });
        }
      }
      console.log(`${LISTEN_LOG_PREFIX} Loaded ${activeConnections.size} existing connection(s)`);
    }
  } catch (err) {
    console.log(`${LISTEN_LOG_PREFIX} No existing connections found (${err.message})`);
  }

  // Start polling
  console.log(`${LISTEN_LOG_PREFIX} Polling every ${POLL_INTERVAL / 1000}s...\n`);

  const poll = async () => {
    while (true) {
      await pollOnce();
      await new Promise(r => setTimeout(r, POLL_INTERVAL));
    }
  };

  // Graceful shutdown
  process.on('SIGINT', () => {
    console.log(`\n${LISTEN_LOG_PREFIX} Shutting down listener...`);
    process.exit(0);
  });

  await poll();
}

// ── Helpers ─────────────────────────────────────────────────────────

function printState(state) {
  console.log('┌─────────────────────────────────────────────────────┐');
  console.log('│         Imperium Annuity Agent — HCS-10             │');
  console.log('├─────────────────────────────────────────────────────┤');
  console.log(`│  Agent Account:   ${state.agentAccountId || 'N/A'}`);
  console.log(`│  Operator:        ${state.operatorId || 'N/A'}`);
  console.log(`│  Inbound Topic:   ${state.inboundTopicId || 'N/A'}`);
  console.log(`│  Outbound Topic:  ${state.outboundTopicId || 'N/A'}`);
  console.log(`│  Profile Topic:   ${state.profileTopicId || 'N/A'}`);
  console.log(`│  Network:         ${state.network || 'N/A'}`);
  console.log(`│  Registry:        ${state.registryUrl || 'N/A'}`);
  console.log(`│  Registered:      ${state.registeredAt || 'N/A'}`);
  console.log(`│  Skills:          ${(state.skills || []).join(', ')}`);
  console.log('└─────────────────────────────────────────────────────┘');
}

// ── Register agent with HOL REST search index ──────────────────────

async function cmdRegisterIndex() {
  const state = loadState();
  if (!state || !state.agentAccountId) {
    console.error('❌ No agent state found. Run "create" first.');
    process.exit(1);
  }

  const agentKey = state.agentPrivateKey || OPERATOR_KEY;
  const keyStr = agentKey.startsWith('0x') ? agentKey.slice(2) : agentKey;

  console.log('Registering agent with HOL Registry REST search index...\n');
  console.log(`   Agent:   ${state.agentAccountId}`);
  console.log(`   Inbound: ${state.inboundTopicId}`);
  console.log(`   Network: ${state.network || 'testnet'}\n`);

  const broker = new RegistryBrokerClient({
    network: state.network || 'testnet',
    accountId: state.agentAccountId,
  });

  // Step 1: Authenticate with ledger credentials (proves account ownership)
  console.log('   [1/3] Authenticating with HOL Registry...');
  let auth;
  try {
    auth = await broker.authenticateWithLedgerCredentials({
      accountId: state.agentAccountId,
      hederaPrivateKey: keyStr,
      network: state.network || 'testnet',
    });
  } catch (err) {
    console.error('❌ Authentication failed:', err.message || err);
    if (err.body) console.error('   Body:', JSON.stringify(err.body));
    process.exit(1);
  }

  const apiKey = auth.key || auth.apiKey;
  if (!apiKey || typeof apiKey !== 'string') {
    console.error('❌ Authentication did not return a valid API key.');
    console.error('   Auth response:', JSON.stringify(auth));
    process.exit(1);
  }
  broker.setLedgerApiKey(apiKey);
  console.log('         ✅ Authenticated');

  // Step 2: Purchase registry credits via direct API (10 credits ≈ 1.12 HBAR)
  // The SDK's purchaseCreditsWithHbar has param-wrapping issues, so we call the API directly.
  console.log('   [2/3] Purchasing registry credits (10 credits ≈ 1.12 HBAR)...');
  try {
    const { PrivateKey } = require('@hashgraph/sdk');
    const rawKey = PrivateKey.fromStringDer(keyStr).toStringRaw();
    const purchaseRes = await fetch('https://hol.org/registry/api/v1/credits/hbar', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-ledger-api-key': apiKey,
      },
      body: JSON.stringify({
        accountId: state.agentAccountId,
        payerKey: rawKey,
        hbarAmount: 2,
      }),
    });
    if (purchaseRes.ok) {
      const purchaseData = await purchaseRes.json().catch(() => ({}));
      console.log('         ✅ Credits purchased');
      if (purchaseData.credits) console.log(`         Balance: ${purchaseData.credits} credits`);
    } else {
      const text = await purchaseRes.text().catch(() => '');
      // 502/504 = backend down; other errors may be transient
      if (purchaseRes.status >= 500) {
        throw new Error(`HOL backend returned ${purchaseRes.status} — temporarily down`);
      }
      // Try to parse JSON error
      let parsed;
      try { parsed = JSON.parse(text); } catch (_) { /* ignore */ }
      if (parsed && parsed.availableCredits >= 10) {
        console.log('         ✅ Sufficient credits already available');
      } else {
        throw new Error(`${purchaseRes.status}: ${text.slice(0, 200)}`);
      }
    }
  } catch (err) {
    console.error('❌ Credit purchase failed:', err.message || err);
    console.error('\n   The HOL Registry credit backend (registry.hashgraphonline.com) may be temporarily down.');
    console.error('   Retry later: node agent/hol-registry.js register-index');
    process.exit(1);
  }

  // Step 3: Register agent in the REST search index
  console.log('   [3/3] Submitting agent to search index...');

  const profile = {
    type: 1,
    version: '1.0',
    display_name: 'Imperium Annuity Agent',
    alias: 'imperium-annuity',
    base_account: state.agentAccountId,
    bio: 'Australian Capital Markets annuity agent — issues, settles, transfers, and redeems AnnuityTokens on Hedera. HCS-10 compliant with 7 domain-specific skills.',
    properties: {
      accountId: state.agentAccountId,
      inboundTopicId: state.inboundTopicId,
      outboundTopicId: state.outboundTopicId,
      profileTopicId: state.profileTopicId,
      network: state.network || 'testnet',
      skills: state.skills || [],
    },
    aiAgent: {
      type: 1,
      creator: 'Imperium Markets',
      model: 'rule-based',
      capabilities: [8, 10, 14, 18, 17, 7, 16],
    },
  };

  try {
    const result = await broker.registerAgent({
      profile,
      protocol: 'hcs-10',
      registry: 'hashgraph-online',
      metadata: {
        openConvAICompatible: true,
        adapter: 'self-registered',
        nativeId: state.agentAccountId,
        category: 'finance',
      },
    });
    console.log('         ✅ Agent submitted to search index');
    console.log('\n🎉 Registration complete! Agent should appear in "list agents imperium" shortly.');
    if (result) console.log('   Response:', JSON.stringify(result, null, 2));
  } catch (err) {
    console.error('❌ Index registration failed:', err.message || err);
    if (err.body) console.error('   Body:', JSON.stringify(err.body));
    console.error('\n   The HOL Registry backend may be temporarily down (502/504).');
    console.error('   Retry later: node agent/hol-registry.js register-index');
  }
}

// ── Exports (for programmatic use) ──────────────────────────────────

module.exports = {
  createClient,
  buildAgent,
  loadState,
  saveState,
  cmdCreate,
  cmdStatus,
  cmdConnect,
  cmdListen,
  cmdRegisterIndex,
  executeSkill,
  SKILL_ROUTES,
};

// ── CLI entry point ─────────────────────────────────────────────────

if (require.main === module) {
  const cmd = process.argv[2];
  const arg = process.argv[3];

  const commands = {
    create:           () => cmdCreate(),
    status:           () => cmdStatus(),
    connect:          () => cmdConnect(arg),
    listen:           () => cmdListen(),
    'register-index': () => cmdRegisterIndex(),
  };

  if (!cmd || !commands[cmd]) {
    console.log('Usage: node agent/hol-registry.js <command>\n');
    console.log('Commands:');
    console.log('  create           Create and register agent on HOL Registry (on-chain)');
    console.log('  status           Show current agent state');
    console.log('  connect <topic>  Connect to another agent\'s inbound topic');
    console.log('  listen           Listen for connections + skill requests');
    console.log('  register-index   Submit agent to HOL REST search index');
    process.exit(0);
  }

  commands[cmd]().catch((err) => {
    console.error('❌ Error:', err.message || err);
    process.exit(1);
  });
}
