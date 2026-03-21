/**
 * Term Deposit Plugin — LangChain tools wrapping ImperiumAPI term deposit endpoints.
 */
'use strict';

const { z } = require('zod');

const API_BASE = process.env.API_BASE || 'http://127.0.0.1:4000';

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
  return `td-${Date.now()}`;
}

const createTermDepositTool = {
  method: 'create_term_deposit',
  name: 'Create Term Deposit',
  description:
    'Create and deploy a new term deposit deal on the network. ' +
    'Term deposits are NOT tradeable — investor locks funds with issuer and receives interest + principal at maturity. ' +
    'Parameters: termDays (default 3), faceValue in whole units (default 1000000), interestRate in basis points (default 500 = 5%).',
  parameters: z.object({
    termDays: z.number().optional().default(3).describe('Term length in days (default 3)'),
    faceValue: z.number().optional().default(1000000).describe('Face value in whole units (default 1000000)'),
    interestRate: z.number().optional().default(500).describe('Interest rate in basis points (default 500 = 5%)'),
  }),
  execute: async ({ termDays = 3, faceValue = 1000000, interestRate = 500 }) => {
    const correlationId = uid();
    const result = await apiPost('/term-deposit', { correlationId, faceValue, interestRate, termDays });
    return JSON.stringify(result);
  },
};

const executeTermDepositTool = {
  method: 'execute_term_deposit',
  name: 'Execute Term Deposit',
  description:
    'Execute (settle) an existing term deposit — investor pays face value to issuer, locking funds until maturity.',
  parameters: z.object({
    correlationId: z.string().describe('The term deposit correlation ID'),
  }),
  execute: async ({ correlationId }) => {
    const result = await apiPost(`/term-deposit/${correlationId}/execute`);
    return JSON.stringify(result);
  },
};

const redeemTermDepositTool = {
  method: 'redeem_term_deposit',
  name: 'Redeem Term Deposit',
  description:
    'Redeem a term deposit at maturity — issuer returns face value + interest to investor.',
  parameters: z.object({
    correlationId: z.string().describe('The term deposit correlation ID'),
  }),
  execute: async ({ correlationId }) => {
    const result = await apiPost(`/term-deposit/${correlationId}/redeem`);
    return JSON.stringify(result);
  },
};

const checkTermDepositStatusTool = {
  method: 'check_term_deposit_status',
  name: 'Check Term Deposit Status',
  description: 'Get the current status of a term deposit (created/executed/redeemed, issued/expired flags).',
  parameters: z.object({
    correlationId: z.string().describe('The term deposit correlation ID'),
  }),
  execute: async ({ correlationId }) => {
    const result = await apiGet(`/term-deposit/${correlationId}`);
    return JSON.stringify(result);
  },
};

const showTermDepositBalancesTool = {
  method: 'show_term_deposit_balances',
  name: 'Show Term Deposit Balances',
  description: 'Show stablecoin balances for term deposit parties (issuer, investor, contract).',
  parameters: z.object({
    correlationId: z.string().describe('The term deposit correlation ID'),
  }),
  execute: async ({ correlationId }) => {
    const result = await apiGet(`/term-deposit/${correlationId}/balances`);
    return JSON.stringify(result);
  },
};

const termDepositPlugin = {
  name: 'imperium-term-deposit-plugin',
  version: '0.5.0',
  description:
    'Imperium Markets term deposit lifecycle tools — create, execute, redeem ' +
    'tokenised term deposits. Non-tradeable fixed-income instrument. Australian Capital Markets.',
  tools: (_context) => [
    createTermDepositTool,
    executeTermDepositTool,
    redeemTermDepositTool,
    checkTermDepositStatusTool,
    showTermDepositBalancesTool,
  ],
};

module.exports = { termDepositPlugin };
