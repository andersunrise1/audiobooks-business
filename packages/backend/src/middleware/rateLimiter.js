import { checkRateLimit, rateLimitExceededMessage } from '../services/rateLimitService.js';

export async function aiRateLimit(req, res, next) {
  const limit = Number(process.env.AI_DAILY_RATE_LIMIT) || 50;
  const { allowed, count } = await checkRateLimit(req.user.id, limit);

  res.set('X-RateLimit-Limit', String(limit));
  res.set('X-RateLimit-Remaining', String(Math.max(0, limit - count)));

  if (!allowed) {
    return res.status(429).json({ error: rateLimitExceededMessage(limit) });
  }

  next();
}
