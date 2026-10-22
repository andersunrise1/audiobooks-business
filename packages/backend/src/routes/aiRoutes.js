import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { aiRateLimit } from '../middleware/rateLimiter.js';
import {
  explainWord,
  translateWord,
  chat,
  remedial,
  updateChatFeedback,
} from '../controllers/aiController.js';

const router = Router();

router.use(requireAuth);

// Only routes that actually trigger a real AI call are rate-limited -
// feedback on an existing reply doesn't cost anything. explain/remedial
// still count a cache hit toward the daily limit (PRICING.md makes no
// "ilimitada" promise for those two) - translate-word is the one
// exception: PRICING.md explicitly promises click-any-word translation is
// unlimited ("não usa IA... sem motivo pra limitar"), so it's deliberately
// NOT gated by this middleware. translateWord checks the same rate limit
// itself, but only immediately before the one code path that actually
// calls real AI (a brand-new word, never seen anywhere in the catalog) -
// every other click resolves for free, matching the real promise.
router.post('/explain', aiRateLimit, explainWord);
router.post('/translate-word', translateWord);
router.post('/chat', aiRateLimit, chat);
router.post('/remedial', aiRateLimit, remedial);
router.patch('/chat/:messageId/feedback', updateChatFeedback);

export default router;
