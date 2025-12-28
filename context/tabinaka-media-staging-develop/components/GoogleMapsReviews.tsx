import React, { useState, useEffect } from "react";
import { Star, MapPin, Users } from "lucide-react";
import { generateCacheKey, CACHE_TTL } from "@/lib/cache";

interface GoogleMapsReview {
  author_name: string;
  rating: number;
  relative_time_description: string;
  time: number;
}

interface GoogleMapsReviewsData {
  rating: number;
  user_ratings_total: number;
  reviews: GoogleMapsReview[];
}

interface GoogleMapsReviewsProps {
  placeId: string;
  showReviews?: boolean;
  maxReviews?: number;
  className?: string;
}

// クライアントサイド用のlocalStorageキャッシュヘルパー
// GoogleMapsRatingと同じキャッシュロジックを使用
const CLIENT_CACHE_KEY_PREFIX = "client_cache:";
const CACHE_DURATION_MS = CACHE_TTL.PLACE_REVIEWS * 60 * 1000; // ミリ秒に変換

const getClientCache = <T,>(key: string): T | null => {
  if (typeof window === "undefined") return null;

  try {
    const cached = localStorage.getItem(`${CLIENT_CACHE_KEY_PREFIX}${key}`);
    if (!cached) return null;

    const data: { value: T; timestamp: number } = JSON.parse(cached);
    const now = Date.now();

    // キャッシュが有効期限内かチェック
    if (now - data.timestamp < CACHE_DURATION_MS) {
      return data.value;
    }

    // 期限切れのキャッシュを削除
    localStorage.removeItem(`${CLIENT_CACHE_KEY_PREFIX}${key}`);
    return null;
  } catch (error) {
    console.error("[GoogleMapsReviews] Error reading cache:", error);
    return null;
  }
};

const setClientCache = <T,>(key: string, value: T): void => {
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
    console.error("[GoogleMapsReviews] Error saving cache:", error);
  }
};

export default function GoogleMapsReviews({
  placeId,
  showReviews = true,
  maxReviews = 5,
  className = "",
}: GoogleMapsReviewsProps) {
  const [data, setData] = useState<GoogleMapsReviewsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchReviews = async () => {
      if (!placeId) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);

        // 統一的なキャッシュキーを使用（サーバーサイドのapiCacheと一致）
        const cacheKey = generateCacheKey.placeReviews(placeId);

        // まずクライアントサイドキャッシュをチェック
        const cachedData = getClientCache<GoogleMapsReviewsData>(cacheKey);
        if (cachedData) {
          setData(cachedData);
          setLoading(false);
          return;
        }

        // キャッシュがなければAPIから取得（サーバーサイドでapiCacheが使用される）
        const response = await fetch(
          `/api/google-places-reviews?placeId=${encodeURIComponent(placeId)}`,
        );

        if (!response.ok) {
          throw new Error("Failed to fetch review information");
        }

        const result = await response.json();

        // クライアントサイドキャッシュに保存
        setClientCache(cacheKey, result);
        setData(result);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "An unknown error occurred",
        );
        console.error("Error fetching Google Maps reviews:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchReviews();
  }, [placeId]);

  const renderStars = (rating: number) => {
    return Array.from({ length: 5 }, (_, index) => (
      <Star
        key={index}
        className={`w-4 h-4 ${
          index < Math.floor(rating)
            ? "text-yellow-400 fill-current"
            : index < rating
              ? "text-yellow-400 fill-current opacity-50"
              : "text-gray-300"
        }`}
      />
    ));
  };

  if (loading) {
    return (
      <div className={`flex items-center space-x-2 ${className}`}>
        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500"></div>
        <span className="text-gray-600">Loading...</span>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className={`text-red-500 text-sm ${className}`}>
        {error || "Could not fetch review information"}
      </div>
    );
  }

  return (
    <div className={`space-y-3 ${className}`}>
      {/* 全体評価 */}
      <div className="flex items-center space-x-2">
        <MapPin className="w-4 h-4 text-blue-500" />
        <div className="flex items-center space-x-1">
          {renderStars(data.rating)}
        </div>
        <span className="text-lg font-semibold text-gray-900">
          {data.rating.toFixed(1)}
        </span>
        <div className="flex items-center space-x-1 text-gray-600">
          <Users className="w-4 h-4" />
          <span className="text-sm">({data.user_ratings_total}件)</span>
        </div>
      </div>

      {/* 個別レビュー */}
      {showReviews && data.reviews && data.reviews.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-gray-700">最新のレビュー</h4>
          <div className="space-y-2">
            {data.reviews.slice(0, maxReviews).map((review, index) => (
              <div key={index} className="bg-gray-50 p-3 rounded-lg">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium text-gray-900">
                    {review.author_name}
                  </span>
                  <span className="text-xs text-gray-500">
                    {review.relative_time_description}
                  </span>
                </div>
                <div className="flex items-center space-x-1">
                  {renderStars(review.rating)}
                  <span className="text-sm text-gray-600 ml-1">
                    {review.rating}/5
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
