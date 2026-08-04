import { describe, test, mock } from 'node:test';
import assert from 'node:assert/strict';
import { listUsers, setUserAdminStatus } from '../../src/services/adminUserService.js';
import { pool } from '../../src/config/database.js';

// This machine's real .env sets ADMIN_EMAIL to the actual owner's address,
// which must never leak into a unit test - each test below controls it
// explicitly instead of relying on ambient state.
async function withAdminEmail(value, fn) {
  const original = process.env.ADMIN_EMAIL;
  if (value === undefined) delete process.env.ADMIN_EMAIL;
  else process.env.ADMIN_EMAIL = value;

  try {
    await fn();
  } finally {
    if (original === undefined) delete process.env.ADMIN_EMAIL;
    else process.env.ADMIN_EMAIL = original;
  }
}

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
          is_beta_tester: false,
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
          isBetaTester: false,
          createdAt: '2026-01-01T00:00:00.000Z',
        },
      ]);
    } finally {
      queryMock.mock.restore();
    }
  });
});

describe('adminUserService.setUserAdminStatus', () => {
  test('returns the updated user, mapped to camelCase, when ADMIN_EMAIL is not configured', async () => {
    await withAdminEmail(undefined, async () => {
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
        // No email lookup should happen at all when the restriction is off.
        assert.equal(queryMock.mock.calls.length, 1);
        const [sql, params] = queryMock.mock.calls[0].arguments;
        assert.match(sql, /UPDATE users SET is_admin/);
        assert.deepEqual(params, [true, 'u1']);
      } finally {
        queryMock.mock.restore();
      }
    });
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

  test('always allows demotion, even when ADMIN_EMAIL is configured', async () => {
    await withAdminEmail('owner@example.com', async () => {
      const queryMock = mock.method(pool, 'query', async () => ({
        rows: [
          {
            id: 'u1',
            email: 'someone-else@example.com',
            name: 'Ana',
            plan: 'free',
            is_admin: false,
            created_at: '2026-01-01T00:00:00.000Z',
          },
        ],
      }));

      try {
        const result = await setUserAdminStatus('u1', false);
        assert.equal(result.isAdmin, false);
        // No email lookup for a demotion - only granting access is guarded.
        assert.equal(queryMock.mock.calls.length, 1);
      } finally {
        queryMock.mock.restore();
      }
    });
  });

  test('throws when granting admin to an email that does not match ADMIN_EMAIL', async () => {
    await withAdminEmail('owner@example.com', async () => {
      const queryMock = mock.method(pool, 'query', async () => ({
        rows: [{ email: 'someone-else@example.com' }],
      }));

      try {
        await assert.rejects(() => setUserAdminStatus('u1', true), {
          code: 'ADMIN_EMAIL_MISMATCH',
        });
      } finally {
        queryMock.mock.restore();
      }
    });
  });

  test('grants admin when the target email matches ADMIN_EMAIL', async () => {
    await withAdminEmail('owner@example.com', async () => {
      let call = 0;
      const queryMock = mock.method(pool, 'query', async () => {
        call += 1;
        if (call === 1) return { rows: [{ email: 'owner@example.com' }] };
        return {
          rows: [
            {
              id: 'u1',
              email: 'owner@example.com',
              name: 'Owner',
              plan: 'pro',
              is_admin: true,
              created_at: '2026-01-01T00:00:00.000Z',
            },
          ],
        };
      });

      try {
        const result = await setUserAdminStatus('u1', true);
        assert.equal(result.isAdmin, true);
        assert.equal(queryMock.mock.calls.length, 2);
      } finally {
        queryMock.mock.restore();
      }
    });
  });
});
