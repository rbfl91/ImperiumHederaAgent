/**
 * LLM Agent — Claude-powered natural language agent via LangChain + hedera-agent-kit.
 *
 * Uses @langchain/anthropic for Claude integration and hedera-agent-kit's built-in
 * Hedera plugins alongside custom Imperium annuity and HCS-10 plugins.
 *
 * Exported function `processInput()` handles one user turn: sends input to Claude,
 * executes any tool calls, and returns a formatted response string.
 */
'use strict';

const { ChatAnthropic } = require('@langchain/anthropic');
const { DynamicStructuredTool } = require('@langchain/core/tools');
const { HumanMessage, AIMessage, SystemMessage } = require('@langchain/core/messages');
const {
  HederaLangchainToolkit,
  coreAccountQueryPlugin,
  coreConsensusQueryPlugin,
  coreTokenQueryPlugin,
  coreEVMQueryPlugin,
  coreMiscQueriesPlugin,
  coreTransactionQueryPlugin,
} = require('hedera-agent-kit');
const { Client, PrivateKey } = require('@hashgraph/sdk');

const { annuityPlugin } = require('./plugins/annuity-plugin');
const { hcs10Plugin } = require('./plugins/hcs10-plugin');

// ── System prompt ───────────────────────────────────────────────────

const SYSTEM_PROMPT = `You are the Imperium Annuity Agent — an Australian Capital Markets specialist \
operating on the Hedera network. You manage structured annuity products (AnnuityToken smart contracts) \
and communicate with other agents via HCS-10 (OpenConvAI protocol).

Domain knowledge:
- Day-count convention: ACT/365 (Australian standard)
- Settlement: T+2 AEST, Australian business days
- Currency: Values are in whole units (e.g., 1000000 = A$1,000,000)
- Interest rate: Stored in basis points (e.g., 500 = 5.00%)
- Regulatory context: ASIC/AFSL compliance, AML/CTF thresholds (A$10,000)

When responding:
- Be concise and action-oriented
- Format monetary values with A$ prefix (e.g., A$1,000,000)
- Show relevant next steps after each action
- For deal operations, always include the correlationId in your response
- Use emojis sparingly: ✅ for success, ❌ for errors, 📋 for info

If the user says "help", list available commands. If they say "exit" or "quit", respond with a goodbye message.
If a tool requires a correlationId and the user hasn't provided one, ask them for it or suggest they create a deal first.`;

// ── Module state ────────────────────────────────────────────────────

let model = null;
let langchainTools = [];
let conversationHistory = [];

/**
 * Initialize the LLM agent. Call once at startup.
 *
 * @param {object} opts
 * @param {string} opts.apiKey - Anthropic API key
 * @param {object} opts.agentState - HOL agent state from deployments/hol-agent.json
 * @param {object} [opts.hcsContext] - HCS-10 context callbacks (hcsConnect, hcsSendSkill, etc.)
 * @returns {boolean} true if initialized successfully
 */
function init({ apiKey, agentState, hcsContext }) {
  if (!apiKey) return false;

  // 1. Create Claude model
  model = new ChatAnthropic({
    model: 'claude-haiku-4-5-20251001',
    anthropicApiKey: apiKey,
    maxTokens: 1024,
    temperature: 0,
  });

  // 2. Build hedera-agent-kit tools (query-only plugins for safety)
  let hederaTools = [];
  try {
    if (agentState && agentState.agentAccountId && agentState.agentPrivateKey) {
      const keyStr = agentState.agentPrivateKey;
      const privKey = PrivateKey.fromStringDer(
        keyStr.startsWith('0x') ? keyStr.slice(2) : keyStr
      );
      const client = Client.forTestnet();
      client.setOperator(agentState.agentAccountId, privKey);

      const toolkit = new HederaLangchainToolkit({
        client,
        configuration: {
          plugins: [
            coreAccountQueryPlugin,
            coreConsensusQueryPlugin,
            coreTokenQueryPlugin,
            coreEVMQueryPlugin,
            coreMiscQueriesPlugin,
            coreTransactionQueryPlugin,
          ],
          context: {
            operatorAccountId: agentState.agentAccountId,
          },
        },
      });
      hederaTools = toolkit.getTools();
    }
  } catch (err) {
    console.error(`[LLM] hedera-agent-kit init warning: ${err.message}`);
    // Continue without Hedera tools — annuity + HCS-10 tools still work
  }

  // 3. Build custom plugin tools as DynamicStructuredTool instances
  const customTools = [];

  // Annuity plugin tools
  for (const toolDef of annuityPlugin.tools({})) {
    customTools.push(
      new DynamicStructuredTool({
        name: toolDef.method,
        description: toolDef.description,
        schema: toolDef.parameters,
        func: async (input) => {
          try {
            return await toolDef.execute(input);
          } catch (err) {
            return JSON.stringify({ error: err.message });
          }
        },
      })
    );
  }

  // HCS-10 plugin tools
  for (const toolDef of hcs10Plugin.tools({})) {
    const ctx = hcsContext || {};
    customTools.push(
      new DynamicStructuredTool({
        name: toolDef.method,
        description: toolDef.description,
        schema: toolDef.parameters,
        func: async (input) => {
          try {
            return await toolDef.execute(input, ctx);
          } catch (err) {
            return JSON.stringify({ error: err.message });
          }
        },
      })
    );
  }

  // 4. Combine all tools
  langchainTools = [...customTools, ...hederaTools];

  // 5. Initialize conversation with system prompt
  conversationHistory = [new SystemMessage(SYSTEM_PROMPT)];

  return true;
}

