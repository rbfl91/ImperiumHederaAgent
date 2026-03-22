# Imperium Markets — Project Details

---

## Project Description

Imperium Markets is an AI-powered agent that manages tokenised Australian fixed-income instruments on Hedera. It supports three asset types — Annuities, Term Deposits, and NCDs — each with full on-chain lifecycle management via Solidity smart contracts. The agent uses Claude (via LangChain) with 33+ tools to understand investor goals through natural conversation and recommend the optimal product. A browser-based RFQ interface streams real-time responses, fetches live quotes from Australian providers, and executes deals on-chain. The agent is registered on the HOL Registry via HCS-10, enabling agent-to-agent discovery, connection, and skill invocation across the Hedera network.

---

## Selected Hackathon Track

1) AI & Agents 
2) DeFi & Tokenization

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| **Blockchain** | Hedera Testnet (EVM-compatible), Solidity ^0.8.21, OpenZeppelin (ReentrancyGuard, SafeERC20) |
| **Smart Contracts** | AnnuityToken, TermDepositToken, NCDToken, ImperiumStableCoin (ERC-20) |
| **Build and Test** | Hardhat 2.28, Hardhat Toolbox, Mocha/Chai, 47+ automated tests |
| **AI / LLM** | Claude Haiku 4.5 (Anthropic), LangChain (@langchain/anthropic, @langchain/core) |
| **Hedera SDK** | hedera-agent-kit (6 query plugins), @hashgraph/sdk (accounts, topics, keys) |
| **Agent Protocol** | HCS-10 (OpenConvAI) via @hashgraphonline/standards-sdk — agent registration, discovery, connection, skill invocation |
| **Backend** | Node.js, Express, WebSocket (ws), CORS |
| **Frontend** | React 18, Vite, WebSocket streaming, Imperium Markets custom branding |
| **Deployment** | Hedera Testnet (chainId 296, HashIO JSON-RPC), local Hardhat node for development |
