/**
 * HCS-10 Plugin — LangChain tools for Hedera agent-to-agent communication.
 *
 * Wraps HOL Registry search, HCS-10 connection lifecycle, skill invocation,
 * and listener management. Each tool returns data as JSON for the LLM to format.
 */
'use strict';

const { z } = require('zod');

const REGISTRY_API = 'https://hol.org/registry/api/v1';

// ── Tool definitions ────────────────────────────────────────────────

const listAgentsTool = {
  method: 'list_agents',
  name: 'List Agents',
  description:
    'Search the HOL Registry for agents on the Hedera network. ' +
    'Returns agent names, registry source, inbound topic IDs, and descriptions. ' +
    'Example: "list agents", "find agents named imperium", "discover agents".',
  parameters: z.object({
    query: z.string().optional().default('agent').describe('Search query (default "agent" for browsing all)'),
  }),
  execute: async ({ query = 'agent' }) => {
    const url = `${REGISTRY_API}/search?q=${encodeURIComponent(query)}&limit=10`;
    const res = await fetch(url);
    if (!res.ok) return JSON.stringify({ error: `Registry API returned ${res.status}` });
    const data = await res.json();
    const agents = data.hits || data.agents || data.results || data.data || [];
    return JSON.stringify({
      total: data.total || agents.length,
      agents: agents.map((a) => ({
        name: a.name || a.displayName || a.alias || 'Unknown',
        registry: a.registry || '—',
        inboundTopicId: a.inboundTopicId || (a.profile || {}).inboundTopicId || null,
        description: (a.description || (a.profile || {}).bio || '').slice(0, 120),
      })),
    });
  },
};

const connectToAgentTool = {
  method: 'connect_to_agent',
  name: 'Connect to Agent',
  description:
    'Establish an HCS-10 connection to a remote agent using their inbound topic ID. ' +
    'This sends a connection request and waits for confirmation. ' +
    'Example: "connect to 0.0.8199241", "establish connection with agent 0.0.1234".',
  parameters: z.object({
    inboundTopicId: z.string().describe('The remote agent\'s inbound topic ID (e.g. "0.0.8199241")'),
  }),
  execute: async ({ inboundTopicId }, context) => {
    // Connection requires the HCS client from cli-agent context
    // This tool delegates to the CLI agent's connection handler
    if (!context || !context.hcsConnect) {
      return JSON.stringify({ error: 'HCS client not initialized. Use "listen" first or ensure agent is registered.' });
    }
    const result = await context.hcsConnect(inboundTopicId);
    return JSON.stringify(result);
  },
};

const sendSkillTool = {
  method: 'send_skill',
  name: 'Send Skill',
  description:
    'Send a skill request to a connected remote agent via HCS-10. ' +
    'Available skills: annuity.issue, annuity.settle, annuity.transfer, annuity.redeem, ' +
    'annuity.compliance, annuity.analytics, annuity.audit. ' +
    'Example: "send annuity.issue", "invoke annuity.analytics on 0.0.8219533".',
  parameters: z.object({
    skill: z.string().describe('Skill name (e.g. "annuity.issue")'),
    connectionTopicId: z.string().optional().describe('Connection topic ID (optional, uses last active connection)'),
    params: z.record(z.unknown()).optional().describe('Optional parameters as key-value pairs'),
  }),
  execute: async ({ skill, connectionTopicId, params }, context) => {
    if (!context || !context.hcsSendSkill) {
      return JSON.stringify({ error: 'HCS client not initialized.' });
    }
    const result = await context.hcsSendSkill(skill, connectionTopicId, params || {});
    return JSON.stringify(result);
  },
};

const showConnectionsTool = {
  method: 'show_connections',
  name: 'Show Connections',
  description:
    'List all active HCS-10 agent-to-agent connections with their topic IDs and remote agents. ' +
    'Example: "show connections", "list my connections".',
  parameters: z.object({}),
  execute: async (_params, context) => {
    if (!context || !context.getConnections) {
      return JSON.stringify({ connections: [] });
    }
    return JSON.stringify(context.getConnections());
  },
};

const startListenerTool = {
  method: 'start_listener',
  name: 'Start Listener',
  description:
    'Start the HCS-10 listener to receive incoming connection requests and skill invocations from remote agents. ' +
    'Polls every 5 seconds in the background. Example: "listen", "start listening".',
  parameters: z.object({}),
  execute: async (_params, context) => {
    if (!context || !context.startListener) {
      return JSON.stringify({ error: 'Listener not available.' });
    }
    const result = await context.startListener();
    return JSON.stringify(result);
  },
};

const stopListenerTool = {
  method: 'stop_listener',
  name: 'Stop Listener',
  description:
    'Stop the HCS-10 background listener. Example: "stop listening", "stop hcs".',
  parameters: z.object({}),
  execute: async (_params, context) => {
    if (!context || !context.stopListener) {
      return JSON.stringify({ error: 'Listener not available.' });
    }
    const result = context.stopListener();
    return JSON.stringify(result);
  },
};

// ── Plugin export ───────────────────────────────────────────────────

const hcs10Plugin = {
  name: 'imperium-hcs10-plugin',
  version: '0.5.0',
  description:
    'HCS-10 agent-to-agent communication tools — discover agents on the HOL Registry, ' +
    'establish connections, invoke skills on remote agents, manage listener mode.',
  tools: (context) => [
    listAgentsTool,
    connectToAgentTool,
    sendSkillTool,
    showConnectionsTool,
    startListenerTool,
    stopListenerTool,
  ],
};

module.exports = { hcs10Plugin };
