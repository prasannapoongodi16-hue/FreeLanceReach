import express from 'express';
import rateLimit from 'express-rate-limit';
import { body, param, validationResult } from 'express-validator';
import protect from '../middleware/authMiddleware.js';
import { connectGmail, disconnectGmail, gmailCallback, gmailStatus, sendDraft } from '../controllers/gmailController.js';

const router = express.Router();
const oauthLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 10, standardHeaders: 'draft-8', legacyHeaders: false,
  message: { success: false, message: 'Gmail connection limit reached. Try again later.' } });
const sendLimiter = rateLimit({ windowMs: 60 * 60 * 1000, limit: 20, standardHeaders: 'draft-8', legacyHeaders: false,
  message: { success: false, message: 'Gmail send limit reached. Try again later.' } });
const validate = (req, res, next) => {
  const errors = validationResult(req);
  return errors.isEmpty() ? next() : res.status(400).json({ success: false, errors: errors.array() });
};

router.get('/oauth/callback', oauthLimiter, gmailCallback);
router.post('/connect', protect, oauthLimiter, connectGmail);
router.get('/status', protect, gmailStatus);
router.delete('/disconnect', protect, disconnectGmail);
router.post('/drafts/:draftId/send', protect, sendLimiter, param('draftId').isMongoId(), body('approved').equals('true'), validate, sendDraft);

export default router;
