import { Router } from 'express';
import { getDictionaryEntry } from '../controllers/dictionaryController.js';

const router = Router();

router.get('/:word', getDictionaryEntry);

export default router;
