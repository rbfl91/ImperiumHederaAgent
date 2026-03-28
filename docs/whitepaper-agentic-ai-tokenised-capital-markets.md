<div style="page-break-after: always; text-align: center; padding-top: 120px;">

<svg width="120" height="93" viewBox="0 0 520 285" fill="none" xmlns="http://www.w3.org/2000/svg" style="margin-bottom: 40px;">
  <g transform="translate(0 -1)">
    <path fill-rule="evenodd" clip-rule="evenodd" fill="#F8C200"
      d="M513.6,282.7V55.9L191,150.8C305.6,174.9,414.9,219.6,513.6,282.7" />
    <path fill-rule="evenodd" clip-rule="evenodd" fill="#F8C200"
      d="M416.2,228.15h7.2V6.66L5.1,129.76v0.2C152.4,132.36,291.7,167.36,416.2,228.15" />
    <path fill-rule="evenodd" clip-rule="evenodd" fill="#F35D00"
      d="M191,150.8c0.5,0.1,1,0.2,1.5,0.3c1.4,0.3,2.8,0.6,4.2,0.9c6.7,1.5,13.3,3,19.9,4.5
      c2.6,0.6,5.1,1.3,7.7,1.9c8.3,2,16.5,4.2,24.7,6.5c5.4,1.5,10.8,3,16.1,4.6c2.6,0.8,5.1,1.5,7.7,2.3
      c6.2,1.9,12.3,3.8,18.5,5.8c1.6,0.5,3.3,1,4.9,1.6c7.9,2.6,15.8,5.3,23.6,8.2c0.7,0.3,1.4,0.5,2.1,0.8
      c7,2.5,13.9,5.2,20.8,7.8c2,0.8,4,1.6,5.9,2.4c13.6,5.4,27.1,11.1,40.5,17.1c1.8,0.8,3.6,1.6,5.4,2.4
      c6.7,3.1,13.4,6.2,20,9.4l1.5,0.7h7.2V82.4L191,150.8z" />
  </g>
</svg>

<div style="border-top: 4px solid #D4A843; border-bottom: 4px solid #D4A843; padding: 40px 20px; margin: 0 60px;">

<h1 style="font-size: 28px; font-weight: 700; color: #1a1a2e; margin-bottom: 12px; line-height: 1.3;">Agentic AI and Tokenised Capital Markets</h1>

<h2 style="font-size: 20px; font-weight: 400; color: #D4A843; margin-bottom: 40px;">Unlocking Australia's $24 Billion Digital Finance Opportunity</h2>

<p style="font-size: 14px; color: #555; margin-bottom: 6px;"><strong>Imperium Markets Pty Ltd</strong></p>
<p style="font-size: 13px; color: #777; margin-bottom: 6px;">March 2026</p>
<p style="font-size: 12px; color: #999; margin-top: 30px;">Industry White Paper</p>
<p style="font-size: 11px; color: #999;">Prepared in conjunction with the Hedera Hello Future Apex Hackathon 2026</p>
<p style="font-size: 11px; color: #999;">and research findings from the Digital Finance Cooperative Research Centre (DFCRC)</p>

</div>

<p style="font-size: 11px; color: #aaa; margin-top: 80px;">CONFIDENTIAL — For discussion purposes with DFCRC and industry stakeholders</p>

</div>

## Table of Contents

1. Executive Summary
2. The State of Australian Capital Markets
3. Tokenisation as Foundation
4. The Agentic Layer: AI as Market Infrastructure
5. Case Study: Imperium Markets Agent
6. Impact and Implications
7. Roadmap and Recommendations
8. Conclusion

---

## 1. Executive Summary

Australia's wholesale capital markets — encompassing annuities, term deposits, negotiable certificates of deposit (NCDs), and broader money market securities — underpin the nation's retirement system and bank funding mechanisms. Yet the infrastructure supporting these markets remains largely manual, fragmented, and operationally expensive.

New research from the Digital Finance Cooperative Research Centre (DFCRC) has quantified the cost of this inefficiency: Australia stands to unlock **$24 billion in annual benefits** by upgrading the technology infrastructure of its financial markets. This figure, encompassing reduced settlement risk, lower operational costs, and improved capital efficiency, represents one of the largest untapped opportunities in Australian financial services.

Imperium Markets, as the **only market operator** to participate in the Reserve Bank of Australia (RBA) and DFCRC's **Project Acacia**, demonstrated that tokenising wholesale bank deposits, money market securities, and annuities is not only feasible but immediately actionable — without requiring regulatory changes.

However, tokenisation alone is necessary but not sufficient. While it provides the settlement and ownership layer, it does not address the upstream inefficiencies: manual quote comparison, counterparty discovery, compliance workflows, and the sheer complexity that prevents smaller participants from accessing institutional-grade products.

This white paper argues that **agentic AI** — autonomous, tool-equipped AI systems that can reason, negotiate, and execute on behalf of market participants — represents the missing layer between tokenised infrastructure and broad market adoption. We present a working proof-of-concept built during the Hedera Hello Future Apex Hackathon 2026: a multi-asset AI agent that guides investors through natural conversation, fetches live quotes from 12 Australian providers, and executes fully settled deals on-chain via Hedera's distributed ledger.

The convergence of tokenisation and agentic AI has the potential to:

