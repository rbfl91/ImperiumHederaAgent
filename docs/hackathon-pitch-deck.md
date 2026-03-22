# Imperium Markets — Pitch Deck

*Tokenised Fixed-Income on Hedera, Powered by AI*

---

## a. Team and Project Introduction

**Imperium Markets** — Australian Capital Markets technology company building infrastructure for tokenised fixed-income products on Hedera.

**Team:** Raphael Lima — full-stack development, smart contract engineering, AI agent architecture, and Australian Capital Markets domain expertise.

**Project:** Imperium Markets Agent — an LLM-powered agent that tokenises and manages fixed-income assets on Hedera, with agent-to-agent communication via HCS-10.

---

## b. Project Summary

### The Problem

Australian fixed-income markets (annuities, term deposits, NCDs) are characterised by manual processes, fragmented systems, and limited accessibility. Investors face complex product selection, slow settlement cycles, and no unified platform to compare or execute across asset types. Existing blockchain tools offer generic smart contract interaction but lack domain-specific intelligence.

### Our Solution

Imperium Markets Agent is a conversational AI that brings three tokenised fixed-income instruments on-chain:

1. **Annuities** — Coupon-bearing, tradeable instruments with scheduled payments
2. **Term Deposits** — Locked deposits with interest at maturity (non-tradeable)
3. **NCDs** — Discount instruments redeemed at face value (tradeable on secondary market)

### What Makes It Unique

- **Smart Asset Recommendation** — The agent analyses investor goals (age, risk appetite, liquidity needs, investment horizon) and recommends the most suitable product type before fetching quotes
- **Full On-Chain Lifecycle** — Issue, settle, transfer (where applicable), and redeem — all executed as smart contract transactions on Hedera
- **Natural Language Interface** — Investors interact through plain English conversation, not contract ABIs. The agent handles the complexity
- **Live Provider Quotes** — Comparison tables from real Australian providers (Challenger, Westpac, NAB, BOQ, Macquarie, etc.) with one-click selection
- **HCS-10 Agent Network** — Registered on the HOL Registry with 18 skills. Other agents can discover Imperium, establish connections, and invoke skills (e.g., `annuity.issue`, `ncd.transfer`) over HCS topics
- **Dual Interface** — CLI agent for developers, browser-based RFQ UI for investors

### Architecture

```
Browser (React/Vite)  <-- WebSocket -->  Express (port 4000)
                                              |
User input (CLI)  -->  cli-agent.js  -->  LangChain Agent (Claude Haiku 4.5)
                                              |
                  +----------+----------+-----+-------+--------------+
            Annuity    TD Plugin   NCD Plugin   RFQ       HCS-10      hedera-
            Plugin     (5 tools)   (6 tools)    Plugin    (6 tools)    agent-kit
            (9 tools)                           (3 tools)              (7+ tools)
                  |         |           |          |          |            |
                  +---------+-----------+----------+   +------+------+ +--+----+
                                  |                  Discover  Connect Account Token
                  ImperiumAPI (25+ endpoints)        Agents    & Msg  Queries Queries
                                  |                     |        |       |       |
                  Solidity Contracts                    +--------+------+-------+
                  (Hedera / Hardhat)                             |
                                                         Hedera Network
                                                    (HCS Topics / Mirror Node)
```

### Key Numbers

| Metric | Value |
|--------|-------|
| LangChain Tools | 33+ across 6 domains |
| Smart Contracts | 4 (Annuity, Term Deposit, NCD, Stablecoin) |
| HCS-10 Skills | 18 (discoverable by other agents) |
| Automated Tests | 47+ (contract logic, security, API integration) |
| API Endpoints | 25+ REST endpoints across 3 asset types |
| Provider Quotes | 12 Australian providers (4 per asset type) |

### Hedera-Specific Integration

| Feature | How We Use Hedera |
|---------|-------------------|
| **Smart Contracts** | 4 Solidity contracts deployed to Hedera Testnet via EVM |
| **HCS-10 Protocol** | Agent identity, inbound/outbound topics, skill publication |
| **HOL Registry** | Agent discoverable by other agents on the network |
| **hedera-agent-kit** | 6 query plugins — account info, token balances, topic queries, transaction details |
| **Mirror Node** | Read on-chain state for agent queries and analytics |

### Judging Criteria Alignment

1. **Innovation** — First multi-asset fixed-income agent on Hedera with smart product recommendation
2. **Technical Complexity** — 33+ LLM tools, 4 smart contracts, HCS-10 agent-to-agent protocol, real-time streaming UI
3. **Hedera Integration** — Deep use of EVM smart contracts, HCS topics, Mirror Node, hedera-agent-kit, and HOL Registry
4. **Practical Impact** — Addresses real pain points in Australian fixed-income markets (product selection, settlement, accessibility)
5. **User Experience** — Conversational RFQ flow that abstracts blockchain complexity behind natural language
6. **Completeness** — Full lifecycle implemented end-to-end: recommendation, quote comparison, on-chain execution, redemption
7. **Scalability** — Plugin architecture allows adding new asset classes without modifying core agent

---

## c. Future Roadmap

### Key Learnings

- **HCS-10 is powerful but early** — The agent-to-agent protocol works well for skill invocation, but the ecosystem is still growing. Being an early mover with domain-specific skills creates differentiation
- **LLM tool-calling scales** — LangChain's tool-calling loop with Claude handles 33+ tools without degradation. Streaming with bound tools required careful handling of content block arrays vs plain strings
- **Smart contract composability matters** — Designing three contracts that share a common stablecoin but have distinct lifecycle semantics (tradeable vs non-tradeable, coupons vs discount vs interest) validated the multi-asset approach

### Room for Improvement

- **Mainnet deployment** — Current implementation is Testnet-only. Production would require proper key management, gas optimisation, and compliance review
- **Real market data feeds** — Quotes are currently simulated. Integration with real-time Australian provider APIs would make the RFQ flow production-ready
- **Secondary market orderbook** — NCDs and Annuities support transfer, but there's no matching engine. A HCS-based orderbook would enable peer-to-peer trading

### Next Steps

1. **Hedera Mainnet Deployment** — Migrate contracts and agent identity to mainnet with production-grade key management
2. **ASX/CHESS Integration Readiness** — Align settlement flows with Australian exchange infrastructure for institutional adoption
3. **ASIC Compliance Module** — Automated regulatory checks (KYC/AML, product disclosure) embedded in the agent workflow
4. **Multi-Agent Marketplace** — Expand the HCS-10 skill set so other agents (e.g., credit rating agents, pricing oracles) can compose with Imperium's capabilities
5. **Institutional White-Label** — Package the agent as a white-label solution for Australian banks and asset managers
6. **Additional Asset Classes** — Extend to government bonds, corporate bonds, and mortgage-backed securities using the same plugin architecture
