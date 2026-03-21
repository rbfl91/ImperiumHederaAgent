/**
 * LLM Agent — Claude-powered natural language agent via LangChain + hedera-agent-kit.
 *
 * Uses @langchain/anthropic for Claude integration and hedera-agent-kit's built-in
 * Hedera plugins alongside custom Imperium annuity and HCS-10 plugins.
 *
 * Supports two modes:
 *   1. Singleton (CLI): init() + processInput() — backward-compatible with cli-agent.js
 *   2. Session factory (Web): createSession() — each call returns an independent session
 */
'use strict';

const { ChatAnthropic } = require('@langchain/anthropic');
const { DynamicStructuredTool } = require('@langchain/core/tools');
const { HumanMessage, AIMessage, SystemMessage, ToolMessage } = require('@langchain/core/messages');
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
const { termDepositPlugin } = require('./plugins/term-deposit-plugin');
const { ncdPlugin } = require('./plugins/ncd-plugin');
const { hcs10Plugin } = require('./plugins/hcs10-plugin');

// ── Default system prompt ────────────────────────────────────────────

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

// ── Tool builder helpers ─────────────────────────────────────────────

function buildHederaTools(agentState) {
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
      return toolkit.getTools();
    }
  } catch (err) {
    console.error(`[LLM] hedera-agent-kit init warning: ${err.message}`);
  }
  return [];
}

function buildPluginTools(plugin, context) {
  return plugin.tools({}).map((toolDef) =>
    new DynamicStructuredTool({
      name: toolDef.method,
      description: toolDef.description,
      schema: toolDef.parameters,
      func: async (input) => {
        try {
          return await toolDef.execute(input, context);
        } catch (err) {
          return JSON.stringify({ error: err.message });
        }
      },
    })
  );
}

// ── Session factory ──────────────────────────────────────────────────

/**
 * Create an independent LLM agent session.
 *
 * Each session has its own Claude model instance, tools, and conversation
 * history. Use this for the web frontend (one session per WebSocket connection).
 *
 * @param {object} opts
 * @param {string} opts.apiKey - Anthropic API key
 * @param {object} [opts.agentState] - HOL agent state from deployments/hol-agent.json
 * @param {object} [opts.hcsContext] - HCS-10 context callbacks
 * @param {string} [opts.systemPrompt] - Override the default system prompt
 * @param {Array}  [opts.extraPlugins] - Additional plugins (e.g. rfq-plugin)
 * @returns {object} Session with { processInput, resetConversation, isReady, getToolCount }
 */
