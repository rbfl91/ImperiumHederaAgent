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

// ── Mock Australian providers ────────────────────────────────────────

const ANNUITY_PROVIDERS = [
  { name: 'Challenger', baseRate: 5.12, logo: 'challenger' },
  { name: 'Resolution Life', baseRate: 5.08, logo: 'resolution' },
  { name: 'Generation Life', baseRate: 4.95, logo: 'generation' },
  { name: 'Allianz Retire+', baseRate: 4.82, logo: 'allianz' },
];

const TD_PROVIDERS = [
  { name: 'Westpac (WBC)', baseRate: 4.65, logo: 'westpac' },
  { name: 'National Australia Bank (NAB)', baseRate: 4.55, logo: 'nab' },
  { name: 'Commonwealth Bank (CBA)', baseRate: 4.50, logo: 'cba' },
  { name: 'ANZ', baseRate: 4.40, logo: 'anz' },
];

const NCD_PROVIDERS = [
  { name: 'Bank of Queensland (BOQ)', baseRate: 4.80, logo: 'boq' },
  { name: 'Macquarie Bank', baseRate: 4.70, logo: 'macquarie' },
  { name: 'Suncorp', baseRate: 4.55, logo: 'suncorp' },
  { name: 'Bendigo Bank', baseRate: 4.45, logo: 'bendigo' },
];

/**
 * Compute mock quotes. Rates shift slightly by age and premium tier.
 */
