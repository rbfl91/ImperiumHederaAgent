#!/usr/bin/env node
/**
 * Imperium Markets — Interactive CLI Agent (v0.4)
 *
 * A rule-based AI agent that orchestrates AnnuityToken smart-contract
 * operations via the ImperiumAPI gateway, with HCS-10 agent-to-agent
 * communication support via the HOL Registry Broker.
 *
 * Usage:
 *   node agent/cli-agent.js
 *
 * Prerequisites:
 *   1. Hardhat node running on port 8545  (npx hardhat node)
 *   2. Contracts deployed                 (npx hardhat run scripts/deploy.js --network localhost)
 *   3. ImperiumAPI running on port 4000   (node api/imperium-api.js)
 *
 *   Or simply:  ./start.sh
 *
 * HCS-10 features (v0.4):
 *   - "list agents"        — discover agents on HOL Registry
 *   - "connect to <topic>"  — establish HCS-10 connection
 *   - "send <skill>"       — invoke skill on connected agent
 *   - "show connections"   — list active HCS-10 connections
 *   - "listen"             — start background HCS-10 listener
 *   - "stop listening"     — stop background listener
 */

const readline = require('readline');
const fetch = require('node-fetch');

// Import HOL registry module for HCS-10 operations
const hol = require('./hol-registry');

const API_BASE = process.env.API_BASE || 'http://127.0.0.1:4000';
const NETWORK = (() => {
  const idx = process.argv.indexOf('--network');
  if (idx !== -1 && process.argv[idx + 1]) return process.argv[idx + 1];
  return process.env.NETWORK || 'local';
})();
const REGISTRY_API = 'https://hol.org/registry/api/v1';

// HashScan explorer base for Hedera Testnet
const EXPLORER_BASE = NETWORK === 'hedera-testnet'
  ? 'https://hashscan.io/testnet'
  : null;

// ── state ───────────────────────────────────────────────────────────
let lastCorrelationId = null;

// HCS-10 session state
const hcsConnections = new Map();     // connectionTopicId → { accountId, name }
let lastConnectionTopicId = null;
let hcsClient = null;                 // HCS10Client instance (lazy init)
let holAgentState = null;             // loaded from deployments/hol-agent.json
let listenerInterval = null;          // background polling interval
const processedRequests = new Set();  // deduplicate inbound connection requests
const processedMessages = new Set();  // deduplicate inbound skill messages

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

function printHCS(lines) {
  if (Array.isArray(lines)) {
    lines.forEach((l) => console.log('  🔊 ' + l));
  } else {
    console.log('  🔊 ' + lines);
  }
}

// ── HCS-10 initialization ───────────────────────────────────────────

function initHCS() {
  if (hcsClient) return true;
  holAgentState = hol.loadState();
  if (!holAgentState || !holAgentState.agentAccountId) {
    return false;
  }
  // Use the agent's own key (stored during registration) — it matches the topic submit keys.
  const agentKey = holAgentState.agentPrivateKey;
  if (!agentKey) {
    printAgent('Agent private key not found in state. Re-register: node agent/hol-registry.js create');
    return false;
  }
  hcsClient = hol.createClient(holAgentState.agentAccountId, agentKey);
  return true;
}

