import express from 'express';
import rateLimit from 'express-rate-limit';
import { param, validationResult } from 'express-validator';
import protect from '../middleware/authMiddleware.js';
import { analyzeLeadWebsite } from '../controllers/websiteController.js';

const router = express.Router();
const analysisLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 3,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: { success: false, message: 'Analysis limit reached. Try again later.' }
});

router.post(
  '/:leadId/analyze',
  protect,
  analysisLimiter,
  param('leadId').isMongoId().withMessage('Invalid lead ID'),
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ success: false, errors: errors.array() });
    return next();
  },
  analyzeLeadWebsite
);

export default router;