function computeQuotes({ age, premiumAmount, payoutFrequency = 'annual' }) {
  const ageFactor = age >= 65 ? 0.12 : age >= 60 ? 0.06 : 0;
  const premiumFactor = premiumAmount >= 500000 ? 0.05 : premiumAmount >= 250000 ? 0.02 : 0;

  const freqDivisor = { monthly: 12, quarterly: 4, annual: 1 }[payoutFrequency] || 1;

  return ANNUITY_PROVIDERS.map((p) => {
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

// ── Term Deposit quotes ──────────────────────────────────────────────

function computeTDQuotes({ faceValue, termDays = 90 }) {
  const termFactor = termDays >= 180 ? 0.15 : termDays >= 90 ? 0.08 : 0;
  const sizeFactor = faceValue >= 500000 ? 0.10 : faceValue >= 250000 ? 0.05 : 0;

  return TD_PROVIDERS.map((p) => {
    const rate = +(p.baseRate + termFactor + sizeFactor).toFixed(2);
    const interestAmount = Math.round(faceValue * (rate / 100) * (termDays / 365));
    return {
      provider: p.name,
      logo: p.logo,
      rate: `${rate}%`,
      rateNum: rate,
      faceValue,
      termDays,
      interestAmount,
      totalReturn: faceValue + interestAmount,
    };
  }).sort((a, b) => b.rateNum - a.rateNum);
}

const getTermDepositQuotesTool = {
  method: 'get_term_deposit_quotes',
  name: 'Get Term Deposit Quotes',
  description:
    'Fetch live term deposit quotes from Australian banks for a given face value and term length. ' +
    'Returns ranked list of banks with rates and interest amounts. ' +
    'Call this when the user wants a term deposit and has provided amount and desired term.',
  parameters: z.object({
    faceValue: z.number().describe('Deposit amount in AUD whole units'),
    termDays: z.number().optional().default(90).describe('Term length in days (default 90)'),
  }),
  execute: async ({ faceValue, termDays = 90 }) => {
    const quotes = computeTDQuotes({ faceValue, termDays });
    return JSON.stringify({
      quotes,
      assetType: 'term-deposit',
      updatedAt: new Date().toISOString(),
      disclaimer: 'Indicative rates only. Subject to issuer terms and market conditions.',
    });
  },
};

// ── NCD quotes ───────────────────────────────────────────────────────

function computeNCDQuotes({ faceValue, termDays = 90 }) {
  const termFactor = termDays >= 180 ? 0.12 : termDays >= 90 ? 0.06 : 0;
  const sizeFactor = faceValue >= 500000 ? 0.08 : faceValue >= 250000 ? 0.04 : 0;

  return NCD_PROVIDERS.map((p) => {
    const rate = +(p.baseRate + termFactor + sizeFactor).toFixed(2);
    const discount = Math.round(faceValue * (rate / 100) * (termDays / 365));
    const discountedPrice = faceValue - discount;
    return {
      provider: p.name,
      logo: p.logo,
      rate: `${rate}%`,
      rateNum: rate,
      faceValue,
      termDays,
      discountedPrice,
      yield: discount,
    };
  }).sort((a, b) => b.rateNum - a.rateNum);
}

const getNCDQuotesTool = {
  method: 'get_ncd_quotes',
  name: 'Get NCD Quotes',
  description:
    'Fetch live NCD (Negotiable Certificate of Deposit) quotes from Australian banks. ' +
    'NCDs are bought at a discount and redeemed at full face value at maturity. Tradeable on secondary market. ' +
    'Returns ranked list with discount prices and yields. Call when user wants an NCD.',
  parameters: z.object({
    faceValue: z.number().describe('Face value in AUD whole units'),
    termDays: z.number().optional().default(90).describe('Term length in days (default 90)'),
  }),
  execute: async ({ faceValue, termDays = 90 }) => {
    const quotes = computeNCDQuotes({ faceValue, termDays });
    return JSON.stringify({
      quotes,
      assetType: 'ncd',
      updatedAt: new Date().toISOString(),
      disclaimer: 'Indicative rates only. Subject to issuer terms and market conditions.',
    });
  },
};

// ── Plugin export ────────────────────────────────────────────────────

const rfqPlugin = {
  name: 'imperium-rfq-plugin',
  version: '0.2.0',
  description: 'RFQ tools for the web-based conversational flow — annuities, term deposits, and NCDs.',
  tools: (_context) => [getAnnuityQuotesTool, getTermDepositQuotesTool, getNCDQuotesTool],
};

// ── RFQ System Prompt ────────────────────────────────────────────────

const RFQ_SYSTEM_PROMPT = `You are the Imperium Markets Advisor — a friendly Australian capital markets specialist guiding investors through tokenised fixed-income products via chat.

Tone: warm, Australian ("G'day!", "No worries"), patient — one question at a time. Format money as A$X.

## Available Products

You can recommend THREE types of tokenised assets. Based on the user's goals, recommend the most appropriate:

1. **Annuity** — Regular income stream (coupons) + face value at maturity. Tradeable. Best for: retirees seeking steady income.
   - Issuers: Challenger, Resolution Life, Generation Life, Allianz Retire+
2. **Term Deposit (TD)** — Fixed amount locked for a term, interest + principal returned at maturity. NOT tradeable. Best for: conservative investors wanting capital preservation.
   - Issuers: Westpac, NAB, CBA, ANZ
3. **NCD (Negotiable Certificate of Deposit)** — Bought at a discount to face value, redeemed at full face value at maturity. Tradeable on secondary market. Best for: investors wanting short-term yield with liquidity.
   - Issuers: BOQ, Macquarie Bank, Suncorp, Bendigo Bank

## RFQ Stages (follow in order)

**Stage 1 — Introduction**: Greet warmly, explain you help find the best rates across annuities, term deposits, and NCDs. Ask about their investment goals, age, and amount.

**Stage 2 — Investment Summary**: Based on goals, recommend the SINGLE best product type. Confirm details, ask funding source and state of residence. Then fetch quotes for ONLY the recommended product (do NOT call multiple quote tools):
- If Annuity: call get_annuity_quotes (needs age + amount)
- If Term Deposit: call get_term_deposit_quotes (needs amount + termDays)
- If NCD: call get_ncd_quotes (needs amount + termDays)
IMPORTANT: Only call ONE quote tool per response. Emit the quotes array from that single tool in the rfq-quotes block. Do NOT combine quotes from multiple tools.
Present quotes to user. For annuities, ask payout frequency.

**Stage 3 — Beneficiary Info**: Ask beneficiary name/relationship and product specifics (annuity type for annuities, term length confirmation for TD/NCD).

**Stage 4 — Final Review**: Summarise the full investment, ask for confirmation. On confirmation, execute on-chain:

For **Annuity**:
1. Call create_annuity (termDays=5, faceValue=amount)
2. Extract correlationId → call execute_deal with it

For **Term Deposit**:
1. Call create_term_deposit (termDays=term, faceValue=amount, interestRate from selected quote in bps)
2. Extract correlationId → call execute_term_deposit with it

For **NCD**:
1. Call create_ncd (termDays=term, faceValue=amount, interestRate from selected quote in bps)
2. Extract correlationId → call execute_ncd with it

Present on-chain results and emit investment card. Chat stays open after finalization.

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
