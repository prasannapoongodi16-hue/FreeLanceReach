
import mongoose from 'mongoose';
import Lead from '../models/Lead.js';
import { getGooglePlaceDetails, getGooglePlaceSummary, searchGooglePlaces } from '../services/googlePlacesService.js';

export const findGooglePlacesForLead = async (req, res) => {
  try {
    const lead = await Lead.findOne({ _id: req.params.id, userId: req.user._id });
    if (!lead) {
      return res.status(404).json({ success: false, message: 'Lead not found' });
    }

    const textQuery = [lead.businessName, lead.location].filter(Boolean).join(', ');
    const places = await searchGooglePlaces(textQuery);
    return res.status(200).json({ success: true, places });
  } catch (error) {
    const status = error.status || 502;
    return res.status(status).json({
      success: false,
      message: error.status ? error.message : 'Could not reach Google Places. Try again shortly.'
    });
  }
};

export const getGooglePlaceDetailsForLead = async (req, res) => {
  try {
    const lead = await Lead.findOne({ _id: req.params.id, userId: req.user._id });
    if (!lead) {
      return res.status(404).json({ success: false, message: 'Lead not found' });
    }

    const place = await getGooglePlaceDetails(req.body.placeId);
    await Lead.updateOne(
      { _id: lead._id, userId: req.user._id },
      { $set: { googlePlaceId: place.id } }
    );
    return res.status(200).json({ success: true, place });
  } catch (error) {
    const status = error.status || 502;
    return res.status(status).json({
      success: false,
      message: error.status ? error.message : 'Could not reach Google Places. Try again shortly.'
    });
  }
};

// Create a new lead
export const createLead = async (req, res) => {
  try {
    const {
      businessName,
      category,
      location,
      website,
      businessEmail,
      businessPhone,
      businessDescription,
      notes,
      priority
    } = req.body;

    const lead = await Lead.create({
      userId: req.user._id,
      businessName,
      category,
      location,
      website,
      businessEmail,
      businessPhone,
      businessDescription,
      notes,
      priority,
      discoverySource: 'manual'
    });

    return res.status(201).json({
      success: true,
      message: 'Lead created successfully',
      lead
    });
  } catch (error) {
    if (error.name === 'ValidationError') {
      return res.status(400).json({
        success: false,
        message: error.message
      });
    }

    console.error('Create lead error:', error);

    return res.status(500).json({
      success: false,
      message: 'Failed to create lead'
    });
  }
};

// Get all leads belonging to the logged-in freelancer
export const getLeads = async (req, res) => {
  try {
    const {
      search,
      status,
      priority,
      category,
      page = 1,
      limit = 10
    } = req.query;

    const filter = {
      userId: req.user._id
    };

    if (status) filter.leadStatus = status;
    if (priority) filter.priority = priority;
    if (category) {
      filter.category = {
        $regex: category,
        $options: 'i'
      };
    }

    if (search) {
      const escapedSearch = search.replace(
        /[.*+?^${}()|[\]\\]/g,
        '\\$&'
      );

      filter.$or = [
        { businessName: { $regex: escapedSearch, $options: 'i' } },
        { category: { $regex: escapedSearch, $options: 'i' } },
        { location: { $regex: escapedSearch, $options: 'i' } }
      ];
    }

    const currentPage = Math.max(1, parseInt(page, 10) || 1);
    const pageLimit = Math.min(
      50,
      Math.max(1, parseInt(limit, 10) || 10)
    );

    const skip = (currentPage - 1) * pageLimit;

    const [storedLeads, total] = await Promise.all([
      Lead.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(pageLimit)
        .lean(),

      Lead.countDocuments(filter)
    ]);

    const summariesAllowed = new Set(storedLeads
      .filter((lead) => lead.discoverySource === 'google_places' && lead.googlePlaceId)
      .slice(0, 10)
      .map((lead) => String(lead._id)));
    const leads = req.query.includeGoogleSummaries === 'true'
      ? await Promise.all(storedLeads.map(async (lead) => {
        if (!summariesAllowed.has(String(lead._id))) return lead;
        try {
          return { ...lead, liveGooglePlaceSummary: await getGooglePlaceSummary(lead.googlePlaceId) };
        } catch {
          return lead;
        }
      }))
      : storedLeads;

    return res.status(200).json({
      success: true,
      results: leads.length,
      pagination: {
        total,
        page: currentPage,
        limit: pageLimit,
        totalPages: Math.ceil(total / pageLimit)
      },
      leads
    });
  } catch (error) {
    console.error('Get leads error:', error);

    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve leads'
    });
  }
};

// Get one lead owned by the logged-in freelancer
export const getLeadById = async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid lead ID'
      });
    }

    const lead = await Lead.findOne({
      _id: req.params.id,
      userId: req.user._id
    });

    if (!lead) {
      return res.status(404).json({
        success: false,
        message: 'Lead not found'
      });
    }

    let responseLead = lead.toObject();
    if (lead.googlePlaceId) {
      try {
        responseLead.liveGooglePlace = await getGooglePlaceDetails(lead.googlePlaceId);
      } catch (providerError) {
        responseLead.liveGooglePlaceError = providerError.status
          ? providerError.message
          : 'Google Maps details are temporarily unavailable.';
      }
    }

    return res.status(200).json({
      success: true,
      lead: responseLead
    });
  } catch (error) {
    console.error('Get lead error:', error);

    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve lead'
    });
  }
};

