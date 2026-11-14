
import express from 'express';
import { body, validationResult } from 'express-validator';

import protect from '../middleware/authMiddleware.js';

import {
  searchBusinesses
} from '../controllers/discoveryController.js';

const router = express.Router();

const validate = (req, res, next) => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      errors: errors.array()
    });
  }

  next();
};

const discoveryValidation = [
  body('city')
    .isString()
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Enter a valid city'),

  body('businessCategory')
    .optional({ checkFalsy: true })
    .isString()
    .trim()
    .isIn([
      'restaurant',
      'clothing',
      'gym',
      'clinic',
      'hotel',
      'real_estate',
      'supermarket',
      'bakery',
      'electronics',
      'beauty'
    ])
    .withMessage('Unsupported business category'),

  body('serviceCategory')
    .optional({ checkFalsy: true })
    .isString()
    .trim()
    .isIn([
      'software_developer',
      'web_developer',
      'mobile_app_developer',
      'data_analyst',
      'it_support',
      'qa_tester',
      'graphic_designer',
      'ui_ux_designer',
      'web_designer',
      'illustrator',
      'photographer',
      'video_editor',
      'content_writer',
      'copywriter',
      'digital_marketer',
      'seo_specialist',
      'social_media_manager',
      'translator',
      'virtual_assistant',
      'accountant',
      'consultant',
      'business_coach',
      'tutor',
      'project_manager',
      'painter',
      'electrician',
      'plumber',
      'carpenter',
      'cleaner',
      'mechanic',
      'landscaper'
    ])
    .withMessage('Unsupported service category'),

  body('category')
    .optional({ checkFalsy: true })
    .isString()
    .trim()
    .isIn([
      'restaurant', 'clothing', 'gym', 'clinic', 'hotel', 'real_estate', 'supermarket', 'bakery', 'electronics', 'beauty',
      'software_developer', 'web_developer', 'mobile_app_developer', 'data_analyst', 'it_support', 'qa_tester',
      'graphic_designer', 'ui_ux_designer', 'web_designer', 'illustrator', 'photographer', 'video_editor',
      'content_writer', 'copywriter', 'digital_marketer', 'seo_specialist', 'social_media_manager', 'translator',
      'virtual_assistant', 'accountant', 'consultant', 'business_coach', 'tutor', 'project_manager', 'painter',
      'electrician', 'plumber', 'carpenter', 'cleaner', 'mechanic', 'landscaper'
    ])
    .withMessage('Unsupported discovery category'),

  body('limit')
    .optional()
    .isInt({ min: 1, max: 20 })
    .withMessage('Limit must be between 1 and 20')
];

const requireCategory = (req, res, next) => {
  if (req.body.businessCategory || req.body.serviceCategory || req.body.category) return next();
  return res.status(400).json({
    success: false,
    errors: [{ msg: 'Choose a business type, a service category, or both.' }]
  });
};

router.post(
  '/search',
  protect,
  discoveryValidation,
  validate,
  requireCategory,
  searchBusinesses
);

export default router;
