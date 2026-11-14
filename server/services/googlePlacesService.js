const PLACES_API_URL = 'https://places.googleapis.com/v1';

class GooglePlacesError extends Error {
  constructor(message, status = 502) {
    super(message);
    this.name = 'GooglePlacesError';
    this.status = status;
  }
}

function getApiKey() {
  const apiKey = process.env.GOOGLE_MAPS_API_KEY;
  if (!apiKey) {
    throw new GooglePlacesError(
      'Google Places is not configured. Add GOOGLE_MAPS_API_KEY to the server environment.',
      503
    );
  }
  return apiKey;
}

async function parseResponse(response) {
  let data;
  try {
    data = await response.json();
  } catch {
    throw new GooglePlacesError('Google Places returned an unreadable response.');
  }

  if (!response.ok) {
    const providerMessage = data?.error?.message;
    throw new GooglePlacesError(
      providerMessage
        ? `Google Places lookup failed: ${providerMessage}`
        : `Google Places lookup failed (${response.status}).`
    );
  }
  return data;
}

export async function searchGooglePlaces(textQuery, maxResultCount = 20) {
  const fieldMask = [
    'places.id',
    'places.displayName',
    'places.formattedAddress',
    'places.location',
    'places.primaryTypeDisplayName',
    'places.types',
    'places.nationalPhoneNumber',
    'places.internationalPhoneNumber',
    'places.websiteUri',
    'places.regularOpeningHours',
    'places.rating',
    'places.userRatingCount',
    'places.googleMapsUri'
  ].join(',');

  const response = await fetch(`${PLACES_API_URL}/places:searchText`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': getApiKey(),
      'X-Goog-FieldMask': fieldMask
    },
    body: JSON.stringify({ textQuery, maxResultCount: Math.min(Math.max(Number(maxResultCount) || 20, 1), 20), languageCode: 'en' }),
    signal: AbortSignal.timeout(15000)
  });

  const data = await parseResponse(response);
  return (data.places || []).map((place) => ({
    id: place.id,
    googlePlaceId: place.id,
    displayName: place.displayName?.text || '',
    formattedAddress: place.formattedAddress || '',
    coordinates: place.location
      ? { lat: place.location.latitude, lng: place.location.longitude }
      : null,
    primaryTypeDisplayName: place.primaryTypeDisplayName?.text || '',
    types: place.types || [],
    phone: place.internationalPhoneNumber || place.nationalPhoneNumber || '',
    websiteUri: place.websiteUri || '',
    openingHours: place.regularOpeningHours?.weekdayDescriptions || [],
    rating: place.rating ?? null,
    userRatingCount: place.userRatingCount ?? null,
    googleMapsUri: place.googleMapsUri || ''
  }));
}

export async function getGooglePlaceDetails(placeId) {
  const fields = [
    'id',
    'displayName',
    'formattedAddress',
    'nationalPhoneNumber',
    'internationalPhoneNumber',
    'websiteUri',
    'regularOpeningHours',
    'googleMapsUri',
    'rating',
    'userRatingCount',
    'primaryTypeDisplayName'
  ].join(',');

  const response = await fetch(`${PLACES_API_URL}/places/${encodeURIComponent(placeId)}`, {
    headers: {
      'X-Goog-Api-Key': getApiKey(),
      'X-Goog-FieldMask': fields
    },
    signal: AbortSignal.timeout(15000)
  });

  const place = await parseResponse(response);
  return {
    id: place.id,
    displayName: place.displayName?.text || '',
    formattedAddress: place.formattedAddress || '',
    phone: place.internationalPhoneNumber || place.nationalPhoneNumber || '',
    websiteUri: place.websiteUri || '',
    openingHours: place.regularOpeningHours?.weekdayDescriptions || [],
    rating: place.rating ?? null,
    userRatingCount: place.userRatingCount ?? null,
    primaryTypeDisplayName: place.primaryTypeDisplayName?.text || '',
    googleMapsUri: place.googleMapsUri || ''
  };
}

export async function getGooglePlaceSummary(placeId) {
  const response = await fetch(`${PLACES_API_URL}/places/${encodeURIComponent(placeId)}`, {
    headers: {
      'X-Goog-Api-Key': getApiKey(),
      'X-Goog-FieldMask': 'id,displayName,formattedAddress,primaryTypeDisplayName,googleMapsUri'
    },
    signal: AbortSignal.timeout(15000)
  });

  const place = await parseResponse(response);
  return {
    id: place.id,
    displayName: place.displayName?.text || '',
    formattedAddress: place.formattedAddress || '',
    primaryTypeDisplayName: place.primaryTypeDisplayName?.text || '',
    googleMapsUri: place.googleMapsUri || ''
  };
}
