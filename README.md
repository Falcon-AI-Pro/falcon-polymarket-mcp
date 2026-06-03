# Falcon Polymarket MCP Server

MCP server exposing Falcon AI's **external Polymarket API** for OpenClaw, Cursor, Claude Desktop, and other MCP hosts.

## Install (npm)

```bash
npm install -g @falconai/polymarket-mcp
# or one-off:
npx -y @falconai/polymarket-mcp
```

## Publish (maintainers)

```bash
cd integrations/falcon-polymarket-mcp
npm login   # npm account with access to @falconai scope
npm publish --access public
```

## Local development

```bash
npm install
```

## Environment

| Variable | Required | Default |
|----------|----------|---------|
| `FALCON_API_KEY` | Yes | — |
| `FALCON_API_BASE` | No | `https://api.falconai.pro/api/v1/external/polymarket` |

## Run

```bash
FALCON_API_KEY=aif_xxx npm start
```

Stdio transport — configure your MCP host to launch `node src/index.js` with the env vars above.

## Tools

- `falcon_health`
- `falcon_list_markets`
- `falcon_get_market`
- `falcon_get_orderbook`
- `falcon_leaderboard`
- `falcon_copy_picks`
- `falcon_trader_stats`
- `falcon_signal_schema`

For live trading execution, use the [Falcon AI agent client](https://app.falconai.pro/app/signals/agent-client).

## Source

https://github.com/Falcon-AI-Pro/falcon-polymarket-mcp
