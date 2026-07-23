import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import {
  getProgress,
  upsertProgress,
  getFlashcards,
  saveWordClick,
  reviewFlashcard,
} from '../controllers/progressController.js';

const router = Router();

router.use(requireAuth);

router.get('/progress', getProgress);
router.post('/progress/:chapterId', upsertProgress);
router.get('/flashcards', getFlashcards);
router.post('/flashcards/:id/review', reviewFlashcard);
router.post('/words-learned', saveWordClick);

export default router;
