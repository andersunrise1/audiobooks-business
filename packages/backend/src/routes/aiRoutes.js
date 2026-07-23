import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { explainWord, chat } from '../controllers/aiController.js';

const router = Router();

router.use(requireAuth);

router.post('/explain', explainWord);
router.post('/chat', chat);

export default router;
