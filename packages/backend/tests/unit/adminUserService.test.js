import { describe, test, mock } from 'node:test';
import assert from 'node:assert/strict';
import { listUsers, setUserAdminStatus } from '../../src/services/adminUserService.js';
import { pool } from '../../src/config/database.js';

describe('adminUserService.listUsers', () => {
  test('maps rows to camelCase', async () => {
    const queryMock = mock.method(pool, 'query', async () => ({
      rows: [
        {
          id: 'u1',
          email: 'a@b.com',
          name: 'Ana',
          plan: 'free',
          is_admin: true,
          created_at: '2026-01-01T00:00:00.000Z',
        },
      ],
    }));

    try {
      const result = await listUsers();
      assert.deepEqual(result, [
        {
          id: 'u1',
          email: 'a@b.com',
          name: 'Ana',
          plan: 'free',
          isAdmin: true,
          createdAt: '2026-01-01T00:00:00.000Z',
        },
      ]);
    } finally {
      queryMock.mock.restore();
    }
  });
});

describe('adminUserService.setUserAdminStatus', () => {
  test('returns the updated user, mapped to camelCase', async () => {
    const queryMock = mock.method(pool, 'query', async () => ({
      rows: [
        {
          id: 'u1',
          email: 'a@b.com',
          name: 'Ana',
          plan: 'free',
          is_admin: true,
          created_at: '2026-01-01T00:00:00.000Z',
        },
      ],
    }));

    try {
      const result = await setUserAdminStatus('u1', true);
      assert.equal(result.isAdmin, true);
      const [sql, params] = queryMock.mock.calls[0].arguments;
      assert.match(sql, /UPDATE users SET is_admin/);
      assert.deepEqual(params, [true, 'u1']);
    } finally {
      queryMock.mock.restore();
    }
  });

  test('returns null when the user does not exist', async () => {
    const queryMock = mock.method(pool, 'query', async () => ({ rows: [] }));

    try {
      const result = await setUserAdminStatus('missing', true);
      assert.equal(result, null);
    } finally {
      queryMock.mock.restore();
    }
  });
});
