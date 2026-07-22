import { Router } from 'express';
import {
  listAudiobooks,
  getAudiobook,
  getAudiobookChapters,
} from '../controllers/audiobookController.js';

const router = Router();

router.get('/', listAudiobooks);
router.get('/:id', getAudiobook);
router.get('/:id/chapters', getAudiobookChapters);

export default router;
