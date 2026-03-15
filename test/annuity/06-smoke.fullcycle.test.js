/**
 * Full-Lifecycle Smoke Test
 *
 * Exercises every API endpoint AND the agent's intent parser in a
 * single automated run.  Requires Hardhat node (8545) + ImperiumAPI (4000).
 *
 *   npx hardhat test test/annuity/06-smoke.fullcycle.test.js --network localhost
 */

const { assert } = require('chai');
const fetch = require('node-fetch');
const path = require('path');

const API = 'http://127.0.0.1:4000';

// Import the agent's intent parser (cli-agent.js now guards main()
// behind require.main === module, so it won't open a REPL here)
const { parseIntent } = require('../../agent/cli-agent');

// ── helpers ─────────────────────────────────────────────────────────
async function post(path, body) {
  const res = await fetch(`${API}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
  return res.json();
}

async function get(path) {
  const res = await fetch(`${API}${path}`);
  return res.json();
}

// ── tests ───────────────────────────────────────────────────────────
describe('Full-Lifecycle Smoke Test', function () {
  this.timeout(300000); // 5 minutes — testnet transactions are slow
  const correlationId = 'smoke-' + Date.now();
  let annuityAddress;
  let stablecoinAddress;

  // ─────────────────────────────────────────────────────────────────
  // Part 1 — API Endpoint Coverage
  // ─────────────────────────────────────────────────────────────────

  it('GET / — root lists all endpoints', async () => {
    const data = await get('/');
    assert.equal(data.service, 'ImperiumAPI');
    assert.ok(data.endpoints.length >= 9, `Expected ≥9 endpoints, got ${data.endpoints.length}`);
  });

  it('GET /health — RPC is listening', async () => {
    const data = await get('/health');
    assert.equal(data.ok, true);
    assert.equal(data.rpcListening, true);
  });

  it('POST /deal — creates a deal', async () => {
    const data = await post('/deal', {
      correlationId,
      participants: {
        buyer: { wallet: '0x0000000000000000000000000000000000000001' },
        seller: {
          wallet: {
            bidAmount: 1000000,
            tokenMetaData: { term: '3', interestRate: '500' },
          },
        },
      },
    });
    assert.equal(data.correlationId, correlationId);
    assert.equal(data.status, 'created');
    assert.ok(data.annuityAddress, 'annuity deployed');
    assert.ok(data.stablecoinAddress, 'stablecoin deployed');
    annuityAddress = data.annuityAddress;
    stablecoinAddress = data.stablecoinAddress;
  });

  it('GET /deal/:id — status is created', async () => {
    const data = await get(`/deal/${correlationId}`);
    assert.equal(data.status, 'created');
    assert.equal(data.contractState.issued, false);
    assert.equal(data.contractState.expired, false);
  });

  it('GET /deals — lists the deal', async () => {
    const data = await get('/deals');
    assert.ok(data.count >= 1, 'at least 1 deal');
    const found = data.deals.find((d) => d.correlationId === correlationId);
    assert.ok(found, 'our deal is in the list');
    assert.equal(found.coupons, 3);
  });

  it('POST /deal/:id/execute — settles and pays 3 coupons', async () => {
    const data = await post(`/deal/${correlationId}/execute`);
    assert.equal(data.status, 'executed');
    assert.ok(data.txs.length >= 5, `Expected ≥5 txs (approve+issue+approve+3 coupons), got ${data.txs.length}`);
    // Check coupon txs
    const couponTxs = data.txs.filter((t) => t.type === 'payCoupon');
    assert.equal(couponTxs.length, 3, '3 coupon payments');
  });

  it('GET /deal/:id — issued=true after execute', async () => {
    const data = await get(`/deal/${correlationId}`);
    assert.equal(data.status, 'executed');
    assert.equal(data.contractState.issued, true);
    assert.equal(data.contractState.expired, false);
  });

  it('GET /deal/:id/balances — all coupons paid', async () => {
    const data = await get(`/deal/${correlationId}/balances`);
    assert.ok(data.currentOwner, 'currentOwner present');
    assert.ok(data.balances.issuer, 'issuer balance present');
    assert.ok(data.balances.investor, 'investor balance present');
    assert.equal(data.coupons.length, 3, '3 coupon entries');
    data.coupons.forEach((c) => {
      assert.equal(c.paid, true, `Coupon #${c.index} should be paid`);
    });
  });

  it('POST /deal/:id/transfer — transfers to secondary buyer', async () => {
    const data = await post(`/deal/${correlationId}/transfer`);
    assert.equal(data.status, 'transferred');
    assert.ok(data.newOwner, 'newOwner present');
    assert.ok(data.price > 0, 'price > 0');
    assert.ok(data.txs.length >= 2, 'at least 2 txs (approve + transfer)');
  });

  it('POST /deal/:id/redeem — redeems at maturity', async () => {
    const data = await post(`/deal/${correlationId}/redeem`);
    assert.equal(data.status, 'redeemed');
    assert.ok(data.txs.length >= 1, 'at least 1 tx');
  });

  it('GET /deal/:id — expired=true after redeem', async () => {
    const data = await get(`/deal/${correlationId}`);
    assert.equal(data.status, 'redeemed');
    assert.equal(data.contractState.expired, true);
  });

  it('GET /deal/:id/transactions — has all tx entries', async () => {
    const data = await get(`/deal/${correlationId}/transactions`);
    assert.ok(data.count >= 8, `Expected ≥8 tx entries, got ${data.count}`);
    // Should include execute, transfer, redeem actions
    const actions = [...new Set(data.transactions.map((t) => t.action))];
    assert.ok(actions.includes('execute'), 'has execute txs');
    assert.ok(actions.includes('transfer'), 'has transfer txs');
    assert.ok(actions.includes('redeem'), 'has redeem txs');
  });

  it('GET /transactions — global log includes our deal', async () => {
    const data = await get('/transactions');
    assert.ok(data.count >= 8, `Expected ≥8 total entries, got ${data.count}`);
    const ours = data.transactions.filter((t) => t.correlationId === correlationId);
    assert.ok(ours.length >= 8, 'our deal has ≥8 entries in the global log');
  });

  // ─────────────────────────────────────────────────────────────────
  // Part 2 — Agent Intent Parser
  // ─────────────────────────────────────────────────────────────────

  it('agent: parses CREATE intent', () => {
    const r = parseIntent('create a deal with 7 coupons and face value 500000');
    assert.equal(r.intent, 'CREATE');
    assert.equal(r.termDays, 7);
    assert.equal(r.faceValue, 500000);
  });

  it('agent: parses CREATE defaults', () => {
    const r = parseIntent('deploy a new annuity');
    assert.equal(r.intent, 'CREATE');
    assert.equal(r.termDays, 5);
    assert.equal(r.faceValue, 1000000);
  });

  it('agent: parses EXECUTE intent', () => {
    const r = parseIntent('execute the deal');
    assert.equal(r.intent, 'EXECUTE');
  });

  it('agent: parses TRANSFER intent', () => {
    const r = parseIntent('transfer for price 800000');
    assert.equal(r.intent, 'TRANSFER');
    assert.equal(r.price, 800000);
  });

  it('agent: parses TRANSFER without price', () => {
    const r = parseIntent('sell the annuity');
    assert.equal(r.intent, 'TRANSFER');
    assert.equal(r.price, null);
  });

  it('agent: parses REDEEM intent', () => {
    const r = parseIntent('redeem at maturity');
    assert.equal(r.intent, 'REDEEM');
  });

  it('agent: parses STATUS intent', () => {
    const r = parseIntent('check status');
    assert.equal(r.intent, 'STATUS');
  });

  it('agent: parses BALANCES intent', () => {
    const r = parseIntent('show balances');
    assert.equal(r.intent, 'BALANCES');
  });

  it('agent: parses LIST intent', () => {
    const r = parseIntent('list deals');
    assert.equal(r.intent, 'LIST');
  });

  it('agent: parses TXLOG intent', () => {
    const r = parseIntent('show transactions');
    assert.equal(r.intent, 'TXLOG');
  });

  it('agent: parses HEALTH intent', () => {
    const r = parseIntent('ping');
    assert.equal(r.intent, 'HEALTH');
  });

  it('agent: parses HELP intent', () => {
    const r = parseIntent('help');
    assert.equal(r.intent, 'HELP');
  });

  it('agent: parses EXIT intent', () => {
    const r = parseIntent('quit');
    assert.equal(r.intent, 'EXIT');
  });

  it('agent: returns UNKNOWN for gibberish', () => {
    const r = parseIntent('asdfghjkl');
    assert.equal(r.intent, 'UNKNOWN');
  });

  // ── Part 3 — LLM Agent (conditional, requires ANTHROPIC_API_KEY) ──
  const llmAgent = require('../../agent/llm-agent');
  const HAS_LLM_KEY = !!process.env.ANTHROPIC_API_KEY;

  (HAS_LLM_KEY ? describe : describe.skip)('LLM Agent (Claude + hedera-agent-kit)', function () {
    this.timeout(60000);

    before(function () {
      const ok = llmAgent.init({
        apiKey: process.env.ANTHROPIC_API_KEY,
        agentState: null,
        hcsContext: {},
      });
      assert.ok(ok, 'LLM agent should initialize with valid API key');
    });

    beforeEach(function () {
      llmAgent.resetConversation();
    });

    it('llm: classifies natural language CREATE request', async () => {
      const { toolCalls } = await llmAgent.processInput(
        "I'd like to create a new bond with 3 coupon payments"
      );
      assert.ok(toolCalls.length > 0, 'should make at least one tool call');
      assert.equal(toolCalls[0].name, 'create_annuity');
    });

    it('llm: classifies freeform status query', async () => {
      const { text, toolCalls } = await llmAgent.processInput(
        'check the status of deal deal-123'
      );
      // Claude may call the tool or ask for clarification — both are valid
      if (toolCalls.length > 0) {
        assert.ok(
          ['check_deal_status', 'list_deals'].includes(toolCalls[0].name),
          `expected status or list tool, got ${toolCalls[0].name}`
        );
      } else {
        assert.ok(text.length > 0, 'should return a text response');
      }
    });

    it('llm: handles help without tool call', async () => {
      const { text } = await llmAgent.processInput('help');
      assert.ok(text.length > 0, 'should return help text');
    });

    it('llm: reports tool count', () => {
      const count = llmAgent.getToolCount();
      assert.ok(count >= 15, `expected ≥15 tools, got ${count}`);
    });
  });
});
