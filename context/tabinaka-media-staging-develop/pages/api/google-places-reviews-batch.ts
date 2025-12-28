import { NextApiRequest, NextApiResponse } from "next";
import { apiCache, generateCacheKey, CACHE_TTL } from "../../lib/cache";

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

interface BatchResponse {
  [placeId: string]: {
    rating: number;
    user_ratings_total: number;
    reviews?: GooglePlacesReview[];
  } | null;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { placeIds } = req.body;

  if (!Array.isArray(placeIds) || placeIds.length === 0) {
    return res.status(400).json({ error: "placeIds array is required" });
  }

  // 最大50件まで（Google Places APIの制限を考慮）
  if (placeIds.length > 50) {
    return res.status(400).json({ error: "Maximum 50 placeIds allowed" });
  }

  const apiKey =
    process.env.GOOGLE_PLACES_API_KEY_SERVER ||
    process.env.GOOGLE_PLACES_API_KEY;
  if (!apiKey) {
    console.warn(
      "Google Places API key not configured. Returning empty results.",
    );
    // APIキーが設定されていない場合でも、空の結果を返してアプリをクラッシュさせない
    const emptyResult: BatchResponse = {};
    for (const placeId of placeIds) {
      if (typeof placeId === "string") {
        emptyResult[placeId] = null;
      }
    }
    return res.status(200).json(emptyResult);
  }

  const result: BatchResponse = {};
  const placeIdsToFetch: string[] = [];

  // まずキャッシュをチェック
  for (const placeId of placeIds) {
    if (typeof placeId !== "string") continue;

    const cacheKey = generateCacheKey.placeReviews(placeId);
    const cachedResult = apiCache.get<GooglePlacesResult>(cacheKey);

    if (cachedResult) {
      result[placeId] = cachedResult;
    } else {
      placeIdsToFetch.push(placeId);
    }
  }

  // キャッシュにないplaceIdのみAPIから取得
  if (placeIdsToFetch.length > 0) {
    // Google Places APIは一度に1つのplaceIdしか取得できないため、並列で取得
    const fetchPromises = placeIdsToFetch.map(async (placeId) => {
      try {
        const url = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&fields=rating,user_ratings_total,reviews&language=en&region=jp&key=${apiKey}`;

        const response = await fetch(url);

        if (!response.ok) {
          console.error(
            `Google Places API error for ${placeId}:`,
            response.status,
            response.statusText,
          );
          return { placeId, data: null, error: `HTTP ${response.status}` };
        }

        const data: GooglePlacesResponse = await response.json();

        if (data.status !== "OK") {
          console.error(
            `Google Places API status error for ${placeId}:`,
            data.status,
            data.error_message,
          );
          return { placeId, data: null, error: data.status };
        }

        if (!data.result) {
          return { placeId, data: null, error: "Place not found" };
        }

        // rating と user_ratings_total が存在するかチェック
        if (
          typeof data.result.rating !== "number" ||
          typeof data.result.user_ratings_total !== "number"
        ) {
          console.error("Missing rating data for placeId:", placeId);
          return { placeId, data: null, error: "Rating data not available" };
        }

        // 星評価のみを返す（レビューテキストは除外）
        const ratingData: GooglePlacesResult = {
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

        // キャッシュに保存
        const cacheKey = generateCacheKey.placeReviews(placeId);
        try {
          apiCache.set(cacheKey, ratingData, CACHE_TTL.PLACE_REVIEWS);
        } catch (cacheError) {
          console.error(
            "Error caching result for placeId:",
            placeId,
            cacheError,
          );
        }

        return { placeId, data: ratingData, error: null };
      } catch (error) {
        console.error(
          `Error fetching Google Places data for ${placeId}:`,
          error,
        );
        return {
          placeId,
          data: null,
          error: error instanceof Error ? error.message : "Unknown error",
        };
      }
    });

    const fetchResults = await Promise.all(fetchPromises);

    // 結果をマージ
    for (const { placeId, data, error } of fetchResults) {
      if (error) {
        result[placeId] = null;
      } else if (data) {
        result[placeId] = data;
      }
    }
  }

  res.status(200).json(result);
}
