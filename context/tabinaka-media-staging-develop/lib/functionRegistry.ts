export interface FunctionDefinition {
  name: string;
  description: string;
  parameters: {
    type: string;
    properties: Record<string, any>;
    required?: string[];
  };
}

export interface FunctionResult<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface SearchPlaceParams {
  query: string;
  userLat?: number;
  userLng?: number;
  radiusMeters?: number;
  language?: string;
  region?: string;
  allowExtendedRadius?: boolean;
}

export interface PlacePhotoSummary {
  photo_reference: string;
  height: number;
  width: number;
}

export interface PlaceSummary {
  place_id: string;
  name: string;
  formatted_address?: string;
  rating?: number;
  user_ratings_total?: number;
  price_level?: number;
  types?: string[];
  geometry?: any;
  photos?: PlacePhotoSummary[];
  opening_hours?: any;
  business_status?: string;
  distance_m?: number;
}

export interface SearchPlaceResult {
  results: PlaceSummary[];
  totalResults: number;
  hasMore: boolean;
  query: string;
  requestParams?: string;
  status?: string;
  errorMessage?: string;
}

export interface PlaceReviewSummary {
  author_name: string;
  rating: number;
  text?: string;
  relative_time_description?: string;
  time?: number;
  profile_photo_url?: string;
}

export interface PlaceDetailsResult {
  place_id: string;
  name?: string;
  formatted_address?: string;
  rating?: number;
  user_ratings_total?: number;
  price_level?: number;
  types?: string[];
  opening_hours?: any;
  website?: string;
  formatted_phone_number?: string;
  international_phone_number?: string;
  geometry?: any;
  reviews?: PlaceReviewSummary[];
  photos?: PlacePhotoSummary[];
  business_status?: string;
  current_opening_hours?: any;
  _fields: string;
  _fieldsArray: string[];
  requestParams?: string;
}

export interface PlaceDetailsParams {
  placeId: string;
  fields?: string[];
  language?: string;
  region?: string;
}

export const FUNCTION_DEFINITIONS: FunctionDefinition[] = [
  {
    name: "search_places",
    description:
      'Search for places using Google Places Text Search API. Default search radius is 500m from user\'s current location. CRITICAL: User\'s explicit requests in chat messages ALWAYS take priority over quiz results. If the user specifies time constraints (e.g., "5分以内"/"5 minutes or less"=400m, "10分以下"/"10 minutes or less"=800m, "15分以上"/"more than 15 minutes"=1200m) or location names (e.g., "Shibuya", "渋谷", "in Shinjuku"), use those values instead of defaults.',
    parameters: {
      type: "object",
      properties: {
        query: {
          type: "string",
          description:
            'Free-form search text. MUST include location names if the user specifies them (e.g., "cafes in Shibuya", "restaurants near [station name]"). If the user mentions a time constraint (5分以内/5 minutes or less, 10分以下/10 minutes or less, 15分以上/more than 15 minutes), you should still include it in the query text but also set the radiusMeters parameter accordingly.',
        },
        user_lat: {
          type: "number",
          description:
            "Latitude for location bias. Use the user's specified location if mentioned in their message, otherwise use quiz location or current location.",
        },
        user_lng: {
          type: "number",
          description:
            "Longitude for location bias. Use the user's specified location if mentioned in their message, otherwise use quiz location or current location.",
        },
        radiusMeters: {
          type: "number",
          description:
            'Search radius in meters. CRITICAL: If the user explicitly mentions a time constraint, use: "5分以内"/"5 minutes or less"=400m, "10分以下"/"10 minutes or less"=800m, "15分以上"/"more than 15 minutes"=1200m. Otherwise, use quiz default (400m for 5分, 800m for 10分, 1200m for 15分) or 500m if no quiz result. Default 500m, capped at 20000 unless allow_extended_radius is true.',
        },
        language: {
          type: "string",
          description: "Preferred language (default en)",
        },
        region: {
          type: "string",
          description: "Region bias (default jp)",
        },
        allow_extended_radius: {
          type: "boolean",
          description:
            "Set true only when the user explicitly requests a wider search than 20km",
        },
      },
      required: ["query"],
    },
  },
  {
    name: "get_place_details",
    description:
      "Get detailed information (including reviews) for a specific place_id",
    parameters: {
      type: "object",
      properties: {
        place_id: {
          type: "string",
          description: "Google Place ID to fetch details for",
        },
        placeId: {
          type: "string",
          description:
            "Alias for place_id, provided for convenience when referencing stored data",
        },
        fields: {
          type: "array",
          description:
            'Optional list of fields to request (e.g. ["name","rating","reviews"])',
          items: { type: "string" },
        },
        language: {
          type: "string",
          description: "Preferred language (default en)",
        },
        region: {
          type: "string",
          description: "Region bias (default jp)",
        },
      },
      required: ["place_id"],
    },
  },
];

