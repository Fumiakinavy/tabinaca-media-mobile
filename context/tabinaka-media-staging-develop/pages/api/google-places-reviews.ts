import { NextApiRequest, NextApiResponse } from "next";
import { apiCache, generateCacheKey, CACHE_TTL } from "../../lib/cache";
import { handleCorsPreflightRequest, setCorsHeaders } from "@/lib/cors";

interface GooglePlacesReview {
  author_name: string;
  rating: number;
  relative_time_description: string;
  text?: string;
  time: number;
}

interface GooglePlacesResult {
  rating: number;
  user_ratings_total: number;
  reviews?: GooglePlacesReview[];
}

interface GooglePlacesResponse {
  result?: GooglePlacesResult;
  status: string;
  error_message?: string;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  // CORS: プリフライトリクエストを処理
  if (handleCorsPreflightRequest(req, res)) {
    return;
  }
  setCorsHeaders(req, res);

  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { placeId } = req.query;

  if (!placeId || typeof placeId !== "string") {
    return res.status(400).json({ error: "Place ID is required" });
  }

  const apiKey =
    process.env.GOOGLE_PLACES_API_KEY_SERVER ||
    process.env.GOOGLE_PLACES_API_KEY;
  if (!apiKey) {
    console.error("Google Places API key not configured");
    return res.status(500).json({
      error: "Google Places API key not configured",
      placeId: placeId as string,
    });
  }

  // Generate cache key
  const cacheKey = generateCacheKey.placeReviews(placeId);

  // Check cache first
  const cachedResult = apiCache.get(cacheKey);
  if (cachedResult) {
    console.log("Using cached place reviews for:", placeId);
    return res.status(200).json(cachedResult);
  }

  try {
    const url = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&fields=rating,user_ratings_total,reviews&language=en&region=jp&key=${apiKey}`;

    console.log("Fetching Google Places data for placeId:", placeId);
    const response = await fetch(url);

    if (!response.ok) {
      console.error(
        "Google Places API error:",
        response.status,
        response.statusText,
      );
      return res.status(response.status).json({
        error: `Google Places API error: ${response.status} ${response.statusText}`,
        status: response.status,
      });
    }

    const data: GooglePlacesResponse = await response.json();

    if (data.status !== "OK") {
      console.error(
        "Google Places API status error:",
        data.status,
        data.error_message,
      );
      return res.status(400).json({
        error: data.error_message || "Failed to fetch place details",
        status: data.status,
      });
    }

    if (!data.result) {
      return res.status(404).json({ error: "Place not found" });
    }

    // rating と user_ratings_total が存在するかチェック
    if (
      typeof data.result.rating !== "number" ||
      typeof data.result.user_ratings_total !== "number"
    ) {
      console.error("Missing rating data:", {
        placeId,
        rating: data.result.rating,
        user_ratings_total: data.result.user_ratings_total,
        result: data.result,
      });
      return res.status(404).json({
        error: "Rating data not available for this place",
        placeId,
      });
    }

    // 星評価のみを返す（レビューテキストは除外）
    const result = {
      rating: data.result.rating,
      user_ratings_total: data.result.user_ratings_total,
      reviews:
        data.result.reviews?.map((review) => ({
          author_name: review.author_name,
          rating: review.rating,
          relative_time_description: review.relative_time_description,
          time: review.time,
        })) || [],
    };

    // Cache the result
    try {
      apiCache.set(cacheKey, result, CACHE_TTL.PLACE_REVIEWS);
    } catch (cacheError) {
      console.error("Error caching result:", cacheError);
      // キャッシュエラーは無視して続行
    }

    res.status(200).json(result);
  } catch (error) {
    console.error("Error fetching Google Places data:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    const errorStack = error instanceof Error ? error.stack : undefined;
    console.error("Error details:", { errorMessage, errorStack, placeId });
    res.status(500).json({
      error: "Internal server error",
      message: errorMessage,
      placeId,
    });
  }
}
