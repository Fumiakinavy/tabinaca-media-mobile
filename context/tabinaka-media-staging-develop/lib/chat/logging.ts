/**
 * Chat logging utilities
 * Extracted from send-message.ts for better organization
 */

import { getChatLogger } from "@/lib/chatLogger";
import { supabaseServer } from "@/lib/supabaseServer";
import { inferSearchCategory } from "@/lib/searchCategory";
import { addAffiliateExperiencesToPlaces, type AffiliatePlace } from "@/lib/affiliatePlaces";
import type { PlaceSummary } from "@/lib/functionRegistry";
import type { ValidatedChatContext } from "./validation";

export interface LoggingContext {
  chatLogger: any;
  dbSessionId: string;
  accountId: string;
  message: string;
  startTime: number;
}

/**
 * Initialize logging context
 */
export function createLoggingContext(
  dbSessionId: string,
  accountId: string,
  message: string
): LoggingContext {
  return {
    chatLogger: getChatLogger(),
    dbSessionId,
    accountId,
    message,
    startTime: Date.now(),
  };
}

/**
 * Log user message
 */
export async function logUserMessage(
  loggingContext: LoggingContext
): Promise<void> {
  if (loggingContext.dbSessionId) {
    await loggingContext.chatLogger.logUserMessage(
      loggingContext.dbSessionId,
      loggingContext.message
    );
  }
}

/**
 * Log tool calls
 */
export async function logToolCalls(
  loggingContext: LoggingContext,
  functionResults: Array<{ function: string; input?: unknown; result: any }>
): Promise<void> {
  if (!loggingContext.dbSessionId) return;

  // Log tool calls after cards are sent (non-blocking)
  await Promise.all(
    functionResults.map(async ({ function: functionName, input, result }) => {
      try {
        await loggingContext.chatLogger.logToolCall(
          loggingContext.dbSessionId,
          functionName,
          input ?? {}, // input (if available)
          result
        );

        if (functionName === "search_places" && input && loggingContext.accountId) {
          const payload = input as {
            query?: string;
            radiusMeters?: number;
            radius?: number;
            userLat?: number;
            userLng?: number;
          };
          const radius =
            typeof payload.radiusMeters === "number"
              ? payload.radiusMeters
              : typeof payload.radius === "number"
                ? payload.radius
                : null;
          const location =
            typeof payload.userLat === "number" && typeof payload.userLng === "number"
              ? { lat: payload.userLat, lng: payload.userLng }
              : null;
          const hasResults =
            result?.success && Array.isArray(result?.data?.results)
              ? result.data.results.length > 0
              : null;

          const inferredCategory = inferSearchCategory(payload.query);

          await supabaseServer.from("search_queries").insert({
            account_id: loggingContext.accountId,
            session_id: loggingContext.dbSessionId,
            search_query: payload.query || "",
            search_source: "chat_tool",
            search_context: input,
            location,
            radius_meters: radius,
            inferred_category: inferredCategory,
            has_results: hasResults,
            results_count: Array.isArray(result?.data?.results)
              ? result.data.results.length
              : null,
            searched_at: new Date().toISOString(),
          });
        }
      } catch (error) {
        console.error(
          "[send-message] Failed to log tool call:",
          error,
        );
      }
    })
  );
}

/**
 * Log assistant message and session metrics
 */
export async function logAssistantMessageAndMetrics(
  loggingContext: LoggingContext,
  finalResponse: string,
  places: PlaceSummary[],
  functionResults: Array<{ function: string; input?: unknown; result: any }>
): Promise<void> {
  if (!loggingContext.dbSessionId) return;

  const latencyMs = Date.now() - loggingContext.startTime;

  // Save actual places data (with affiliates) so it can be restored when loading session
  // Include geometry and photos for map display
  const placesToSave = addAffiliateExperiencesToPlaces(places, {
    logPrefix: "send-message",
  }).slice(0, 12).map((p) => ({
    place_id: p.place_id,
    name: p.name,
    formatted_address: p.formatted_address,
    rating: p.rating,
    user_ratings_total: p.user_ratings_total,
    price_level: p.price_level,
    types: p.types,
    distance_m: p.distance_m,
    geometry: (p as PlaceSummary).geometry,
    photos: (p as PlaceSummary).photos,
    opening_hours: (p as PlaceSummary).opening_hours,
    affiliateUrl: (p as AffiliatePlace).affiliateUrl,
    price: (p as AffiliatePlace).price,
    duration: (p as AffiliatePlace).duration,
    isAffiliate: (p as AffiliatePlace).isAffiliate,
    imageUrl: (p as AffiliatePlace).imageUrl,
  }));

  console.log("[send-message] Saving places to session metadata:", {
    sessionId: loggingContext.dbSessionId,
    placesCount: placesToSave.length,
    placeNames: placesToSave.slice(0, 3).map((p) => p.name),
    hasGeometry: placesToSave.some((p) => p.geometry?.location),
  });

  await loggingContext.chatLogger.logAssistantMessage(
    loggingContext.dbSessionId,
    finalResponse,
    latencyMs,
    {
      places: placesToSave,
      functionResults: functionResults,
    },
  );

  // Update session metrics
  await loggingContext.chatLogger.updateSessionMetrics(
    loggingContext.dbSessionId,
    {
      totalMessages: 2,
      totalLatencyMs: latencyMs,
      functionsUsed: functionResults.map((f) => f.function),
      placesFound: places.length,
    },
  );

  // Set title if empty
  if (loggingContext.message.length > 0) {
    const title = loggingContext.message.slice(0, 50) + (loggingContext.message.length > 50 ? "..." : "");
    await loggingContext.chatLogger.setTitleIfEmpty(
      loggingContext.dbSessionId,
      title
    );
  }
}

/**
 * Log error
 */
export async function logError(
  loggingContext: LoggingContext,
  error: any,
  context?: any
): Promise<void> {
  if (loggingContext.dbSessionId) {
    await loggingContext.chatLogger.logError(
      loggingContext.dbSessionId,
      error,
      context || {
        message: loggingContext.message,
        iteration: "unknown",
      }
    );
  }
}
