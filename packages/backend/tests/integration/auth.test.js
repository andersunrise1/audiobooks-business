import { after, before, describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { pool } from '../../src/config/database.js';
import { startTestServer, stopTestServer, registerTestUser } from '../helpers/testServer.js';

describe('Authentication', () => {
  let server;
  let baseUrl;
  const createdUserIds = [];

  before(async () => {
    ({ server, baseUrl } = await startTestServer());
  });

  after(async () => {
    if (createdUserIds.length > 0) {
      await pool.query('DELETE FROM users WHERE id = ANY($1)', [createdUserIds]);
    }
    await stopTestServer(server);
  });

  async function registerAndTrack(overrides) {
    const result = await registerTestUser(baseUrl, overrides);
    createdUserIds.push(result.user.id);
    return result;
  }

  test('should register new user', async () => {
    const { user, accessToken } = await registerAndTrack();
    assert.ok(user.id);
    assert.ok(accessToken);
  });

  test('rejects registration with a malformed email (Dia 75)', async () => {
    const res = await fetch(`${baseUrl}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'not-an-email', password: 'correct-horse-battery-staple' }),
    });
    assert.equal(res.status, 400);
  });

  test('rejects registration with a too-short password (Dia 75)', async () => {
    const res = await fetch(`${baseUrl}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: `short-pw-${Date.now()}@techspeak.test`, password: 'short' }),
    });
    assert.equal(res.status, 400);
  });

  test('should login with valid credentials', async () => {
    const { email, password } = await registerAndTrack();

    const res = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });

    assert.equal(res.status, 200);
    const data = await res.json();
    assert.ok(data.accessToken);
  });

  test('should reject invalid credentials', async () => {
    const { email } = await registerAndTrack();

    const res = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password: 'wrong-password' }),
    });

    assert.equal(res.status, 401);
  });

  describe('GET /api/auth/me', () => {
    test('rejects unauthenticated requests', async () => {
      const res = await fetch(`${baseUrl}/api/auth/me`);
      assert.equal(res.status, 401);
    });

    test("returns the caller's current profile, reflecting DB changes since login", async () => {
      const { user, accessToken } = await registerAndTrack();
      assert.equal(user.plan, 'free');

      await pool.query(`UPDATE users SET plan = 'pro' WHERE id = $1`, [user.id]);

      const res = await fetch(`${baseUrl}/api/auth/me`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      assert.equal(res.status, 200);
      const data = await res.json();
      assert.equal(data.user.id, user.id);
      assert.equal(data.user.plan, 'pro');
      assert.ok(!('passwordHash' in data.user));
    });
  });
});