- Reduce time-to-execution from **days to minutes**
- Cut operational costs by automating manual RFQ, compliance, and settlement workflows
- Democratise access to institutional-grade fixed-income products
- Enable a new paradigm of **agent-to-agent markets**, where autonomous systems discover, negotiate, and settle on behalf of their principals

The technology exists today. What is needed is action and collaboration from Australia's banks, asset managers, and regulators.

---

## 2. The State of Australian Capital Markets

### 2.1 Market Structure and Scale

Australia's fixed-income markets are a cornerstone of the domestic financial system. The key instruments relevant to this paper are:

- **Annuities**: Issued by APRA-regulated life offices (Challenger, Resolution Life, Generation Life, Allianz Retire+), annuities provide guaranteed income streams for retirees. The Australian annuity market is valued at over $20 billion in assets under management, with demand accelerating as the population ages and the superannuation system matures.

- **Term Deposits (TDs)**: Offered by Authorised Deposit-taking Institutions (ADIs) — the major banks (Westpac, NAB, CBA, ANZ) and regional banks — TDs represent a core savings and funding instrument. Total term deposit holdings in Australia exceed $900 billion.

- **Negotiable Certificates of Deposit (NCDs)**: Issued at a discount to face value by banks (BOQ, Macquarie Bank, Suncorp, Bendigo Bank), NCDs are tradeable money market instruments that provide short-term wholesale funding. The Australian NCD market is a key component of the bank bill swap rate (BBSW) and broader money market.

### 2.2 Operational Inefficiencies

Despite their importance, these markets operate on infrastructure that has changed little in decades:

| Pain Point | Current State | Impact |
|---|---|---|
| **Quote Discovery** | Phone calls, email, relationship-based | Hours to days per RFQ cycle |
| **Rate Comparison** | Manual spreadsheet compilation | Suboptimal pricing for investors |
| **Settlement** | T+2 AEST, manual reconciliation | Settlement risk, capital lock-up |
| **Compliance** | Manual AML/CTF checks, paper-based KYC | Delays, cost, human error |
| **Secondary Trading** | OTC, bilateral negotiation | Illiquidity, price opacity |
| **Reporting** | Batch-based, end-of-day | Stale risk data, regulatory lag |

These inefficiencies are not merely inconvenient — they are structurally expensive. The DFCRC's research estimates $24 billion in annual benefits from addressing them through technology modernisation.

### 2.3 The DFCRC $24 Billion Opportunity

The DFCRC, established under the Australian Government's Cooperative Research Centres program, has conducted the most comprehensive analysis to date of the benefits of digitising Australia's financial market infrastructure. Their findings are stark:

- **Reduced settlement risk**: Atomic, same-day settlement eliminates counterparty exposure during the settlement window.
- **Lower operational costs**: Automation of reconciliation, compliance, and reporting workflows.
- **Improved capital efficiency**: Faster settlement frees trapped collateral and reduces margin requirements.
- **Market accessibility**: Lower barriers to entry for smaller ADIs, fund managers, and retail investors.

As Imperium Markets Chairman Rod Lewis noted: *"For years we have been saying that there are immense efficiencies to be gained from tokenising the financial markets that fund the Australian economy. We are not sure what everyone is waiting for — there are things we can do today to start the tokenisation journey that don't require regulation changes."*

### 2.4 Project Acacia: Proof of Feasibility

Project Acacia, a joint initiative of the RBA and DFCRC, brought together regulators, financial institutions, and market operators to test the feasibility of tokenised settlement on distributed ledger technology. Imperium Markets participated as the **only market operator**, demonstrating:

- Tokenised wholesale bank deposit settlement
- Tokenised money market securities (NCDs)
- Tokenised annuity issuance and lifecycle management
- Stablecoin-based settlement (eAUD equivalents)

Project Acacia confirmed that the technical foundations for tokenised capital markets are sound. The question is no longer *whether* tokenisation works, but *how quickly* the market can adopt it — and what additional capabilities are needed to drive adoption.

### 2.5 International Context

Australia is not operating in isolation. Comparable jurisdictions are advancing rapidly:

- **Singapore (MAS Project Guardian)**: Tokenised bonds and foreign exchange on DLT, with participation from DBS, JPMorgan, and Standard Chartered.
- **United Kingdom (FCA Digital Securities Sandbox)**: Regulatory sandbox for tokenised financial instruments, launched 2024.
- **European Union (DLT Pilot Regime)**: Pan-EU framework for DLT-based market infrastructure, operational since 2023.
- **Switzerland (SIX Digital Exchange)**: Fully regulated exchange for digital securities, with tokenised bonds trading since 2021.

Australia risks falling behind if industry participants do not act with urgency.

### 2.6 The Cost of Inaction

The $24 billion figure identified by the DFCRC is not merely an upside opportunity — it represents an ongoing cost borne by the Australian financial system every year that modernisation is deferred.

**Settlement risk exposure**: Under the current T+2 settlement cycle, approximately $30 billion in transactions remain unsettled at any given time across Australian fixed-income markets. Each day of delayed settlement represents counterparty exposure that must be collateralised, tying up capital that could otherwise be productively deployed.

**Operational redundancy**: Every participant in a bilateral OTC transaction maintains their own record of the trade. Reconciliation between these records — often conducted overnight in batch processes — consumes significant operational resources and is a persistent source of trade breaks and disputes.

