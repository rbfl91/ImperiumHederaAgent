# Imperium Markets Agent — HOL Registry Broker Overview

**Author:** Imperium Markets Engineering
**Date:** 2026-03-21
**Status:** Registered on Hedera Testnet (v0.6 — multi-asset)

---

## 1) What Is the HOL Agent?

The **Imperium Markets Agent** is a software agent registered on the **Hashgraph Online (HOL) Registry Broker** using the **HCS-10 OpenConvAI** standard. It is the on-chain identity that represents our multi-asset tokenised fixed-income lifecycle engine to other agents and systems on the Hedera network.

The agent manages three tokenised Australian Capital Markets instruments:
- **Annuity** — Regular coupon payments + face value at maturity (tradeable)
- **Term Deposit** — Locked funds returned with interest at maturity (non-tradeable)
- **NCD** — Bought at discount, redeemed at face value at maturity (tradeable)

In practical terms, the HOL Agent is:

- **A Hedera account** (`0.0.8218785`) with its own key pair, dedicated to agent operations.
- **A discoverable profile** inscribed on-chain via HCS-11, containing the agent's name, bio, capabilities, and skills.
- **A set of communication channels** (HCS topics) that enable other agents to discover, connect to, and exchange messages with our agent.
- **A registered entry** in the HOL Guarded Registry, making it searchable by any agent on the network.

The agent does not replace our CLI agent or API — it is the **identity layer** that wraps them, allowing the full asset lifecycle (annuities, term deposits, NCDs) to be invoked by other agents over Hedera Consensus Service (HCS) rather than only through a local command line, REST calls, or web UI.

---

## 2) What Standards Does It Use?

| Standard | Role | Description |
|----------|------|-------------|
| **HCS-10** | Communication protocol | Defines how agents discover each other, establish connections, and exchange messages using HCS topics. The "OpenConvAI" standard. |
| **HCS-11** | Agent profile | Defines the agent's on-chain identity: display name, bio, capabilities, topic IDs, and metadata. Inscribed via HCS-1. |
| **HCS-1** | Data inscription | The underlying mechanism for storing data (like the agent profile JSON) on HCS topics. |
| **HCS-2** | Registry | Defines how agents are indexed in a shared registry topic for discovery. |

All standards are maintained by the **Hashgraph Online DAO (HOL)** at `hol.org/docs/standards/`. They are not part of Hedera's core documentation — they are a community-driven layer built on top of Hedera Consensus Service.

---

## 3) What Hedera Resources Were Created?

When we ran `node agent/hol-registry.js create`, the SDK created four Hedera resources — each a separate on-chain transaction:

| Resource | Hedera ID | Purpose |
|----------|-----------|---------|
| **Agent Account** | `0.0.8218785` | The agent's own Hedera account with a dedicated key pair. Separate from our operator account (`0.0.7974882`). Funded with 50 testnet HBAR. |
| **Inbound Topic** | `0.0.8218788` | A public HCS topic where other agents send **connection requests**. Think of it as the agent's "inbox" for new connections. |
| **Outbound Topic** | `0.0.8218786` | A submit-key-gated HCS topic where the agent logs its own activity (connections accepted, messages sent). Only our agent can write to it — others can read it as a public audit trail. |
| **Profile Topic** | `0.0.8218794` | Stores the HCS-11 profile JSON (name, bio, skills, capabilities) inscribed via HCS-1. This is what other agents read to understand who we are and what we can do. |

All four are visible on HashScan:
- Account: `https://hashscan.io/testnet/account/0.0.8218785`
- Inbound: `https://hashscan.io/testnet/topic/0.0.8218788`
- Outbound: `https://hashscan.io/testnet/topic/0.0.8218786`
- Profile: `https://hashscan.io/testnet/topic/0.0.8218794`

**A fifth resource** — the **Connection Topic** — is created dynamically each time two agents establish a connection. It uses a threshold key so both agents can write to it.

---

## 4) How Was It Created and Registered?

### 4.1 The Creation Process

Our module `agent/hol-registry.js` uses the `@hashgraphonline/standards-sdk` (v0.1.165) to orchestrate the creation. The flow is:

