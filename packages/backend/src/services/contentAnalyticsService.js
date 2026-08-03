import { pool } from '../config/database.js';
import { LIFETIME_PRICE_BRL_CENTS } from './paymentService.js';

// "Completed" a chapter has meant `user_progress.completed = true` since
// Dia 11; "completed an audiobook" is derived here as having that row, set
// true, for every one of the audiobook's chapters - there's no separate
// audiobook-level completion flag in the schema.
export async function getAudiobookCompletionRates() {
  const { rows } = await pool.query(`
    WITH chapter_counts AS (
      SELECT audiobook_id, COUNT(*) AS total_chapters
      FROM chapters
      GROUP BY audiobook_id
    ),
    user_completions AS (
      SELECT c.audiobook_id, up.user_id, COUNT(*) FILTER (WHERE up.completed) AS completed_chapters
      FROM chapters c
      JOIN user_progress up ON up.chapter_id = c.id
      GROUP BY c.audiobook_id, up.user_id
    )
    SELECT
      a.id AS audiobook_id,
      a.title,
      COUNT(DISTINCT uc.user_id)::int AS users_started,
      COUNT(DISTINCT CASE WHEN uc.completed_chapters = cc.total_chapters THEN uc.user_id END)::int AS users_completed
    FROM audiobooks a
    JOIN chapter_counts cc ON cc.audiobook_id = a.id
    LEFT JOIN user_completions uc ON uc.audiobook_id = a.id
    GROUP BY a.id, a.title, cc.total_chapters
    ORDER BY users_started DESC, a.title ASC
  `);

  return rows.map((row) => ({
    audiobookId: row.audiobook_id,
    title: row.title,
    usersStarted: row.users_started,
    usersCompleted: row.users_completed,
    completionRate: row.users_started > 0 ? row.users_completed / row.users_started : null,
  }));
}

// TECHSPEAKING has no subscription to cancel (Dia 46's lifetime-purchase
// decision), so "churn" here is adapted to mean engagement/activity churn -
// users who were active in the prior 30-day window but haven't clicked a
// word (the broadest real usage signal, word_clicks) in the most recent one -
// not billing churn, which doesn't exist in this pricing model.
export async function getUserRetention() {
  const { rows } = await pool.query(`
    WITH recent AS (
      SELECT DISTINCT user_id FROM word_clicks WHERE created_at >= now() - interval '30 days'
    ),
    previous AS (
      SELECT DISTINCT user_id FROM word_clicks
      WHERE created_at >= now() - interval '60 days' AND created_at < now() - interval '30 days'
    )
    SELECT
      (SELECT COUNT(*) FROM previous)::int AS previous_period_active_users,
      (SELECT COUNT(*) FROM recent)::int AS recent_period_active_users,
      (SELECT COUNT(*) FROM previous p JOIN recent r ON r.user_id = p.user_id)::int AS retained_users
  `);

  const {
    previous_period_active_users: previousActive,
    recent_period_active_users: recentActive,
    retained_users: retained,
  } = rows[0];

  return {
    previousPeriodActiveUsers: previousActive,
    recentPeriodActiveUsers: recentActive,
    retainedUsers: retained,
    retentionRate: previousActive > 0 ? retained / previousActive : null,
    churnRate: previousActive > 0 ? 1 - retained / previousActive : null,
  };
}

// LTV under a one-time-lifetime-purchase model (Dia 46) is intentionally
// simple - each 'pro'/'corporate' user represents exactly one R$57 payment,
// not a recurring-revenue formula (ARPU x average lifespan), since there's
// no recurring revenue to model. Future book packs (MONETIZATION.md's
// still-open "purchase-history table" gap) would add to this once they
// exist; today a paying user's lifetime value is just the one purchase.
export async function getLifetimeValue() {
  const { rows } = await pool.query(`
    SELECT
      COUNT(*)::int AS total_users,
      COUNT(*) FILTER (WHERE plan IN ('pro', 'corporate'))::int AS paying_users
    FROM users
  `);

  const { total_users: totalUsers, paying_users: payingUsers } = rows[0];
  const totalRevenueBrlCents = payingUsers * LIFETIME_PRICE_BRL_CENTS;

  return {
    totalUsers,
    payingUsers,
    conversionRate: totalUsers > 0 ? payingUsers / totalUsers : null,
    totalRevenueBrlCents,
    averageLtvBrlCents: totalUsers > 0 ? Math.round(totalRevenueBrlCents / totalUsers) : 0,
  };
}
