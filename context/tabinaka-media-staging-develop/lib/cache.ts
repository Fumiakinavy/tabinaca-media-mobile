// Simple in-memory cache for API responses
interface CacheItem<T> {
  data: T;
  timestamp: number;
  ttl: number; // Time to live in milliseconds
}

class ApiCache {
  private cache = new Map<string, CacheItem<any>>();
  private maxSize = 1000; // Maximum number of cached items

  set<T>(key: string, data: T, ttlMinutes: number = 60): void {
    // Remove oldest items if cache is full
    if (this.cache.size >= this.maxSize) {
      const oldestKey = this.cache.keys().next().value;
      if (oldestKey) {
        this.cache.delete(oldestKey);
      }
    }

    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl: ttlMinutes * 60 * 1000, // Convert minutes to milliseconds
    });
  }

  get<T>(key: string): T | null {
    const item = this.cache.get(key);

    if (!item) {
      return null;
    }

    // Check if item has expired
    if (Date.now() - item.timestamp > item.ttl) {
      this.cache.delete(key);
      return null;
    }

    return item.data as T;
  }

  has(key: string): boolean {
    const item = this.cache.get(key);
    return item ? Date.now() - item.timestamp <= item.ttl : false;
  }

  delete(key: string): boolean {
    return this.cache.delete(key);
  }

  clear(): void {
    this.cache.clear();
  }

  // Get cache statistics
  getStats() {
    return {
      size: this.cache.size,
      maxSize: this.maxSize,
      keys: Array.from(this.cache.keys()),
    };
  }
}

// Global cache instance
export const apiCache = new ApiCache();

// Cache key generators
export const generateCacheKey = {
  placesSearch: (
    query: string,
    location?: string,
    radius?: string,
    type?: string,
  ) =>
    `places_search:${query}:${location || "default"}:${radius || "5000"}:${type || "all"}`,

  placeDetails: (placeId: string, fields?: string) =>
    `place_details:${placeId}:${fields || "default"}`,

  placeReviews: (placeId: string) => `place_reviews:${placeId}`,

  geocode: (address: string) => `geocode:${address}`,

  nearbySearch: (location: string, radius: number, type: string) =>
    `nearby_search:${location}:${radius}:${type}`,

  chatResponse: (
    message: string,
    userId: string,
    quizResults: string,
    location: string,
  ) =>
    `chat_response:${userId}:${Buffer.from(message).toString("base64").substring(0, 50)}:${Buffer.from(quizResults).toString("base64").substring(0, 20)}:${location}`,
};

// Cache TTL settings (in minutes)
export const CACHE_TTL = {
  PLACES_SEARCH: 60, // 1 hour
  PLACE_DETAILS: 24 * 60, // 24 hours
  PLACE_REVIEWS: 24 * 60, // 24 hours
  GEOCODE: 7 * 24 * 60, // 7 days
  NEARBY_SEARCH: 30, // 30 minutes
  CHAT_RESPONSE: 15, // 15 minutes
} as const;
