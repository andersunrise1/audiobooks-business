import { pool } from '../config/database.js';

export async function getUserPlan(userId) {
  const { rows } = await pool.query('SELECT plan FROM users WHERE id = $1', [userId]);
  return rows[0]?.plan ?? 'free';
}

// 'corporate' isn't built yet (see MONETIZATION.md) but the schema already
// allows it, so it's treated as paid alongside 'pro' rather than assumed free.
export function isPaidPlan(plan) {
  return plan === 'pro' || plan === 'corporate';
}
