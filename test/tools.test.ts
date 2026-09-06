import test from 'node:test';
import assert from 'node:assert/strict';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { createRingMcpServer } from '../src/server';
import { RingClient } from '../src/client';

function setupToolsHarness(extendedTools = false) {
  const client = new RingClient({ mockMode: true });
  const server = createRingMcpServer({ client, extendedTools });
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();

  return {
    server,
    clientTransport,
    serverTransport,
  };
}

test('Tools: executes standard tools including device inventory, status, capabilities, and configs', async () => {
  const harness = setupToolsHarness(false);
  await harness.server.connect(harness.serverTransport);

  const client = new Client({ name: 'test-client', version: '1.0.0' });
  await client.connect(harness.clientTransport);

  const toolsResult = await client.listTools();
  const toolNames = toolsResult.tools.map((t) => t.name);

  assert.equal(toolNames.length, 7);
  assert.ok(toolNames.includes('ring_list_devices'));
  assert.ok(toolNames.includes('ring_get_device_status'));
  assert.ok(toolNames.includes('ring_get_device_capabilities'));
  assert.ok(toolNames.includes('ring_get_device_configurations'));
  assert.ok(toolNames.includes('ring_query_event_history'));
  assert.ok(toolNames.includes('ring_initiate_whep_stream'));
  assert.ok(toolNames.includes('ring_terminate_whep_stream'));

  // Test ring_list_devices
  const listRes = (await client.callTool({
    name: 'ring_list_devices',
    arguments: { includeOffline: true },
  })) as { content: Array<{ type: string; text: string }> };
  const devices = JSON.parse(listRes.content[0].text);
  assert.equal(devices.length, 2);

  // Test ring_get_device_status with substring name resolution
  const statusRes = (await client.callTool({
    name: 'ring_get_device_status',
    arguments: { deviceId: 'front door' },
  })) as { content: Array<{ type: string; text: string }> };
  const status = JSON.parse(statusRes.content[0].text);
  assert.equal(status.online, true);
  assert.equal(status.batteryPercentage, 94);

  // Test ring_get_device_capabilities
  const capRes = (await client.callTool({
    name: 'ring_get_device_capabilities',
    arguments: { deviceId: 'front door' },
  })) as { content: Array<{ type: string; text: string }> };
  const caps = JSON.parse(capRes.content[0].text);
  assert.ok(caps.codecs.includes('H.264'));

  // Test ring_get_device_configurations
  const confRes = (await client.callTool({
    name: 'ring_get_device_configurations',
    arguments: { deviceId: 'front door' },
  })) as { content: Array<{ type: string; text: string }> };
  const conf = JSON.parse(confRes.content[0].text);
  assert.equal(conf.settings.motion_detection_enabled, true);

  // Test ring_query_event_history account-wide (deviceId omitted)
  const historyRes = (await client.callTool({
    name: 'ring_query_event_history',
    arguments: { limit: 2 },
  })) as { content: Array<{ type: string; text: string }> };
  const history = JSON.parse(historyRes.content[0].text);
  assert.equal(history.length, 2);

  // Test WHEP stream lifecycle
  const streamRes = (await client.callTool({
    name: 'ring_initiate_whep_stream',
    arguments: { deviceId: 'front door', sdpOffer: 'v=0\r\no=test 0 0 IN IP4 127.0.0.1' },
  })) as { content: Array<{ type: string; text: string }> };
  const stream = JSON.parse(streamRes.content[0].text);
  assert.ok(stream.success);
  assert.ok(stream.sessionUrl.includes('mock-session'));

  const termRes = (await client.callTool({
    name: 'ring_terminate_whep_stream',
    arguments: { sessionUrl: stream.sessionUrl },
  })) as { content: Array<{ type: string; text: string }> };
  const term = JSON.parse(termRes.content[0].text);
  assert.equal(term.success, true);
});

test('Tools: enables extended diagnostic tools when extendedTools is true', async () => {
  const harness = setupToolsHarness(true);
  await harness.server.connect(harness.serverTransport);

  const client = new Client({ name: 'test-client', version: '1.0.0' });
  await client.connect(harness.clientTransport);

  const toolsResult = await client.listTools();
  const toolNames = toolsResult.tools.map((t) => t.name);

  assert.equal(toolNames.length, 10);
  assert.ok(toolNames.includes('ring_inspect_raw_device'));
  assert.ok(toolNames.includes('ring_inspect_auth_status'));
  assert.ok(toolNames.includes('ring_inspect_stream_session'));
});
