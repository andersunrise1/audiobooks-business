import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { requireAdmin } from '../middleware/requireAdmin.js';
import { getAiAnalytics } from '../controllers/adminAnalyticsController.js';

const router = Router();

router.use(requireAuth);
router.use(requireAdmin);

router.get('/analytics', getAiAnalytics);

export default router;