// ── intent parser ───────────────────────────────────────────────────
function parseIntent(input) {
  const lower = input.toLowerCase().trim();

  // ── HCS-10 intents (check first to avoid conflicts) ─────────────

  // LISTEN
  if (lower.match(/^(?:listen|start\s+listen)/)) {
    return { intent: 'HCS_LISTEN' };
  }

  // STOP LISTENING
  if (lower.match(/^(?:stop\s+listen|stop\s+hcs)/)) {
    return { intent: 'HCS_STOP_LISTEN' };
  }

  // LIST AGENTS / DISCOVER
  if (lower.match(/(?:list|discover|find|search)\s*(?:agent|agents)/)) {
    const queryMatch = lower.match(/(?:list|discover|find|search)\s*agents?\s+(.+)/);
    const query = queryMatch ? queryMatch[1].trim() : '';
    return { intent: 'HCS_LIST_AGENTS', query };
  }

  // CONNECT TO
  if (lower.match(/connect\s+(?:to\s*)?(\d+\.\d+\.\d+)/)) {
    const topicMatch = lower.match(/connect\s+(?:to\s*)?(\d+\.\d+\.\d+)/);
    const target = topicMatch ? topicMatch[1] : null;
    return { intent: 'HCS_CONNECT', target };
  }

  // SEND SKILL
  if (lower.match(/(?:send|invoke|call)\s+(?:skill\s+)?(\S+)/)) {
    const skillMatch = input.trim().match(/(?:send|invoke|call)\s+(?:skill\s+)?(\S+)(?:\s+(?:to|on)\s+(\S+))?/i);
    const skill = skillMatch ? skillMatch[1] : null;
    const target = skillMatch && skillMatch[2] ? skillMatch[2] : lastConnectionTopicId;
    // Extract params — look for key=value pairs or JSON
    const paramsMatch = input.match(/(?:with|params?)\s+(\{.+\})/i);
    let params = {};
    if (paramsMatch) {
      try { params = JSON.parse(paramsMatch[1]); } catch { /* ignore */ }
    }
    return { intent: 'HCS_SEND_SKILL', skill, target, params };
  }

  // SHOW CONNECTIONS
  if (lower.match(/(?:show|list)\s*connection/)) {
    return { intent: 'HCS_CONNECTIONS' };
  }

  // ── Annuity lifecycle intents ───────────────────────────────────

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

// ── HCS-10 command handlers ─────────────────────────────────────────

async function handleListAgents(query) {
  // The HOL REST API requires a q= parameter to return results.
  // Default to "agent" for unfiltered browsing.
  const searchQuery = query || 'agent';
  printAgent(query ? `Searching HOL Registry for "${query}"...` : 'Listing agents on HOL Registry...');
  try {
    const url = `${REGISTRY_API}/search?q=${encodeURIComponent(searchQuery)}&limit=10`;
    const res = await fetch(url);
    if (!res.ok) {
      printAgent(`❌ Registry API returned ${res.status}`);
      return;
    }
    const data = await res.json();
    const agents = data.hits || data.agents || data.results || data.data || [];
    if (agents.length === 0) {
      printAgent(`📋 No agents found${query ? ` for "${query}"` : ''}. Try: "list agents <keyword>"`);
      return;
    }
    const total = data.total || agents.length;
    const lines = [`📋 Found ${agents.length} agent(s)${total > agents.length ? ` (of ${total} total)` : ''}:`, ''];
    agents.forEach((a, i) => {
      const name = a.name || a.displayName || a.alias || 'Unknown';
      const registry = a.registry || '—';
      const profile = a.profile || {};
      const inbound = a.inboundTopicId || profile.inboundTopicId || '—';
      const desc = (a.description || profile.bio || '').slice(0, 80);
      lines.push(`   ${i + 1}. ${name}  [${registry}]`);
      if (inbound !== '—') lines.push(`      Inbound: ${inbound}`);
      if (desc) lines.push(`      ${desc}${desc.length >= 80 ? '...' : ''}`);
      lines.push('');
    });
    if (query) lines.push('To connect: "connect to <inbound-topic-id>"');
    else lines.push('Search: "list agents <keyword>" — Connect: "connect to <inbound-topic-id>"');
    printAgent(lines);
  } catch (err) {
    printAgent(`❌ Failed to search registry: ${err.message}`);
  }
}

async function handleConnect(target) {
  if (!target) {
    printAgent('⚠️  Usage: "connect to <inbound-topic-id>"');
    return;
  }
  if (!initHCS()) {
    printAgent('⚠️  No HOL agent registered. Run: node agent/hol-registry.js create');
    return;
  }

  printAgent(`Connecting to agent at ${target}...`);
  try {
    const receipt = await hcsClient.submitConnectionRequest(
      target,
      'Connection request from Imperium Annuity Agent (CLI v0.4)'
    );

    const requestId = receipt.topicSequenceNumber
      ? (typeof receipt.topicSequenceNumber.toNumber === 'function'
          ? receipt.topicSequenceNumber.toNumber()
          : receipt.topicSequenceNumber)
      : receipt.topicSequenceNumber;

    printAgent(`Connection request sent (sequence: ${requestId}). Waiting for confirmation...`);

    const confirmation = await hcsClient.waitForConnectionConfirmation(
      target,
      requestId,
      60,    // maxAttempts
      2000,  // delayMs
      true   // record on outbound
    );

    const connTopicId = confirmation.connectionTopicId;
    hcsConnections.set(connTopicId, {
      accountId: confirmation.confirmedBy || target,
      name: target,
    });
    lastConnectionTopicId = connTopicId;

    printAgent([
      '✅ Connection established!',
      `   Connection Topic: ${connTopicId}`,
      `   Confirmed by:     ${confirmation.confirmedBy || '—'}`,
      '',
      'You can now: "send annuity.issue" to invoke a skill on this agent.',
    ]);
  } catch (err) {
    printAgent(`❌ Connection failed: ${err.message}`);
  }
}

async function handleSendSkill(skill, target, params) {
  if (!skill) {
    printAgent('⚠️  Usage: "send <skill-name>" (e.g., "send annuity.issue")');
    return;
  }
  if (!initHCS()) {
    printAgent('⚠️  No HOL agent registered. Run: node agent/hol-registry.js create');
    return;
  }

  const connTopicId = target || lastConnectionTopicId;
  if (!connTopicId) {
    printAgent('⚠️  No active connection. Use "connect to <topic>" first.');
    return;
  }

  // Build default params for annuity.issue if none provided
  if (skill === 'annuity.issue' && !params.correlationId) {
    params.correlationId = uid();
    if (!params.participants) {
      params.participants = {
        buyer: { wallet: '0x0000000000000000000000000000000000000001' },
        seller: {
          wallet: {
            bidAmount: 1000000,
            tokenMetaData: { term: '5', interestRate: '500' },
          },
        },
      };
    }
  }

  const requestId = 'cli-' + Date.now();
  const payload = JSON.stringify({ skill, requestId, params });

  printAgent(`Sending skill "${skill}" on connection ${short(connTopicId)}...`);
  try {
    await hcsClient.sendMessage(connTopicId, payload, `skill:${skill}:request`);
    printAgent('📤 Skill request sent. Polling for response...');

    // Poll for response (up to 120s)
    const maxPolls = 24;
    const pollDelay = 5000;
    for (let i = 0; i < maxPolls; i++) {
      await new Promise(r => setTimeout(r, pollDelay));
      try {
        const { messages } = await hcsClient.getMessages(connTopicId);
        if (!messages) continue;

        for (const msg of messages) {
          if (msg.op !== 'message') continue;
          const senderId = msg.operator_id || msg.payer || '';
          if (senderId.includes(holAgentState.agentAccountId)) continue;

          let resp;
          try {
            const content = typeof msg.data === 'string' ? msg.data : JSON.stringify(msg.data);
            resp = JSON.parse(content);
          } catch { continue; }

          if (resp.requestId === requestId || resp.skill === skill) {
            if (resp.status === 'error') {
              printAgent(`❌ Skill "${skill}" failed: ${JSON.stringify(resp.result)}`);
            } else {
              const lines = [
                `✅ Skill "${skill}" response received!`,
                `   Status: ${resp.status}`,
              ];
              const r = resp.result || {};
              if (r.correlationId) lines.push(`   Deal: ${r.correlationId}`);
              if (r.annuityAddress) lines.push(`   Annuity: ${contractLink(r.annuityAddress)}`);
              if (r.status) lines.push(`   Deal Status: ${r.status}`);
              if (r.currentOwner) lines.push(`   Owner: ${short(r.currentOwner)}`);
              lines.push(`   Full result: ${JSON.stringify(r).slice(0, 200)}...`);
              printAgent(lines);
            }
            return;
          }
        }
      } catch { /* poll error, continue */ }
    }
    printAgent(`⏰ Timed out waiting for response to "${skill}". The remote agent may still be processing.`);
  } catch (err) {
    printAgent(`❌ Failed to send skill: ${err.message}`);
  }
}

function handleShowConnections() {
  if (hcsConnections.size === 0) {
    printAgent('📋 No active HCS-10 connections. Use "connect to <topic>" to establish one.');
    return;
  }
  const lines = [`📋 ${hcsConnections.size} active connection(s):`, ''];
  let i = 1;
  for (const [topicId, info] of hcsConnections) {
    const active = topicId === lastConnectionTopicId ? ' ← active' : '';
    lines.push(`   ${i}. Connection Topic: ${topicId}`);
    lines.push(`      Remote: ${info.accountId || info.name || '—'}${active}`);
    i++;
  }
  lines.push('');
  lines.push('To send a skill: "send <skill-name>"');
  printAgent(lines);
}

// ── HCS-10 Listener mode ────────────────────────────────────────────

async function handleStartListener() {
  if (listenerInterval) {
    printAgent('🔊 Listener already running. Use "stop listening" to stop.');
    return;
  }
  if (!initHCS()) {
    printAgent('⚠️  No HOL agent registered. Run: node agent/hol-registry.js create');
    return;
  }

  // Load existing connections
  try {
    const { ConnectionsManager } = require('@hashgraphonline/standards-sdk');
    const connMgr = new ConnectionsManager({ baseClient: hcsClient, logLevel: 'warn', silent: true });
    await connMgr.fetchConnectionData(holAgentState.agentAccountId);
    const existing = connMgr.getActiveConnections();
    if (existing && existing.length > 0) {
      for (const conn of existing) {
        if (conn.connectionTopicId && !hcsConnections.has(conn.connectionTopicId)) {
          hcsConnections.set(conn.connectionTopicId, { accountId: conn.targetAccountId });
        }
      }
      printHCS(`Loaded ${hcsConnections.size} existing connection(s)`);
    }
  } catch (err) {
    printHCS(`No existing connections found (${err.message})`);
  }

  // Load last processed sequence numbers from state so we skip already-handled messages
  // but still process any that arrived while the listener was off
  const lastInboundSeq = holAgentState.lastInboundSeq || 0;
  const lastConnSeqs = holAgentState.lastConnSeqs || {};
  for (const [connTopicId] of hcsConnections) {
    if (lastConnSeqs[connTopicId]) {
      // Pre-mark everything up to the saved sequence
      for (let i = 1; i <= lastConnSeqs[connTopicId]; i++) {
        processedMessages.add(`${connTopicId}:${i}`);
      }
    }
  }
  // Pre-mark inbound messages up to the saved sequence
  for (let i = 1; i <= lastInboundSeq; i++) {
    processedRequests.add(`${holAgentState.inboundTopicId}:${i}`);
  }
  if (lastInboundSeq > 0) {
    printHCS(`Resuming from inbound seq ${lastInboundSeq} — new messages only`);
  }

  printAgent([
    '🔊 HCS-10 listener started!',
    `   Agent: ${holAgentState.agentAccountId}`,
    `   Inbound: ${holAgentState.inboundTopicId}`,
    `   Polling every 5s. Type commands normally.`,
    `   Use "stop listening" to stop.`,
  ]);

  listenerInterval = setInterval(() => pollOnce(), 5000);
}

function handleStopListener() {
  if (!listenerInterval) {
    printAgent('🔊 Listener is not running.');
    return;
  }
  clearInterval(listenerInterval);
  listenerInterval = null;
  printAgent('🔊 HCS-10 listener stopped.');
}

async function pollOnce() {
  if (!hcsClient || !holAgentState) return;

  // 1. Check inbound topic for new connection requests
  try {
    const { messages } = await hcsClient.getMessages(holAgentState.inboundTopicId);
    if (messages && messages.length > 0) {
      for (const msg of messages) {
        const seqKey = `${holAgentState.inboundTopicId}:${msg.sequence_number}`;
        if (processedRequests.has(seqKey)) continue;

        if (msg.op === 'connection_request') {
          processedRequests.add(seqKey);
          const rawId = msg.operator_id || msg.payer;
          const requesterId = rawId && rawId.includes('@') ? rawId.split('@')[1] : rawId;
          printHCS(`Connection request from ${requesterId} (seq: ${msg.sequence_number})`);

          try {
            const result = await hcsClient.handleConnectionRequest(
              holAgentState.inboundTopicId,
              requesterId,
              msg.sequence_number,
            );
            const connTopicId = result.connectionTopicId;
            hcsConnections.set(connTopicId, { accountId: requesterId });
            lastConnectionTopicId = connTopicId;
            printHCS(`✅ Connection accepted → topic ${connTopicId}`);
          } catch (err) {
            printHCS(`❌ Failed to accept connection: ${err.message}`);
          }
        } else if (msg.op === 'connection_created') {
          processedRequests.add(seqKey);
          if (msg.connection_topic_id && !hcsConnections.has(msg.connection_topic_id)) {
            hcsConnections.set(msg.connection_topic_id, { accountId: msg.operator_id || msg.payer });
            printHCS(`Connection confirmed → topic ${msg.connection_topic_id}`);
          }
        }
      }
    }
  } catch (err) {
    if (!err.message.includes('404')) {
      // Suppress noisy errors during polling
    }
  }

  // 2. Check each active connection topic for skill invocation messages
  for (const [connTopicId] of hcsConnections) {
    try {
      const { messages } = await hcsClient.getMessages(connTopicId);
      if (!messages || messages.length === 0) continue;

      for (const msg of messages) {
        const msgKey = `${connTopicId}:${msg.sequence_number}`;
        if (processedMessages.has(msgKey)) continue;
        if (msg.op !== 'message') continue;

        const senderId = msg.operator_id || msg.payer || '';
        if (senderId.includes(holAgentState.agentAccountId)) continue;

        processedMessages.add(msgKey);

        let payload;
        try {
          const content = typeof msg.data === 'string' ? msg.data : JSON.stringify(msg.data);
          payload = JSON.parse(content);
        } catch {
          continue;
        }

        if (!payload.skill) continue;

        printHCS(`📥 Skill request: ${payload.skill} from ${senderId}`);

        let result;
        try {
          result = await hol.executeSkill(payload.skill, payload.params || {});
          printHCS(`✅ Skill ${payload.skill} executed successfully`);
        } catch (err) {
          result = { error: err.message };
          printHCS(`❌ Skill ${payload.skill} failed: ${err.message}`);
        }

        const response = JSON.stringify({
          skill: payload.skill,
          requestId: payload.requestId || null,
          status: result.error ? 'error' : 'success',
          result,
        });

        try {
          await hcsClient.sendMessage(connTopicId, response, `skill:${payload.skill}:response`);
          printHCS(`📤 Response sent on ${connTopicId}`);
        } catch (err) {
          printHCS(`❌ Failed to send response: ${err.message}`);
        }
      }
    } catch (err) {
      if (!err.message.includes('404')) {
        // Suppress noisy errors during polling
      }
    }
  }

  // Persist highest processed sequence numbers so restarts skip old messages
  persistSeqNumbers();
}

function persistSeqNumbers() {
  try {
    const state = hol.loadState();
    if (!state) return;

    // Find max inbound seq from processedRequests
    let maxInbound = state.lastInboundSeq || 0;
    for (const key of processedRequests) {
      const seq = parseInt(key.split(':').pop(), 10);
      if (seq > maxInbound) maxInbound = seq;
    }

    // Find max seq per connection topic from processedMessages
    const connSeqs = state.lastConnSeqs || {};
    for (const key of processedMessages) {
      const parts = key.split(':');
      const seq = parseInt(parts.pop(), 10);
      const topicId = parts.join(':');
      if (!connSeqs[topicId] || seq > connSeqs[topicId]) {
        connSeqs[topicId] = seq;
      }
    }

    if (maxInbound !== (state.lastInboundSeq || 0) || JSON.stringify(connSeqs) !== JSON.stringify(state.lastConnSeqs || {})) {
      state.lastInboundSeq = maxInbound;
      state.lastConnSeqs = connSeqs;
      const fs = require('fs');
      const statePath = require('path').join(__dirname, '..', 'deployments', 'hol-agent.json');
      fs.writeFileSync(statePath, JSON.stringify(state, null, 2));
    }
  } catch { /* non-critical — next restart will re-process a few messages */ }
}

// ── Annuity command handlers ────────────────────────────────────────
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

async function handleListDeals() {
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
    '  ── HCS-10 Agent Network ──────────────────────────────',
    '   "list agents"            — discover agents on HOL Registry',
    '   "list agents <query>"    — search by keyword',
    '   "connect to <topic>"     — connect to agent\'s inbound topic',
    '   "send <skill>"           — invoke skill on connected agent',
    '   "send annuity.issue"     — issue deal via remote agent',
    '   "show connections"       — list active HCS-10 connections',
    '   "listen"                 — start HCS-10 listener (background)',
    '   "stop listening"         — stop HCS-10 listener',
    '',
    '  ── System ─────────────────────────────────────────────',
    '   "health"                 — API + RPC health check',
    '   "help"                   — this message',
    '   "exit"                   — quit the agent',
    '',
    '  Tip: The agent remembers the last deal ID and connection.',
  ]);
}

