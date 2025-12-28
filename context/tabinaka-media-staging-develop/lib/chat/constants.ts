/**
 * Chat model configuration constants
 * Central configuration for AI model settings, timeouts, and limits
 */

export const MODEL_CONFIG = {
  // Claude 3.5 Haiku (latest, fastest)
  HAIKU_3_5: "us.anthropic.claude-3-5-haiku-20241022-v1:0",

  // Claude 3 Haiku (legacy version)
  HAIKU_3: "us.anthropic.claude-3-haiku-20240307-v1:0",

  // Sonnet (for cases requiring higher accuracy)
  SONNET_3_5: "us.anthropic.claude-3-5-sonnet-20241022-v2:0",
} as const;

export const CHAT_CONFIG = {
  // Model selection
  DEFAULT_MODEL: MODEL_CONFIG.HAIKU_3_5,
  FALLBACK_MODEL: MODEL_CONFIG.HAIKU_3,

  // Tool calling
  MAX_TOOL_ITERATIONS: 3,
  TOOL_TIMEOUT_MS: 8000, // 8 seconds timeout for tool execution

  // Context management
  MAX_DISPLAYED_CARDS: 5, // Increased from 2 for better context
  MAX_CONVERSATION_TURNS: 4,
  TRUNCATE_LENGTH: 300, // Increased from 120 for better context retention

  // API configuration
  MAX_TOKENS: 1024,
  TEMPERATURE: 0.4,

  // Cache configuration
  CACHE_TTL_SECONDS: 300, // 5 minutes

  // Google Places API
  PLACES_API_TIMEOUT_MS: 5000, // 5 seconds timeout for Places API
} as const;

export type ModelId = typeof MODEL_CONFIG[keyof typeof MODEL_CONFIG];

/**
 * Get the optimal number of tool iterations based on intent
 */
export function getOptimalIterations(intent?: string): number {
  if (!intent) return CHAT_CONFIG.MAX_TOOL_ITERATIONS;

  switch (intent) {
    case "details":
      // Details requests: usually complete in 1-2 iterations
      return 2;

    case "specific":
      // Specific searches: up to 3 iterations
      return 3;

    case "inspiration":
      // Exploratory searches: up to 4 iterations (multiple search queries)
      return 4;

    case "clarify":
      // Clarification: up to 2 iterations (question + search)
      return 2;

    default:
      return CHAT_CONFIG.MAX_TOOL_ITERATIONS;
  }
}

/**
 * Get human-readable label for tool execution
 */
export function getToolLabel(name: string, input?: Record<string, unknown>): string {
  if (name === "search_places") {
    const query = (input?.query as string) || "places";
    return `🔍 Searching: "${query}"`;
  }
  if (name === "get_place_details") {
    return `📍 Getting place details`;
  }
  return `🔧 ${name}`;
}
