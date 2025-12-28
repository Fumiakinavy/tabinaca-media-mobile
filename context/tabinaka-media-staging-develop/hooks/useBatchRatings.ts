import { useState, useEffect, useMemo } from "react";
import { generateCacheKey } from "@/lib/cache";

interface RatingData {
  rating: number;
  user_ratings_total: number;
}

interface BatchRatingsResult {
  [placeId: string]: RatingData | null;
}

interface UseBatchRatingsOptions {
  placeIds: string[];
  enabled?: boolean;
}

const CLIENT_CACHE_KEY_PREFIX = "client_cache:";
const CACHE_DURATION_MS = 7 * 24 * 60 * 60 * 1000; // 7 days (extended from 24 hours for cost optimization)

const getClientCache = <T>(key: string): T | null => {
  if (typeof window === "undefined") return null;

  try {
    const cached = localStorage.getItem(`${CLIENT_CACHE_KEY_PREFIX}${key}`);
    if (!cached) return null;

    const data: { value: T; timestamp: number } = JSON.parse(cached);
    const now = Date.now();

    if (now - data.timestamp < CACHE_DURATION_MS) {
      return data.value;
    }

    localStorage.removeItem(`${CLIENT_CACHE_KEY_PREFIX}${key}`);
    return null;
  } catch (error) {
    console.error("[useBatchRatings] Error reading cache:", error);
    return null;
  }
};

const setClientCache = <T>(key: string, value: T): void => {
  if (typeof window === "undefined") return;

  try {
    const cachedData = {
      value,
      timestamp: Date.now(),
    };
    localStorage.setItem(
      `${CLIENT_CACHE_KEY_PREFIX}${key}`,
      JSON.stringify(cachedData),
    );
  } catch (error) {
    console.error("[useBatchRatings] Error saving cache:", error);
  }
};

export function useBatchRatings({
  placeIds,
  enabled = true,
}: UseBatchRatingsOptions) {
  const [ratings, setRatings] = useState<BatchRatingsResult>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 有効なplaceIdのみをフィルタリング
  const validPlaceIds = useMemo(() => {
    return placeIds.filter(
      (id): id is string => typeof id === "string" && id.length > 0,
    );
  }, [placeIds]);

  useEffect(() => {
    if (!enabled || validPlaceIds.length === 0) {
      setLoading(false);
      return;
    }

    const fetchBatchRatings = async () => {
      try {
        setLoading(true);
        setError(null);

        // まずクライアントサイドキャッシュをチェック
        const cachedResults: BatchRatingsResult = {};
        const placeIdsToFetch: string[] = [];

        for (const placeId of validPlaceIds) {
          const cacheKey = generateCacheKey.placeReviews(placeId);
          const cachedData = getClientCache<RatingData>(cacheKey);

          if (cachedData) {
            cachedResults[placeId] = cachedData;
          } else {
            placeIdsToFetch.push(placeId);
          }
        }

        // キャッシュにないplaceIdのみAPIから取得
        if (placeIdsToFetch.length > 0) {
          const response = await fetch("/api/google-places-reviews-batch", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ placeIds: placeIdsToFetch }),
          });

          if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            const errorMessage =
              errorData.error ||
              `Failed to fetch batch ratings (${response.status})`;

            // APIキー関連のエラーの場合は警告のみで、空の結果を返す
            if (
              errorMessage.includes("API key") ||
              errorMessage.includes("not configured")
            ) {
              console.warn(
                "[useBatchRatings] Google Places API key not configured. Ratings will not be available.",
              );
              setRatings(cachedResults);
              return;
            }

            throw new Error(errorMessage);
          }

          const batchResults: BatchRatingsResult = await response.json();

          // キャッシュに保存
          for (const [placeId, ratingData] of Object.entries(batchResults)) {
            if (ratingData) {
              const cacheKey = generateCacheKey.placeReviews(placeId);
              setClientCache(cacheKey, ratingData);
            }
          }

          // キャッシュ結果とAPI結果をマージ
          setRatings({ ...cachedResults, ...batchResults });
        } else {
          // 全てキャッシュから取得できた場合
          setRatings(cachedResults);
        }
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "An unknown error occurred",
        );
        console.error("[useBatchRatings] Error fetching batch ratings:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchBatchRatings();
  }, [validPlaceIds.join(","), enabled]);

  // 個別の評価情報を取得するヘルパー関数
  const getRating = (placeId: string): RatingData | null => {
    return ratings[placeId] || null;
  };

  return {
    ratings,
    loading,
    error,
    getRating,
  };
}