// ── main loop ───────────────────────────────────────────────────────
async function main() {
  const netLabel = NETWORK === 'local' ? 'Local (Hardhat)' : NETWORK;

  // Try to load HOL agent state for banner
  holAgentState = hol.loadState();
  const agentLine = holAgentState && holAgentState.agentAccountId
    ? `  HCS-10 Agent: ${holAgentState.agentAccountId}  (Inbound: ${holAgentState.inboundTopicId})`
    : '  HCS-10: Not registered (run: node agent/hol-registry.js create)';

  console.log();
  console.log('  ╔═══════════════════════════════════════════════════╗');
  console.log('  ║   🦞  Imperium Markets — Annuity Agent  (v0.4)   ║');
  console.log('  ║                                                   ║');
  console.log('  ║   Rule-based agent + HCS-10 agent network.       ║');
  console.log('  ║   Type "help" for available commands.             ║');
  console.log('  ╚═══════════════════════════════════════════════════╝');
  console.log(`  Network: ${netLabel}`);
  console.log(agentLine);
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
      // HCS-10 commands
      case 'HCS_LIST_AGENTS':
        await handleListAgents(parsed.query);
        break;
      case 'HCS_CONNECT':
        await handleConnect(parsed.target);
        break;
      case 'HCS_SEND_SKILL':
        await handleSendSkill(parsed.skill, parsed.target, parsed.params);
        break;
      case 'HCS_CONNECTIONS':
        handleShowConnections();
        break;
      case 'HCS_LISTEN':
        await handleStartListener();
        break;
      case 'HCS_STOP_LISTEN':
        handleStopListener();
        break;

      // Annuity lifecycle
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
        await handleListDeals();
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
        if (listenerInterval) clearInterval(listenerInterval);
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
    if (listenerInterval) clearInterval(listenerInterval);
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
