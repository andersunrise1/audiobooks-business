import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import {
  getProgress,
  upsertProgress,
  getFlashcards,
  saveWordClick,
  reviewFlashcard,
} from '../controllers/progressController.js';
import { getUserStats } from '../controllers/statsController.js';
import { getDifficultyProfile } from '../controllers/difficultyController.js';
import { getRepeatedDifficultWords } from '../controllers/wordRepetitionController.js';

const router = Router();

router.use(requireAuth);

router.get('/progress', getProgress);
router.post('/progress/:chapterId', upsertProgress);
router.get('/flashcards', getFlashcards);
router.post('/flashcards/:id/review', reviewFlashcard);
router.post('/words-learned', saveWordClick);
router.get('/stats', getUserStats);
router.get('/difficulty-profile', getDifficultyProfile);
router.get('/chapters/:chapterId/repeated-words', getRepeatedDifficultWords);

export default router;
