import { pool } from '../config/database.js';

const FEEDBACK_CATEGORIES = ['bug', 'feature_request', 'general'];

export function isValidFeedbackCategory(category) {
  return FEEDBACK_CATEGORIES.includes(category);
}

export function isValidRating(rating) {
  return (
    rating === undefined ||
    rating === null ||
    (Number.isInteger(rating) && rating >= 1 && rating <= 5)
  );
}

// Granting beta status also grants free Pro access (the plan's own
// "Dar acesso Pro gratis" ask) - reusing the existing plan='pro' value
// rather than a separate 'beta' plan means every existing plan === 'pro'
// check (paywall, AI rate limits, dashboard) already works correctly with
// no changes elsewhere. Revoking beta status deliberately does NOT revert
// plan back to 'free' - this app has no purchase-history table (Dia 47's
// webhook sets plan='pro' directly, nothing records *how*), so there's no
// reliable way to tell a beta grant apart from a real purchase after the
// fact except this flag itself; auto-downgrading on revoke risks yanking
// access from someone who has since paid for real. An admin can still
// change plan directly if that's genuinely what's needed.
export async function setBetaTesterStatus(userId, isBetaTester) {
  const query = isBetaTester
    ? `UPDATE users SET is_beta_tester = true, plan = 'pro' WHERE id = $1
       RETURNING id, email, name, plan, is_admin, is_beta_tester, created_at`
    : `UPDATE users SET is_beta_tester = false WHERE id = $1
       RETURNING id, email, name, plan, is_admin, is_beta_tester, created_at`;

  const { rows } = await pool.query(query, [userId]);
  const user = rows[0];
  if (!user) return null;

  return {
    id: user.id,
    email: user.email,
    name: user.name,
    plan: user.plan,
    isAdmin: user.is_admin,
    isBetaTester: user.is_beta_tester,
    createdAt: user.created_at,
  };
}

export async function submitFeedback(userId, { category, rating, message }) {
  const { rows } = await pool.query(
    `INSERT INTO beta_feedback (user_id, category, rating, message, was_beta_tester)
     SELECT $1, $2, $3, $4, is_beta_tester FROM users WHERE id = $1
     RETURNING id, category, rating, message, was_beta_tester, created_at`,
    [userId, category, rating ?? null, message],
  );
  return rows[0];
}

export async function listFeedback() {
  const { rows } = await pool.query(
    `SELECT bf.id, bf.category, bf.rating, bf.message, bf.was_beta_tester, bf.created_at,
            u.email, u.name
     FROM beta_feedback bf
     JOIN users u ON u.id = bf.user_id
     ORDER BY bf.created_at DESC`,
  );

  return rows.map((row) => ({
    id: row.id,
    category: row.category,
    rating: row.rating,
    message: row.message,
    wasBetaTester: row.was_beta_tester,
    createdAt: row.created_at,
    user: { email: row.email, name: row.name },
  }));
}
