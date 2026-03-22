/**
 * Annuity Plugin — LangChain tools wrapping ImperiumAPI endpoints.
 *
 * Each tool maps to a CLI handler and calls the local REST API (POST/GET).
 * The LLM selects the right tool from user input; execute() does the work.
 */
'use strict';

const { z } = require('zod');

const API_PORT = process.env.PORT || 4000;
const API_BASE = process.env.API_BASE || `http://127.0.0.1:${API_PORT}`;

// ── Shared API helpers ──────────────────────────────────────────────
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

function uid() {
  return `deal-${Date.now()}`;
}

// ── Tool definitions ────────────────────────────────────────────────

const createAnnuityTool = {
  method: 'create_annuity',
  name: 'Create Annuity',
  description:
    'Create and deploy a new annuity deal (AnnuityToken + stablecoin contracts) on the Hedera network. ' +
    'Parameters: number of coupon payments (termDays, default 5) and face value in whole units (faceValue, default 1000000). ' +
    'Example: "create a deal with 7 coupons and face value 500000", "deploy a new annuity".',
  parameters: z.object({
    termDays: z.number().optional().default(5).describe('Number of coupon payments (default 5)'),
    faceValue: z.number().optional().default(1000000).describe('Face value in whole units (default 1000000)'),
  }),
  execute: async ({ termDays = 5, faceValue = 1000000 }) => {
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
    return JSON.stringify(result);
  },
};

const executeDealTool = {
  method: 'execute_deal',
  name: 'Execute Deal',
  description:
    'Execute (settle) an existing annuity deal — issues the annuity, pays all coupons, and funds the contract. ' +
    'Requires correlationId (deal ID). Example: "execute the deal", "settle deal-123".',
  parameters: z.object({
    correlationId: z.string().describe('The deal correlation ID (e.g. "deal-1710400000")'),
  }),
  execute: async ({ correlationId }) => {
    const result = await apiPost(`/deal/${correlationId}/execute`);
    return JSON.stringify(result);
  },
};

const transferDealTool = {
  method: 'transfer_deal',
  name: 'Transfer Deal',
  description:
    'Transfer (sell) an annuity to a secondary buyer at a given price. ' +
    'If no price is specified, defaults to 90% of face value. ' +
    'Example: "transfer for price 800000", "sell the annuity".',
  parameters: z.object({
    correlationId: z.string().describe('The deal correlation ID'),
    price: z.number().optional().describe('Transfer price in whole units (optional, defaults to 90% face value)'),
  }),
  execute: async ({ correlationId, price }) => {
    const body = price ? { price } : {};
    const result = await apiPost(`/deal/${correlationId}/transfer`, body);
    return JSON.stringify(result);
  },
};

const redeemDealTool = {
  method: 'redeem_deal',
  name: 'Redeem Deal',
  description:
    'Redeem an annuity at maturity — returns face value to the current owner. ' +
    'Example: "redeem the deal", "redeem at maturity".',
  parameters: z.object({
    correlationId: z.string().describe('The deal correlation ID'),
  }),
  execute: async ({ correlationId }) => {
    const result = await apiPost(`/deal/${correlationId}/redeem`);
    return JSON.stringify(result);
  },
};

const checkStatusTool = {
  method: 'check_deal_status',
  name: 'Check Deal Status',
  description:
    'Get the current status of an annuity deal (created/executed/transferred/redeemed, issued/expired flags). ' +
    'Example: "check status", "what is the status of my deal?".',
  parameters: z.object({
    correlationId: z.string().describe('The deal correlation ID'),
  }),
  execute: async ({ correlationId }) => {
    const result = await apiGet(`/deal/${correlationId}`);
    return JSON.stringify(result);
  },
};

const showBalancesTool = {
  method: 'show_balances',
  name: 'Show Balances',
  description:
    'Show stablecoin balances for all parties (issuer, investor, secondary, contract) and coupon payment status. ' +
    'Example: "show balances", "how much does each party have?".',
  parameters: z.object({
    correlationId: z.string().describe('The deal correlation ID'),
  }),
  execute: async ({ correlationId }) => {
    const result = await apiGet(`/deal/${correlationId}/balances`);
    return JSON.stringify(result);
  },
};

const listDealsTool = {
  method: 'list_deals',
  name: 'List Deals',
  description:
    'List all annuity deals managed by this agent. ' +
    'Example: "list deals", "show all my deals".',
  parameters: z.object({}),
  execute: async () => {
    const result = await apiGet('/deals');
    return JSON.stringify(result);
  },
};

const showTransactionsTool = {
  method: 'show_transactions',
  name: 'Show Transactions',
  description:
    'Show the transaction log (history) for a specific deal or all deals. ' +
    'Example: "show transactions", "tx log for deal-123".',
  parameters: z.object({
    correlationId: z.string().optional().describe('Deal correlation ID (omit for global log)'),
  }),
  execute: async ({ correlationId } = {}) => {
    const path = correlationId
      ? `/deal/${correlationId}/transactions`
      : '/transactions';
    const result = await apiGet(path);
    return JSON.stringify(result);
  },
};

const healthCheckTool = {
  method: 'health_check',
  name: 'Health Check',
  description:
    'Check if the Imperium API server is running and connected to the network. ' +
    'Example: "health", "ping", "is the api alive?".',
  parameters: z.object({}),
  execute: async () => {
    const result = await apiGet('/health');
    return JSON.stringify(result);
  },
};

// ── Plugin export ───────────────────────────────────────────────────

const annuityPlugin = {
  name: 'imperium-annuity-plugin',
  version: '0.5.0',
  description:
    'Imperium Markets annuity lifecycle tools — create, execute, transfer, redeem ' +
    'structured annuity products on Hedera. Australian Capital Markets domain.',
  tools: (_context) => [
    createAnnuityTool,
    executeDealTool,
    transferDealTool,
    redeemDealTool,
    checkStatusTool,
    showBalancesTool,
    listDealsTool,
    showTransactionsTool,
    healthCheckTool,
  ],
};

module.exports = { annuityPlugin };
