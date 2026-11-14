import express from 'express';
import { body } from 'express-validator';

import rateLimit from 'express-rate-limit';

import {
  register,
  login,
  logout,
  getMe
} from '../controllers/authController.js';

import protect from '../middleware/authMiddleware.js';

const router = express.Router();

const validateRequest = (req, res, next) => {
  const errors = req.validationErrors;

  if (errors && errors.length > 0) {
    return res.status(400).json({
      success: false,
      errors
    });
  }

  next();
};

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many login attempts. Try again later.'
  }
});

const validate = async (req, res, next) => {
  const { validationResult } = await import('express-validator');

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

// Registration
router.post(
  '/register',
  [
    body('name')
      .trim()
      .isLength({ min: 2, max: 80 })
      .withMessage('Name must contain 2–80 characters'),

    body('email')
      .trim()
      .isEmail()
      .withMessage('Enter a valid email')
      .normalizeEmail(),

    body('password')
      .isLength({ min: 8, max: 72 })
      .withMessage('Password must contain 8–72 characters')
  ],
  validate,
  register
);

// Login
router.post(
  '/login',
  loginLimiter,
  [
    body('email')
      .trim()
      .isEmail()
      .withMessage('Enter a valid email')
      .normalizeEmail(),

    body('password')
      .notEmpty()
      .withMessage('Password is required')
  ],
  validate,
  login
);

// Logout
router.post('/logout', protect, logout);

// Current user
router.get('/me', protect, getMe);

export default router;