**Exclusion of smaller participants**: The relationship-based nature of Australian wholesale markets creates structural barriers for smaller ADIs, credit unions, and fund managers. A regional bank seeking to issue NCDs must maintain dealer relationships and operational infrastructure that is disproportionate to their issuance volume. This concentrates market activity among the major banks and limits competition.

**Information asymmetry**: Investors — particularly retail investors approaching retirement — have limited visibility into the full range of annuity, TD, and NCD products available. The traditional advice model, while valuable, is constrained by the adviser's own network and the manual effort required to source and compare quotes.

These costs are not theoretical. They are experienced daily by every participant in Australian capital markets, from the largest ADI to the individual retiree seeking the best annuity rate.

---

## 3. Tokenisation as Foundation

### 3.1 What Tokenisation Delivers

Tokenisation — the representation of financial instruments as programmable tokens on a distributed ledger — provides several foundational capabilities:

**Atomic Settlement**: The transfer of ownership and payment occurs simultaneously in a single transaction. This eliminates settlement risk (the possibility that one leg of the trade settles while the other fails) and the need for central counterparties in many scenarios.

**Programmable Lifecycle**: Smart contracts encode the full instrument lifecycle — issuance, coupon payments, maturity, redemption, and secondary transfer — as verifiable, self-executing code. This reduces the need for manual intervention and eliminates discrepancies between counterparties.

**24/7 Markets**: Unlike traditional markets bound by business hours and T+2 settlement cycles, tokenised instruments can be issued, traded, and settled at any time.

**Fractional Ownership**: Tokens can represent any fraction of an instrument, lowering minimum investment thresholds and improving accessibility.

**Immutable Audit Trail**: Every transaction is permanently recorded on-chain, providing regulators and auditors with real-time visibility into market activity.

### 3.2 Smart Contract Architecture for Fixed Income

The Imperium Markets proof-of-concept implements three distinct smart contract models, each reflecting the unique characteristics of its instrument class:

| Feature | AnnuityToken | TermDepositToken | NCDToken |
|---|---|---|---|
| **Cash Flow** | Periodic coupons + face value at maturity | Principal + interest at maturity | Discount purchase, face value at maturity |
| **Tradeable** | Yes (secondary market) | No (locked until maturity) | Yes (secondary market) |
| **Settlement** | safeTransferFrom (ERC-20) | safeTransferFrom (ERC-20) | safeTransferFrom (ERC-20) |
| **Key Functions** | acceptAndIssue, payCoupon, transferAnnuity, redeemMaturity | acceptAndIssue, redeemMaturity | acceptAndIssue, transferNCD, redeemMaturity |
| **Idempotency** | couponPaid[] mapping | N/A (single redemption) | N/A (single redemption) |
| **Interest Model** | Basis points, periodic | Basis points, accrued | Discount to face value |

All contracts inherit from OpenZeppelin's security primitives (ReentrancyGuard, SafeERC20) and settle in an ERC-20 stablecoin (eAUD), reflecting the DFCRC's work on tokenised Australian dollar settlement.

### 3.3 Stablecoin Settlement and the eAUD Context

On-chain settlement requires a tokenised representation of the Australian dollar. The Imperium Markets proof-of-concept uses an ERC-20 stablecoin (ImperiumAUD / eAUD) to settle all transactions — mirroring the eAUD concept explored in the RBA's CBDC research and Project Acacia.

In a production environment, this settlement token could be:

- A **wholesale CBDC** issued by the RBA
- A **regulated stablecoin** issued by an ADI
- A **tokenised bank deposit** (the model tested in Project Acacia)

The choice of settlement token is orthogonal to the smart contract architecture — the contracts accept any ERC-20-compliant token, providing flexibility as the regulatory framework for digital money evolves.

### 3.4 Regulatory Alignment

A critical insight from Imperium Markets' experience is that tokenisation of existing financial instruments can proceed under current Australian regulation:

- **ASIC/AFSL**: Tokenised annuities, TDs, and NCDs remain financial products under existing definitions. The underlying regulatory obligations (disclosure, conduct, suitability) apply regardless of the technology layer.
- **APRA**: Prudential requirements for ADIs and life offices are instrument-based, not technology-based.
- **AML/CTF**: Transaction monitoring, identity verification, and reporting obligations (A$10,000 threshold) can be embedded directly in smart contract logic or agent workflows.
- **Transfer Balance Cap**: The A$1.9 million cap on retirement income streams applies to tokenised annuities as it does to traditional ones.

As Rod Lewis has emphasised, there are things the market can do today without waiting for regulatory changes. The technology is ready; the instruments are regulated; what is needed is industry collaboration.

---

## 4. The Agentic Layer: AI as Market Infrastructure

### 4.1 Beyond Chatbots: What Are AI Agents?

The term "AI agent" is often conflated with conversational chatbots. In the context of financial markets, the distinction is critical.

A **chatbot** responds to queries. An **agent** takes action.

An AI agent in capital markets is an autonomous system that can:

1. **Reason** about an investor's goals, risk profile, and regulatory constraints
2. **Discover** suitable products and counterparties across the market
3. **Compare** competing quotes in real time using domain expertise
4. **Negotiate** terms within predefined parameters
5. **Execute** settlement on-chain through smart contract interaction
6. **Report** on positions, compliance, and performance

