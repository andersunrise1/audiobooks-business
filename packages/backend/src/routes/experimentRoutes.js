import { Router } from 'express';
import { getAssignment, postConversion } from '../controllers/experimentController.js';

const router = Router();

// Public and auth-optional: an anonymous pricing-page visitor needs a
// variant assignment before ever logging in.
router.get('/:name/assignment', getAssignment);
router.post('/:name/conversion', postConversion);

export default router;
