import type { NextApiRequest, NextApiResponse } from "next";
import { searchPlaces } from "@/lib/functionRegistry";
import type { PlacePayload } from "@/lib/generatedActivitySaves";
import { addAffiliateExperiencesToPlaces } from "@/lib/affiliatePlaces";
import { aiDiscoveryCategories } from "@/config/aiDiscoveryCategories";

const DEFAULT_COORDINATES = { lat: 35.659106, lng: 139.700134 };
const DEFAULT_RADIUS_METERS = 700;
const CACHE_TTL_MS = 15 * 60 * 1000; // 15 minutes
const GEO_STEP_DEGREES = 0.02; // 約2km（東京付近）
const LOCATION_REFRESH_THRESHOLD_M = 2000; // 2kmを超えたら取り直し
type CacheEntry = {
  expiresAt: number;
  sections: AiSectionResponse[];
  centerLat: number;
  centerLng: number;
};

// 簡易メモリキャッシュ：同じ検索パラメータでの短時間連続アクセスを抑制
const cache = new Map<string, CacheEntry>();

const quantize = (value: number, step: number) =>
  Math.round(value / step) * step;

const haversineMeters = (
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number => {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const R = 6371e3; // Earth radius in meters
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

function mergeAffiliatesIntoPlaces(
  places: PlacePayload[],
  options?: { includeAffiliates?: boolean },
): PlacePayload[] {
  return addAffiliateExperiencesToPlaces(places, {
    includeAffiliates: options?.includeAffiliates,
    logPrefix: "ai-cards",
  }) as PlacePayload[];
}

interface AiSectionResponse {
  id: string;
  title: string;
  description: string;
  chatQuery: string;
  locationName?: string;
  places: PlacePayload[];
}

interface ApiResponse {
  success: boolean;
  sections?: AiSectionResponse[];
  error?: string;
}

const toNumberParam = (
  value: string | string[] | undefined,
): number | undefined => {
  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : undefined;
  }
  if (Array.isArray(value) && value.length > 0) {
    return toNumberParam(value[0]);
  }
  return undefined;
};

const getPlaceDistanceMeters = (
  place: PlacePayload,
  centerLat: number,
  centerLng: number,
): number | undefined => {
  if (typeof place.distance_m === "number") return place.distance_m;
  const lat = place.geometry?.location?.lat;
  const lng = place.geometry?.location?.lng;
  if (typeof lat !== "number" || typeof lng !== "number") return undefined;
  return haversineMeters(centerLat, centerLng, lat, lng);
};

// フィッシャー・イェーツシャッフルアルゴリズム
function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ApiResponse>,
) {
  if (req.method !== "GET") {
    res.setHeader("Allow", ["GET"]);
    return res
      .status(405)
      .json({ success: false, error: "Method not allowed" });
  }

  const latQuery = toNumberParam(req.query.lat);
  const lngQuery = toNumberParam(req.query.lng);
  const radius = toNumberParam(req.query.radius) ?? DEFAULT_RADIUS_METERS;
  const region =
    typeof req.query.region === "string" ? req.query.region : undefined;

  const requestLat = latQuery ?? DEFAULT_COORDINATES.lat;
  const requestLng = lngQuery ?? DEFAULT_COORDINATES.lng;
  const quantizedLat = quantize(requestLat, GEO_STEP_DEGREES);
  const quantizedLng = quantize(requestLng, GEO_STEP_DEGREES);

  // キャッシュキー生成
  const cacheKey = JSON.stringify({
    lat: quantizedLat,
    lng: quantizedLng,
    radius,
    region: region ?? null,
  });

  const now = Date.now();
  const cached = cache.get(cacheKey);
  if (cached && cached.expiresAt > now) {
    const distance = haversineMeters(
      requestLat,
      requestLng,
      cached.centerLat,
      cached.centerLng,
    );

    if (distance <= LOCATION_REFRESH_THRESHOLD_M) {
      res.setHeader(
        "Cache-Control",
        `s-maxage=${Math.floor(CACHE_TTL_MS / 1000)}, stale-while-revalidate=86400`,
      );
      return res.status(200).json({ success: true, sections: cached.sections });
    }
  }

  try {
    // カテゴリをシャッフルして、毎回異なる順序で処理
    const shuffledCategories = shuffleArray(aiDiscoveryCategories);

    // 最大6つのカテゴリを表示（毎回異なる組み合わせになる）
    const maxCategories = 6;
    const selectedCategories = shuffledCategories.slice(0, maxCategories);

    const sections = await Promise.all(
      selectedCategories.map(async (category) => {
        try {
          // ユーザーの現在地を優先的に使用（クエリパラメータで渡された場合）
          // 現在地がない場合は、カテゴリの固定座標を使用
          // それもない場合はデフォルト座標を使用
          const searchLat = latQuery ?? category.lat ?? DEFAULT_COORDINATES.lat;
          const searchLng = lngQuery ?? category.lng ?? DEFAULT_COORDINATES.lng;

          // 検索クエリに「Shibuya」が含まれている場合でも、現在地を優先
          // これにより、ユーザーの現在地（渋谷）に基づいた検索結果が返される
          const result = await searchPlaces({
            query: category.searchQuery,
            userLat: searchLat,
            userLng: searchLng,
            radiusMeters: radius,
            language: "en",
            region,
          });

          const places: PlacePayload[] = result.results.map((place) => ({
            place_id: place.place_id,
            name: place.name,
            formatted_address: place.formatted_address,
            rating: place.rating,
            user_ratings_total: place.user_ratings_total,
            price_level: place.price_level,
            types: place.types,
            geometry: place.geometry,
            photos: place.photos,
            opening_hours: place.opening_hours,
            distance_m: place.distance_m,
          }));

          // 念のためサーバ側でも半径内に絞る（distance_m が欠損の場合は geometry から計算）
          const radiusFilteredPlaces = places.filter((place) => {
            const distance = getPlaceDistanceMeters(place, searchLat, searchLng);
            if (typeof distance !== "number") return false;
            return distance <= radius;
          });

          // 各カテゴリの結果もシャッフルして、毎回異なる順序で表示
          const shuffledPlaces = shuffleArray(radiusFilteredPlaces);
          const placesWithAffiliates = mergeAffiliatesIntoPlaces(
            shuffledPlaces,
            {
              // 現在地が指定されている場合は「700m以内」を保証するため affiliate を混ぜない
              includeAffiliates: !(latQuery && lngQuery),
            },
          );

          return {
            id: category.id,
            title: category.title,
            description: category.description,
            chatQuery: category.chatQuery,
            locationName: category.locationName,
            places: placesWithAffiliates,
          };
        } catch (error) {
          console.error(
            "[ai-cards] Failed to fetch places for category",
            category.id,
            error,
          );
          return {
            id: category.id,
            title: category.title,
            description: category.description,
            chatQuery: category.chatQuery,
            locationName: category.locationName,
            places: [],
          };
        }
      }),
    );

    // 成功結果をキャッシュ
    cache.set(cacheKey, {
      expiresAt: now + CACHE_TTL_MS,
      sections,
      centerLat: requestLat,
      centerLng: requestLng,
    });

    res.setHeader(
      "Cache-Control",
      `s-maxage=${Math.floor(CACHE_TTL_MS / 1000)}, stale-while-revalidate=86400`,
    );

    return res.status(200).json({ success: true, sections });
  } catch (error) {
    console.error("[ai-cards] Unexpected error", error);
    return res.status(500).json({
      success: false,
      error: "Failed to generate AI discovery cards",
    });
  }
}