/**
 * Process a single user input turn.
 *
 * Sends the input to Claude with all tools bound, executes any tool calls,
 * and returns the final text response.
 *
 * @param {string} input - User's natural language input
 * @returns {Promise<{text: string, toolCalls: Array}>}
 */
async function processInput(input) {
  if (!model) {
    return { text: 'LLM agent not initialized. Check ANTHROPIC_API_KEY.', toolCalls: [] };
  }

  const { ToolMessage } = require('@langchain/core/messages');

  // Snapshot history length so we can rollback on error
  const historySnapshot = conversationHistory.length;

  try {
    // Add user message
    conversationHistory.push(new HumanMessage(input));

    // Bind tools and invoke
    const modelWithTools = model.bindTools(langchainTools);

    let response = await modelWithTools.invoke(conversationHistory);
    conversationHistory.push(response);

    const allToolCalls = [];

    // Tool call loop — execute tools and feed results back until Claude gives a text response
    while (response.tool_calls && response.tool_calls.length > 0) {
      for (const toolCall of response.tool_calls) {
        allToolCalls.push(toolCall);

        // Find and execute the tool
        const tool = langchainTools.find(
          (t) => t.name === toolCall.name
        );

        let result;
        if (tool) {
          try {
            result = await tool.invoke(toolCall.args);
          } catch (err) {
            result = JSON.stringify({ error: err.message });
          }
        } else {
          result = JSON.stringify({ error: `Unknown tool: ${toolCall.name}` });
        }

        // Add tool result to conversation
        conversationHistory.push(
          new ToolMessage({
            content: typeof result === 'string' ? result : JSON.stringify(result),
            tool_call_id: toolCall.id,
          })
        );
      }

      // Get next response (may contain more tool calls or final text)
      response = await modelWithTools.invoke(conversationHistory);
      conversationHistory.push(response);
    }

    // Keep conversation history manageable (last 20 turns)
    if (conversationHistory.length > 42) {
      conversationHistory = [
        conversationHistory[0],
        ...conversationHistory.slice(-40),
      ];
    }

    return {
      text: response.content || '(no response)',
      toolCalls: allToolCalls,
    };
  } catch (err) {
    // Rollback conversation history to prevent corruption
    // (e.g. tool_use without matching tool_result)
    conversationHistory.length = historySnapshot;
    throw err;
  }
}

/**
 * Reset conversation history (useful for test isolation).
 */
function resetConversation() {
  conversationHistory = [new SystemMessage(SYSTEM_PROMPT)];
}

/**
 * Check if the LLM agent is initialized and ready.
 */
function isReady() {
  return model !== null;
}

/**
 * Get the number of available tools.
 */
function getToolCount() {
  return langchainTools.length;
}

/**
 * Get tool names grouped by source.
 */
function getToolSummary() {
  const annuityTools = annuityPlugin.tools({}).map((t) => t.method);
  const hcs10Tools = hcs10Plugin.tools({}).map((t) => t.method);
  const hederaKitTools = langchainTools
    .filter((t) => !annuityTools.includes(t.name) && !hcs10Tools.includes(t.name))
    .map((t) => t.name);

  return { annuityTools, hcs10Tools, hederaKitTools };
}

module.exports = { init, processInput, isReady, getToolCount, getToolSummary, resetConversation };
