/**
 * Rich, dynamic status messages for chat processing
 * Provides context-aware feedback to users during AI conversation
 */

import type { IntentLabel } from "@/lib/intentClassifier";

/**
 * Generate dynamic status message based on intent
 */
export function getAnalysisMessage(intent: IntentLabel, message: string): string {
  const shortMessage = message.length > 30 ? `${message.slice(0, 30)}...` : message;

  switch (intent) {
    case "inspiration":
      return `✨ Looking for inspiration based on your interests...`;
    case "specific":
      return `🔍 Understanding your search: "${shortMessage}"`;
    case "details":
      return `📋 Getting detailed information for you...`;
    case "clarify":
      return `💭 Analyzing your request...`;
    default:
      return `🤔 Processing your message...`;
  }
}

/**
 * Generate dynamic model call message
 */
export function getModelCallMessage(intent: IntentLabel, iteration: number): string {
  if (iteration === 1) {
    switch (intent) {
      case "inspiration":
        return `🎨 Thinking of diverse options that match your vibe...`;
      case "specific":
        return `🧠 Finding the best matches for your request...`;
      case "details":
        return `📚 Gathering comprehensive information...`;
      case "clarify":
        return `💬 Preparing a clarifying question...`;
      default:
        return `🤖 AI is thinking...`;
    }
  } else {
    return `🔄 Refining results (step ${iteration})...`;
  }
}

/**
 * Generate dynamic tool execution message
 */
export function getToolExecutionMessage(
  toolName: string,
  input: Record<string, unknown>,
  intent?: IntentLabel
): string {
  if (toolName === "search_places") {
    const query = input.query as string;
    const radius = input.radiusMeters as number | undefined;

    // Extract key terms from query
    const queryTerms = extractKeyTerms(query);

    if (intent === "inspiration") {
      return `🌟 Exploring ${queryTerms} in your area...`;
    } else {
      const radiusText = radius
        ? ` (within ${Math.round(radius)}m)`
        : "";
      return `🔍 Searching for ${queryTerms}${radiusText}`;
    }
  }

  if (toolName === "get_place_details") {
    return `📍 Loading detailed information and reviews...`;
  }

  return `🔧 ${toolName}`;
}

/**
 * Generate success message with results
 */
export function getToolSuccessMessage(
  toolName: string,
  input: Record<string, unknown>,
  duration: number,
  result?: any
): string {
  if (toolName === "search_places") {
    const query = input.query as string;
    const queryTerms = extractKeyTerms(query);
    const count = result?.data?.results?.length || 0;

    if (count === 0) {
      return `❌ No ${queryTerms} found nearby`;
    } else if (count === 1) {
      return `✓ Found 1 ${queryTerms} option (${duration}ms)`;
    } else {
      return `✓ Found ${count} ${queryTerms} options (${duration}ms)`;
    }
  }

  if (toolName === "get_place_details") {
    const hasReviews = result?.data?.reviews?.length > 0;
    if (hasReviews) {
      return `✓ Details loaded with ${result.data.reviews.length} reviews (${duration}ms)`;
    }
    return `✓ Details loaded (${duration}ms)`;
  }

  return `✓ Completed (${duration}ms)`;
}

/**
 * Generate final composition message
 */
export function getComposingMessage(intent: IntentLabel, hasPlaces: boolean): string {
  if (!hasPlaces) {
    switch (intent) {
      case "details":
        return `✍️ Preparing detailed answer...`;
      case "clarify":
        return `💬 Crafting response...`;
      default:
        return `✍️ Composing personalized recommendation...`;
    }
  }

  switch (intent) {
    case "inspiration":
      return `✨ Curating inspiring suggestions for you...`;
    case "specific":
      return `📝 Preparing your search results...`;
    case "details":
      return `📋 Formatting detailed information...`;
    default:
      return `✍️ Composing response...`;
  }
}

/**
 * Extract key terms from search query (simplified)
 */
function extractKeyTerms(query: string): string {
  // Remove common words and location phrases
  const cleaned = query
    .toLowerCase()
    .replace(/near|in|around|within|current location|my location|here/gi, "")
    .replace(/\d+\s*(m|km|meter|kilometer|min|minute|minutes|walk)/gi, "")
    .trim();

  // Extract main terms (first 2-3 words)
  const words = cleaned.split(/\s+/).filter(w => w.length > 2);
  const keyTerms = words.slice(0, 3).join(" ");

  return keyTerms || "places";
}

/**
 * Generate thinking/reasoning message
 */
export function getThinkingMessage(text: string, intent?: IntentLabel): string {
  const shortText = text.length > 50 ? `${text.slice(0, 50)}...` : text;

  switch (intent) {
    case "inspiration":
      return `💭 Considering: "${shortText}"`;
    case "specific":
      return `🎯 Planning: "${shortText}"`;
    case "details":
      return `📖 Analyzing: "${shortText}"`;
    default:
      return `💭 ${shortText}`;
  }
}

/**
 * Generate error message
 */
export function getToolErrorMessage(
  toolName: string,
  input: Record<string, unknown>,
  error: string
): string {
  if (toolName === "search_places") {
    const query = input.query as string;
    const queryTerms = extractKeyTerms(query);

    if (error.includes("timeout")) {
      return `⏱️ Search for ${queryTerms} timed out - retrying...`;
    }
    return `❌ Could not search for ${queryTerms}`;
  }

  if (toolName === "get_place_details") {
    if (error.includes("timeout")) {
      return `⏱️ Loading details timed out - retrying...`;
    }
    return `❌ Could not load place details`;
  }

  return `❌ ${toolName} failed`;
}

/**
 * Generate cache hit message (for debugging/info)
 */
export function getCacheHitMessage(cacheType: "intent" | "prompt" | "response"): string {
  switch (cacheType) {
    case "intent":
      return `⚡ Intent classification cached`;
    case "prompt":
      return `⚡ Using cached prompt (faster response)`;
    case "response":
      return `⚡ Found cached response (instant)`;
    default:
      return `⚡ Cache hit`;
  }
}

/**
 * Generate progress message with percentage
 */
export function getProgressMessage(
  currentStep: number,
  totalSteps: number,
  stepName: string
): string {
  const percentage = Math.round((currentStep / totalSteps) * 100);
  return `⏳ ${stepName}... (${percentage}%)`;
}

/**
 * Generate location-aware message
 */
export function getLocationMessage(
  hasLocation: boolean,
  locationName?: string
): string {
  if (hasLocation && locationName) {
    return `📍 Searching near ${locationName}...`;
  } else if (hasLocation) {
    return `📍 Searching near your current location...`;
  } else {
    return `🌍 Searching in your area...`;
  }
}

/**
 * Generate time-constraint aware message
 */
export function getTimeConstraintMessage(
  maxMinutes?: number,
  maxRadius?: number
): string {
  if (maxMinutes && maxRadius) {
    return `⏱️ Filtering for ~${maxMinutes}min walk (~${Math.round(maxRadius)}m)`;
  }
  return "";
}