This represents a fundamental shift from "tools that humans use" to "systems that act on behalf of humans" — with appropriate oversight and authorisation.

### 4.2 Why Tokenisation Needs Agents

Tokenisation provides the rails. Agents provide the intelligence to use them.

Consider the current RFQ (Request for Quote) process for an annuity:

**Traditional flow (3-5 business days):**
1. Financial adviser meets with client, assesses needs (Day 1)
2. Adviser contacts 3-4 life offices by phone/email for quotes (Day 1-2)
3. Life offices respond with indicative rates (Day 2-3)
4. Adviser compiles comparison, presents to client (Day 3-4)
5. Client selects provider, adviser submits application (Day 4)
6. Settlement, documentation, and compliance checks (Day 4-5)

**Agent-assisted flow (minutes):**
1. Investor describes goals in natural language
2. Agent assesses suitability, recommends product type
3. Agent fetches live quotes from all providers simultaneously
4. Agent presents ranked comparison with domain analysis
5. Investor confirms selection
6. Agent executes on-chain: contract deployment, funding, settlement — all in one session

The efficiency gain is not merely speed — it is the elimination of entire categories of manual work and the errors they introduce.

**Figure 2: Traditional vs Agent-Assisted RFQ Flow**

```
  TRADITIONAL RFQ (3-5 Business Days)        AGENT-ASSISTED RFQ (Minutes)
  ════════════════════════════════════        ════════════════════════════

  Day 1  ┌─────────────────────────┐         ┌─────────────────────────┐
         │ Adviser meets client,   │         │ Investor: "I want       │
         │ assesses needs manually │         │ steady retirement       │
         └──────────┬──────────────┘         │ income, A$500k"         │
                    │                        └──────────┬──────────────┘
  Day 1-2 ┌────────▼──────────────┐                    │  ⚡ seconds
         │ Adviser phones/emails  │         ┌──────────▼──────────────┐
         │ 3-4 life offices for   │         │ Agent fetches quotes    │
         │ quotes individually    │         │ from ALL 12 providers   │
         └──────────┬─────────────┘         │ simultaneously          │
                    │                        └──────────┬──────────────┘
  Day 2-3 ┌────────▼──────────────┐                    │  ⚡ seconds
         │ Life offices respond   │         ┌──────────▼──────────────┐
         │ at their convenience   │         │ Agent presents ranked   │
         └──────────┬─────────────┘         │ comparison with domain  │
                    │                        │ analysis                │
  Day 3-4 ┌────────▼──────────────┐         └──────────┬──────────────┘
         │ Adviser compiles       │                    │  ⚡ seconds
         │ spreadsheet, presents  │         ┌──────────▼──────────────┐
         │ comparison to client   │         │ Investor confirms       │
         └──────────┬─────────────┘         │ selection               │
                    │                        └──────────┬──────────────┘
  Day 4   ┌────────▼──────────────┐                    │  ⚡ minutes
         │ Client selects, adviser│         ┌──────────▼──────────────┐
         │ submits application    │         │ Agent executes on-chain:│
         └──────────┬─────────────┘         │ deploy → fund → settle │
                    │                        │ → pay coupons → done   │
  Day 4-5 ┌────────▼──────────────┐         └──────────┬──────────────┘
         │ Settlement, compliance │                    │
         │ checks, documentation  │         ┌──────────▼──────────────┐
         └────────────────────────┘         │ ✓ Investment card with  │
                                            │   contract addresses,   │
                                            │   tx hashes, explorer   │
                                            │   links                 │
                                            └─────────────────────────┘
```

### 4.3 Agent-to-Agent Communication: The Next Frontier

Perhaps the most transformative capability of agentic AI in financial markets is **agent-to-agent communication** — where autonomous systems representing different market participants discover each other, negotiate, and settle without human intermediation.

The Hedera Consensus Service (HCS) provides a protocol-level foundation for this through **HCS-10 (OpenConvAI)**, which enables:

- **Agent Discovery**: Agents register their capabilities (skills) on a decentralised registry, allowing other agents to find counterparties by capability.
- **Secure Communication**: Agents establish authenticated, encrypted communication channels via HCS topics.
- **Skill Invocation**: One agent can invoke another's capabilities (e.g., "issue an annuity with these parameters") through a standardised protocol.
- **Audit Trail**: All agent-to-agent messages are recorded on the Hedera ledger, providing a complete, tamper-proof record of negotiations and executions.

In this paradigm, an investor's agent could autonomously:
1. Query the registry for agents representing life offices
2. Request quotes from each
3. Compare responses using pre-agreed criteria
4. Execute settlement with the best counterparty
5. Report the completed transaction to the investor

This is not speculative. The Imperium Markets Agent is registered on Hedera's HOL Registry with **18 discoverable skills** spanning annuity, term deposit, and NCD lifecycle management. Any agent on the Hedera network can discover and interact with it.

To illustrate the transformative potential: consider a superannuation fund with $50 billion in assets under management, seeking to allocate $500 million across annuities, TDs, and NCDs. Today, this requires a team of portfolio managers and dealers engaging bilaterally with dozens of counterparties over days or weeks. In an agent-to-agent paradigm, the fund's agent could:

- Simultaneously query every registered issuer agent on the network
- Receive and rank quotes across all three asset classes in seconds
- Apply the fund's investment policy (duration targets, credit limits, concentration limits) automatically
- Execute the optimal allocation across multiple counterparties atomically
- Generate a complete audit trail for the fund's compliance team and regulators

