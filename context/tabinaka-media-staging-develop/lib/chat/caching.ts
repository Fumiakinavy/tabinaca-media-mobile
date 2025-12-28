/**
 * Chat API caching utilities
 * Extracted from send-message.ts for better organization
 */

import type { PlaceSummary } from "@/lib/functionRegistry";
import { addAffiliateExperiencesToPlaces } from "@/lib/affiliatePlaces";
import { apiCache, generateCacheKey, CACHE_TTL } from "@/lib/cache";
import type { ValidatedChatContext } from "./validation";

export interface CachedChatResponse {
  response: string;
  places: PlaceSummary[];
  functionResults: Array<{ function: string; input?: unknown; result: any }>;
}

/**
 * Check if query is recommendation-based (should skip cache)
 */
export function isRecommendationQuery(message: string): boolean {
  return /おすすめ|探して|教えて|search|find|recommend/i.test(message);
}

/**
 * Generate cache key for chat response
 */
export function generateChatCacheKey(
  message: string,
  accountId: string,
  travelTypeCode: string,
  locationKey: string
): string {
  return generateCacheKey.chatResponse(
    message,
    accountId || "anonymous",
    travelTypeCode,
    locationKey
  );
}

/**
 * Get cached chat response if available
 */
export function getCachedChatResponse(cacheKey: string): CachedChatResponse | null {
  return apiCache.get<CachedChatResponse>(cacheKey);
}

/**
 * Cache chat response
 */
export function setCachedChatResponse(
  cacheKey: string,
  response: string,
  places: PlaceSummary[],
  functionResults: Array<{ function: string; input?: unknown; result: any }>
): void {
  if (response) {
    apiCache.set(cacheKey, { response, places, functionResults }, CACHE_TTL.CHAT_RESPONSE);
  }
}

/**
 * Process cached response and send via SSE
 */
export async function processCachedResponse(
  cachedResponse: CachedChatResponse,
  sseChannel: any
): Promise<void> {
  // Add affiliates to cached places
  const cachedPlacesWithAffiliates = addAffiliateExperiencesToPlaces(
    cachedResponse.places,
    { logPrefix: "send-message" }
  );

  // Return cached response
  await sseChannel.write({
    type: "content",
    content: cachedResponse.response,
  });
  await sseChannel.write({
    type: "metadata",
    places: cachedPlacesWithAffiliates,
    functionResults: cachedResponse.functionResults,
  });
  await sseChannel.write({ type: "done" });
}