const GOOGLE_PLACES_TEXT_SEARCH_ENDPOINT =
  "https://maps.googleapis.com/maps/api/place/textsearch/json";
const GOOGLE_PLACES_DETAILS_ENDPOINT =
  "https://maps.googleapis.com/maps/api/place/details/json";

function assertApiKey(): string {
  const apiKey = process.env.GOOGLE_PLACES_API_KEY_SERVER;
  if (!apiKey) {
    throw new Error("Google Places API key is not configured");
  }
  return apiKey;
}

function buildSearchParams(
  apiKey: string,
  params: SearchPlaceParams,
): URLSearchParams {
  const DEFAULT_RADIUS_METERS = 500; // 500m default radius for local searches
  const MAX_DEFAULT_RADIUS_METERS = 20000;

  // radiusMeters が正式パラメータ。後方互換として radius も許容する。
  const radiusInput = (params as any).radius ?? params.radiusMeters;

  const searchParams = new URLSearchParams({
    key: apiKey,
    language: params.language ?? "en",
    query: params.query.trim(),
  });

  if (params.region) {
    searchParams.set("region", params.region);
  }

  if (params.userLat !== undefined && params.userLng !== undefined) {
    searchParams.append("location", `${params.userLat},${params.userLng}`);
    const requestedRadius =
      typeof radiusInput === "number" && radiusInput > 0
        ? radiusInput
        : DEFAULT_RADIUS_METERS;
    const effectiveRadius = params.allowExtendedRadius
      ? requestedRadius
      : Math.min(requestedRadius, MAX_DEFAULT_RADIUS_METERS);
    searchParams.append("radius", String(effectiveRadius));
  }

  return searchParams;
}

function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  const R = 6371e3; // metres
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

function mapPlace(
  place: any,
  userLat?: number,
  userLng?: number,
): PlaceSummary {
  // Optimize: Only include first photo to reduce data size
  const photos =
    place.photos && place.photos.length > 0
      ? [
          {
            photo_reference: place.photos[0].photo_reference,
            height: place.photos[0].height,
            width: place.photos[0].width,
          },
        ]
      : undefined;

  let distance_m: number | undefined;
  if (
    userLat !== undefined &&
    userLng !== undefined &&
    place.geometry?.location
  ) {
    distance_m = calculateDistance(
      userLat,
      userLng,
      place.geometry.location.lat,
      place.geometry.location.lng,
    );
  }

  return {
    place_id: place.place_id,
    name: place.name,
    formatted_address: place.formatted_address,
    rating: place.rating,
    user_ratings_total: place.user_ratings_total,
    price_level: place.price_level,
    types: place.types,
    geometry: place.geometry,
    photos,
    opening_hours: place.opening_hours,
    business_status: place.business_status,
    distance_m,
  };
}

