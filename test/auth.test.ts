import test from 'node:test';
import assert from 'node:assert/strict';
import { RingAuthManager } from '../src/auth';

test('RingAuthManager: detects auth mode correctly', () => {
  const emptyManager = new RingAuthManager({});
  assert.equal(emptyManager.getAuthMode(), null);

  const tokenManager = new RingAuthManager({ accessToken: 'test-token' });
  assert.equal(tokenManager.getAuthMode(), 'access_token');

  const refreshManager = new RingAuthManager({
    refreshToken: 'refresh-token',
    clientId: 'client-id',
    clientSecret: 'client-secret',
  });
  assert.equal(refreshManager.getAuthMode(), 'refresh_token');

  const conflictManager = new RingAuthManager({
    accessToken: 'test-token',
    refreshToken: 'refresh-token',
  });
  assert.equal(conflictManager.getAuthMode(), null);
});

test('RingAuthManager: throws on credential conflict', async () => {
  const conflictManager = new RingAuthManager({
    accessToken: 'test-token',
    refreshToken: 'refresh-token',
  });

  await assert.rejects(
    async () => {
      await conflictManager.getAccessToken();
    },
    { message: /Both RING_ACCESS_TOKEN and RING_REFRESH_TOKEN are set/ }
  );
});

test('RingAuthManager: returns direct access token in access token mode', async () => {
  const manager = new RingAuthManager({ accessToken: 'test-playground-token' });
  const token = await manager.getAccessToken();
  assert.equal(token, 'test-playground-token');
});

test('RingAuthManager: produces actionable 401 error message with playground instructions', () => {
  const manager = new RingAuthManager({ accessToken: 'expired-token' });
  const error = manager.handleApiError(401, 'Unauthorized');

  assert.match(error.message, /Ring Developer Playground/);
  assert.match(error.message, /RING_ACCESS_TOKEN/);
});

test('RingAuthManager: refreshes OAuth token and caches it', async () => {
  let callCount = 0;
  const originalFetch = globalThis.fetch;

  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    callCount++;
    return new Response(
      JSON.stringify({
        access_token: 'fresh-refreshed-token',
        expires_in: 3600,
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  }) as typeof fetch;

  try {
    const manager = new RingAuthManager({
      refreshToken: 'test-refresh-token',
      clientId: 'test-client-id',
      clientSecret: 'test-client-secret',
      tokenEndpoint: 'https://oauth.example.com/token',
    });

    const token1 = await manager.getAccessToken();
    assert.equal(token1, 'fresh-refreshed-token');
    assert.equal(callCount, 1);

    const token2 = await manager.getAccessToken();
    assert.equal(token2, 'fresh-refreshed-token');
    assert.equal(callCount, 1);
  } finally {
    globalThis.fetch = originalFetch;
  }
});
