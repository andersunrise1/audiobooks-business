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
});
