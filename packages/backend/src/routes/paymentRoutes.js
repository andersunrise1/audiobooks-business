import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import {
  createCheckoutSession,
  refundPurchase,
  verifyGooglePlayPurchase,
} from '../controllers/paymentController.js';

const router = Router();

router.use(requireAuth);
router.post('/create-checkout-session', createCheckoutSession);
router.post('/refund', refundPurchase);
router.post('/google-play/verify', verifyGooglePlayPurchase);

export default router;
