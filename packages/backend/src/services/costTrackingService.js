import { pool } from '../config/database.js';

// Approximate Anthropic pricing per million tokens (USD, mid-2026). Used only
// for cost estimates/analytics, not billing - update if pricing changes.
const MODEL_PRICING = {
  'claude-sonnet-5': { input: 3, output: 15 },
  'claude-haiku-4-5': { input: 0.8, output: 4 },
};

export function estimateCostUsd(model, inputTokens, outputTokens) {
  const pricing = MODEL_PRICING[model] ?? MODEL_PRICING['claude-sonnet-5'];
  return (inputTokens / 1_000_000) * pricing.input + (outputTokens / 1_000_000) * pricing.output;
}

// Best-effort: a logging failure should never break the AI response the
// user is actually waiting on, so errors are caught and logged, not thrown.
export async function logAiUsage({
  userId,
  endpoint,
  model,
  inputTokens,
  outputTokens,
  responseTimeMs,
}) {
  try {
    const estimatedCostUsd = estimateCostUsd(model, inputTokens, outputTokens);
    await pool.query(
      `INSERT INTO ai_usage_log (user_id, endpoint, model, input_tokens, output_tokens, estimated_cost_usd, response_time_ms)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [
        userId,
        endpoint,
        model,
        inputTokens,
        outputTokens,
        estimatedCostUsd,
        responseTimeMs ?? null,
      ],
    );
  } catch (err) {
    console.error(`Failed to log AI usage for endpoint "${endpoint}":`, err.message);
  }
}
