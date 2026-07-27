import { Router } from 'express';
import multer from 'multer';
import { requireAuth } from '../middleware/auth.js';
import { requireAdmin } from '../middleware/requireAdmin.js';
import { getAiAnalytics } from '../controllers/adminAnalyticsController.js';
import { getContentAnalytics } from '../controllers/adminContentAnalyticsController.js';
import {
  createAudiobookWithChapter,
  listAllAudiobooks,
  getAudiobookPreview,
  publishAudiobook,
  unpublishAudiobook,
} from '../controllers/adminAudiobookController.js';
import { getUsers, updateUserAdminStatus } from '../controllers/adminUserController.js';
import { listExperiments, getResults } from '../controllers/adminExperimentController.js';
import { getTickets, patchTicket } from '../controllers/adminSupportController.js';

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 },
});

const router = Router();

router.use(requireAuth);
router.use(requireAdmin);

router.get('/analytics', getAiAnalytics);
router.get('/content-analytics', getContentAnalytics);
router.post('/audiobooks', upload.single('audio_file'), createAudiobookWithChapter);
router.get('/audiobooks', listAllAudiobooks);
router.get('/audiobooks/:id', getAudiobookPreview);
router.post('/audiobooks/:id/publish', publishAudiobook);
router.post('/audiobooks/:id/unpublish', unpublishAudiobook);
router.get('/users', getUsers);
router.patch('/users/:id', updateUserAdminStatus);
router.get('/experiments', listExperiments);
router.get('/experiments/:name/results', getResults);
router.get('/support/tickets', getTickets);
router.patch('/support/tickets/:id', patchTicket);

export default router;