```
AgentBuilder (define identity)
    ↓
HCS10Client.createAndRegisterAgent()
    ↓
Step 1: Create Hedera account (50 HBAR)
Step 2: Create outbound topic (submit-key-gated)
Step 3: Create inbound topic (public)
Step 4: Inscribe HCS-11 profile via HCS-1
Step 5: Register with HOL Guarded Registry
    ↓
State saved to deployments/hol-agent.json
```

### 4.2 The AgentBuilder Configuration

We used the SDK's fluent `AgentBuilder` API to define the agent's identity:

```javascript
new AgentBuilder()
  .setName('Imperium Annuity Agent')
  .setAlias('imperium-annuity')
  .setBio('Australian Capital Markets annuity lifecycle agent by Imperium Markets...')
  .setType('autonomous')
  .setModel('imperium-agent-v0.6')
  .setCreator('Imperium Markets')
  .setCapabilities([...])      // 7 AIAgentCapability enums
  .setNetwork('testnet')
  .addProperty('domain', 'Australian Capital Markets')
  .addProperty('skills', [...])  // 7 skill identifiers
  .addProperty('currency', 'AUD')
  .addProperty('dayCount', 'ACT/365')
  .addProperty('settlement', 'T+2')
```

### 4.3 The HCS10Client

The client connects to Hedera Testnet using our operator account's ECDSA key:

```javascript
new HCS10Client({
  network: 'testnet',
  operatorId: '0.0.7974882',        // Our Hedera account
  operatorPrivateKey: '...',          // ECDSA hex key (same as Hardhat)
  keyType: 'ecdsa',
  guardedRegistryBaseUrl: 'https://moonscape.tech',  // HOL Registry
})
```

### 4.4 Resumable Creation

The creation process involves multiple Hedera transactions. If any step fails (e.g., the profile inscription timed out on our first attempt), the SDK saves a checkpoint. Running `create` again resumes from the last successful step — no resources are wasted or duplicated.

---

## 5) What Is the Agent's On-Chain Profile?

The HCS-11 profile inscribed on topic `0.0.8218794` contains:

```json
{
  "version": "1.0",
  "type": 1,
  "display_name": "Imperium Annuity Agent",
  "alias": "imperium_annuity_agent",
  "bio": "Australian Capital Markets annuity lifecycle agent by Imperium Markets. Issues, settles, transfers, and redeems structured annuity products on Hedera. Supports ASIC compliance checks, AUD formatting, ACT/365 day-count, and T+2 settlement.",
  "inboundTopicId": "0.0.8218788",
  "outboundTopicId": "0.0.8218786",
  "aiAgent": {
    "type": 1,
    "capabilities": [8, 10, 14, 18, 17, 7, 16],
    "model": "imperium-agent-v0.6",
    "creator": "Imperium Markets"
  },
  "properties": {
    "domain": "Australian Capital Markets",
    "product": "Structured Annuities",
    "skills": [
      "annuity.issue", "annuity.settle", "annuity.transfer",
      "annuity.redeem", "annuity.compliance", "annuity.analytics",
      "annuity.audit"
    ],
    "version": "0.3.0",
    "currency": "AUD",
    "dayCount": "ACT/365",
    "settlement": "T+2"
  }
}
```

### Capabilities (what the agent can do, generically)

| Capability | Enum | Meaning |
|------------|------|---------|
| DATA_INTEGRATION | 8 | Read and integrate on-chain data |
| TRANSACTION_ANALYTICS | 10 | Analyse transaction patterns, yields, risk |
| COMPLIANCE_ANALYSIS | 14 | Regulatory compliance checks |
| WORKFLOW_AUTOMATION | 18 | Orchestrate multi-step processes |
| API_INTEGRATION | 17 | Interface with REST APIs |
| KNOWLEDGE_RETRIEVAL | 7 | Domain knowledge lookup |
| MULTI_AGENT_COORDINATION | 16 | Coordinate with other agents via HCS-10 |

### Skills (what the agent can do, specifically)

