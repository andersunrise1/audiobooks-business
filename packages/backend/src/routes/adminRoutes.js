import { Router } from 'express';
import multer from 'multer';
import { requireAuth } from '../middleware/auth.js';
import { requireAdmin } from '../middleware/requireAdmin.js';
import { getAiAnalytics } from '../controllers/adminAnalyticsController.js';
import { createAudiobookWithChapter } from '../controllers/adminAudiobookController.js';
import { getUsers, updateUserAdminStatus } from '../controllers/adminUserController.js';

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 },
});

const router = Router();

router.use(requireAuth);
router.use(requireAdmin);

router.get('/analytics', getAiAnalytics);
router.post('/audiobooks', upload.single('audio_file'), createAudiobookWithChapter);
router.get('/users', getUsers);
router.patch('/users/:id', updateUserAdminStatus);

export default router;
