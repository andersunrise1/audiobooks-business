import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { handleVoiceCommand } from '../controllers/voiceController.js';

const router = Router();

router.use(requireAuth);

router.post('/command', handleVoiceCommand);

export default router;
