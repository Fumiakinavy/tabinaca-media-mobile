// Optimized API client with retry limits and error handling
import { apiCache, generateCacheKey, CACHE_TTL } from "./cache";
import { checkApiLimit } from "./apiLimiter";
import {
  shouldUseMockData,
  MOCK_PLACES,
  MOCK_PLACE_DETAILS,
  MOCK_REVIEWS,
} from "./mockData";

interface ApiResponse<T> {
  data: T;
  fromCache: boolean;
  fromMock: boolean;
}

class OptimizedApiClient {
  private maxRetries = 2; // Reduced from default 3
  private retryDelay = 1000; // 1 second

  async fetchWithRetry<T>(
    url: string,
    options: RequestInit = {},
    cacheKey?: string,
    ttl?: number,
  ): Promise<ApiResponse<T>> {
    // Check cache first
    if (cacheKey) {
      const cached = apiCache.get<T>(cacheKey);
      if (cached) {
        console.log("Using cached data for:", cacheKey);
        return { data: cached, fromCache: true, fromMock: false };
      }
    }

    // Check API limits
    if (!checkApiLimit(url)) {
      throw new Error("API rate limit exceeded. Please try again later.");
    }

    // Use mock data in development if enabled
    if (shouldUseMockData()) {
      console.log("Using mock data for:", url);
      return this.getMockData<T>(url);
    }

    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
      try {
        const response = await fetch(url, {
          ...options,
          headers: {
            "Content-Type": "application/json",
            ...options.headers,
          },
        });

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`HTTP ${response.status}: ${errorText}`);
        }

        const data = await response.json();

        // Cache successful responses
        if (cacheKey && ttl) {
          apiCache.set(cacheKey, data, ttl);
        }

        return { data, fromCache: false, fromMock: false };
      } catch (error) {
        lastError = error as Error;
        console.warn(`API call attempt ${attempt + 1} failed:`, error);

        if (attempt < this.maxRetries) {
          // Exponential backoff
          const delay = this.retryDelay * Math.pow(2, attempt);
          console.log(`Retrying in ${delay}ms...`);
          await new Promise((resolve) => setTimeout(resolve, delay));
        }
      }
    }

    throw lastError || new Error("API call failed after all retries");
  }

  private getMockData<T>(url: string): ApiResponse<T> {
    // Return appropriate mock data based on URL
    if (url.includes("textsearch")) {
      return {
        data: { results: MOCK_PLACES } as T,
        fromCache: false,
        fromMock: true,
      };
    }
    if (url.includes("details")) {
      return {
        data: { result: MOCK_PLACE_DETAILS } as T,
        fromCache: false,
        fromMock: true,
      };
    }
    if (url.includes("nearbysearch")) {
      return {
        data: { results: MOCK_PLACES } as T,
        fromCache: false,
        fromMock: true,
      };
    }

    return { data: MOCK_REVIEWS as T, fromCache: false, fromMock: true };
  }

  // Optimized Places API calls
  async searchPlaces(
    query: string,
    location?: string,
    radius?: string,
    type?: string,
  ): Promise<ApiResponse<any>> {
    const cacheKey = generateCacheKey.placesSearch(
      query,
      location,
      radius,
      type,
    );
    const url = this.buildPlacesSearchUrl(query, location, radius, type);

    return this.fetchWithRetry(url, {}, cacheKey, CACHE_TTL.PLACES_SEARCH);
  }

  async getPlaceDetails(
    placeId: string,
    fields?: string,
  ): Promise<ApiResponse<any>> {
    const cacheKey = generateCacheKey.placeDetails(placeId, fields);
    const url = this.buildPlaceDetailsUrl(placeId, fields);

    return this.fetchWithRetry(url, {}, cacheKey, CACHE_TTL.PLACE_DETAILS);
  }

  async getPlaceReviews(placeId: string): Promise<ApiResponse<any>> {
    const cacheKey = generateCacheKey.placeReviews(placeId);
    const url = this.buildPlaceReviewsUrl(placeId);

    return this.fetchWithRetry(url, {}, cacheKey, CACHE_TTL.PLACE_REVIEWS);
  }

  private buildPlacesSearchUrl(
    query: string,
    location?: string,
    radius?: string,
    type?: string,
  ): string {
    const apiKey = process.env.GOOGLE_PLACES_API_KEY_SERVER;
    if (!apiKey) throw new Error("API key not configured");

    const params = new URLSearchParams({
      query,
      key: apiKey,
      language: "en",
      region: "jp",
      location: location || "35.6812,139.7671",
      radius: radius || "5000",
    });

    if (type) params.append("type", type);

    return `https://maps.googleapis.com/maps/api/place/textsearch/json?${params}`;
  }

  private buildPlaceDetailsUrl(placeId: string, fields?: string): string {
    const apiKey = process.env.GOOGLE_PLACES_API_KEY_SERVER;
    if (!apiKey) throw new Error("API key not configured");

    const defaultFields =
      "name,formatted_address,rating,user_ratings_total,photos,opening_hours,reviews,price_level,types,website,formatted_phone_number";
    const fieldsToRetrieve = fields || defaultFields;

    return `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&fields=${fieldsToRetrieve}&key=${apiKey}`;
  }

  private buildPlaceReviewsUrl(placeId: string): string {
    const apiKey = process.env.GOOGLE_PLACES_API_KEY_SERVER;
    if (!apiKey) throw new Error("API key not configured");

    return `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&fields=rating,user_ratings_total,reviews&language=en&region=jp&key=${apiKey}`;
  }
}

export const apiClient = new OptimizedApiClient();