The infrastructure cost of this interaction is marginal — consensus messages on Hedera and gas fees for EVM settlement. The operational cost savings compared to the current manual process are substantial.

### 4.4 The Operational Efficiency Case

The convergence of agentic AI and tokenisation delivers efficiency gains across multiple dimensions:

| Dimension | Traditional | Agent + Tokenised | Improvement |
|---|---|---|---|
| **Quote Discovery** | 1-3 days | Real-time (seconds) | >99% time reduction |
| **Rate Comparison** | Manual, error-prone | Automated, ranked | Eliminates human error |
| **Settlement** | T+2, manual reconciliation | Atomic, same-session | Eliminates settlement risk |
| **Compliance** | Manual AML/CTF checks | Embedded in agent workflow | Real-time, automated |
| **Secondary Trading** | OTC phone calls | Agent-to-agent protocol | 24/7 liquidity |
| **Reporting** | End-of-day batch | On-chain, real-time | Continuous visibility |
| **Staffing** | One adviser per client session | One agent per unlimited sessions | Linear to marginal cost |

These gains compound at scale. A single agent instance can serve multiple concurrent investors, each with personalised recommendations, while executing atomic settlements that would traditionally require teams of operations staff.

---

## 5. Case Study: Imperium Markets Agent

### 5.1 Architecture Overview

**Figure 1: Imperium Markets Agent — System Architecture**

```
 ┌─────────────────────────────────────────────────────────────────────┐
 │                    INVESTOR (Browser / CLI)                         │
 │              React UI with live wallet panel + chat                 │
 └────────────────┬──────────────────────┬────────────────────────────┘
                  │ WebSocket (/ws)      │ REST (fetch)
                  │ Streaming responses  │ Wallet, quotes
                  ▼                      ▼
 ┌─────────────────────────────────────────────────────────────────────┐
 │                    IMPERIUM API (Node.js / Express)                 │
 │                                                                     │
 │  ┌──────────────┐  ┌──────────────────────────────────────────┐    │
 │  │  LLM Agent   │  │          REST Endpoints (25+)            │    │
 │  │  Claude via   │  │  /deal  /term-deposit  /ncd  /wallet    │    │
 │  │  LangChain   │  │  /deal/:id/execute  /transfer  /redeem   │    │
 │  │  (33+ tools) │  └──────────────────────────────────────────┘    │
 │  └──────┬───────┘                                                   │
 │         │                                                           │
 │  ┌──────┴────────────────────────────────────────────────────┐     │
 │  │                    PLUGIN LAYER                            │     │
 │  │                                                            │     │
 │  │  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────────────┐ │     │
 │  │  │Annuity  │ │  Term   │ │   NCD   │ │   RFQ Plugin    │ │     │
 │  │  │Plugin   │ │Deposit  │ │ Plugin  │ │ 12 AU providers │ │     │
 │  │  │(9 tools)│ │Plugin   │ │(6 tools)│ │   (3 tools)     │ │     │
 │  │  │         │ │(5 tools)│ │         │ │                 │ │     │
 │  │  └─────────┘ └─────────┘ └─────────┘ └─────────────────┘ │     │
 │  │  ┌──────────────────┐ ┌──────────────────────────────────┐│     │
 │  │  │   HCS-10 Plugin  │ │  Hedera Agent Kit (7+ tools)    ││     │
 │  │  │ Agent-to-Agent   │ │  Account, Token, Consensus      ││     │
 │  │  │   (6 tools)      │ │  queries                        ││     │
 │  │  └──────────────────┘ └──────────────────────────────────┘│     │
 │  └───────────────────────────────────────────────────────────┘     │
 └────────────────────────────────┬────────────────────────────────────┘
                                  │
                                  ▼
 ┌─────────────────────────────────────────────────────────────────────┐
 │                    HEDERA NETWORK (Testnet)                         │
 │                                                                     │
 │  ┌───────────────────────────────┐  ┌────────────────────────────┐ │
 │  │     EVM (Smart Contracts)     │  │  Hedera Consensus Service  │ │
 │  │                               │  │         (HCS-10)           │ │
 │  │  ┌──────────┐ ┌────────────┐ │  │                            │ │
 │  │  │ Annuity  │ │  Term      │ │  │  ┌──────────────────────┐  │ │
 │  │  │  Token   │ │  Deposit   │ │  │  │   HOL Registry       │  │ │
 │  │  └──────────┘ │  Token     │ │  │  │   18 skills          │  │ │
 │  │  ┌──────────┐ └────────────┘ │  │  │   Agent-to-Agent     │  │ │
 │  │  │   NCD    │ ┌────────────┐ │  │  │   discovery +        │  │ │
 │  │  │  Token   │ │  eAUD      │ │  │  │   invocation         │  │ │
 │  │  └──────────┘ │ Stablecoin │ │  │  └──────────────────────┘  │ │
 │  │               └────────────┘ │  │                            │ │
 │  └───────────────────────────────┘  └────────────────────────────┘ │
 └─────────────────────────────────────────────────────────────────────┘
```

The Imperium Markets Agent is a working proof-of-concept built on the following stack:

