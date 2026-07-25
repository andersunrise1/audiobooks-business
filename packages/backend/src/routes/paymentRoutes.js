import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { createCheckoutSession } from '../controllers/paymentController.js';

const router = Router();

router.use(requireAuth);
router.post('/create-checkout-session', createCheckoutSession);

export default router;
