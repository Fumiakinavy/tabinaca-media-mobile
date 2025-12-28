import { NextApiRequest, NextApiResponse } from "next";
import {
  getSearchQueryVariants,
  isValidTravelTypeCode,
  TravelTypeCode,
} from "../../lib/travelTypeMapping";
import {
  rankPlaces,
  PlaceData,
  haversineDistance,
} from "../../lib/scoring/rank";
import { getPhotoUrl, getMapsUrl } from "../../lib/maps/photos";
import { apiCache, generateCacheKey, CACHE_TTL } from "../../lib/cache";
import { verifyAccountToken } from "@/lib/accountToken";
import { supabaseServer } from "@/lib/supabaseServer";
import { ensureQuizCompleted } from "@/lib/server/quizState";
import { handleCorsPreflightRequest, setCorsHeaders } from "@/lib/cors";

interface RecommendationResult {
  items: PlaceData[];
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<RecommendationResult | { error: string }>,
) {
  // CORS: プリフライトリクエストを処理
  if (handleCorsPreflightRequest(req, res)) {
    return;
  }
  setCorsHeaders(req, res);

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const accountIdHeader = Array.isArray(req.headers["x-gappy-account-id"])
      ? req.headers["x-gappy-account-id"][0]
      : req.headers["x-gappy-account-id"];
    const accountTokenHeader = Array.isArray(
      req.headers["x-gappy-account-token"],
    )
      ? req.headers["x-gappy-account-token"][0]
      : req.headers["x-gappy-account-token"];
    if (!accountIdHeader || !accountTokenHeader) {
      return res.status(401).json({ error: "Missing account credentials" });
    }

    const tokenRecord = verifyAccountToken(accountTokenHeader as string);
    if (!tokenRecord || tokenRecord.accountId !== accountIdHeader) {
      return res.status(401).json({ error: "Invalid account session" });
    }

    const authHeader = req.headers.authorization || req.headers.Authorization;
    if (
      typeof authHeader !== "string" ||
      !authHeader.toLowerCase().startsWith("bearer ")
    ) {
      return res.status(401).json({ error: "Authorization required" });
    }
    const accessToken = authHeader.slice(7).trim();
    const { data: userData, error: userError } =
      await supabaseServer.auth.getUser(accessToken);
    if (userError || !userData?.user) {
      return res.status(401).json({ error: "Invalid Supabase session" });
    }

    const quizState = await ensureQuizCompleted(accountIdHeader as string);
    if (!quizState) {
      return res.status(403).json({ error: "Quiz is not completed" });
    }

    const { location, travelTypeCode } = req.body;
    console.log("Recommendation API - Received request:", {
      location,
      travelTypeCode,
    });

    // Validate input
    if (!location || !travelTypeCode) {
      console.error("Recommendation API - Invalid input:", {
        location,
        travelTypeCode,
      });
      return res.status(400).json({
        error: "Invalid input: location and travelTypeCode are required",
      });
    }

    // Validate travel type code
    if (!isValidTravelTypeCode(travelTypeCode)) {
      console.error(
        "Recommendation API - Invalid travel type code:",
        travelTypeCode,
      );
      return res.status(400).json({ error: "Invalid travel type code" });
    }

    // Get walking tolerance from quiz state to determine search radius
    const walkingTolerance = quizState.answers?.walkingTolerance;
    let radiusMeters: number;
    if (walkingTolerance === "5") {
      radiusMeters = 400; // 5 minutes or less: approximately 400m (5 minutes walk)
    } else if (walkingTolerance === "10") {
      radiusMeters = 800; // 10 minutes or less: approximately 800m (10 minutes walk)
    } else if (walkingTolerance === "15") {
      radiusMeters = 1200; // 15 minutes or more: approximately 1200m (15 minutes walk)
    } else {
      radiusMeters = 5000; // Default radius if walkingTolerance is not set
    }

    // Invalidate cache for recommendation queries (for diversity)
    const isRecommendationQuery = true;

    // Generate cache key for recommendation
    const cacheKey = generateCacheKey.placesSearch(
      `recommendation:${travelTypeCode}`,
      `${location.lat},${location.lng}`,
      String(radiusMeters),
      travelTypeCode,
    );

    // Check cache first (but skip for recommendation queries)
    if (!isRecommendationQuery) {
      const cachedResult = apiCache.get<RecommendationResult>(cacheKey);
      if (cachedResult) {
        console.log("Using cached recommendation result");
        return res.status(200).json(cachedResult);
      }
    }

    const apiKey = process.env.GOOGLE_PLACES_API_KEY_SERVER;
    if (!apiKey) {
      console.error("GOOGLE_PLACES_API_KEY_SERVER is not configured");
      // Return mock data for testing
      const mockData = {
        items: [
          {
            place_id: "mock_1",
            name: "Tokyo Skytree",
            vicinity: "Sumida, Tokyo",
            types: ["tourist_attraction", "point_of_interest"],
            rating: 4.5,
            user_ratings_total: 1000,
            price_level: 2,
            distance_m: 1000,
            open_now: true,
            photo_url: null,
            maps_url: "https://maps.google.com",
            geometry: {
              location: { lat: 35.7101, lng: 139.8107 },
            },
          },
          {
            place_id: "mock_2",
            name: "Senso-ji Temple",
            vicinity: "Asakusa, Tokyo",
            types: ["place_of_worship", "tourist_attraction"],
            rating: 4.3,
            user_ratings_total: 800,
            price_level: 0,
            distance_m: 1500,
            open_now: true,
            photo_url: null,
            maps_url: "https://maps.google.com",
            geometry: {
              location: { lat: 35.7148, lng: 139.7967 },
            },
          },
        ],
      };

      // Cache the mock result
      apiCache.set(cacheKey, mockData, CACHE_TTL.PLACES_SEARCH);

      return res.status(200).json(mockData);
    }

    // Get multiple search query variants for diversity
    const searchQueryVariants = getSearchQueryVariants(travelTypeCode);

    console.log("Recommendation request:", {
      travelTypeCode,
      location,
      radius: radiusMeters,
      walkingTolerance,
      queryVariants: searchQueryVariants,
    });

    // Fetch places from multiple query variants in parallel for diversity
    const placePromises = searchQueryVariants.map((query) =>
      fetchPlaces(location, radiusMeters, query, apiKey),
    );

    const placeResults = await Promise.all(placePromises);

    // Merge results and remove duplicates
    const placeMap = new Map<string, { place_id: string; name: string }>();
    placeResults.forEach((places) => {
      places.forEach((place) => {
        if (place.place_id && place.name) {
          placeMap.set(place.place_id, place);
        }
      });
    });

    let places = Array.from(placeMap.values());

    if (places.length === 0) {
      // Retry with wider radius using first variant
      console.log("No results, retrying with wider radius");
      const widerPlaces = await fetchPlaces(
        location,
        radiusMeters * 1.5,
        searchQueryVariants[0],
        apiKey,
      );
      places.push(...widerPlaces);
    }

    // Fetch details for top places in parallel
    const detailPromises = places.slice(0, 10).map(async (place) => {
      try {
        const details = await fetchPlaceDetails(place.place_id, apiKey);
        const distance = haversineDistance(
          location.lat,
          location.lng,
          details.geometry.location.lat,
          details.geometry.location.lng,
        );

        return {
          ...details,
          distance_m: distance,
          maps_url: getMapsUrl(details.place_id),
        };
      } catch (error) {
        console.error(`Error fetching details for ${place.place_id}:`, error);
        return null;
      }
    });

    // Fetch Place Details in parallel
    const detailResults = await Promise.all(detailPromises);
    const detailedPlaces = detailResults.filter(
      (place): place is PlaceData => place !== null,
    );

    // Rank places (simplified ranking for travel type)
    // Note: We'll use a simpler ranking since we don't have userVector/constraints
    const rankedPlaces = detailedPlaces.sort((a, b) => {
      // Simple ranking: prioritize rating and distance
      const scoreA = (a.rating || 0) * 0.7 - ((a.distance_m || 0) / 1000) * 0.3;
      const scoreB = (b.rating || 0) * 0.7 - ((b.distance_m || 0) / 1000) * 0.3;
      return scoreB - scoreA;
    });

    console.log("Recommendation success:", {
      totalFound: places.length,
      detailed: detailedPlaces.length,
      finalResults: rankedPlaces.slice(0, 5).map((p) => ({
        name: p.name,
        rating: p.rating,
        distance: p.distance_m,
      })),
    });

    const finalItems = rankedPlaces.slice(0, 20);
    const responseData = {
      status: finalItems.length > 0 ? "ready" : "empty",
      items: finalItems,
    };

    // Cache the result (but skip for recommendation queries)
    if (!isRecommendationQuery) {
      apiCache.set(cacheKey, responseData, CACHE_TTL.PLACES_SEARCH);
    }

    res.status(200).json(responseData);
  } catch (error) {
    console.error("Recommendation API Error:", error);

    // Log detailed error information
    if (error instanceof Error) {
      console.error("Error details:", {
        message: error.message,
        stack: error.stack,
        name: error.name,
      });
    }

    // Return a more user-friendly error response
    const errorResponse = {
      error: "Failed to generate recommendations",
      details: error instanceof Error ? error.message : "Unknown error",
      timestamp: new Date().toISOString(),
    };

    res.status(500).json(errorResponse);
  }
}

