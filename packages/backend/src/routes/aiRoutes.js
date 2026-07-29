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
// feedback on an existing reply doesn't cost anything. translate-word is
// rate-limited too even though most calls resolve for free from an
// existing words row or technical_dictionary (same precedent as
// explain/remedial, which count a cache hit toward the daily limit too).
router.post('/explain', aiRateLimit, explainWord);
router.post('/translate-word', aiRateLimit, translateWord);
router.post('/chat', aiRateLimit, chat);
router.post('/remedial', aiRateLimit, remedial);
router.patch('/chat/:messageId/feedback', updateChatFeedback);

export default router;
