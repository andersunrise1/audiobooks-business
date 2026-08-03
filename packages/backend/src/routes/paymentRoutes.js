import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { createCheckoutSession, refundPurchase } from '../controllers/paymentController.js';

const router = Router();

router.use(requireAuth);
router.post('/create-checkout-session', createCheckoutSession);
router.post('/refund', refundPurchase);

export default router;