| Layer | Technology | Role |
|---|---|---|
| **AI Reasoning** | Claude (Anthropic) via LangChain | Natural language understanding, tool selection, domain reasoning |
| **Tool Framework** | LangChain Tool Plugins | 33+ tools across 6 domains |
| **API** | Node.js / Express | Smart contract orchestration, deal lifecycle management |
| **Streaming** | WebSocket | Real-time LLM response streaming to browser |
| **Smart Contracts** | Solidity (OpenZeppelin) | 4 contracts: AnnuityToken, TermDepositToken, NCDToken, ImperiumStableCoin |
| **DLT** | Hedera Testnet (EVM + HCS) | Settlement, consensus, agent-to-agent |
| **Frontend** | React / Vite | Conversational RFQ interface with live wallet panel |
| **Agent Protocol** | HCS-10 (OpenConvAI) | Agent discovery, connection, skill invocation |

### 5.2 The 33-Tool Architecture

The agent's capabilities are organised into six plugin domains:

**Annuity Plugin (9 tools)**: Full lifecycle management — create, execute (settle), transfer (secondary market), redeem (maturity), status checks, balance queries, deal listing, transaction audit, and health monitoring.

**Term Deposit Plugin (5 tools)**: Issuance, settlement, redemption at maturity (principal + interest), status, and balance queries. Non-tradeable by design, reflecting the locked nature of term deposits.

**NCD Plugin (6 tools)**: Issuance at discount, settlement, secondary market transfer at any price, redemption at face value, status, and balance queries. Tradeable, reflecting the negotiable nature of NCDs.

**RFQ Plugin (3 tools)**: Real-time quote fetching from 12 Australian providers — 4 life offices for annuities (Challenger, Resolution Life, Generation Life, Allianz Retire+), 4 major banks for term deposits (Westpac, NAB, CBA, ANZ), and 4 issuers for NCDs (BOQ, Macquarie Bank, Suncorp, Bendigo Bank). Quotes are ranked by rate with domain-specific adjustments.

**HCS-10 Plugin (6 tools)**: Agent-to-agent capabilities — registry search, connection establishment, skill invocation on remote agents, connection management, and inbound request listener.

**Hedera Native Queries (7+ tools via hedera-agent-kit)**: Account information, token balances, consensus topic queries, and transaction details directly from the Hedera network.

### 5.3 Conversational RFQ Flow

The agent guides investors through a structured four-stage flow:

**Stage 1 — Introduction (10%)**: The agent greets the investor, explains the three available product types, and asks about investment goals, age, amount, and preferences. The conversation is natural and adaptive — an investor who says "I want steady retirement income" is guided toward annuities, while "I want to save safely for a few years" points toward term deposits.

**Stage 2 — Investment Summary (50%)**: Based on the investor's goals, the agent recommends the optimal product type and fetches live quotes from all relevant providers simultaneously. Quotes are presented in a ranked comparison table with rates, projected payouts, and domain analysis. The agent explains the trade-offs in plain language.

**Stage 3 — Beneficiary Information (75%)**: The agent collects beneficiary details and confirms product-specific parameters (annuity type, term length, payout frequency).

**Stage 4 — Final Review and Execution (100%)**: The agent presents a comprehensive summary and requests confirmation. Upon confirmation, the agent executes the full on-chain workflow:

For an annuity, this means:
1. Deploying the AnnuityToken and stablecoin contracts to Hedera
2. Funding the investor account with stablecoin (eAUD)
3. Executing the `acceptAndIssue` function (investor pays face value to issuer)
4. Approving and paying all coupons
5. Returning a success card with contract addresses, transaction hashes, and explorer links

The entire process — from "G'day" to fully settled on-chain instrument — takes minutes.

### 5.4 Agent-to-Agent Registration

The Imperium Markets Agent is registered on Hedera's HOL Registry with the following identity:

- **Agent Account**: 0.0.8314627
- **Inbound Topic**: 0.0.8314635 (receives connection requests and skill invocations)
- **Outbound Topic**: 0.0.8314632 (publishes responses)
- **Registered Skills**: 18 (spanning annuity, term deposit, and NCD lifecycle operations)

Any agent on the Hedera network can discover the Imperium Markets Agent by querying the registry, establish a secure connection via HCS, and invoke any of its 18 skills programmatically. This means a superannuation fund's agent, for example, could autonomously request annuity quotes, compare them across multiple providers, and settle the optimal deal — all without human involvement on either side.

### 5.5 Lessons from Deployment

The proof-of-concept was deployed live on Hedera Testnet and accessible via a public URL during the hackathon. Key technical learnings included:

**Idempotent Execution**: Hedera's JSON-RPC relay (Hashio) can intermittently return non-JSON responses while the underlying transaction succeeds on-chain. We developed an idempotent execution layer that checks on-chain state before each retry, preventing double-execution — a pattern that would be essential in any production deployment.

**Gas Estimation**: Hedera's EVM requires explicit gas price and gas limit overrides for contract deployments, as the relay's gas estimation does not function reliably for large deployments. This is a documentation gap that affects all builders on the platform.

**Single-Account Mode**: For testnet demonstration, a single funded account plays all roles (deployer, issuer, investor, secondary buyer). The architecture supports distinct accounts without code changes, which would be required for production.