function createSession({ apiKey, agentState, hcsContext, systemPrompt, extraPlugins }) {
  if (!apiKey) {
    return {
      processInput: async () => ({ text: 'LLM agent not initialized. Check ANTHROPIC_API_KEY.', toolCalls: [] }),
      resetConversation: () => {},
      isReady: () => false,
      getToolCount: () => 0,
    };
  }

  const prompt = systemPrompt || SYSTEM_PROMPT;

  // 1. Create Claude model
  const model = new ChatAnthropic({
    model: 'claude-haiku-4-5-20251001',
    anthropicApiKey: apiKey,
    maxTokens: 1024,
    temperature: 0,
  });

  // 2. Build tools
  const hederaTools = buildHederaTools(agentState);
  const annuityTools = buildPluginTools(annuityPlugin, {});
  const tdTools = buildPluginTools(termDepositPlugin, {});
  const ncdTools = buildPluginTools(ncdPlugin, {});
  const hcs10Tools = buildPluginTools(hcs10Plugin, hcsContext || {});

  let extraTools = [];
  if (extraPlugins) {
    for (const plugin of extraPlugins) {
      extraTools = extraTools.concat(buildPluginTools(plugin, {}));
    }
  }

  const langchainTools = [...annuityTools, ...tdTools, ...ncdTools, ...hcs10Tools, ...extraTools, ...hederaTools];

  // 3. Conversation history
  let conversationHistory = [new SystemMessage(prompt)];

  // ── Streaming helper ────────────────────────────────────────────

  /** Extract text from a chunk's content (may be a string or array of content blocks). */
  function extractChunkText(content) {
    if (typeof content === 'string') return content;
    if (Array.isArray(content)) {
      for (const block of content) {
        if (block.type === 'text' && block.text) return block.text;
      }
    }
    return '';
  }

  async function streamModel(mdl, history, onToken) {
    const stream = await mdl.stream(history);
    let accumulated = null;

    for await (const chunk of stream) {
      const text = extractChunkText(chunk.content);
      if (onToken && text.length > 0) {
        onToken(text);
      }
      accumulated = accumulated ? accumulated.concat(chunk) : chunk;
    }

    return accumulated;
  }

  // ── Session methods ──────────────────────────────────────────────

  /**
   * Process user input. Pass opts.onToken callback to enable streaming.
   */
  async function processInput(input, { onToken } = {}) {
    const historySnapshot = conversationHistory.length;

    try {
      conversationHistory.push(new HumanMessage(input));
      const modelWithTools = model.bindTools(langchainTools);

      let response = onToken
        ? await streamModel(modelWithTools, conversationHistory, onToken)
        : await modelWithTools.invoke(conversationHistory);
      conversationHistory.push(response);

      const allToolCalls = [];

      while (response.tool_calls && response.tool_calls.length > 0) {
        for (const toolCall of response.tool_calls) {
          allToolCalls.push(toolCall);

          const tool = langchainTools.find((t) => t.name === toolCall.name);

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

          conversationHistory.push(
            new ToolMessage({
              content: typeof result === 'string' ? result : JSON.stringify(result),
              tool_call_id: toolCall.id,
            })
          );
        }

        // Stream the post-tool response (this is usually the final text)
        response = onToken
          ? await streamModel(modelWithTools, conversationHistory, onToken)
          : await modelWithTools.invoke(conversationHistory);
        conversationHistory.push(response);
      }

      // Keep history manageable — trim at 50 messages (~12-15 conversation turns)
      if (conversationHistory.length > 50) {
        conversationHistory = [
          conversationHistory[0],
          ...conversationHistory.slice(-40),
        ];
      }

      // Content may be a string or array of content blocks
      const rawContent = response.content;
      let text;
      if (typeof rawContent === 'string') {
        text = rawContent || '(no response)';
      } else if (Array.isArray(rawContent)) {
        text = rawContent
          .filter((b) => b.type === 'text')
          .map((b) => b.text)
          .join('') || '(no response)';
      } else {
        text = '(no response)';
      }

      return { text, toolCalls: allToolCalls };
    } catch (err) {
      conversationHistory.length = historySnapshot;
      throw err;
    }
  }

  function resetConversation() {
    conversationHistory = [new SystemMessage(prompt)];
  }

  function isReady() {
    return true;
  }

  function getToolCount() {
    return langchainTools.length;
  }

  return { processInput, resetConversation, isReady, getToolCount };
}

// ── Backward-compatible singleton (for CLI agent) ────────────────────

let _singleton = null;

function init(opts) {
  _singleton = createSession(opts);
  return _singleton.isReady();
}

function processInput(input) {
  if (!_singleton) {
    return Promise.resolve({ text: 'LLM agent not initialized. Check ANTHROPIC_API_KEY.', toolCalls: [] });
  }
  return _singleton.processInput(input);
}

function resetConversation() {
  if (_singleton) _singleton.resetConversation();
}

function isReady() {
  return _singleton ? _singleton.isReady() : false;
}

function getToolCount() {
  return _singleton ? _singleton.getToolCount() : 0;
}

function getToolSummary() {
  const aTools = annuityPlugin.tools({}).map((t) => t.method);
  const tdToolsList = termDepositPlugin.tools({}).map((t) => t.method);
  const ncdToolsList = ncdPlugin.tools({}).map((t) => t.method);
  const hTools = hcs10Plugin.tools({}).map((t) => t.method);

  return {
    annuityTools: aTools,
    termDepositTools: tdToolsList,
    ncdTools: ncdToolsList,
    hcs10Tools: hTools,
    hederaKitTools: [],
  };
}

module.exports = {
  createSession,
  init,
  processInput,
  isReady,
  getToolCount,
  getToolSummary,
  resetConversation,
};
