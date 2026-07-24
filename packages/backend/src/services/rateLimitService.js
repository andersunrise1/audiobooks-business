import { redisClient, connectRedis } from '../config/redis.js';

// Read fresh on every call (not cached at module load) so tests can override
// AI_DAILY_RATE_LIMIT per-run without needing to reload the module.
export function getDailyAiLimit() {
  return Number(process.env.AI_DAILY_RATE_LIMIT) || 50;
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