**Stablecoin Settlement**: The eAUD stablecoin model proved effective for atomic settlement. Every lifecycle operation — issuance, coupon payment, secondary transfer, maturity redemption — settles via ERC-20 `safeTransferFrom`, providing a consistent and auditable settlement mechanism across all three asset classes. In production, this settlement token would be replaced by a regulated stablecoin, tokenised bank deposit, or wholesale CBDC, with no changes to the smart contract architecture.

**Real-Time Streaming**: WebSocket-based streaming of LLM responses proved essential for user experience. Financial conversations involve complex reasoning (suitability assessment, rate comparison, regulatory context), and streaming allows the investor to follow the agent's thinking in real time rather than waiting for a complete response. This transparency builds trust — a critical factor for financial services adoption.

---

## 6. Impact and Implications

### 6.1 For Banks and ADIs

Banks stand to gain the most from tokenised, agent-driven capital markets — and their participation is essential for the ecosystem to function.

**Funding efficiency**: Tokenised TDs and NCDs can be issued, distributed, and settled in minutes rather than days, allowing banks to respond to funding needs with greater agility.

**Distribution reach**: An AI agent can serve as a 24/7 distribution channel, reaching investors that traditional relationship-based models cannot. A regional bank with limited branch presence can compete with major banks on rate and accessibility.

**Operational savings**: The manual infrastructure supporting OTC money markets — dealers, operations staff, reconciliation systems — can be progressively automated. The DFCRC's $24 billion estimate encompasses these savings at scale.

As Chairman Rod Lewis has emphasised: *"We need buy-in from the banks who are the major beneficiaries from those markets."* Agent-to-agent interoperability via HCS-10 provides a path for banks to participate without overhauling their entire infrastructure — they can deploy agents that interface with the existing ecosystem.

### 6.2 For Asset Managers and Life Offices

Life offices issuing annuities and asset managers distributing fixed-income products can use agents to:

- **Automate quote generation** in response to agent-initiated RFQs, reducing the cost of each quote from manual effort to marginal compute cost
- **Expand distribution** beyond traditional adviser channels
- **Reduce time-to-settlement**, freeing capital more quickly
- **Improve pricing transparency**, which benefits both issuers and investors

### 6.3 For Regulators

Agentic AI on tokenised infrastructure provides regulators with capabilities that are impossible in traditional markets:

**Real-time supervision**: Every transaction, coupon payment, and ownership transfer is recorded on-chain in real time. Regulators can monitor market activity continuously rather than relying on periodic reporting.

**Programmable compliance**: AML/CTF thresholds, product suitability rules, and disclosure requirements can be embedded directly in agent logic and smart contract code. Compliance becomes a property of the system rather than a manual overlay.

**Audit trail**: The combination of on-chain transactions and HCS-10 communication logs provides a complete, tamper-proof record of every decision, negotiation, and execution — from the investor's initial expression of interest to the final settlement.

### 6.4 For Investors

The most significant impact may be on investors themselves:

- **Accessibility**: Complex institutional products become accessible through natural conversation. An investor does not need to understand basis points or settlement cycles — the agent translates.
- **Better pricing**: Automated, simultaneous RFQ across all providers ensures investors see the best available rates, eliminating information asymmetry.
- **Speed**: Settlement that previously took days happens in minutes.
- **Transparency**: On-chain verification of every transaction, accessible via block explorer.

### 6.5 Trust, Governance, and Human Oversight

The introduction of AI agents into financial markets raises legitimate questions about trust, accountability, and governance. These concerns must be addressed proactively, not as an afterthought.

**Human-in-the-loop**: The Imperium Markets Agent is designed as an advisory and execution agent, not a fully autonomous trading system. The investor must explicitly confirm every transaction before on-chain execution begins. The agent recommends; the human decides. This model preserves investor autonomy while delivering the efficiency benefits of automation.

**Explainability**: Every recommendation the agent makes is accompanied by reasoning that the investor can review. Quote comparisons include rates, projected payouts, and provider details. The agent explains trade-offs in plain language — for example, why a lower-rate annuity from a particular life office might be preferable based on the investor's age and payout frequency preference.

**Auditability**: The combination of on-chain transaction records, HCS-10 communication logs, and LLM conversation history provides a complete audit trail. Regulators, compliance officers, or dispute resolution bodies can reconstruct every step of the process — from the investor's initial goals to the final settlement.

**Liability framework**: As agent-to-agent markets develop, the industry will need clarity on liability. If an agent acting on behalf of an investor selects a counterparty that subsequently defaults, where does liability rest? The existing AFSL framework places responsibility on the licensee operating the agent. This is consistent with the current model where a financial adviser bears responsibility for their recommendations, regardless of the tools they use.

### 6.6 Quantifying the Efficiency Gain

While a full cost-benefit analysis requires production-scale data, the proof-of-concept demonstrates order-of-magnitude improvements in key metrics:

| Metric | Traditional | Agent + Tokenised | Factor |
|---|---|---|---|
| Time to complete RFQ | 3-5 business days | 5-10 minutes | ~500x |
| Number of providers compared | 1-3 (relationship-dependent) | All available (12+) | 4-12x |
| Settlement time | T+2 (48 hours) | Same-session (minutes) | ~300x |
| Manual touchpoints per deal | 15-20 (adviser, ops, compliance) | 1 (investor confirmation) | ~15x |
| After-hours availability | None | 24/7 | Infinite |

---

## 7. Roadmap and Recommendations

### 7.1 Technology Roadmap

