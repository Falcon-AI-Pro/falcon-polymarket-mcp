#!/usr/bin/env node
/**
 * Falcon AI — Polymarket MCP server
 *
 * Env:
 *   FALCON_API_KEY   (required) — aif_… from Falcon Integration → API keys
 *   FALCON_API_BASE  (optional) — default https://api.falconai.pro/api/v1/external/polymarket
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';

const API_BASE = (process.env.FALCON_API_BASE || 'https://api.falconai.pro/api/v1/external/polymarket').replace(/\/$/, '');
const API_KEY = (process.env.FALCON_API_KEY || '').trim();

async function falconFetch(path, query = {}) {
  if (!API_KEY) {
    throw new Error('FALCON_API_KEY is not set');
  }
  const url = new URL(`${API_BASE}${path.startsWith('/') ? path : `/${path}`}`);
  for (const [k, v] of Object.entries(query)) {
    if (v !== undefined && v !== null && v !== '') url.searchParams.set(k, String(v));
  }
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${API_KEY}`, Accept: 'application/json' },
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg = body.error || body.message || res.statusText;
    throw new Error(`${res.status} ${msg}`);
  }
  return body;
}

function textResult(data) {
  return {
    content: [{ type: 'text', text: typeof data === 'string' ? data : JSON.stringify(data, null, 2) }],
  };
}

const SIGNAL_SCHEMA = {
  websocket_url: 'wss://api.falconai.pro/ws/signals?apiKey=<FALCON_API_KEY>',
  subscribe: { type: 'subscribe', categories: ['crypto', 'sports'] },
  signal_fields: {
    id: 'unique signal id',
    category: 'crypto | sports | politics | weather | …',
    signal_type: 'whale_copy | price_signal | …',
    market_title: 'human-readable market',
    market_id: 'Polymarket market id',
    side: 'YES | NO',
    entry_price: '0–1',
    edge: 'estimated edge 0–1',
    confidence: '0–1',
    suggested_size_pct: 'server Kelly suggestion % of bankroll',
  },
  execution_note:
    'For live orders use the Falcon AI client on the user machine (DRY_RUN=true first). Do not put POLYMARKET__PK in OpenClaw chat.',
};

const server = new McpServer({
  name: 'falcon-polymarket',
  version: '1.0.0',
});

server.registerTool(
  'falcon_health',
  { description: 'Check Falcon Polymarket API connectivity and API key validity' },
  async () => textResult(await falconFetch('/health'))
);

server.registerTool(
  'falcon_list_markets',
  {
    description: 'List Polymarket markets',
    inputSchema: {
      limit: z.number().optional().describe('Max results (default 20)'),
      active: z.boolean().optional().describe('Only active markets (default true)'),
      q: z.string().optional().describe('Search query'),
    },
  },
  async ({ limit = 20, active = true, q }) =>
    textResult(await falconFetch('/markets', { limit, active: active ? 'true' : 'false', q }))
);

server.registerTool(
  'falcon_get_market',
  {
    description: 'Get one Polymarket market by id',
    inputSchema: { market_id: z.string().describe('Polymarket market id') },
  },
  async ({ market_id }) => textResult(await falconFetch(`/markets/${encodeURIComponent(market_id)}`))
);

server.registerTool(
  'falcon_get_orderbook',
  {
    description: 'Order book for a market',
    inputSchema: { market_id: z.string().describe('Polymarket market id') },
  },
  async ({ market_id }) =>
    textResult(await falconFetch(`/markets/${encodeURIComponent(market_id)}/orderbook`))
);

server.registerTool(
  'falcon_leaderboard',
  {
    description: 'Top Polymarket traders by lifetime stats',
    inputSchema: {
      limit: z.number().optional().describe('1–50, default 10'),
      sort_by: z.string().optional().describe('total_realized_pnl | win_rate_pct | total_trades'),
      min_trades: z.number().optional().describe('Minimum trades'),
    },
  },
  async ({ limit = 10, sort_by = 'total_realized_pnl', min_trades = 5 }) =>
    textResult(await falconFetch('/leaderboard', { limit, sort_by, min_trades }))
);

server.registerTool(
  'falcon_copy_picks',
  {
    description: 'Copy-trading wallet picks for a topic',
    inputSchema: {
      topic: z.string().optional().describe('politics | sports | crypto | …'),
      limit: z.number().optional(),
      sort_by: z.string().optional(),
    },
  },
  async ({ topic = 'crypto', limit = 5, sort_by = 'recent_pnl' }) =>
    textResult(await falconFetch('/copy-picks', { topic, limit, sort_by }))
);

server.registerTool(
  'falcon_trader_stats',
  {
    description: 'Lifetime stats for a wallet address',
    inputSchema: { wallet: z.string().describe('0x… Polygon address') },
  },
  async ({ wallet }) =>
    textResult(await falconFetch(`/traders/${encodeURIComponent(wallet)}/stats`))
);

server.registerTool(
  'falcon_signal_schema',
  {
    description:
      'Explain Falcon WebSocket signal fields and when to use the local Falcon AI client for execution',
  },
  async () => textResult(SIGNAL_SCHEMA)
);

const transport = new StdioServerTransport();
await server.connect(transport);
