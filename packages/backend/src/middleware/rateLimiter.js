import {
  checkRateLimit,
  rateLimitExceededMessage,
  getDailyAiLimit,
} from '../services/rateLimitService.js';
import { getUserPlan } from '../services/planService.js';

export async function aiRateLimit(req, res, next) {
  const plan = await getUserPlan(req.user.id);
  const limit = getDailyAiLimit(plan);
  const { allowed, count } = await checkRateLimit(req.user.id, limit);

  res.set('X-RateLimit-Limit', String(limit));
  res.set('X-RateLimit-Remaining', String(Math.max(0, limit - count)));

  if (!allowed) {
    return res.status(429).json({ error: rateLimitExceededMessage(limit) });
  }

  next();
}
