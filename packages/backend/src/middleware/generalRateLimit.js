import rateLimit from 'express-rate-limit';

// Dia 75: general abuse protection across every /api/* route (login
// brute-forcing, scripted signup spam, etc.) - distinct from Dia 37's
// Redis-backed per-user AI rate limit, which caps AI *cost* specifically.
// This one is a simple in-memory, per-IP counter (express-rate-limit's
// default store) - fine for this single-instance deployment; a future
// multi-instance deployment would need a shared store (e.g. Redis) so
// limits are enforced consistently across instances, same class of gap
// Dia 37 already solved for the AI-specific limiter. `limit` is a function
// (express-rate-limit evaluates it per-request) reading the env var fresh
// every time, not a value baked in at module load - same "don't cache at
// import time" reasoning as rateLimitService.getDailyAiLimit, and it lets
// tests override the limit to a tiny number instead of making hundreds of
// real requests.
export const generalRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: () => Number(process.env.GENERAL_RATE_LIMIT) || 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Muitas requisições. Tente novamente em alguns minutos.' },
});

// Auth routes (login/register) are a common brute-force/spam target -
// tighter than the general limit.
export const authRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: () => Number(process.env.AUTH_RATE_LIMIT) || 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Muitas tentativas de login/cadastro. Tente novamente em alguns minutos.' },
});
