/**
 * Chat streaming utilities
 * Extracted from send-message.ts for better organization
 */

import { initSSE } from "@/lib/sse";
import { addAffiliateExperiencesToPlaces, type AffiliatePlace } from "@/lib/affiliatePlaces";
import type { PlaceSummary } from "@/lib/functionRegistry";
import type { NextApiResponse } from "next";

export interface StreamingContext {
  places: PlaceSummary[];
  functionResults: Array<{ function: string; input?: unknown; result: any }>;
}

/**
 * Initialize SSE channel and send status updates
 */
export function createSSEChannel(res: NextApiResponse) {
  const sseChannel = initSSE(res);

  const sendStatusUpdate = (payload: {
    id: string;
    state: "pending" | "success" | "error";
    label?: string;
  }): Promise<void> => sseChannel.sendStatus(payload);

  return { sseChannel, sendStatusUpdate };
}

/**
 * Send cards with affiliate information
 */
export async function sendCardsWithAffiliates(
  sseChannel: any,
  places: PlaceSummary[],
  sendStatusUpdate: (payload: any) => Promise<void>
): Promise<void> {
  await sendStatusUpdate({
    id: "send_cards",
    state: "pending",
    label: "Preparing cards...",
  });

  console.log("[send-message] Adding affiliates to places:", {
    placesCount: places.length,
  });

  const placesWithAffiliates = addAffiliateExperiencesToPlaces(places, {
    logPrefix: "send-message",
  });

  const affiliateCount = placesWithAffiliates.filter(
    (p) => (p as AffiliatePlace).isAffiliate,
  ).length;

  console.log("[send-message] Places with affiliates:", {
    originalPlacesCount: places.length,
    totalPlacesCount: placesWithAffiliates.length,
    affiliateCount: affiliateCount,
    affiliateIds: placesWithAffiliates
      .filter((p) => (p as AffiliatePlace).isAffiliate)
      .map((p) => p.place_id),
  });

  const cardsPayload = {
    type: "cards",
    places: placesWithAffiliates.slice(0, 20),
    updatedCards: placesWithAffiliates.map((p) => ({
      place_id: p.place_id,
      name: p.name,
      formatted_address: p.formatted_address,
      rating: p.rating,
      user_ratings_total: p.user_ratings_total,
      price_level: p.price_level,
      types: p.types,
      distance_m: p.distance_m,
      affiliateUrl: (p as AffiliatePlace).affiliateUrl,
      price: (p as AffiliatePlace).price,
      duration: (p as AffiliatePlace).duration,
      isAffiliate: (p as AffiliatePlace).isAffiliate,
      imageUrl: (p as AffiliatePlace).imageUrl,
    })),
  };

  console.log("[send-message] 🚀 Sending cards immediately:", {
    placesCount: placesWithAffiliates.length,
    affiliateCount: affiliateCount,
    timestamp: new Date().toISOString(),
  });

  // Write cards data and flush
  await sseChannel.write(cardsPayload);

  await sendStatusUpdate({
    id: "send_cards",
    state: "success",
    label: "Cards ready",
  });
}

/**
 * Stream final response with chunking
 */
export async function streamFinalResponse(
  sseChannel: any,
  finalResponse: string,
  sendStatusUpdate: (payload: any) => Promise<void>
): Promise<void> {
  if (!finalResponse) return;

  await sendStatusUpdate({
    id: "compose_response",
    state: "pending",
    label: "Composing response...",
  });

  // Stream in chunks with delay for visible streaming effect
  const chunkSize = 120;
  const delayMs = 0;

  for (let i = 0; i < finalResponse.length; i += chunkSize) {
    const chunk = finalResponse.slice(i, i + chunkSize);
    await sseChannel.write({
      type: "content",
      content: chunk,
    });

    // Flush and add delay between chunks for streaming effect
    if (delayMs > 0 && i + chunkSize < finalResponse.length) {
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }

  await sendStatusUpdate({
    id: "compose_response",
    state: "success",
    label: "Response ready",
  });
}

/**
 * Send final metadata
 */
export async function sendFinalMetadata(
  sseChannel: any,
  places: PlaceSummary[],
  functionResults: Array<{ function: string; input?: unknown; result: any }>
): Promise<void> {
  // Get final places with affiliates for metadata
  const placesWithAffiliates = addAffiliateExperiencesToPlaces(places, {
    logPrefix: "send-message",
  });

  // Send final metadata
  await sseChannel.write({
    type: "metadata",
    places: placesWithAffiliates.slice(0, 12),
    functionResults,
    updatedCards: placesWithAffiliates.map((p) => ({
      place_id: p.place_id,
      name: p.name,
      formatted_address: p.formatted_address,
      rating: p.rating,
      user_ratings_total: p.user_ratings_total,
      price_level: p.price_level,
      types: p.types,
      distance_m: p.distance_m,
      affiliateUrl: (p as AffiliatePlace).affiliateUrl,
      price: (p as AffiliatePlace).price,
      duration: (p as AffiliatePlace).duration,
      isAffiliate: (p as AffiliatePlace).isAffiliate,
      imageUrl: (p as AffiliatePlace).imageUrl,
    })),
  });

  await sseChannel.write({ type: "done" });
}
