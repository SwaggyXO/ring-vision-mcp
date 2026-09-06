import test from 'node:test';
import assert from 'node:assert/strict';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { createRingMcpServer } from '../src/server';
import { RingClient } from '../src/client';
import { RingAuthManager } from '../src/auth';

test('Protocol: adheres to strict MCP semantics and least privilege privacy', async () => {
  const authManager = new RingAuthManager({ accessToken: 'test-proto-token' });
  const client = new RingClient({ authManager, mockMode: true });
  const server = createRingMcpServer({ client });

  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  await server.connect(serverTransport);

  const mcpClient = new Client({ name: 'test-mcp-agent', version: '1.0.0' });
  await mcpClient.connect(clientTransport);

  const toolsResult = await mcpClient.listTools();
  const toolNames = toolsResult.tools.map((t) => t.name);

  // Verifies least privilege: zero PII and zero raw location tools
  assert.ok(!toolNames.includes('ring_get_user_profile'));
  assert.ok(!toolNames.includes('ring_get_device_location'));

  // Verifies core operational tools are exposed
  assert.ok(toolNames.includes('ring_list_devices'));
  assert.ok(toolNames.includes('ring_get_device_status'));
  assert.ok(toolNames.includes('ring_get_device_capabilities'));
  assert.ok(toolNames.includes('ring_get_device_configurations'));
  assert.ok(toolNames.includes('ring_query_event_history'));
  assert.ok(toolNames.includes('ring_initiate_whep_stream'));
  assert.ok(toolNames.includes('ring_terminate_whep_stream'));
  assert.equal(toolNames.length, 7);

  // Verifies resources
  const resourcesResult = await mcpClient.listResources();
  const resourceUris = resourcesResult.resources.map((r) => r.uri);
  assert.ok(resourceUris.includes('ring://devices'));
  assert.ok(resourceUris.includes('ring://events/recent'));

  // Verifies core v1 is prompt-free
  const capabilities = mcpClient.getServerCapabilities();
  assert.equal(capabilities?.prompts, undefined);
});
