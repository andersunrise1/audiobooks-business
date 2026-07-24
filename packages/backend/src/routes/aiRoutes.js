import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { aiRateLimit } from '../middleware/rateLimiter.js';
import { explainWord, chat, remedial, updateChatFeedback } from '../controllers/aiController.js';

const router = Router();

router.use(requireAuth);

// Only routes that actually trigger a real AI call are rate-limited -
// feedback on an existing reply doesn't cost anything.
router.post('/explain', aiRateLimit, explainWord);
router.post('/chat', aiRateLimit, chat);
router.post('/remedial', aiRateLimit, remedial);
router.patch('/chat/:messageId/feedback', updateChatFeedback);

export default router;
