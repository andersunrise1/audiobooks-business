import { pool } from '../config/database.js';

// Global (all-users) signal, unlike difficultyService.getFrequentQuestionChapters
// (Dia 31) which is scoped to a single caller.
export async function getQuestionsPerChapter() {
  const { rows } = await pool.query(`
    SELECT c.id AS chapter_id, c.title, COUNT(cm.id)::int AS question_count
    FROM chat_messages cm
    JOIN chapters c ON c.id = cm.chapter_id
    GROUP BY c.id, c.title
    ORDER BY question_count DESC
  `);

  return rows.map((row) => ({
    chapterId: row.chapter_id,
    title: row.title,
    questionCount: row.question_count,
  }));
}

export async function getAvgResponseTimeByEndpoint() {
  const { rows } = await pool.query(`
    SELECT endpoint, ROUND(AVG(response_time_ms))::int AS avg_response_time_ms, COUNT(*)::int AS call_count
    FROM ai_usage_log
    WHERE response_time_ms IS NOT NULL
    GROUP BY endpoint
    ORDER BY endpoint
  `);

  return rows.map((row) => ({
    endpoint: row.endpoint,
    avgResponseTimeMs: row.avg_response_time_ms,
    callCount: row.call_count,
  }));
}

export async function getSatisfactionRate() {
  const { rows } = await pool.query(`
    SELECT
      COUNT(*) FILTER (WHERE feedback = 'helpful')::int AS helpful_count,
      COUNT(*) FILTER (WHERE feedback = 'not_helpful')::int AS not_helpful_count
    FROM chat_messages
  `);

  const { helpful_count: helpfulCount, not_helpful_count: notHelpfulCount } = rows[0];
  const total = helpfulCount + notHelpfulCount;

  return {
    helpfulCount,
    notHelpfulCount,
    satisfactionRate: total > 0 ? helpfulCount / total : null,
  };
}

export async function getCostPerUser() {
  const { rows } = await pool.query(`
    SELECT u.id AS user_id, u.email, SUM(a.estimated_cost_usd)::float AS total_cost_usd, COUNT(a.id)::int AS request_count
    FROM ai_usage_log a
    JOIN users u ON u.id = a.user_id
    GROUP BY u.id, u.email
    ORDER BY total_cost_usd DESC
  `);

  return rows.map((row) => ({
    userId: row.user_id,
    email: row.email,
    totalCostUsd: row.total_cost_usd,
    requestCount: row.request_count,
  }));
}
