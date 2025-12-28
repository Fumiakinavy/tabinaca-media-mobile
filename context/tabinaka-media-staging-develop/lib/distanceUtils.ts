// Distance calculation utilities for location-based recommendations

export interface Location {
  lat: number;
  lng: number;
}

export interface PlaceWithDistance {
  place_id: string;
  name: string;
  formatted_address: string;
  rating?: number;
  user_ratings_total?: number;
  price_level?: number;
  types: string[];
  geometry: {
    location: {
      lat: number;
      lng: number;
    };
  };
  photos?: Array<{
    photo_reference: string;
    height: number;
    width: number;
  }>;
  opening_hours?: {
    open_now?: boolean;
  };
  business_status?: string;
  distance?: number; // Distance in meters
  distanceText?: string; // Human-readable distance
}

/**
 * Calculate distance between two points using Haversine formula
 * @param point1 First location
 * @param point2 Second location
 * @returns Distance in meters
 */
export function calculateDistance(point1: Location, point2: Location): number {
  const R = 6371e3; // Earth's radius in meters
  const φ1 = (point1.lat * Math.PI) / 180;
  const φ2 = (point2.lat * Math.PI) / 180;
  const Δφ = ((point2.lat - point1.lat) * Math.PI) / 180;
  const Δλ = ((point2.lng - point1.lng) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c; // Distance in meters
}

/**
 * Format distance in a human-readable way
 * @param distance Distance in meters
 * @returns Formatted distance string
 */
export function formatDistance(distance: number): string {
  if (distance < 1000) {
    return `${Math.round(distance)}m`;
  } else {
    return `${(distance / 1000).toFixed(1)}km`;
  }
}

/**
 * Add distance information to places based on user location
 * @param places Array of places from Google Places API
 * @param userLocation User's current location
 * @returns Places with distance information, sorted by distance
 */
export function addDistanceToPlaces(
  places: any[],
  userLocation: Location,
): PlaceWithDistance[] {
  return places
    .map((place) => {
      const placeLocation: Location = {
        lat: place.geometry.location.lat,
        lng: place.geometry.location.lng,
      };

      const distance = calculateDistance(userLocation, placeLocation);

      return {
        ...place,
        distance,
        distanceText: formatDistance(distance),
      };
    })
    .sort((a, b) => (a.distance || 0) - (b.distance || 0)); // Sort by distance
}

/**
 * Filter places by maximum distance
 * @param places Places with distance information
 * @param maxDistance Maximum distance in meters
 * @returns Filtered places within the maximum distance
 */
export function filterPlacesByDistance(
  places: PlaceWithDistance[],
  maxDistance: number,
): PlaceWithDistance[] {
  return places.filter((place) => (place.distance || 0) <= maxDistance);
}

/**
 * Get distance-based recommendations
 * @param places Places with distance information
 * @param userLocation User's current location
 * @param maxResults Maximum number of results to return
 * @returns Recommended places sorted by distance and rating
 */
export function getDistanceBasedRecommendations(
  places: any[],
  userLocation: Location,
  maxResults: number = 10,
): PlaceWithDistance[] {
  const placesWithDistance = addDistanceToPlaces(places, userLocation);

  // Filter out places that are too far (more than 5km)
  const nearbyPlaces = filterPlacesByDistance(placesWithDistance, 5000);

  // Sort by distance first, then by rating
  return nearbyPlaces
    .sort((a, b) => {
      // Primary sort: distance
      const distanceDiff = (a.distance || 0) - (b.distance || 0);
      if (Math.abs(distanceDiff) > 500) {
        // If distance difference is significant (>500m)
        return distanceDiff;
      }

      // Secondary sort: rating (higher is better)
      const ratingA = a.rating || 0;
      const ratingB = b.rating || 0;
      return ratingB - ratingA;
    })
    .slice(0, maxResults);
}

/**
 * Get walking time estimate
 * @param distance Distance in meters
 * @returns Walking time in minutes
 */
export function getWalkingTime(distance: number): number {
  const walkingSpeed = 1.4; // m/s (average walking speed)
  return Math.round(distance / (walkingSpeed * 60)); // Convert to minutes
}

/**
 * Get distance category for UI display
 * @param distance Distance in meters
 * @returns Distance category
 */
export function getDistanceCategory(distance: number): string {
  if (distance < 500) return "very_close";
  if (distance < 1000) return "close";
  if (distance < 2000) return "nearby";
  if (distance < 5000) return "within_area";
  return "far";
}

/**
 * Get distance category text in Japanese
 * @param distance Distance in meters
 * @returns Japanese distance category text
 */
export function getDistanceCategoryText(distance: number): string {
  const category = getDistanceCategory(distance);
  const categoryTexts: Record<string, string> = {
    very_close: "すぐ近く",
    close: "近く",
    nearby: "近辺",
    within_area: "エリア内",
    far: "少し離れた場所",
  };
  return categoryTexts[category] || "近辺";
}
