import { Router } from 'express';
import { register, login, refreshToken, getCurrentUser } from '../controllers/authController.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

router.post('/register', register);
router.post('/login', login);
router.post('/refresh-token', refreshToken);
router.get('/me', requireAuth, getCurrentUser);

export default router;
