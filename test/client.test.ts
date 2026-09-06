import test from 'node:test';
import assert from 'node:assert/strict';
import { RingClient } from '../src/client';
import { RingAuthManager } from '../src/auth';

function createMockClient(mockFetchHandler: (url: string, init?: RequestInit) => Promise<Response>): RingClient {
  const authManager = new RingAuthManager({ accessToken: 'mock-test-token' });
  const client = new RingClient({
    apiBase: 'https://api.mockvision.com',
    authManager,
  });

  const originalFetch = globalThis.fetch;
  globalThis.fetch = ((input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === 'string' ? input : input.toString();
    return mockFetchHandler(url, init);
  }) as typeof fetch;

  return client;
}

test('RingClient: listDevices returns normalized devices and filters offline', async () => {
  const originalFetch = globalThis.fetch;
  try {
    const client = createMockClient(async (url) => {
      assert.match(url, /\/v1\/devices/);
      return new Response(
        JSON.stringify({
          data: [
            {
              id: 'device-1',
              attributes: { name: 'Front Door', online: true, capabilities: { motion: true } },
            },
            {
              id: 'device-2',
              attributes: { name: 'Backyard', online: false, capabilities: { motion: true } },
            },
          ],
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    });

    const allDevices = await client.listDevices(true);
    assert.equal(allDevices.length, 2);
    assert.equal(allDevices[0].name, 'Front Door');
    assert.equal(allDevices[0].online, true);

    const onlineOnly = await client.listDevices(false);
    assert.equal(onlineOnly.length, 1);
    assert.equal(onlineOnly[0].id, 'device-1');
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('RingClient: resolveDeviceId matches exact ID and case-insensitive substring', async () => {
  const originalFetch = globalThis.fetch;
  try {
    const client = createMockClient(async (url) => {
      return new Response(
        JSON.stringify({
          data: [
            {
              id: 'urn:ring:device:101',
              attributes: { name: 'Front Door Video Doorbell', online: true },
            },
            {
              id: 'urn:ring:device:202',
              attributes: { name: 'Backyard Cam', online: true },
            },
          ],
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    });

    const exact = await client.resolveDeviceId('urn:ring:device:101');
    assert.equal(exact, 'urn:ring:device:101');

    const bySubstring = await client.resolveDeviceId('front door');
    assert.equal(bySubstring, 'urn:ring:device:101');

    const byPartial = await client.resolveDeviceId('backyard');
    assert.equal(byPartial, 'urn:ring:device:202');
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('RingClient: getDeviceStatus parses battery, RSSI, and firmware', async () => {
  const originalFetch = globalThis.fetch;
  try {
    const client = createMockClient(async (url) => {
      if (url.includes('/v1/devices') && !url.includes('/status')) {
        return new Response(JSON.stringify({ data: [{ id: 'cam-101', attributes: { name: 'Cam 101' } }] }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
      }
      assert.match(url, /\/v1\/devices\/cam-101\/status/);
      return new Response(
        JSON.stringify({
          data: {
            attributes: {
              online: true,
              battery_percentage: 85,
              rssi: -58,
              firmware_version: '1.14.2',
              last_seen: '2026-09-06T12:00:00Z',
            },
          },
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    });

    const status = await client.getDeviceStatus('cam-101');
    assert.equal(status.online, true);
    assert.equal(status.batteryPercentage, 85);
    assert.equal(status.signalStrengthRssi, -58);
    assert.equal(status.firmwareVersion, '1.14.2');
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('RingClient: getDeviceCapabilities and getDeviceConfigurations parse correctly', async () => {
  const originalFetch = globalThis.fetch;
  try {
    const client = createMockClient(async (url) => {
      if (url.includes('/capabilities')) {
        return new Response(
          JSON.stringify({
            data: {
              attributes: {
                video_codecs: ['H.264', 'H.265'],
                features: { color_night_vision: true },
              },
            },
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        );
      }
      if (url.includes('/configurations')) {
        return new Response(
          JSON.stringify({
            data: {
              attributes: {
                motion_detection: { enabled: true },
              },
            },
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        );
      }
      return new Response(JSON.stringify({ data: [] }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    });

    const caps = await client.getDeviceCapabilities('cam-101');
    assert.deepEqual(caps.codecs, ['H.264', 'H.265']);

    const configs = await client.getDeviceConfigurations('cam-101');
    assert.ok(configs.settings);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('RingClient: initiateWhepStream extracts session URL and terminate sends DELETE', async () => {
  const originalFetch = globalThis.fetch;
  try {
    let deleteCalled = false;
    const client = createMockClient(async (url, init) => {
      if (url.includes('/media/streaming/whep/sessions')) {
        return new Response('v=0\r\nsdp-answer-content', {
          status: 201,
          headers: {
            'Content-Type': 'application/sdp',
            Location: 'https://api.mockvision.com/sessions/sess_999',
          },
        });
      }
      if (url === 'https://api.mockvision.com/sessions/sess_999' && init?.method === 'DELETE') {
        deleteCalled = true;
        return new Response(null, { status: 204 });
      }
      return new Response(JSON.stringify({ data: [] }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    });

    const result = await client.initiateWhepStream('cam-101', 'v=0\r\no=test 0 0 IN IP4 127.0.0.1');
    assert.equal(result.sdpAnswer, 'v=0\r\nsdp-answer-content');
    assert.equal(result.sessionUrl, 'https://api.mockvision.com/sessions/sess_999');

    const term = await client.terminateWhepStream(result.sessionUrl);
    assert.equal(term.success, true);
    assert.equal(deleteCalled, true);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('RingClient: mockMode returns deterministic local data without network calls', async () => {
  const client = new RingClient({ mockMode: true });

  const devices = await client.listDevices(true);
  assert.equal(devices.length, 2);
  assert.equal(devices[0].name, 'Front Door Video Doorbell');

  const status = await client.getDeviceStatus('urn:ring:device:front-door-101');
  assert.equal(status.online, true);
  assert.equal(status.batteryPercentage, 94);

  const events = await client.getEventHistory(undefined, 2);
  assert.equal(events.length, 2);

  const stream = await client.initiateWhepStream('urn:ring:device:front-door-101', 'offer');
  assert.ok(stream.sdpAnswer.includes('v=0'));
  assert.ok(stream.sessionUrl.includes('mock-session'));
});
