
import mongoose from 'mongoose';

const leadSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },

    businessName: {
      type: String,
      required: [true, 'Business name is required'],
      trim: true,
      minlength: 2,
      maxlength: 120
    },

    category: {
      type: String,
      trim: true,
      maxlength: 80,
      default: ''
    },

    location: {
      type: String,
      trim: true,
      maxlength: 150,
      default: ''
    },

    website: {
      type: String,
      trim: true,
      maxlength: 500,
      default: '',
      validate: {
        validator: (value) =>
          !value || /^https?:\/\/.+/i.test(value),
        message: 'Website must start with http:// or https://'
      }
    },

    businessEmail: {
      type: String,
      trim: true,
      lowercase: true,
      maxlength: 254,
      default: '',
      validate: {
        validator: (value) =>
          !value || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value),
        message: 'Enter a valid business email'
      }
    },

    businessPhone: {
      type: String,
      trim: true,
      maxlength: 30,
      default: ''
    },

    openingHours: { type: String, trim: true, maxlength: 300, default: '' },
    cuisine: { type: String, trim: true, maxlength: 200, default: '' },
    brand: { type: String, trim: true, maxlength: 120, default: '' },
    operator: { type: String, trim: true, maxlength: 120, default: '' },
    
    latitude: {
      type: Number,
      min: -90,
      max: 90,
      default: null
    },

    longitude: {
      type: Number,
      min: -180,
      max: 180,
      default: null
    },

    businessDescription: {
      type: String,
      trim: true,
      maxlength: 1000,
      default: ''
    },

    discoverySource: {
      type: String,
      enum: ['manual', 'google_places', 'openstreetmap'],
      default: 'manual'
    },
    providerPlaceId: {
      type: String,
      trim: true,
      default: ''
    },
    googlePlaceId: {
      type: String,
      trim: true,
      default: ''
    },

    websiteStatus: {
      type: String,
      enum: ['not_checked', 'no_website', 'has_website', 'unreachable'],
      default: 'not_checked'
    },

    websiteAnalysis: {
      analyzedAt: { type: Date, default: null },
      analyzedUrl: { type: String, maxlength: 2048, default: '' },
      scores: {
        performance: { type: Number, min: 0, max: 1, default: null },
        accessibility: { type: Number, min: 0, max: 1, default: null },
        bestPractices: { type: Number, min: 0, max: 1, default: null },
        seo: { type: Number, min: 0, max: 1, default: null }
      },
      findings: [{
        category: { type: String, enum: ['performance', 'accessibility', 'best-practices', 'seo'] },
        auditId: { type: String, maxlength: 120 },
        title: { type: String, maxlength: 300 },
        description: { type: String, maxlength: 2000, default: '' },
        displayValue: { type: String, maxlength: 300, default: '' }
      }]
    },

    opportunityScore: {
      type: Number,
      min: 0,
      max: 100,
      default: null
    },

    opportunityReasons: {
      type: [String],
      default: []
    },

    leadStatus: {
      type: String,
      enum: [
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
      ],
      default: 'new'
    },

    priority: {
      type: String,
      enum: ['low', 'medium', 'high'],
      default: 'medium'
    },

    doNotContact: {
      type: Boolean,
      default: false
    },

    notes: {
      type: String,
      trim: true,
      maxlength: 2000,
      default: ''
    },

    lastContactedAt: {
      type: Date,
      default: null
    }
  },
  {
    timestamps: true
  }
);

// Efficient queries scoped to an individual freelancer.
leadSchema.index({ userId: 1, createdAt: -1 });
leadSchema.index({ userId: 1, leadStatus: 1 });
leadSchema.index({ userId: 1, priority: 1 });
leadSchema.index({ userId: 1, businessName: 1, location: 1 });
leadSchema.index(
  { userId: 1, providerPlaceId: 1 },
  {
    unique: true,
    partialFilterExpression: {
      discoverySource: 'openstreetmap'
    }
  }
);
leadSchema.index(
  { userId: 1, googlePlaceId: 1 },
  {
    unique: true,
    partialFilterExpression: {
      discoverySource: 'google_places',
      googlePlaceId: { $type: 'string' }
    }
  }
);

const Lead = mongoose.model('Lead', leadSchema);

export default Lead;