**Near-term (6-12 months)**:
- Mainnet migration with production-grade key management and compliance checks
- Integration with licensed stablecoin or tokenised deposit for real settlement
- Expanded provider integrations with live API connections to life offices and banks
- Enhanced agent-to-agent marketplace: agents representing issuers, investors, and intermediaries

**Medium-term (12-24 months)**:
- ASX/CHESS integration alignment for institutional adoption
- Regulatory sandbox participation (ASIC Innovation Hub)
- Multi-agent negotiation protocols — agents that bid, counter-offer, and settle autonomously
- Cross-asset expansion beyond fixed income (structured products, syndicated loans)

**Long-term (24+ months)**:
- White-label agent platform for banks and asset managers
- Cross-border agent interoperability (AUD/SGD/GBP tokenised settlement)
- Integration with wholesale CBDC (if/when issued by RBA)

### 7.2 Industry Recommendations

**For banks and ADIs**: Begin with a low-risk pilot — deploy an agent for a single product (e.g., term deposits) on testnet, integrated with existing systems. The Imperium Markets architecture demonstrates that this can be achieved with existing Solidity and EVM tooling, without requiring a wholesale infrastructure overhaul.

**For asset managers and life offices**: Engage with agent-to-agent protocols (HCS-10) to make your products discoverable and executable by other agents. The marginal cost of serving an agent-initiated RFQ is near zero compared to the current cost of manual quote generation.

**For regulators**: Consider the regulatory implications of agent-to-agent markets — including suitability, disclosure, and liability frameworks for autonomous systems. The existing ASIC/AFSL framework covers the instruments; what may be needed is guidance on the conduct obligations of agent operators.

**For industry bodies**: Collaborate on standards for agent-to-agent communication in Australian capital markets. The HCS-10 protocol provides a starting point, but industry-specific conventions (quote formats, compliance attestation, settlement protocols) will need to be developed collaboratively.

---

## 8. Conclusion

Australia's capital markets are at an inflection point. The DFCRC has quantified the opportunity at $24 billion annually. Project Acacia has demonstrated the feasibility of tokenised settlement. The regulatory framework can accommodate tokenised instruments today.

What has been missing is the intelligence layer — the capability to translate tokenised infrastructure into accessible, efficient, and automated market operations. Agentic AI provides this layer.

The Imperium Markets Agent demonstrates that it is possible to guide an investor from "I want steady retirement income" to a fully settled, tokenised annuity on Hedera — through natural conversation, in a single session, with real-time quotes from Australian providers and atomic on-chain settlement.

This is not a theoretical exercise. It is a working system, deployed on Hedera Testnet, with 33+ tools, 4 smart contracts, 18 registered agent-to-agent skills, and live quotes from 12 Australian providers.

The technology is ready. The regulatory path is clear. The $24 billion opportunity is waiting.

What is needed now is what Imperium Markets has been calling for: **action and collaboration** from Australia's banks, asset managers, and market participants. The agents are ready. The question is whether the market will be.

---

## Appendix: Technical Architecture

### A.1 Smart Contract Summary

| Contract | Standard | Settlement | Tradeable | Key Functions |
|---|---|---|---|---|
| AnnuityToken | ERC-20 compatible | eAUD (safeTransferFrom) | Yes | acceptAndIssue, payCoupon, transferAnnuity, redeemMaturity |
| TermDepositToken | ERC-20 compatible | eAUD (safeTransferFrom) | No | acceptAndIssue, redeemMaturity |
| NCDToken | ERC-20 compatible | eAUD (safeTransferFrom) | Yes | acceptAndIssue, transferNCD, redeemMaturity |
| ImperiumStableCoin | ERC-20 | N/A (is settlement token) | Yes | Standard ERC-20 (transfer, approve, transferFrom) |

### A.2 Agent Tool Inventory

| Domain | Tools | Description |
|---|---|---|
| Annuity | 9 | Full lifecycle: create, execute, transfer, redeem, status, balances, list, audit, health |
| Term Deposit | 5 | Create, execute, redeem, status, balances |
| NCD | 6 | Create, execute, transfer, redeem, status, balances |
| RFQ | 3 | Live quotes from 12 Australian providers (4 per asset class) |
| HCS-10 | 6 | Agent discovery, connection, skill invocation, listener management |
| Hedera Native | 7+ | Account info, token queries, consensus, transaction details |
| **Total** | **33+** | |

### A.3 Australian Provider Coverage

| Asset Class | Providers |
|---|---|
| Annuities | Challenger, Resolution Life, Generation Life, Allianz Retire+ |
| Term Deposits | Westpac, NAB, CBA, ANZ |
| NCDs | BOQ, Macquarie Bank, Suncorp, Bendigo Bank |

### A.4 Regulatory Standards Embedded

| Standard | Implementation |
|---|---|
| Day-count convention | ACT/365 (Australian standard) |
| Settlement cycle | T+2 AEST (traditional), atomic (on-chain) |
| Interest rate format | Basis points (e.g., 529 = 5.29% p.a.) |
| AML/CTF threshold | A$10,000 (embedded in agent workflow) |
| Transfer balance cap | A$1.9M (retirement income streams) |
| Regulatory authorities | ASIC/AFSL (conduct), APRA (prudential) |

---

*Imperium Markets Pty Ltd*
*March 2026*

*For enquiries regarding this white paper, please contact Imperium Markets.*
