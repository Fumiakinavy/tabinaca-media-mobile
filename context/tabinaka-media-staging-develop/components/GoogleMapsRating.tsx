import React, { useState, useEffect } from "react";
import { Star } from "lucide-react";
import { generateCacheKey, CACHE_TTL } from "@/lib/cache";

interface GoogleMapsRatingData {
  rating: number;
  user_ratings_total: number;
}

interface CachedRatingData extends GoogleMapsRatingData {
  timestamp: number;
}

interface GoogleMapsRatingProps {
  placeId: string;
  showCount?: boolean;
  size?: "sm" | "md" | "lg";
  className?: string;
  // 評価情報をpropsで受け取れるように（API呼び出しを回避）
  rating?: number;
  userRatingsTotal?: number;
}

// クライアントサイド用のlocalStorageキャッシュヘルパー
// サーバーサイドのapiCacheと統合されたインターフェースを提供
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
    console.error("[GoogleMapsRating] Error reading cache:", error);
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
    console.error("[GoogleMapsRating] Error saving cache:", error);
  }
};

export default function GoogleMapsRating({
  placeId,
  showCount = true,
  size = "md",
  className = "",
  rating: propRating,
  userRatingsTotal: propUserRatingsTotal,
}: GoogleMapsRatingProps) {
  const [data, setData] = useState<GoogleMapsRatingData | null>(
    // propsで評価情報が渡されている場合はそれを使用
    propRating !== undefined && propUserRatingsTotal !== undefined
      ? { rating: propRating, user_ratings_total: propUserRatingsTotal }
      : null,
  );
  const [loading, setLoading] = useState(
    // propsで評価情報が渡されている場合はローディング不要
    propRating === undefined || propUserRatingsTotal === undefined,
  );
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // propsで評価情報が渡されている場合はAPI呼び出しをスキップ
    if (propRating !== undefined && propUserRatingsTotal !== undefined) {
      setData({ rating: propRating, user_ratings_total: propUserRatingsTotal });
      setLoading(false);
      return;
    }

    const fetchRating = async () => {
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
        const cachedData = getClientCache<GoogleMapsRatingData>(cacheKey);
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
          let errorData: any = {};
          try {
            errorData = await response.json();
          } catch (e) {
            // JSON解析に失敗した場合は空オブジェクトを使用
          }

          const errorMessage =
            errorData.error ||
            errorData.message ||
            `Failed to fetch rating information (${response.status})`;
          setError(errorMessage);
          setData(null);
          setLoading(false);
          return;
        }

        const result = await response.json();

        // rating が存在しない場合はエラーとして扱う
        if (
          typeof result.rating !== "number" ||
          typeof result.user_ratings_total !== "number"
        ) {
          setError("Rating data is incomplete");
          setData(null);
          setLoading(false);
          return;
        }

        const ratingData: GoogleMapsRatingData = {
          rating: result.rating,
          user_ratings_total: result.user_ratings_total,
        };

        // クライアントサイドキャッシュに保存
        setClientCache(cacheKey, ratingData);
        setData(ratingData);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "An unknown error occurred",
        );
        console.error("[GoogleMapsRating] Error fetching rating:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchRating();
  }, [placeId, propRating, propUserRatingsTotal]);

  const getStarSize = () => {
    switch (size) {
      case "sm":
        return "w-3 h-3";
      case "lg":
        return "w-6 h-6";
      default:
        return "w-4 h-4";
    }
  };

  const getTextSize = () => {
    switch (size) {
      case "sm":
        return "text-sm";
      case "lg":
        return "text-xl";
      default:
        return "text-base";
    }
  };

  const renderStars = (rating: number) => {
    const starSize = getStarSize();
    return Array.from({ length: 5 }, (_, index) => (
      <Star
        key={index}
        className={`${starSize} ${
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
        <div className="animate-pulse bg-gray-200 rounded w-20 h-4"></div>
      </div>
    );
  }

  if (error || !data || typeof data.rating !== "number") {
    return (
      <div className={`text-gray-400 text-xs ${className}`}>Google Maps</div>
    );
  }

  return (
    <div className={`flex items-center space-x-2 ${className}`}>
      <div className="flex items-center space-x-1">
        {renderStars(data.rating)}
      </div>
      <span className={`font-semibold text-gray-900 ${getTextSize()}`}>
        {data.rating.toFixed(1)}
      </span>
      {showCount && (
        <span
          className={`text-gray-600 ${size === "sm" ? "text-xs" : "text-sm"}`}
        >
          ({data.user_ratings_total})
        </span>
      )}
    </div>
  );
}
