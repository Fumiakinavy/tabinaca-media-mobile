/**
 * Helper functions for Google Places API
 */

/**
 * Get photo URL from photo reference
 */
export function getPlacePhotoUrl(
  photoReference: string,
  maxWidth: number = 400,
  maxHeight?: number,
): string {
  // Use proxy API route to avoid browser key restrictions
  const params = new URLSearchParams({
    photo_reference: photoReference,
    maxwidth: String(maxWidth),
  });

  if (maxHeight) {
    params.append("maxheight", String(maxHeight));
  }

  return `/api/places/photo-legacy?${params.toString()}`;
}

/**
 * Get photo URL using Places API v1 photo name
 */
export function getPlacePhotoUrlV1(
  photoName: string,
  maxHeightPx: number = 400,
  maxWidthPx?: number,
): string {
  // Use proxy API route for v1 photos
  const params = new URLSearchParams({
    name: photoName,
    maxHeightPx: String(maxHeightPx),
  });

  if (maxWidthPx) {
    params.append("maxWidthPx", String(maxWidthPx));
  }

  return `/api/places/photo?${params.toString()}`;
}

/**
 * Format price level to readable string
 */
export function formatPriceLevel(priceLevel?: number): string {
  if (priceLevel === undefined) return "Price not available";

  const prices = [
    "Free",
    "Inexpensive",
    "Moderate",
    "Expensive",
    "Very Expensive",
  ];
  return prices[priceLevel] || "Price not available";
}

/**
 * Format rating to stars
 */
export function formatRating(rating?: number): string {
  if (!rating) return "No rating";
  return `${rating.toFixed(1)} ⭐`;
}

/**
 * Get category display name from place type
 */
export function getCategoryFromTypes(types: string[]): string {
  const categoryMap: Record<string, string> = {
    restaurant: "Restaurant",
    cafe: "Cafe",
    bar: "Bar",
    museum: "Museum",
    art_gallery: "Art Gallery",
    park: "Park",
    shopping_mall: "Shopping",
    store: "Store",
    tourist_attraction: "Attraction",
    night_club: "Nightlife",
    spa: "Spa & Wellness",
    gym: "Fitness",
    movie_theater: "Entertainment",
    amusement_park: "Entertainment",
  };

  for (const type of types) {
    if (categoryMap[type]) {
      return categoryMap[type];
    }
  }

  return "Place";
}

/**
 * Extract location name from formatted address
 */
export function extractLocationName(formattedAddress: string): string {
  const parts = formattedAddress.split(",");

  // Return the first part (usually the neighborhood/area)
  if (parts.length > 1) {
    return parts[0].trim();
  }

  return formattedAddress;
}

/**
 * Check if place is currently open
 */
export function isOpen(openNow?: boolean): string {
  if (openNow === undefined) return "Hours not available";
  return openNow ? "Open now" : "Closed";
}

/**
 * Generate Google Maps URL for place
 */
export function getGoogleMapsUrl(placeId: string, queryText?: string): string {
  // Use official Google Maps URL format:
  // https://www.google.com/maps/search/?api=1&query=<text>&query_place_id=<PLACE_ID>
  const params = new URLSearchParams({
    api: "1",
    query_place_id: placeId,
  });

  // query は必須のため、テキストが無い場合は placeId をフォールバックとして使う
  params.set("query", queryText || placeId);

  return `https://www.google.com/maps/search/?${params.toString()}`;
}

/**
 * Calculate distance between two coordinates (Haversine formula)
 */
export function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  const R = 6371; // Earth's radius in km
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;

  return distance;
}

function toRad(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

/**
 * Format distance to readable string
 */
export function formatDistance(distanceKm: number): string {
  if (distanceKm < 1) {
    return `${Math.round(distanceKm * 1000)}m`;
  }
  return `${distanceKm.toFixed(1)}km`;
}
