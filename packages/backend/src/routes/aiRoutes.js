import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { explainWord, chat, remedial } from '../controllers/aiController.js';

const router = Router();

router.use(requireAuth);

router.post('/explain', explainWord);
router.post('/chat', chat);
router.post('/remedial', remedial);

export default router;
