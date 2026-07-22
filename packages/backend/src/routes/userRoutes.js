import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { getProgress, upsertProgress, getFlashcards } from '../controllers/progressController.js';

const router = Router();

router.use(requireAuth);

router.get('/progress', getProgress);
router.post('/progress/:chapterId', upsertProgress);
router.get('/flashcards', getFlashcards);

export default router;
