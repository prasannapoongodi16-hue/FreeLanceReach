
import User from '../models/User.js';

export const getDashboardSummary = async (req, res) => {
  try {
    const user = await User.findById(req.user._id)
      .select('-passwordHash -tokenVersion');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    const completionItems = [
      Boolean(user.name),
      Boolean(user.email),
      Boolean(user.profile?.introduction?.trim()),
      Boolean(user.profile?.experience?.trim()),
      Boolean(user.profile?.portfolioUrl?.trim()),
      user.skills.length > 0,
      user.services.length > 0,
      user.preferences.industries.length > 0,
      user.preferences.locations.length > 0
    ];

    const completedFields = completionItems.filter(
      Boolean
    ).length;

    const totalFields = completionItems.length;

    const profileCompletion = Math.round(
      (completedFields / totalFields) * 100
    );

    return res.status(200).json({
      success: true,

      dashboard: {
        user: {
          id: user._id,
          name: user.name,
          email: user.email
        },

        profileCompletion: {
          percentage: profileCompletion,
          completedFields,
          totalFields
        },

        account: {
          createdAt: user.createdAt
        }
      }
    });

  } catch (error) {
    console.error('Dashboard summary error:', error);

    return res.status(500).json({
      success: false,
      message: 'Unable to retrieve dashboard summary'
    });
  }
};
