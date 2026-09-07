import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { randomUUID } from 'node:crypto';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { createRingMcpServer } from '../src/server';
import { RingClient } from '../src/client';

test('Transport: implements MCP 2025-11-25 Streamable HTTP transport at /mcp', async () => {
  const server = createRingMcpServer({
    client: new RingClient({ mockMode: true }),
  });
  const serverTransport = new StreamableHTTPServerTransport({
    sessionIdGenerator: () => randomUUID(),
  });
  await server.connect(serverTransport);

  const httpServer = http.createServer(async (req, res) => {
    const url = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);
    if (url.pathname === '/mcp') {
      await serverTransport.handleRequest(req, res);
      return;
    }
    res.writeHead(404);
    res.end();
  });

  await new Promise<void>((resolve) => httpServer.listen(0, resolve));
  const port = (httpServer.address() as { port: number }).port;

  try {
    const client = new Client({ name: 'streamable-test-client', version: '1.0.0' });
    const clientTransport = new StreamableHTTPClientTransport(new URL(`http://localhost:${port}/mcp`));
    clientTransport.onerror = (err) => {
      if (err.message.includes('AbortError') || err.name === 'AbortError') return;
      console.error('CLIENT_TRANSPORT_ERROR:', err);
    };
    await client.connect(clientTransport);

    const toolsResult = await client.listTools();
    assert.equal(toolsResult.tools.length, 7);

    const listRes = (await client.callTool({
      name: 'ring_list_devices',
      arguments: {},
    })) as { content: Array<{ type: string; text: string }> };
    const devices = JSON.parse(listRes.content[0].text);
    assert.equal(devices.length, 2);

    await client.close();
  } finally {
    await new Promise<void>((resolve) => httpServer.close(() => resolve()));
  }
});
