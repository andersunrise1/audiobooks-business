import { Router } from 'express';
import multer from 'multer';
import { requireAuth } from '../middleware/auth.js';
import { scoreRecording } from '../controllers/pronunciationController.js';

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB - a few seconds of speech, plenty of headroom
});

const router = Router();

router.use(requireAuth);

router.post('/score', upload.single('audio'), scoreRecording);

export default router;