export async function searchPlaces(
  params: SearchPlaceParams,
): Promise<SearchPlaceResult> {
  if (!params?.query || typeof params.query !== "string") {
    throw new Error("Query is required for place search");
  }

  // Generate cache key for this search
  const { apiCache, generateCacheKey, CACHE_TTL } = await import("./cache");
  const cacheKey = generateCacheKey.placesSearch(
    params.query.trim(),
    params.userLat && params.userLng
      ? `${params.userLat},${params.userLng}`
      : undefined,
    params.radiusMeters ? String(params.radiusMeters) : undefined,
    undefined,
  );

  // Check cache first
  const cachedResult = apiCache.get<SearchPlaceResult>(cacheKey);
  if (cachedResult) {
    console.log("Using cached search result for:", params.query);
    return cachedResult;
  }

  const apiKey = assertApiKey();
  const requestParams = buildSearchParams(apiKey, params);
  const requestParamsWithoutKey = new URLSearchParams(requestParams);
  requestParamsWithoutKey.delete("key");

  // Use AbortController for timeout (10 seconds)
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10000);

  try {
    const response = await fetch(
      `${GOOGLE_PLACES_TEXT_SEARCH_ENDPOINT}?${requestParams.toString()}`,
      {
        signal: controller.signal,
        headers: {
          Accept: "application/json",
        },
      },
    );

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`Failed to fetch places: HTTP ${response.status}`);
    }

    const data = await response.json();

    const status = data.status as string | undefined;
    const rawResults = Array.isArray(data.results) ? data.results : [];

    // When Google API returns an error status, log it but return an empty list so the caller can still respond gracefully.
    if (status && status !== "OK" && status !== "ZERO_RESULTS") {
      const errorMessage =
        data.error_message || `Places search failed: ${status}`;
      console.error("[searchPlaces] Google API returned non-OK status", {
        status,
        errorMessage,
        query: params.query,
        hasLocation:
          typeof params.userLat === "number" &&
          typeof params.userLng === "number",
      });

      const fallbackResult: SearchPlaceResult = {
        results: [],
        totalResults: 0,
        hasMore: false,
        query: params.query.trim(),
        requestParams: requestParamsWithoutKey.toString(),
        status,
        errorMessage,
      };

      // Cache the fallback to avoid hammering the API with the same invalid request
      apiCache.set(cacheKey, fallbackResult, CACHE_TTL.PLACES_SEARCH);
      return fallbackResult;
    }

    // Optimize: Only map necessary fields and limit results early
    // 距離情報を含めてマッピング
    const mappedResults = rawResults.map((place: any) =>
      mapPlace(place, params.userLat, params.userLng),
    );

    // 位置情報がある場合、距離でソート（近い順）
    // これにより、ユーザーの現在地に近い結果が優先される
    const results =
      params.userLat !== undefined && params.userLng !== undefined
        ? mappedResults
            .sort((a: PlaceSummary, b: PlaceSummary) => {
              const distanceA = a.distance_m ?? Infinity;
              const distanceB = b.distance_m ?? Infinity;
              return distanceA - distanceB;
            })
            .slice(0, 20)
        : mappedResults.slice(0, 20);

    const searchResult: SearchPlaceResult = {
      results,
      totalResults: rawResults.length,
      hasMore: rawResults.length > 20,
      query: params.query.trim(),
      requestParams: requestParamsWithoutKey.toString(),
      status: status ?? "OK",
    };

    // Cache the result
    apiCache.set(cacheKey, searchResult, CACHE_TTL.PLACES_SEARCH);

    return searchResult;
  } catch (error) {
    clearTimeout(timeoutId);
    const isAbort = error instanceof Error && error.name === "AbortError";
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    console.error("[searchPlaces] Error while calling Google Places API", {
      query: params.query,
      error: errorMessage,
      isAbort,
    });

    const fallbackResult: SearchPlaceResult = {
      results: [],
      totalResults: 0,
      hasMore: false,
      query: params.query.trim(),
      requestParams: requestParamsWithoutKey.toString(),
      status: isAbort ? "ABORTED" : "ERROR",
      errorMessage,
    };

    // Cache the failure to avoid rapid retries on the same query with no connectivity
    apiCache.set(cacheKey, fallbackResult, CACHE_TTL.PLACES_SEARCH);

    return fallbackResult;
  }
}

