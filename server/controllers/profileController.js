
import User from '../models/User.js';

// GET FREELANCER PROFILE
export const getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user._id)
      .select('-passwordHash -tokenVersion');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    return res.status(200).json({
      success: true,
      profile: {
        id: user._id,
        name: user.name,
        email: user.email,
        profile: user.profile,
        jobCategories: user.jobCategories,
        skills: user.skills,
        services: user.services,
        preferences: user.preferences,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt
      }
    });

  } catch (error) {
    console.error('Get profile error:', error);

    return res.status(500).json({
      success: false,
      message: 'Unable to retrieve profile'
    });
  }
};

// UPDATE FREELANCER PROFILE
export const updateProfile = async (req, res) => {
  try {
    const allowedFields = [
      'name',
      'jobCategories',
      'skills',
      'services'
    ];

    const updates = {};

    // Allow only approved top-level fields
    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        updates[field] = req.body[field];
      }
    }

    // Allow only approved nested profile fields
    if (req.body.profile !== undefined) {
      const profile = req.body.profile;

      if (profile.introduction !== undefined) {
        updates['profile.introduction'] = profile.introduction;
      }

      if (profile.experience !== undefined) {
        updates['profile.experience'] = profile.experience;
      }

      if (profile.portfolioUrl !== undefined) {
        updates['profile.portfolioUrl'] = profile.portfolioUrl;
      }
    }

    // Allow only approved preference fields
    if (req.body.preferences !== undefined) {
      const preferences = req.body.preferences;

      if (preferences.industries !== undefined) {
        updates['preferences.industries'] =
          preferences.industries;
      }

      if (preferences.locations !== undefined) {
        updates['preferences.locations'] =
          preferences.locations;
      }
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No valid profile fields provided'
      });
    }

    const user = await User.findByIdAndUpdate(
      req.user._id,
      { $set: updates },
      {
        new: true,
        runValidators: true
      }
    ).select('-passwordHash -tokenVersion');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Profile updated successfully',
      profile: {
        id: user._id,
        name: user.name,
        email: user.email,
        profile: user.profile,
        jobCategories: user.jobCategories,
        skills: user.skills,
        services: user.services,
        preferences: user.preferences
      }
    });

  } catch (error) {
    console.error('Update profile error:', error);

    if (error.name === 'ValidationError') {
      return res.status(400).json({
        success: false,
        message: 'Invalid profile information',
        errors: Object.values(error.errors).map(
          item => item.message
        )
      });
    }

    return res.status(500).json({
      success: false,
      message: 'Unable to update profile'
    });
  }
};