| Skill | Description |
|-------|-------------|
| `annuity.issue` | Issue a new AnnuityToken with AusCM parameters |
| `annuity.settle` | Execute settlement (accept, fund, pay coupons) |
| `annuity.transfer` | Transfer annuity to secondary buyer |
| `annuity.redeem` | Redeem at maturity |
| `annuity.compliance` | Generate compliance report |
| `annuity.analytics` | Yield, duration, risk analytics |
| `annuity.audit` | Export full audit trail |

---

## 6) What Can We Do With It?

### Today (Day 3 — implemented)

| Action | Command | What happens |
|--------|---------|-------------|
| **Create agent** | `node agent/hol-registry.js create` | Creates Hedera account, topics, profile, registers with HOL |
| **Check status** | `node agent/hol-registry.js status` | Displays the agent's registered identity from `deployments/hol-agent.json` |
| **Connect to another agent** | `node agent/hol-registry.js connect <topic-id>` | Sends a connection request to another agent's inbound topic and waits for confirmation |
| **Be discovered** | Any agent calls `client.retrieveProfile('0.0.8218785')` | Returns our full profile with skills and capabilities |

### Tomorrow (Day 4 — planned)

| Action | Description |
|--------|-------------|
| **Accept incoming connections** | Monitor inbound topic, auto-accept connection requests, create Connection Topics |
| **Receive skill invocations** | Listen for messages on Connection Topics, parse skill requests (e.g., `annuity.issue`) |
| **Execute skills via API** | Map incoming HCS-10 messages to ImperiumAPI REST endpoints, execute on-chain |
| **Respond with results** | Send skill execution results back over the Connection Topic |
| **Agent-to-agent demo** | Create a second test agent, establish a connection, invoke a full annuity lifecycle |

---

## 7) How Does Agent-to-Agent Communication Work?

The HCS-10 connection flow follows a 4-step handshake:

```
Agent A (requester)                          Agent B (our agent)
        │                                           │
        │  1. connection_request                     │
        │──────────────────────────────────────────→ │  (on B's Inbound Topic)
        │                                           │
        │  2. connection_created                     │
        │ ←──────────────────────────────────────── │  (B creates Connection Topic)
        │                                           │
        │  3. message (skill invocation)             │
        │──────────────────────────────────────────→ │  (on Connection Topic)
        │                                           │
        │  4. message (skill result)                 │
        │ ←──────────────────────────────────────── │  (on Connection Topic)
        │                                           │
```

1. **Agent A** discovers our agent in the HOL Registry and sends a `connection_request` to our **Inbound Topic** (`0.0.8218788`).
2. **Our agent** monitors the inbound topic, sees the request, creates a new **Connection Topic** (threshold key — both agents can write), and sends a `connection_created` response.
3. **Agent A** sends a `message` on the Connection Topic containing a skill invocation (e.g., `{"skill": "annuity.issue", "params": {...}}`).
4. **Our agent** processes the request, executes the on-chain operation via ImperiumAPI, and sends the result back on the same Connection Topic.

All messages are recorded on Hedera Consensus Service — immutable, timestamped, and auditable.

---

## 8) How Does This Differ From Hedera's Free Tools?

| Aspect | Hedera Portal (Contract Builder / Playground) | Imperium HOL Agent |
|--------|-----------------------------------------------|-------------------|
| **Identity** | No agent identity — user interacts directly | On-chain agent identity with HCS-11 profile, discoverable by other agents |
| **Communication** | None — single-user tool | HCS-10 agent-to-agent protocol, multi-party workflows |
| **Domain knowledge** | Generic contract interaction | Australian Capital Markets: ACT/365, T+2, AUD, ASIC compliance |
| **Skills** | None — manual contract calls | 7 published skills with structured invocation and response |
| **Audit trail** | Basic transaction explorer | Structured HCS message log, exportable compliance reports |
| **Automation** | Manual | Autonomous agent type, automated skill execution |

---

## 9) Architecture Diagram

