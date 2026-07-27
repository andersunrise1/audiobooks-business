import { Router } from 'express';
import { submitTicket } from '../controllers/supportController.js';
import { optionalAuth } from '../middleware/optionalAuth.js';

const router = Router();

// Auth optional - an anonymous visitor (e.g. a pre-purchase question) can
// still file a ticket with just an email address.
router.post('/tickets', optionalAuth, submitTicket);

export default router;
