
import express from 'express';
import { body, validationResult } from 'express-validator';

import protect from '../middleware/authMiddleware.js';

import {
  getProfile,
  updateProfile
} from '../controllers/profileController.js';

const router = express.Router();

const validate = (req, res, next) => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      errors: errors.array().map(error => ({
        field: error.path,
        message: error.msg
      }))
    });
  }

  next();
};

const profileValidation = [
  body('name')
    .optional()
    .trim()
    .isLength({ min: 2, max: 80 }),

  body('profile')
    .optional()
    .isObject(),

  body('profile.introduction')
    .optional()
    .isString()
    .isLength({ max: 500 }),

  body('profile.experience')
    .optional()
    .isString()
    .isLength({ max: 100 }),

  body('profile.portfolioUrl')
    .optional()
    .isString()
    .custom(value => {
      if (value === '') return true;

      return /^https?:\/\/.+/i.test(value);
    })
    .withMessage('Portfolio must be a valid HTTP or HTTPS URL'),

  body('jobCategories')
    .optional()
    .isArray({ max: 40 }),

  body('jobCategories.*')
    .optional()
    .isString()
    .trim()
    .isLength({ min: 1, max: 80 }),

  body('skills')
    .optional()
    .isArray({ max: 30 }),

  body('skills.*')
    .optional()
    .isString()
    .trim()
    .isLength({ min: 1, max: 50 }),

  body('services')
    .optional()
    .isArray({ max: 20 }),

  body('services.*')
    .optional()
    .isString()
    .trim()
    .isLength({ min: 1, max: 80 }),

  body('preferences')
    .optional()
    .isObject(),

  body('preferences.industries')
    .optional()
    .isArray({ max: 20 }),

  body('preferences.industries.*')
    .optional()
    .isString()
    .trim()
    .isLength({ min: 1, max: 60 }),

  body('preferences.locations')
    .optional()
    .isArray({ max: 20 }),

  body('preferences.locations.*')
    .optional()
    .isString()
    .trim()
    .isLength({ min: 1, max: 60 })
];

// GET PROFILE
router.get('/', protect, getProfile);

// UPDATE PROFILE
router.put(
  '/',
  protect,
  profileValidation,
  validate,
  updateProfile
);

export default router;
