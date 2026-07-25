import { pool } from '../config/database.js';

export async function listUsers() {
  const { rows } = await pool.query(
    `SELECT id, email, name, plan, is_admin, created_at FROM users ORDER BY created_at DESC`,
  );

  return rows.map((row) => ({
    id: row.id,
    email: row.email,
    name: row.name,
    plan: row.plan,
    isAdmin: row.is_admin,
    createdAt: row.created_at,
  }));
}

export async function setUserAdminStatus(userId, isAdmin) {
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
