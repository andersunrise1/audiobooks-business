import { after, before, describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { startTestServer, stopTestServer } from '../helpers/testServer.js';

// generalRateLimit's in-memory store is a module-level singleton shared by
// every createApp() call within this process (express-rate-limit has no
// per-app store by default) - this describe block runs first, before any
// other section in this file makes its own /api/health requests, so its
// tiny GENERAL_RATE_LIMIT=3 quota starts from a clean count.
describe('General API rate limiting (Dia 75)', () => {
  let server;
  let baseUrl;
  let originalLimit;

  before(async () => {
    originalLimit = process.env.GENERAL_RATE_LIMIT;
    process.env.GENERAL_RATE_LIMIT = '3';
    ({ server, baseUrl } = await startTestServer());
  });

  after(async () => {
    process.env.GENERAL_RATE_LIMIT = originalLimit;
    await stopTestServer(server);
  });

  test('blocks requests once the configured limit is exceeded', async () => {
    const results = [];
    for (let i = 0; i < 4; i += 1) {
      const res = await fetch(`${baseUrl}/api/health`);
      results.push(res.status);
    }
    assert.deepEqual(results.slice(0, 3), [200, 200, 200]);
    assert.equal(results[3], 429);
  });
});

describe('Auth-route rate limiting (Dia 75)', () => {
  let server;
  let baseUrl;
  let originalLimit;

  before(async () => {
    originalLimit = process.env.AUTH_RATE_LIMIT;
    process.env.AUTH_RATE_LIMIT = '2';
    ({ server, baseUrl } = await startTestServer());
  });

  after(async () => {
    process.env.AUTH_RATE_LIMIT = originalLimit;
    await stopTestServer(server);
  });

  test('blocks login attempts once the configured limit is exceeded', async () => {
    function attemptLogin() {
      return fetch(`${baseUrl}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'nobody@techspeak.dev', password: 'wrong' }),
      });
    }

    const first = await attemptLogin();
    const second = await attemptLogin();
    const third = await attemptLogin();

    assert.notEqual(first.status, 429);
    assert.notEqual(second.status, 429);
    assert.equal(third.status, 429);
  });
});

// The remaining sections' occasional /api/health calls stay well under the
// restored default GENERAL_RATE_LIMIT (300), so running after the section
// above (which used a tiny limit of 3) is safe regardless of the shared
// in-memory store's accumulated count.
describe('Security headers and CORS (Dia 75)', () => {
  let server;
  let baseUrl;

  before(async () => {
    ({ server, baseUrl } = await startTestServer());
  });

  after(async () => {
    await stopTestServer(server);
  });

  test('helmet sets standard security headers', async () => {
    const res = await fetch(`${baseUrl}/api/health`);
    assert.equal(res.headers.get('x-content-type-options'), 'nosniff');
    assert.equal(res.headers.get('x-dns-prefetch-control'), 'off');
  });

  test('allows the configured frontend origin', async () => {
    const res = await fetch(`${baseUrl}/api/health`, {
      headers: { Origin: 'http://localhost:5173' },
    });
    assert.equal(res.headers.get('access-control-allow-origin'), 'http://localhost:5173');
  });

  test('rejects a request from a disallowed origin', async () => {
    const res = await fetch(`${baseUrl}/api/health`, {
      headers: { Origin: 'https://evil.example.com' },
    });
    assert.notEqual(res.headers.get('access-control-allow-origin'), 'https://evil.example.com');
  });

  test('allows requests with no Origin header (non-browser clients)', async () => {
    const res = await fetch(`${baseUrl}/api/health`);
    assert.equal(res.status, 200);
  });
});

describe('HTTPS enforcement (Dia 75)', () => {
  let server;
  let baseUrl;
  let originalEnv;

  before(async () => {
    originalEnv = process.env.NODE_ENV;
    ({ server, baseUrl } = await startTestServer());
  });

  after(async () => {
    process.env.NODE_ENV = originalEnv;
    await stopTestServer(server);
  });

  test('does not redirect outside production (dev/test)', async () => {
    const res = await fetch(`${baseUrl}/api/health`, { redirect: 'manual' });
    assert.equal(res.status, 200);
  });

  test('redirects plain HTTP to HTTPS when NODE_ENV=production', async () => {
    process.env.NODE_ENV = 'production';
    try {
      const res = await fetch(`${baseUrl}/api/health`, { redirect: 'manual' });
      assert.equal(res.status, 308);
      assert.match(res.headers.get('location'), /^https:\/\//);
    } finally {
      process.env.NODE_ENV = originalEnv;
    }
  });
});
