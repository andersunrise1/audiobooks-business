import { Router } from 'express';
import {
  listAudiobooks,
  getAudiobook,
  getAudiobookChapters,
  getChapterWords,
} from '../controllers/audiobookController.js';
import { optionalAuth } from '../middleware/optionalAuth.js';

const router = Router();

router.get('/', listAudiobooks);
router.get('/chapters/:chapterId/words', getChapterWords);
router.get('/:id', getAudiobook);
router.get('/:id/chapters', optionalAuth, getAudiobookChapters);

export default router;
