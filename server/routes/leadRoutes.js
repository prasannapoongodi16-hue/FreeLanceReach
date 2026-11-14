
import express from 'express';
import { body, query, param, validationResult } from 'express-validator';
import rateLimit from 'express-rate-limit';

import protect from '../middleware/authMiddleware.js';

import {
  createLead,
  getLeads,
  getLeadById,
  updateLead,
  deleteLead,
  saveGooglePlaceLeads,
  findGooglePlacesForLead,
  getGooglePlaceDetailsForLead
} from '../controllers/leadController.js';

const router = express.Router();
const placesLookupLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 30,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: { success: false, message: 'Google Places lookups are temporarily limited. Try again later.' }
});
const limitLiveLeadSummaries = (req, res, next) =>
  req.query.includeGoogleSummaries === 'true'
    ? placesLookupLimit(req, res, next)
    : next();

// Validation result handler
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

// Create lead validation
const createLeadValidation = [
  body('businessName')
    .trim()
    .isLength({ min: 2, max: 120 })
    .withMessage('Business name must be 2-120 characters'),

  body('category').optional().isString().trim().isLength({ max: 80 }),
  body('location').optional().isString().trim().isLength({ max: 150 }),

  body('website')
    .optional()
    .isString()
    .trim()
    .custom((value) => !value || /^https?:\/\/.+/i.test(value))
    .withMessage('Website must start with http:// or https://'),

  body('businessEmail')
    .optional()
    .isString()
    .trim()
    .custom((value) => !value || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value))
    .withMessage('Enter a valid business email'),

  body('businessPhone').optional().isString().trim().isLength({ max: 30 }),
  body('businessDescription').optional().isString().trim().isLength({ max: 1000 }),
  body('notes').optional().isString().trim().isLength({ max: 2000 }),

  body('priority')
    .optional()
    .isIn(['low', 'medium', 'high'])
    .withMessage('Invalid priority')
];

// Update lead validation
const updateLeadValidation = [
  param('id').isMongoId().withMessage('Invalid lead ID'),

  body('notes').optional().isString().trim().isLength({ max: 2000 }),

  body('priority').optional().isIn(['low', 'medium', 'high']),

  body('leadStatus').optional().isIn([
    'new',
    'reviewed',
    'ready_for_contact',
    'contacted',
    'replied',
    'interested',
    'negotiation',
    'client_won',
    'not_interested',
    'no_response',
    'invalid_contact',
    'do_not_contact',
    'closed_lost'
  ]),

  body('doNotContact').optional().isBoolean()
];

// List leads
router.get(
  '/',
  protect,
  limitLiveLeadSummaries,
  [
    query('search').optional().isString().trim().isLength({ max: 100 }),
    query('status').optional().isIn([
      'new', 'reviewed', 'ready_for_contact', 'contacted',
      'replied', 'interested', 'negotiation', 'client_won',
      'not_interested', 'no_response', 'invalid_contact',
      'do_not_contact', 'closed_lost'
    ]),
    query('priority').optional().isIn(['low', 'medium', 'high']),
    query('category').optional().isString().trim().isLength({ max: 80 }),
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 50 }),
    query('includeGoogleSummaries').optional().isBoolean()
  ],
  validate,
  getLeads
);

// Create lead
router.post(
  '/',
  protect,
  createLeadValidation,
  validate,
  createLead
);

router.post(
  '/import-google-places',
  protect,
  placesLookupLimit,
  body('places').isArray({ min: 1, max: 20 }),
  body('places.*.googlePlaceId').isString().trim().isLength({ min: 10, max: 512 }),
  body('places.*.category').optional().isString().trim().isLength({ max: 80 }),
  body('city').optional().isString().trim().isLength({ max: 150 }),
  validate,
  saveGooglePlaceLeads
);

router.post(
  '/:id/google-places/search',
  protect,
  placesLookupLimit,
  param('id').isMongoId().withMessage('Invalid lead ID'),
  validate,
  findGooglePlacesForLead
);

router.post(
  '/:id/google-places/details',
  protect,
  placesLookupLimit,
  param('id').isMongoId().withMessage('Invalid lead ID'),
  body('placeId').isString().trim().isLength({ min: 1, max: 512 }),
  validate,
  getGooglePlaceDetailsForLead
);

// Get one lead
router.get(
  '/:id',
  protect,
  param('id').isMongoId().withMessage('Invalid lead ID'),
  validate,
  getLeadById
);

// Update lead
router.put(
  '/:id',
  protect,
  updateLeadValidation,
  validate,
  updateLead
);

// Delete lead
router.delete(
  '/:id',
  protect,
  param('id').isMongoId().withMessage('Invalid lead ID'),
  validate,
  deleteLead
);

export default router;
