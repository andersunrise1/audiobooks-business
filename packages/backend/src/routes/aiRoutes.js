import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { explainWord } from '../controllers/aiController.js';

const router = Router();

router.use(requireAuth);

router.post('/explain', explainWord);

export default router;