export async function getPlaceDetails(
  params: PlaceDetailsParams,
): Promise<PlaceDetailsResult> {
  if (!params?.placeId || typeof params.placeId !== "string") {
    console.error("[getPlaceDetails] Missing or invalid placeId:", params);
    throw new Error("placeId is required for place details");
  }

  console.log(
    "[getPlaceDetails] Fetching details for place_id:",
    params.placeId,
  );

  // Check cache first
  const { apiCache, generateCacheKey, CACHE_TTL } = await import("./cache");
  const cacheFieldsParam =
    Array.isArray(params.fields) && params.fields.length > 0
      ? params.fields.join(",")
      : "default";
  const cacheKey = generateCacheKey.placeDetails(
    params.placeId,
    cacheFieldsParam,
  );

  const cachedResult = apiCache.get<PlaceDetailsResult>(cacheKey);
  if (cachedResult) {
    console.log("[getPlaceDetails] Using cached result for:", params.placeId);
    return cachedResult;
  }

  const apiKey = assertApiKey();
  const fieldsArray =
    Array.isArray(params.fields) && params.fields.length > 0
      ? params.fields
      : [
          "place_id",
          "name",
          "formatted_address",
          "geometry",
          "rating",
          "user_ratings_total",
          "price_level",
          "types",
          "opening_hours",
          "current_opening_hours",
          "website",
          "formatted_phone_number",
          "international_phone_number",
          "business_status",
          "photos",
          "reviews",
        ];
  const fieldsParam = fieldsArray.join(",");

  const url = new URL(GOOGLE_PLACES_DETAILS_ENDPOINT);
  url.searchParams.set("place_id", params.placeId);
  url.searchParams.set("fields", fieldsParam);
  url.searchParams.set("key", apiKey);
  url.searchParams.set("language", params.language ?? "en");
  url.searchParams.set("region", params.region ?? "jp");

  const requestParams = new URLSearchParams(url.searchParams);
  requestParams.delete("key");

  // Use AbortController for timeout (10 seconds)
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10000);

  try {
    console.log(
      "[getPlaceDetails] Requesting:",
      url.toString().replace(apiKey, "***"),
    );
    const response = await fetch(url.toString(), {
      signal: controller.signal,
      headers: {
        Accept: "application/json",
      },
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorText = await response.text().catch(() => "");
      console.error(
        "[getPlaceDetails] HTTP error:",
        response.status,
        errorText,
      );
      throw new Error(
        `Failed to fetch place details: HTTP ${response.status} ${errorText}`,
      );
    }

    const data = await response.json();
    console.log("[getPlaceDetails] API response status:", data.status);

    if (data.status !== "OK" || !data.result) {
      const errorMessage =
        data.error_message ||
        `Place details request failed with status ${data.status}`;
      console.error("[getPlaceDetails] API error:", errorMessage, {
        status: data.status,
        place_id: params.placeId,
      });
      throw new Error(errorMessage);
    }

    const result = data.result;
    const normalizedReviews: PlaceReviewSummary[] | undefined = Array.isArray(
      result.reviews,
    )
      ? result.reviews.map((review: any) => ({
          author_name: review.author_name,
          rating: review.rating,
          text: review.text,
          relative_time_description: review.relative_time_description,
          time: review.time,
          profile_photo_url: review.profile_photo_url,
        }))
      : undefined;

    console.log(
      "[getPlaceDetails] Successfully fetched details for:",
      params.placeId,
    );

    const placeDetailsResult: PlaceDetailsResult = {
      place_id: result.place_id ?? params.placeId,
      name: result.name,
      formatted_address: result.formatted_address,
      rating: result.rating,
      user_ratings_total: result.user_ratings_total,
      price_level: result.price_level,
      types: result.types,
      opening_hours: result.opening_hours,
      current_opening_hours: result.current_opening_hours,
      website: result.website,
      formatted_phone_number: result.formatted_phone_number,
      international_phone_number: result.international_phone_number,
      geometry: result.geometry,
      photos: result.photos?.map(mapPlacePhoto),
      reviews: normalizedReviews,
      business_status: result.business_status,
      _fields: fieldsParam,
      _fieldsArray: fieldsArray,
      requestParams: requestParams.toString(),
    };

    // Cache the result
    apiCache.set(cacheKey, placeDetailsResult, CACHE_TTL.PLACE_DETAILS);

    return placeDetailsResult;
  } catch (error) {
    clearTimeout(timeoutId);
    if (error instanceof Error && error.name === "AbortError") {
      console.error(
        "[getPlaceDetails] Request timed out for place_id:",
        params.placeId,
      );
      throw new Error("Place details request timed out");
    }
    console.error("[getPlaceDetails] Error fetching place details:", error, {
      place_id: params.placeId,
    });
    throw error;
  }
}

