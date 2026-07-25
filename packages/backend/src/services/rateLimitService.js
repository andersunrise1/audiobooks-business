import { redisClient, connectRedis } from '../config/redis.js';
import { isPaidPlan } from './planService.js';

// Read fresh on every call (not cached at module load) so tests can override
// AI_DAILY_RATE_LIMIT_FREE/AI_DAILY_RATE_LIMIT_PRO per-run without needing to
// reload the module. Dia 49: plan-aware, and deliberately NOT "unlimited for
// paid" - a lifetime purchase against an unbounded ongoing AI cost is a real
// risk (see MONETIZATION.md's "AI cost problem"), so paid plans get a higher
// cap, not no cap.
export function getDailyAiLimit(plan) {
  return isPaidPlan(plan)
    ? Number(process.env.AI_DAILY_RATE_LIMIT_PRO) || 10
    : Number(process.env.AI_DAILY_RATE_LIMIT_FREE) || 1;
}

// Fixed-window counter keyed by userId + window bucket. A Redis outage fails
// open (allows the request) rather than blocking users on an infra hiccup -
// same tradeoff as cacheService's best-effort design.
export async function checkRateLimit(userId, limit, windowSeconds = 24 * 60 * 60) {
  const bucket = Math.floor(Date.now() / (windowSeconds * 1000));
  const key = `ratelimit:ai:${userId}:${bucket}`;

  try {
    await connectRedis();
    const count = await redisClient.incr(key);
    if (count === 1) {
      await redisClient.expire(key, windowSeconds);
    }
    return { allowed: count <= limit, count, limit };
  } catch (err) {
    console.error(`Rate limit check failed for user "${userId}", allowing request:`, err.message);
    return { allowed: true, count: 0, limit };
  }
}

export function rateLimitExceededMessage(limit) {
  return `Limite diário de ${limit} requisições de IA atingido. Tente novamente amanhã.`;
}