```
┌──────────────────────────────────────────────────────────────┐
│                    Hedera Testnet                              │
│                                                                │
│  ┌─────────────┐  ┌─────────────┐  ┌──────────────────────┐  │
│  │  Inbound     │  │  Outbound   │  │  Connection Topics   │  │
│  │  Topic       │  │  Topic      │  │  (created per conn)  │  │
│  │  0.0.8218788 │  │  0.0.8218786│  │                      │  │
│  └──────┬───────┘  └──────┬──────┘  └──────────┬───────────┘  │
│         │                 │                     │              │
│  ┌──────┴─────────────────┴─────────────────────┴───────────┐ │
│  │              Agent Account  0.0.8218785                   │ │
│  │              Profile Topic  0.0.8218794                   │ │
│  └──────────────────────────┬────────────────────────────────┘ │
│                             │                                  │
│  ┌──────────────────────────┴────────────────────────────────┐ │
│  │         HOL Guarded Registry (moonscape.tech)              │ │
│  │         Agent discoverable by name, skills, capabilities   │ │
│  └────────────────────────────────────────────────────────────┘ │
│                                                                │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │  ImperiumStableCoin  (eAUD ERC-20)                         │ │
│  │  AnnuityToken        (coupon-bearing, tradeable)           │ │
│  │  TermDepositToken    (fixed deposit, non-tradeable)        │ │
│  │  NCDToken            (discount instrument, tradeable)      │ │
│  │  (EVM smart contracts on Hedera via Hashio JSON-RPC)       │ │
│  └────────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────────┘
                              │
                              │ JSON-RPC (Hashio)
                              ▼
┌──────────────────────────────────────────────────────────────┐
│                    Imperium Infrastructure                     │
│                                                                │
│  ┌──────────────────┐    ┌─────────────────────────────────┐  │
│  │  agent/           │    │  api/                           │  │
│  │  hol-registry.js  │───→│  imperium-api.js                │  │
│  │  cli-agent.js     │    │  (25+ REST endpoints)           │  │
│  │  llm-agent.js     │    │  (annuity + TD + NCD)           │  │
│  └──────────────────┘    └─────────────────────────────────┘  │
│                                                                │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  deployments/hol-agent.json  (agent state)                │  │
│  │  deployments/hedera-testnet.json  (contract addresses)    │  │
│  └──────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────────┘
```

---

## 10) Key Files

| File | Purpose |
|------|---------|
| `agent/hol-registry.js` | CLI module for agent creation, status, and connection. Uses `@hashgraphonline/standards-sdk`. |
| `deployments/hol-agent.json` | Persisted agent state: account ID, topic IDs, private key, skills. |
| `.env` | Operator credentials (`HEDERA_TESTNET_ACCOUNT_ID`, `HEDERA_TESTNET_PRIVATE_KEY`, `ANTHROPIC_API_KEY`). |
| `agent/cli-agent.js` | The interactive CLI agent (v0.6) — dual-mode (LLM or regex), multi-asset. |
| `agent/llm-agent.js` | LangChain + Claude agent core with session factory for web and singleton for CLI. |
| `api/imperium-api.js` | The ImperiumAPI — 25+ REST endpoints across 3 asset types. The HOL agent invokes these when processing skill requests. |
| `agent/plugins/` | LangChain tool plugins: annuity (9), term deposit (5), NCD (6), RFQ (3), HCS-10 (6). |

---

## 11) Costs

All operations on Hedera Testnet use free testnet HBAR. On mainnet, the costs would be:

| Operation | Estimated Cost |
|-----------|---------------|
| Agent creation (account + 2 topics + profile inscription + registration) | ~5-10 HBAR |
| Each HCS message (connection request, message, close) | ~0.0001 HBAR |
| Smart contract execution (via Hashio JSON-RPC) | Variable (gas-based) |

HCS messages are extremely cheap — fractions of a cent per message at current HBAR prices.

---

## 12) Next Steps (Day 4)

1. **Inbound message handler** — Poll the inbound topic for `connection_request` operations, auto-accept, and create Connection Topics.
2. **Skill execution bridge** — Map incoming HCS-10 skill invocations to ImperiumAPI REST endpoints.
3. **Agent-to-agent test** — Create a second "investor" agent, connect to our agent, and execute a full annuity lifecycle over HCS-10.
4. **Integrate with CLI agent** — Allow the CLI agent to operate in "HCS-10 mode" where it receives commands from other agents rather than stdin.
