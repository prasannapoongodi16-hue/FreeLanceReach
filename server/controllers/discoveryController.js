import { searchGooglePlaces } from '../services/googlePlacesService.js';

const businessCategoryLabels = {
  restaurant: 'restaurants and cafes',
  clothing: 'clothing stores',
  gym: 'gyms and fitness centres',
  clinic: 'clinics and doctors',
  hotel: 'hotels and guest houses',
  real_estate: 'real estate agents',
  supermarket: 'supermarkets',
  bakery: 'bakeries',
  electronics: 'electronics stores',
  beauty: 'beauty businesses'
};

const readableCategory = (key) =>
  businessCategoryLabels[key] || key.replaceAll('_', ' ');

export const searchBusinesses = async (req, res) => {
  try {
    const { city, businessCategory, serviceCategory, category, limit = 20 } = req.body;
    const categories = [...new Set([businessCategory, serviceCategory, category].filter(Boolean))];
    const perCategoryLimit = Math.max(1, Math.ceil(Math.min(Number(limit) || 20, 20) / categories.length));

    const batches = await Promise.all(categories.map(async (categoryKey) => {
      const label = readableCategory(categoryKey);
      const places = await searchGooglePlaces(`${label} in ${city}`, perCategoryLimit);
      return places.map((place) => ({
        ...place,
        businessName: place.displayName,
        category: place.primaryTypeDisplayName || label,
        location: place.formattedAddress,
        businessPhone: place.phone,
        website: place.websiteUri,
        openingHours: place.openingHours,
        discoverySource: 'google_places',
        searchCategory: categoryKey
      }));
    }));

    const businesses = [...new Map(batches.flat().map((place) => [place.googlePlaceId, place])).values()]
      .slice(0, Math.min(Math.max(Number(limit) || 20, 1), 20));

    return res.status(200).json({
      success: true,
      provider: 'Google Maps',
      totalResults: businesses.length,
      businesses
    });
  } catch (error) {
    console.error('Google Places discovery error:', error.status || error.name);
    return res.status(error.status || 502).json({
      success: false,
      message: error.status
        ? error.message
        : 'Google Places is temporarily unavailable. Please try again shortly.'
    });
  }
};