async function fetchPlaces(
  location: { lat: number; lng: number },
  radius: number,
  searchQuery: string,
  apiKey: string,
): Promise<Array<{ place_id: string; name: string }>> {
  try {
    // Text Search APIを使用（locationとradiusパラメータで範囲を指定）
    // locationはlat,lng形式、radiusはメートル単位
    const encodedQuery = encodeURIComponent(searchQuery);
    const url = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodedQuery}&location=${location.lat},${location.lng}&radius=${radius}&key=${apiKey}`;

    const response = await fetch(url);
    const data = await response.json();

    if (data.status === "OK" && data.results) {
      // 重複を除去
      const placeMap = new Map<string, { place_id: string; name: string }>();
      (data.results as any[]).forEach((r: any) => {
        if (r.place_id && r.name) {
          placeMap.set(r.place_id, { place_id: r.place_id, name: r.name });
        }
      });
      const uniquePlaces = Array.from(placeMap.values());

      console.log(
        `Fetched ${uniquePlaces.length} unique places using Text Search with query: "${searchQuery}"`,
      );
      return uniquePlaces;
    }

    console.warn(`Text Search returned status: ${data.status}`);
    return [];
  } catch (error) {
    console.error(`Error fetching places with query "${searchQuery}":`, error);
    return [];
  }
}

async function fetchPlaceDetails(
  placeId: string,
  apiKey: string,
): Promise<PlaceData> {
  const fields =
    "place_id,name,vicinity,types,rating,user_ratings_total,price_level,photos,geometry,opening_hours";
  const url = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&fields=${fields}&key=${apiKey}`;

  const response = await fetch(url);
  const data = await response.json();

  if (data.status !== "OK" || !data.result) {
    throw new Error(`Failed to fetch details for ${placeId}`);
  }

  const result = data.result;
  const photoUrl = result.photos?.[0]?.photo_reference
    ? getPhotoUrl(result.photos[0].photo_reference, 800, apiKey)
    : null;

  return {
    place_id: result.place_id,
    name: result.name,
    vicinity: result.vicinity || "",
    types: result.types || [],
    rating: result.rating || null,
    user_ratings_total: result.user_ratings_total || null,
    price_level: result.price_level !== undefined ? result.price_level : null,
    distance_m: 0, // Will be calculated later
    open_now: result.opening_hours?.open_now || null,
    photo_url: photoUrl,
    photos: result.photos || [], // Include photos array for PlaceCard
    maps_url: "", // Will be set later
    geometry: result.geometry,
  };
}
