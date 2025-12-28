import { NextApiRequest, NextApiResponse } from "next";
import {
  addDistanceToPlaces,
  getDistanceBasedRecommendations,
  PlaceWithDistance,
} from "../../../lib/distanceUtils";
import { apiClient } from "../../../lib/apiClient";

interface PlaceResult {
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
}

interface SearchResponse {
  results: PlaceResult[];
  status: string;
  next_page_token?: string;
  error?: string;
  user_location?: {
    lat: number;
    lng: number;
  };
  distance_based?: boolean;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<SearchResponse>,
) {
  // Only allow GET requests
  if (req.method !== "GET") {
    return res.status(405).json({
      results: [],
      status: "error",
      error: "Method not allowed",
    });
  }

  try {
    const {
      query,
      location,
      radius,
      type,
      rankby,
      pagetoken,
      opennow,
      minprice,
      maxprice,
      near,
      user_lat,
      user_lng,
    } = req.query;

    // Validate input
    if (!query || typeof query !== "string") {
      return res.status(400).json({
        results: [],
        status: "error",
        error: "Search query is required",
      });
    }

    // Check if Google Places API key is configured
    const apiKey = process.env.GOOGLE_PLACES_API_KEY_SERVER;

    if (!apiKey) {
      console.error("Google Places API key is not configured");
      return res.status(500).json({
        results: [],
        status: "error",
        error: "Maps service is not configured",
      });
    }

    // Use optimized API client
    const apiResponse = await apiClient.searchPlaces(
      query,
      location as string,
      radius as string,
      type as string,
    );

    const data = apiResponse.data;

    // Check API response status and map to appropriate HTTP status
    if (data.status === "ZERO_RESULTS") {
      return res.status(200).json({
        results: [],
        status: "ZERO_RESULTS",
      });
    }

    if (data.status !== "OK") {
      console.error(
        "Google Places API error:",
        data.status,
        data.error_message,
      );

      // Map Google status to HTTP status codes
      let httpStatus = 500;
      if (data.status === "INVALID_REQUEST") {
        httpStatus = 400;
      } else if (data.status === "REQUEST_DENIED") {
        httpStatus = 403;
      } else if (data.status === "OVER_QUERY_LIMIT") {
        httpStatus = 429;
      }

      return res.status(httpStatus).json({
        results: [],
        status: data.status,
        error: data.error_message || "Failed to search places",
      });
    }

    // Process and return results
    let results: PlaceResult[] = data.results.map((place: any) => ({
      place_id: place.place_id,
      name: place.name,
      formatted_address: place.formatted_address,
      rating: place.rating,
      user_ratings_total: place.user_ratings_total,
      price_level: place.price_level,
      types: place.types,
      geometry: {
        location: {
          lat: place.geometry.location.lat,
          lng: place.geometry.location.lng,
        },
      },
      photos: place.photos?.map((photo: any) => ({
        photo_reference: photo.photo_reference,
        height: photo.height,
        width: photo.width,
      })),
      opening_hours: place.opening_hours,
      business_status: place.business_status,
    }));

    // Add distance-based sorting if user location is provided
    let distanceBased = false;
    if (user_lat && user_lng) {
      const userLocation = {
        lat: parseFloat(user_lat as string),
        lng: parseFloat(user_lng as string),
      };

      // Add distance information and sort by distance
      const resultsWithDistance = addDistanceToPlaces(results, userLocation);
      results = resultsWithDistance;
      distanceBased = true;
    }

    console.log("Places search success:", {
      query,
      resultsCount: results.length,
      timestamp: new Date().toISOString(),
    });

    const responseData = {
      results,
      status: "OK",
      next_page_token: data.next_page_token,
      ...(distanceBased && user_lat && user_lng
        ? {
            user_location: {
              lat: parseFloat(user_lat as string),
              lng: parseFloat(user_lng as string),
            },
            distance_based: true,
          }
        : {}),
      // Add metadata about the response
      metadata: {
        fromCache: apiResponse.fromCache,
        fromMock: apiResponse.fromMock,
        timestamp: new Date().toISOString(),
      },
    };

    res.status(200).json(responseData);
  } catch (error) {
    console.error("Places search error:", error);

    res.status(500).json({
      results: [],
      status: "error",
      error: error instanceof Error ? error.message : "Failed to search places",
    });
  }
}
