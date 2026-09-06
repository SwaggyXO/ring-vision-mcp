import test from 'node:test';
import assert from 'node:assert/strict';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { createRingMcpServer } from '../src/server';
import { RingClient } from '../src/client';
import { RingAuthManager } from '../src/auth';

function setupResourceHarness(mockFetchHandler: (url: string, init?: RequestInit) => Promise<Response>) {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = ((input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === 'string' ? input : input.toString();
    return mockFetchHandler(url, init);
  }) as typeof fetch;

  const authManager = new RingAuthManager({ accessToken: 'test-resource-token' });
  const client = new RingClient({
    apiBase: 'https://api.mockvision.com',
    authManager,
  });

  const eventStore = [
    {
      event_id: 'evt_ring_1',
      event_type: 'motion_detected',
      timestamp: '2026-09-06T12:00:00Z',
      device_id: 'cam-porch',
    },
  ];

  const server = createRingMcpServer({ client, eventStore });
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();

  return {
    server,
    clientTransport,
    serverTransport,
    cleanup: () => {
      globalThis.fetch = originalFetch;
    },
  };
}

test('Resources: lists and reads ring://devices, ring://devices/{id}/status, and ring://events/recent', async () => {
  const harness = setupResourceHarness(async (url) => {
    if (url.includes('/v1/devices/cam-porch/status')) {
      return new Response(
        JSON.stringify({
          data: {
            attributes: { online: true, battery_percentage: 92, rssi: -50 },
          },
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({
        data: [
          {
            id: 'cam-porch',
            attributes: { name: 'Porch Camera', online: true, capabilities: { liveStream: true } },
          },
        ],
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  });

  try {
    await harness.server.connect(harness.serverTransport);

    const client = new Client({ name: 'test-client', version: '1.0.0' });
    await client.connect(harness.clientTransport);

    const resourcesResult = await client.listResources();
    const uris = resourcesResult.resources.map((r) => r.uri);
    assert.ok(uris.includes('ring://devices'));
    assert.ok(uris.includes('ring://events/recent'));

    const devicesRes = await client.readResource({ uri: 'ring://devices' });
    const devContent = devicesRes.contents[0];
    assert.ok('text' in devContent && typeof devContent.text === 'string');
    const devices = JSON.parse(devContent.text);
    assert.equal(devices.length, 1);
    assert.equal(devices[0].id, 'cam-porch');

    const statusRes = await client.readResource({ uri: 'ring://devices/cam-porch/status' });
    const statContent = statusRes.contents[0];
    assert.ok('text' in statContent && typeof statContent.text === 'string');
    const status = JSON.parse(statContent.text);
    assert.equal(status.online, true);
    assert.equal(status.batteryPercentage, 92);

    const eventsRes = await client.readResource({ uri: 'ring://events/recent' });
    const evtContent = eventsRes.contents[0];
    assert.ok('text' in evtContent && typeof evtContent.text === 'string');
    const events = JSON.parse(evtContent.text);
    assert.equal(events.length, 1);
    assert.equal(events[0].event_id, 'evt_ring_1');
  } finally {
    harness.cleanup();
  }
});
