import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { postFeedback } from '../controllers/betaController.js';

const router = Router();

// Open to any authenticated user, not just current beta testers - general
// product feedback is valuable from anyone, and betaProgramService.js
// snapshots is_beta_tester per submission so beta feedback can still be
// told apart from the rest when reviewing it.
router.post('/feedback', requireAuth, postFeedback);

export default router;
