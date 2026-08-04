import { pool } from '../config/database.js';

export async function listUsers() {
  const { rows } = await pool.query(
    `SELECT id, email, name, plan, is_admin, is_beta_tester, created_at FROM users ORDER BY created_at DESC`,
  );

  return rows.map((row) => ({
    id: row.id,
    email: row.email,
    name: row.name,
    plan: row.plan,
    isAdmin: row.is_admin,
    isBetaTester: row.is_beta_tester,
    createdAt: row.created_at,
  }));
}

// When ADMIN_EMAIL is configured, only that one account can ever be granted
// admin access - closes off the real risk this endpoint otherwise carries
// (any existing admin could promote an arbitrary second account, and a
// leftover test fixture from earlier manual verification could easily be
// forgotten in an admin-flagged state, as actually happened with an old
// chattest@techspeak.dev row found in this dev DB). Demotion (isAdmin:
// false) is never restricted - only granting new access is.
export async function setUserAdminStatus(userId, isAdmin) {
  if (isAdmin && process.env.ADMIN_EMAIL) {
    const { rows: targetRows } = await pool.query('SELECT email FROM users WHERE id = $1', [
      userId,
    ]);
    if (!targetRows[0]) return null;
    if (targetRows[0].email !== process.env.ADMIN_EMAIL) {
      const err = new Error('only the primary admin account can be granted admin access');
      err.code = 'ADMIN_EMAIL_MISMATCH';
      throw err;
    }
  }

  const { rows } = await pool.query(
    `UPDATE users SET is_admin = $1 WHERE id = $2 RETURNING id, email, name, plan, is_admin, created_at`,
    [isAdmin, userId],
  );

  const user = rows[0];
  if (!user) return null;

  return {
    id: user.id,
    email: user.email,
    name: user.name,
    plan: user.plan,
    isAdmin: user.is_admin,
    createdAt: user.created_at,
  };
}
