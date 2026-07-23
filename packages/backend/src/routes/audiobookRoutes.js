import { Router } from 'express';
import {
  listAudiobooks,
  getAudiobook,
  getAudiobookChapters,
  getChapterWords,
} from '../controllers/audiobookController.js';

const router = Router();

router.get('/', listAudiobooks);
router.get('/chapters/:chapterId/words', getChapterWords);
router.get('/:id', getAudiobook);
router.get('/:id/chapters', getAudiobookChapters);

export default router;
