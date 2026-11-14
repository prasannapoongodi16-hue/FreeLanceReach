import mongoose from 'mongoose';

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      minlength: 2,
      maxlength: 80
    },

    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true
    },

    passwordHash: {
      type: String,
      required: true,
      select: false
    },

    profile: {
      introduction: {
        type: String,
        default: ''
      },
      experience: {
        type: String,
        default: ''
      },
      portfolioUrl: {
        type: String,
        default: ''
      }
    },

    jobCategories: {
      type: [String],
      default: []
    },

    skills: {
      type: [String],
      default: []
    },

    services: {
      type: [String],
      default: []
    },

    preferences: {
      industries: {
        type: [String],
        default: []
      },
      locations: {
        type: [String],
        default: []
      }
    },

    tokenVersion: {
      type: Number,
      default: 0
    },

    gmailOAuthStateHash: { type: String, select: false },
    gmailOAuthStateExpiresAt: { type: Date, select: false }
  },
  {
    timestamps: true
  }
);

const User = mongoose.model('User', userSchema);

export default User;
