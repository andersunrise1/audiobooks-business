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
import { getStudyPriorityQueue } from '../controllers/schedulingController.js';
import { getRecommendations } from '../controllers/recommendationController.js';
import { updateTheme } from '../controllers/themeController.js';

const router = Router();

router.use(requireAuth);

router.patch('/theme', updateTheme);
router.get('/progress', getProgress);
router.post('/progress/:chapterId', upsertProgress);
router.get('/flashcards', getFlashcards);
router.post('/flashcards/:id/review', reviewFlashcard);
router.post('/words-learned', saveWordClick);
router.get('/stats', getUserStats);
router.get('/difficulty-profile', getDifficultyProfile);
router.get('/chapters/:chapterId/repeated-words', getRepeatedDifficultWords);
router.get('/study-priority', getStudyPriorityQueue);
router.get('/recommendations', getRecommendations);

export default router;
