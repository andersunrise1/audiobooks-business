import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { aiRateLimit } from '../middleware/rateLimiter.js';
import { explainWord, chat, remedial } from '../controllers/aiController.js';

const router = Router();

router.use(requireAuth);
router.use(aiRateLimit);

router.post('/explain', explainWord);
router.post('/chat', chat);
router.post('/remedial', remedial);

export default router;
