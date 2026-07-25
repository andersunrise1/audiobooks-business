import { after, before, describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { pool } from '../../src/config/database.js';
import { startTestServer, stopTestServer, registerTestUser } from '../helpers/testServer.js';

describe('Admin user management', () => {
  let server;
  let baseUrl;
  let adminAccessToken;
  let adminUserId;
  let plainAccessToken;
  let plainUserId;

  before(async () => {
    ({ server, baseUrl } = await startTestServer());

    const admin = await registerTestUser(baseUrl);
    adminAccessToken = admin.accessToken;
    adminUserId = admin.user.id;
    await pool.query('UPDATE users SET is_admin = true WHERE id = $1', [adminUserId]);

    const plain = await registerTestUser(baseUrl);
    plainAccessToken = plain.accessToken;
    plainUserId = plain.user.id;
  });

  after(async () => {
    await pool.query('DELETE FROM users WHERE id = $1', [adminUserId]);
    await pool.query('DELETE FROM users WHERE id = $1', [plainUserId]);
    await stopTestServer(server);
  });

  describe('GET /api/admin/users', () => {
    test('rejects unauthenticated requests', async () => {
      const res = await fetch(`${baseUrl}/api/admin/users`);
      assert.equal(res.status, 401);
    });

    test('rejects a non-admin user', async () => {
      const res = await fetch(`${baseUrl}/api/admin/users`, {
        headers: { Authorization: `Bearer ${plainAccessToken}` },
      });
      assert.equal(res.status, 403);
    });

    test('returns every user for an admin', async () => {
      const res = await fetch(`${baseUrl}/api/admin/users`, {
        headers: { Authorization: `Bearer ${adminAccessToken}` },
      });
      assert.equal(res.status, 200);

      const data = await res.json();
      const plainRow = data.find((u) => u.id === plainUserId);
      assert.ok(plainRow);
      assert.equal(plainRow.isAdmin, false);
      assert.equal(typeof plainRow.plan, 'string');
      assert.ok('password_hash' in plainRow === false);
    });
  });

  describe('PATCH /api/admin/users/:id', () => {
    test('rejects a non-boolean isAdmin', async () => {
      const res = await fetch(`${baseUrl}/api/admin/users/${plainUserId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminAccessToken}`,
        },
        body: JSON.stringify({ isAdmin: 'yes' }),
      });
      assert.equal(res.status, 400);
    });

    test('returns 404 for a user that does not exist', async () => {
      const res = await fetch(`${baseUrl}/api/admin/users/00000000-0000-0000-0000-000000000000`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminAccessToken}`,
        },
        body: JSON.stringify({ isAdmin: true }),
      });
      assert.equal(res.status, 404);
    });

    test('prevents an admin from removing their own admin access', async () => {
      const res = await fetch(`${baseUrl}/api/admin/users/${adminUserId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminAccessToken}`,
        },
        body: JSON.stringify({ isAdmin: false }),
      });
      assert.equal(res.status, 400);

      const { rows } = await pool.query('SELECT is_admin FROM users WHERE id = $1', [adminUserId]);
      assert.equal(rows[0].is_admin, true);
    });

    test('promotes another user to admin', async () => {
      const res = await fetch(`${baseUrl}/api/admin/users/${plainUserId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminAccessToken}`,
        },
        body: JSON.stringify({ isAdmin: true }),
      });
      assert.equal(res.status, 200);

      const data = await res.json();
      assert.equal(data.isAdmin, true);

      const { rows } = await pool.query('SELECT is_admin FROM users WHERE id = $1', [plainUserId]);
      assert.equal(rows[0].is_admin, true);
    });
  });
});
