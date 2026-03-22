/**
 * NCD Plugin — LangChain tools wrapping ImperiumAPI NCD endpoints.
 */
'use strict';

const { z } = require('zod');

const API_PORT = process.env.PORT || 4000;
const API_BASE = process.env.API_BASE || `http://127.0.0.1:${API_PORT}`;

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
  return `ncd-${Date.now()}`;
}

const createNCDTool = {
  method: 'create_ncd',
  name: 'Create NCD',
  description:
    'Create and deploy a new Negotiable Certificate of Deposit (NCD) on the network. ' +
    'NCDs are tradeable — investor buys at a discount to face value; at maturity the full face value is paid to the current owner. ' +
    'Parameters: termDays (default 5), faceValue (default 1000000), interestRate in basis points (default 300 = 3%).',
  parameters: z.object({
    termDays: z.number().optional().default(5).describe('Term length in days (default 5)'),
    faceValue: z.number().optional().default(1000000).describe('Face value in whole units (default 1000000)'),
    interestRate: z.number().optional().default(300).describe('Interest rate / discount in basis points (default 300 = 3%)'),
  }),
  execute: async ({ termDays = 5, faceValue = 1000000, interestRate = 300 }) => {
    const correlationId = uid();
    const result = await apiPost('/ncd', { correlationId, faceValue, interestRate, termDays });
    return JSON.stringify(result);
  },
};

const executeNCDTool = {
  method: 'execute_ncd',
  name: 'Execute NCD',
  description:
    'Execute (settle) an existing NCD — investor pays the discounted price to the issuer, receiving the NCD token.',
  parameters: z.object({
    correlationId: z.string().describe('The NCD correlation ID'),
  }),
  execute: async ({ correlationId }) => {
    const result = await apiPost(`/ncd/${correlationId}/execute`);
    return JSON.stringify(result);
  },
};

const transferNCDTool = {
  method: 'transfer_ncd',
  name: 'Transfer NCD',
  description:
    'Transfer (sell) an NCD to a secondary buyer at a negotiated price. ' +
    'If no price is specified, defaults to 95% of face value.',
  parameters: z.object({
    correlationId: z.string().describe('The NCD correlation ID'),
    price: z.number().optional().describe('Transfer price in whole units (optional, defaults to 95% face value)'),
  }),
  execute: async ({ correlationId, price }) => {
    const body = price ? { price } : {};
    const result = await apiPost(`/ncd/${correlationId}/transfer`, body);
    return JSON.stringify(result);
  },
};

const redeemNCDTool = {
  method: 'redeem_ncd',
  name: 'Redeem NCD',
  description:
    'Redeem an NCD at maturity — issuer pays full face value to the current owner.',
  parameters: z.object({
    correlationId: z.string().describe('The NCD correlation ID'),
  }),
  execute: async ({ correlationId }) => {
    const result = await apiPost(`/ncd/${correlationId}/redeem`);
    return JSON.stringify(result);
  },
};

const checkNCDStatusTool = {
  method: 'check_ncd_status',
  name: 'Check NCD Status',
  description: 'Get the current status of an NCD (created/executed/transferred/redeemed, issued/expired flags).',
  parameters: z.object({
    correlationId: z.string().describe('The NCD correlation ID'),
  }),
  execute: async ({ correlationId }) => {
    const result = await apiGet(`/ncd/${correlationId}`);
    return JSON.stringify(result);
  },
};

const showNCDBalancesTool = {
  method: 'show_ncd_balances',
  name: 'Show NCD Balances',
  description: 'Show stablecoin balances for NCD parties (issuer, investor, secondary, contract).',
  parameters: z.object({
    correlationId: z.string().describe('The NCD correlation ID'),
  }),
  execute: async ({ correlationId }) => {
    const result = await apiGet(`/ncd/${correlationId}/balances`);
    return JSON.stringify(result);
  },
};

const ncdPlugin = {
  name: 'imperium-ncd-plugin',
  version: '0.5.0',
  description:
    'Imperium Markets NCD lifecycle tools — create, execute, transfer, redeem ' +
    'tokenised Negotiable Certificates of Deposit. Tradeable discount instrument. Australian Capital Markets.',
  tools: (_context) => [
    createNCDTool,
    executeNCDTool,
    transferNCDTool,
    redeemNCDTool,
    checkNCDStatusTool,
    showNCDBalancesTool,
  ],
};

module.exports = { ncdPlugin };
