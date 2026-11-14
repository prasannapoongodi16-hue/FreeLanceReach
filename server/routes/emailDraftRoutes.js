import express from 'express';
import rateLimit from 'express-rate-limit';
import { body, param, query, validationResult } from 'express-validator';
import protect from '../middleware/authMiddleware.js';
import {
  deleteDraft,
  generateDraft,
  getDraft,
  getDrafts,
  updateDraft
} from '../controllers/emailDraftController.js';

const router = express.Router();

const generationLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 5,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: { success: false, message: 'Draft generation limit reached. Try again later.' }
});

const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, errors: errors.array() });
  }
  return next();
};

router.post(
  '/generate',
  protect,
  generationLimiter,
  body('leadId').isMongoId().withMessage('Valid leadId is required'),
  validate,
  generateDraft
);

router.get(
  '/',
  protect,
  query('leadId').optional().isMongoId().withMessage('Invalid lead ID'),
  validate,
  getDrafts
);

router.get(
  '/:draftId',
  protect,
  param('draftId').isMongoId().withMessage('Invalid draft ID'),
  validate,
  getDraft
);

router.put(
  '/:draftId',
  protect,
  param('draftId').isMongoId().withMessage('Invalid draft ID'),
  body('subject').optional().isString().trim().isLength({ min: 1, max: 200 }),
  body('body').optional().isString().trim().isLength({ min: 1, max: 8000 }),
  validate,
  updateDraft
);

router.delete(
  '/:draftId',
  protect,
  param('draftId').isMongoId().withMessage('Invalid draft ID'),
  validate,
  deleteDraft
);

export default router;