// Update a lead
export const updateLead = async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid lead ID'
      });
    }

    const allowedFields = ['notes', 'priority', 'leadStatus', 'doNotContact'];
    const forbiddenFields = [
      'businessName', 'category', 'location', 'website', 'businessEmail',
      'phone', 'businessPhone', 'businessDescription', 'providerPlaceId',
      'discoverySource', 'latitude', 'longitude', 'coordinates',
      'websiteStatus', 'websiteAnalysis', 'opportunityScore', 'opportunityReasons',
      'userId', 'lastContactedAt'
    ];

    const attemptedForbiddenFields = forbiddenFields.filter((field) =>
      Object.prototype.hasOwnProperty.call(req.body, field)
    );
    if (attemptedForbiddenFields.length) {
      return res.status(400).json({
        success: false,
        message: `Business and source data cannot be edited: ${attemptedForbiddenFields.join(', ')}`
      });
    }

    const updates = {};

    for (const field of allowedFields) {
      if (Object.prototype.hasOwnProperty.call(req.body, field)) {
        updates[field] = req.body[field];
      }
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No valid fields provided for update'
      });
    }

    const lead = await Lead.findOneAndUpdate(
      {
        _id: req.params.id,
        userId: req.user._id
      },
      { $set: updates },
      {
        new: true,
        runValidators: true
      }
    );

    if (!lead) {
      return res.status(404).json({
        success: false,
        message: 'Lead not found'
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Lead updated successfully',
      lead
    });
  } catch (error) {
    if (error.name === 'ValidationError') {
      return res.status(400).json({
        success: false,
        message: error.message
      });
    }

    console.error('Update lead error:', error);

    return res.status(500).json({
      success: false,
      message: 'Failed to update lead'
    });
  }
};

// Delete a lead
export const deleteLead = async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid lead ID'
      });
    }

    const lead = await Lead.findOneAndDelete({
      _id: req.params.id,
      userId: req.user._id
    });

    if (!lead) {
      return res.status(404).json({
        success: false,
        message: 'Lead not found'
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Lead deleted successfully'
    });
  } catch (error) {
    console.error('Delete lead error:', error);

    return res.status(500).json({
      success: false,
      message: 'Failed to delete lead'
    });
  }
};

export const saveGooglePlaceLeads = async (req, res) => {
  try {
    const { places, city } = req.body;

    if (
      !Array.isArray(places) ||
      places.length === 0 ||
      places.length > 20
    ) {
      return res.status(400).json({ success: false, message: 'Select between 1 and 20 places to save.' });
    }

    const saved = [];
    const duplicates = [];
    const invalid = [];
    const seen = new Set();

    for (const item of places) {
      const googlePlaceId = typeof item?.googlePlaceId === 'string' ? item.googlePlaceId.trim() : '';
      const category = typeof item?.category === 'string' ? item.category.trim().slice(0, 80) : '';
      if (!/^[A-Za-z0-9_-]{10,512}$/.test(googlePlaceId)) {
        invalid.push({ googlePlaceId, reason: 'Invalid Google Place ID' });
        continue;
      }

      if (seen.has(googlePlaceId)) {
        duplicates.push({ googlePlaceId, reason: 'Repeated in this request' });
        continue;
      }

      seen.add(googlePlaceId);

      const existing = await Lead.findOne({
        userId: req.user._id,
        googlePlaceId,
        discoverySource: 'google_places'
      }).select('_id');

      if (existing) {
        duplicates.push({ googlePlaceId, reason: 'Already saved' });
        continue;
      }

      try {
        const lead = await Lead.create({
          userId: req.user._id,
          businessName: 'Google Maps place',
          category,
          location: typeof city === 'string' ? city.trim().slice(0, 150) : '',
          googlePlaceId,
          discoverySource: 'google_places',
          leadStatus: 'new',
          priority: 'medium'
        });

        saved.push(lead);
      } catch (error) {
        if (error.code === 11000) {
          duplicates.push({ googlePlaceId, reason: 'Already saved' });
          continue;
        }

        if (error.name === 'ValidationError') {
          invalid.push({ googlePlaceId, reason: error.message });
          continue;
        }

        throw error;
      }
    }

    return res.status(200).json({
      success: true,
      message: 'Google Maps places saved',
      summary: {
        received: places.length,
        saved: saved.length,
        duplicates: duplicates.length,
        invalid: invalid.length
      },
      saved,
      duplicates,
      invalid
    });
  } catch (error) {
    console.error('Save Google Places error:', error.name);

    return res.status(500).json({
      success: false,
      message: 'Failed to save Google Maps places'
    });
  }
};
