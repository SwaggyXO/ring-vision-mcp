#!/usr/bin/env node
import http from 'node:http';
import { randomUUID } from 'node:crypto';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { createRingMcpServer } from './server';

function printHelp(): void {
  console.log(`
Ring Vision MCP Server

Open-source Model Context Protocol server for Ring cameras and doorbells,
built on the official 2026 Amazon Vision Partner API (api.amazonvision.com).

Usage:
  npx ring-vision-mcp [options]
  node src/index.ts [options]

Modes:
  stdio (default)   Runs over standard I/O for Claude Desktop, Cursor, and terminal agents
  --http            Starts an HTTP server implementing MCP 2025-11-25 Streamable HTTP at /mcp
  --port <number>   Port for HTTP server (default: 3001)
  --mock            Enables offline mock mode without live hardware or credentials
  --extended        Enables auxiliary developer inspection tools (raw attributes, auth)

Authentication Environment Variables:
  RING_ACCESS_TOKEN     Temporary Playground access token (https://developer.amazon.com/ring/console/playground)
  RING_REFRESH_TOKEN    OAuth refresh token for production long-running sessions
  RING_CLIENT_ID        OAuth client ID (required with RING_REFRESH_TOKEN)
  RING_CLIENT_SECRET    OAuth client secret (required with RING_REFRESH_TOKEN)
  RING_API_BASE         Optional base URL (default: https://api.amazonvision.com)
  RING_MOCK_MODE        Set to "true" to enable offline mock mode
`);
}

async function runStdio(extendedTools: boolean): Promise<void> {
  const server = createRingMcpServer({ extendedTools });
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

async function runHttp(port: number, extendedTools: boolean): Promise<void> {
  const server = createRingMcpServer({ extendedTools });
  const transport = new StreamableHTTPServerTransport({
    sessionIdGenerator: () => randomUUID(),
  });
  await server.connect(transport);

  const httpServer = http.createServer(async (req, res) => {
    const url = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);

    if (url.pathname === '/mcp' || url.pathname === '/sse') {
      await transport.handleRequest(req, res);
      return;
    }

    if (url.pathname === '/health') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(
        JSON.stringify({
          status: 'ok',
          server: 'ring-vision-mcp',
          protocol: 'mcp-2025-11-25',
          transport: 'streamable-http',
        })
      );
      return;
    }

    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Not found' }));
  });

  httpServer.listen(port, () => {
    console.error(`Ring Vision MCP server listening via Streamable HTTP on http://localhost:${port}/mcp`);
  });
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);

  if (args.includes('--help') || args.includes('-h')) {
    printHelp();
    process.exit(0);
  }

  if (args.includes('--mock')) {
    process.env.RING_MOCK_MODE = 'true';
  }

  const extendedTools = args.includes('--extended') || process.env.RING_EXTENDED_TOOLS === 'true';
  const isHttp = args.includes('--http') || process.env.MCP_TRANSPORT === 'http';
  const portIndex = args.indexOf('--port');
  const port = portIndex !== -1 && args[portIndex + 1]
    ? parseInt(args[portIndex + 1], 10)
    : parseInt(process.env.MCP_PORT || '3001', 10);

  if (isHttp) {
    await runHttp(port, extendedTools);
  } else {
    await runStdio(extendedTools);
  }
}

main().catch((error) => {
  console.error('Fatal MCP server error:', error);
  process.exit(1);
});