function mapPlacePhoto(photo: any): PlacePhotoSummary {
  return {
    photo_reference: photo.photo_reference,
    height: photo.height,
    width: photo.width,
  };
}

export class FunctionExecutor {
  private static instance: FunctionExecutor;
  private currentLocation?: { lat: number; lng: number };

  // Timeout configuration (imported from constants if available)
  private readonly TOOL_TIMEOUT = 8000; // 8 seconds

  static getInstance(): FunctionExecutor {
    if (!FunctionExecutor.instance) {
      FunctionExecutor.instance = new FunctionExecutor();
    }
    return FunctionExecutor.instance;
  }

  public setCurrentLocation(location?: { lat: number; lng: number }): void {
    this.currentLocation = location;
  }

  async executeFunction(
    functionName: string,
    parameters: Record<string, unknown>,
  ): Promise<FunctionResult> {
    console.log(`[FunctionExecutor] Executing ${functionName}`, {
      timeout: this.TOOL_TIMEOUT,
    });

    // Timeout promise
    const timeoutPromise = new Promise<FunctionResult>((_, reject) =>
      setTimeout(
        () => reject(new Error(`Tool execution timeout: ${functionName}`)),
        this.TOOL_TIMEOUT
      )
    );

    try {
      // Race between actual execution and timeout
      const result = await Promise.race([
        this.executeInternal(functionName, parameters),
        timeoutPromise,
      ]);

      return result;
    } catch (error) {
      console.error(`[FunctionExecutor] Error executing ${functionName}:`, error);

      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
        data: {
          errorType:
            error instanceof Error && error.message.includes("timeout")
              ? "TIMEOUT"
              : "EXECUTION_ERROR",
        },
      };
    }
  }

  private async executeInternal(
    functionName: string,
    parameters: Record<string, unknown>,
  ): Promise<FunctionResult> {
    switch (functionName) {
      case "search_places":
        return this.handleSearchPlaces(parameters);
      case "get_place_details":
        return this.handleGetPlaceDetails(parameters);
      default:
        return { success: false, error: `Unknown function: ${functionName}` };
    }
  }

  private async handleSearchPlaces(
    parameters: Record<string, unknown>,
  ): Promise<FunctionResult<SearchPlaceResult>> {
    try {
      const allowExtendedRadius =
        typeof parameters.allow_extended_radius === "boolean"
          ? parameters.allow_extended_radius
          : typeof parameters.allowExtendedRadius === "boolean"
            ? parameters.allowExtendedRadius
            : false;

      // AIが位置情報を渡さない場合、コンテキストから取得
      const DEFAULT_RADIUS_METERS = 500;
      const userLat =
        typeof parameters.user_lat === "number"
          ? parameters.user_lat
          : this.currentLocation?.lat;
      const userLng =
        typeof parameters.user_lng === "number"
          ? parameters.user_lng
          : this.currentLocation?.lng;

      // 位置情報がない場合は検索を実行しない（サーバー位置に基づく不正確な結果を防ぐ）
      if (userLat === undefined || userLng === undefined) {
        console.warn(
          "[handleSearchPlaces] No location information available. Returning empty results to prevent server-biased searches.",
          {
            hasUserLat: typeof parameters.user_lat === "number",
            hasUserLng: typeof parameters.user_lng === "number",
            hasCurrentLocation: !!this.currentLocation,
            query: String(parameters.query),
          },
        );
        return {
          success: true,
          data: {
            results: [],
            totalResults: 0,
            hasMore: false,
            query: String(parameters.query),
            status: "ZERO_RESULTS",
            errorMessage:
              "Location information required for search. Please enable location access.",
          },
        };
      }

      // radiusMetersも、AIが渡さない場合はデフォルト値を使用
      const radiusMeters =
        typeof parameters.radiusMeters === "number"
          ? parameters.radiusMeters
          : typeof parameters.radius === "number"
            ? parameters.radius
            : DEFAULT_RADIUS_METERS;

      const result = await searchPlaces({
        query: String(parameters.query),
        userLat,
        userLng,
        radiusMeters,
        language:
          typeof parameters.language === "string" ? parameters.language : "en", // Default to English for place names
        region:
          typeof parameters.region === "string" ? parameters.region : undefined,
        allowExtendedRadius,
      });

      return { success: true, data: result };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  private async handleGetPlaceDetails(
    parameters: Record<string, unknown>,
  ): Promise<FunctionResult<PlaceDetailsResult>> {
    try {
      console.log("[handleGetPlaceDetails] Received parameters:", {
        has_place_id: "place_id" in parameters,
        has_placeId: "placeId" in parameters,
        place_id_type: typeof parameters.place_id,
        placeId_type: typeof (parameters as { placeId?: unknown }).placeId,
        parameters_keys: Object.keys(parameters),
      });

      const placeIdFromSnake =
        typeof parameters.place_id === "string" &&
        parameters.place_id.trim().length > 0
          ? parameters.place_id.trim()
          : undefined;
      const placeIdAliasCandidate = (parameters as { placeId?: unknown })
        .placeId;
      const placeIdFromCamel =
        typeof placeIdAliasCandidate === "string" &&
        placeIdAliasCandidate.trim().length > 0
          ? placeIdAliasCandidate.trim()
          : undefined;
      const rawPlaceId = placeIdFromSnake ?? placeIdFromCamel;

      console.log("[handleGetPlaceDetails] Extracted place_id:", {
        fromSnake: placeIdFromSnake,
        fromCamel: placeIdFromCamel,
        final: rawPlaceId,
      });

      if (!rawPlaceId) {
        console.error(
          "[handleGetPlaceDetails] Missing place_id in parameters:",
          parameters,
        );
        return {
          success: false,
          error:
            'place_id is required for place details. Please provide either "place_id" or "placeId" parameter.',
        };
      }

      const result = await getPlaceDetails({
        placeId: rawPlaceId,
        fields: Array.isArray(parameters.fields)
          ? (parameters.fields as unknown[]).map(String)
          : undefined,
        language:
          typeof parameters.language === "string"
            ? (parameters.language as string)
            : "en", // Default to English for place names
        region:
          typeof parameters.region === "string"
            ? (parameters.region as string)
            : undefined,
      });

      console.log("[handleGetPlaceDetails] Successfully fetched place details");
      return { success: true, data: result };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      console.error("[handleGetPlaceDetails] Error:", errorMessage, error);
      return {
        success: false,
        error: errorMessage,
      };
    }
  }
}
