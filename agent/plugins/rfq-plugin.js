/**
 * RFQ Plugin — Tools and system prompt for the web-based RFQ conversational flow.
 *
 * Provides:
 *   - get_annuity_quotes: returns mock Australian annuity provider quotes
 *   - RFQ_SYSTEM_PROMPT: instructs the agent to guide users through the RFQ stages
 *     and emit structured data blocks the frontend can parse and render.
 */
'use strict';

const { z } = require('zod');

// ── Mock Australian annuity providers ────────────────────────────────

const PROVIDERS = [
  { name: 'Challenger', baseRate: 5.12, logo: 'challenger' },
  { name: 'Resolution Life', baseRate: 5.08, logo: 'resolution' },
  { name: 'Generation Life', baseRate: 4.95, logo: 'generation' },
  { name: 'Allianz Retire+', baseRate: 4.82, logo: 'allianz' },
];

/**
 * Compute mock quotes. Rates shift slightly by age and premium tier.
 */
function computeQuotes({ age, premiumAmount, payoutFrequency = 'annual' }) {
  const ageFactor = age >= 65 ? 0.12 : age >= 60 ? 0.06 : 0;
  const premiumFactor = premiumAmount >= 500000 ? 0.05 : premiumAmount >= 250000 ? 0.02 : 0;

  const freqDivisor = { monthly: 12, quarterly: 4, annual: 1 }[payoutFrequency] || 1;

  return PROVIDERS.map((p) => {
    const rate = +(p.baseRate + ageFactor + premiumFactor).toFixed(2);
    const annualPayout = Math.round(premiumAmount * (rate / 100));
    const periodPayout = Math.round(annualPayout / freqDivisor);

    return {
      provider: p.name,
      logo: p.logo,
      rate: `${rate}%`,
      rateNum: rate,
      annualPayout,
      periodPayout,
      payoutFrequency,
    };
  }).sort((a, b) => b.rateNum - a.rateNum);
}

// ── Tool definitions ─────────────────────────────────────────────────

const getAnnuityQuotesTool = {
  method: 'get_annuity_quotes',
  name: 'Get Annuity Quotes',
  description:
    'Fetch live annuity quotes from Australian providers for a given age, premium amount, and payout frequency. ' +
    'Returns a ranked list of providers with rates and annual/period payouts. ' +
    'Call this tool when the user has provided their age and investment amount.',
  parameters: z.object({
    age: z.number().describe('Investor age in years'),
    premiumAmount: z.number().describe('Investment amount in AUD whole units (e.g. 500000)'),
    payoutFrequency: z
      .enum(['monthly', 'quarterly', 'annual'])
      .optional()
      .default('annual')
      .describe('Desired payout frequency (default: annual)'),
  }),
  execute: async ({ age, premiumAmount, payoutFrequency = 'annual' }) => {
    const quotes = computeQuotes({ age, premiumAmount, payoutFrequency });
    return JSON.stringify({
      quotes,
      updatedAt: new Date().toISOString(),
      disclaimer: 'Indicative rates only. Subject to provider PDS and market conditions.',
    });
  },
};

// ── Plugin export ────────────────────────────────────────────────────

const rfqPlugin = {
  name: 'imperium-rfq-plugin',
  version: '0.1.0',
  description: 'RFQ tools for the web-based conversational annuity quoting flow.',
  tools: (_context) => [getAnnuityQuotesTool],
};

// ── RFQ System Prompt ────────────────────────────────────────────────

const RFQ_SYSTEM_PROMPT = `You are the Imperium Annuity Advisor — a friendly Australian retirement specialist guiding investors through annuity quoting via chat.

Tone: warm, Australian ("G'day!", "No worries"), patient — one question at a time. Format money as A$X.

## RFQ Stages (follow in order)

**Stage 1 — Introduction**: Greet warmly, explain you'll find the best annuity rates, ask for age and investment amount.

**Stage 2 — Investment Summary**: Confirm age/amount, ask funding source and state of residence. Call get_annuity_quotes when you have age + amount. Present quotes, ask about payout frequency.

**Stage 3 — Beneficiary Info**: Ask beneficiary name/relationship and annuity type (lifetime, fixed-term, inflation-adjusted).

**Stage 4 — Final Review**: Summarise the full investment, ask for confirmation. On confirmation:
1. Call **create_annuity** (termDays=5, faceValue=premium amount)
2. Extract correlationId from result
3. Call **execute_deal** with that correlationId
4. Present on-chain results (addresses, tx hashes, coupons)
5. Emit investment card with real data (see blocks below)
Chat stays open after finalization for follow-up queries.

## Structured Data Blocks (REQUIRED)

Emit these fenced blocks so the frontend renders rich UI. Content must be valid JSON.
IMPORTANT: You MUST emit rfq-stage and rfq-chips in EVERY response, no exceptions. The chips should be contextual suggestions for what the user might say next.

~~~rfq-stage\\n{"stage":"STAGE_ID","progress":N}\\n~~~
~~~rfq-details\\n{"premiumAmount":N,"source":"SRC","age":N,"residence":"STATE"}\\n~~~
~~~rfq-quotes\\n[QUOTES_ARRAY_FROM_TOOL]\\n~~~
~~~rfq-chips\\n["chip1","chip2","chip3"]\\n~~~
~~~rfq-investment-card\\n{"provider":"NAME","ref":"CORR_ID","amount":N,"startDate":"DATE","firstPayment":"DATE","type":"TYPE","rate":"RATE","annuityAddress":"0x...","stablecoinAddress":"0x...","txCount":N}\\n~~~

Stage IDs: introduction (progress 10), investment_summary (50), beneficiary_info (75), final_review (100).

## Domain
Day-count: ACT/365. Settlement: T+2 AEST. Regulatory: ASIC/AFSL, AML/CTF (A$10k). APRA-regulated life offices. Transfer balance cap: A$1.9M.

If asked something off-topic, answer helpfully then steer back.`;

module.exports = { rfqPlugin, RFQ_SYSTEM_PROMPT };
