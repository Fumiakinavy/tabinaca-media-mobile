import type { NextApiRequest, NextApiResponse } from "next";

interface NearbyPlace {
  place_id: string;
  name: string;
  formatted_address?: string;
  geometry: {
    location: {
      lat: number;
      lng: number;
    };
  };
  types?: string[];
  rating?: number;
  vicinity?: string;
}

interface NearbyLandmarksResponse {
  success: boolean;
  places?: NearbyPlace[];
  error?: string;
}

const GOOGLE_PLACES_NEARBY_ENDPOINT =
  "https://maps.googleapis.com/maps/api/place/nearbysearch/json";

// Types of places to search for - prioritize transit stations and landmarks
const PLACE_TYPES = [
  "transit_station",
  "train_station",
  "subway_station",
  "tourist_attraction",
  "lodging",
  "point_of_interest",
];

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<NearbyLandmarksResponse>,
) {
  if (req.method !== "POST") {
    return res
      .status(405)
      .json({ success: false, error: "Method not allowed" });
  }

  const { lat, lng, radius = 1000 } = req.body;

  if (typeof lat !== "number" || typeof lng !== "number") {
    return res.status(400).json({
      success: false,
      error: "lat and lng are required as numbers",
    });
  }

  const apiKey = process.env.GOOGLE_PLACES_API_KEY_SERVER;
  if (!apiKey) {
    console.error("[nearby-landmarks] Missing GOOGLE_PLACES_API_KEY_SERVER");
    return res.status(500).json({
      success: false,
      error: "API key not configured",
    });
  }

  try {
    // Search for multiple types and combine results
    const allPlaces: NearbyPlace[] = [];
    const seenPlaceIds = new Set<string>();
    let hasApiError = false;
    let apiErrorMessage: string | null = null;

    // First, search for transit stations (most important for users)
    const transitTypes = ["transit_station", "train_station", "subway_station"];
    for (const type of transitTypes) {
      const params = new URLSearchParams({
        key: apiKey,
        location: `${lat},${lng}`,
        radius: String(Math.min(radius, 2000)), // Cap at 2km for transit
        type,
        language: "en",
      });

      const response = await fetch(
        `${GOOGLE_PLACES_NEARBY_ENDPOINT}?${params.toString()}`,
      );

      if (response.ok) {
        const data = await response.json();
        
        // Check for API errors
        if (data.status === "REQUEST_DENIED" || data.status === "OVER_QUERY_LIMIT") {
          const errorMessage = data.error_message || "Google Places API error";
          console.error(`[nearby-landmarks] API error for type ${type}:`, data.status, errorMessage);
          hasApiError = true;
          if (!apiErrorMessage) {
            apiErrorMessage = errorMessage;
          }
          // Continue to next type instead of failing completely
          continue;
        }
        
        if (data.status === "OK" && data.results && Array.isArray(data.results)) {
          for (const place of data.results.slice(0, 5)) {
            if (!seenPlaceIds.has(place.place_id)) {
              seenPlaceIds.add(place.place_id);
              allPlaces.push({
                place_id: place.place_id,
                name: place.name,
                formatted_address: place.formatted_address,
                geometry: place.geometry,
                types: place.types,
                rating: place.rating,
                vicinity: place.vicinity,
              });
            }
          }
        }
      } else {
        console.error(`[nearby-landmarks] HTTP error for type ${type}:`, response.status, response.statusText);
      }

      // Stop if we have enough transit stations
      if (allPlaces.length >= 5) break;
    }

    // Then search for landmarks/attractions if we need more options
    if (allPlaces.length < 8) {
      const landmarkParams = new URLSearchParams({
        key: apiKey,
        location: `${lat},${lng}`,
        radius: String(Math.min(radius, 1500)),
        type: "tourist_attraction",
        language: "en",
      });

      const landmarkResponse = await fetch(
        `${GOOGLE_PLACES_NEARBY_ENDPOINT}?${landmarkParams.toString()}`,
      );

      if (landmarkResponse.ok) {
        const data = await landmarkResponse.json();
        
        // Check for API errors
        if (data.status === "REQUEST_DENIED" || data.status === "OVER_QUERY_LIMIT") {
          const errorMessage = data.error_message || "Google Places API error";
          console.error("[nearby-landmarks] API error for landmarks:", data.status, errorMessage);
          hasApiError = true;
          if (!apiErrorMessage) {
            apiErrorMessage = errorMessage;
          }
          // Continue without landmarks if API fails
        } else if (data.status === "OK" && data.results && Array.isArray(data.results)) {
          for (const place of data.results.slice(0, 5)) {
            if (!seenPlaceIds.has(place.place_id)) {
              seenPlaceIds.add(place.place_id);
              allPlaces.push({
                place_id: place.place_id,
                name: place.name,
                formatted_address: place.formatted_address,
                geometry: place.geometry,
                types: place.types,
                rating: place.rating,
                vicinity: place.vicinity,
              });
            }
          }
        }
      } else {
        console.error("[nearby-landmarks] HTTP error for landmarks:", landmarkResponse.status, landmarkResponse.statusText);
      }
    }

    // Sort by distance (closest first) - simple approximation
    allPlaces.sort((a, b) => {
      const distA = Math.sqrt(
        Math.pow(a.geometry.location.lat - lat, 2) +
          Math.pow(a.geometry.location.lng - lng, 2),
      );
      const distB = Math.sqrt(
        Math.pow(b.geometry.location.lat - lat, 2) +
          Math.pow(b.geometry.location.lng - lng, 2),
      );
      return distA - distB;
    });

    // Return top 8 places
    const topPlaces = allPlaces.slice(0, 8);

    console.log(
      `[nearby-landmarks] Found ${topPlaces.length} places near ${lat},${lng}`,
    );

    // If no places found and API errors occurred, return error
    if (topPlaces.length === 0 && hasApiError) {
      return res.status(503).json({
        success: false,
        error: apiErrorMessage || "Unable to fetch nearby places. Please check Google Maps API configuration.",
      });
    }

    return res.status(200).json({
      success: true,
      places: topPlaces,
    });
  } catch (error) {
    console.error("[nearby-landmarks] Error:", error);
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
}



