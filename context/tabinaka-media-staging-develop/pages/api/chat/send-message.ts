import { NextApiRequest, NextApiResponse } from "next";
import { handleCorsPreflightRequest, setCorsHeaders } from "@/lib/cors";

// Extracted modules
import { validateAndAuthenticateChatRequest } from "@/lib/chat/validation";
import {
  isRecommendationQuery,
  generateChatCacheKey,
  getCachedChatResponse,
  setCachedChatResponse,
  processCachedResponse,
} from "@/lib/chat/caching";
import { runAIConversation } from "@/lib/chat/model";
import {
  createSSEChannel,
  streamFinalResponse,
  sendFinalMetadata,
} from "@/lib/chat/streaming";
import {
  addAffiliateExperiencesToPlaces,
  type AffiliatePlace,
} from "@/lib/affiliatePlaces";
import { apiCache, generateCacheKey, CACHE_TTL } from "@/lib/cache";
import { handleCorsPreflightRequest, setCorsHeaders } from "@/lib/cors";
import { fetchChatSessionById } from "@/lib/server/chatSessions";
import { initSSE } from "@/lib/sse";
import { getWeatherRecommendation } from "@/lib/weather";
import { fetchWeatherDataServer } from "@/lib/weatherServer";

// Types
interface ChatRequest {
  message: string;
  conversationHistory?: { role: "user" | "assistant"; content: string }[];
  userId?: string;
  sessionId?: string;
  currentLocation?: {
    lat: number;
    lng: number;
    permission?: boolean;
  };
  displayedCards?: Array<{
    place_id: string;
    name: string;
    formatted_address?: string;
    rating?: number;
    user_ratings_total?: number;
    price_level?: number;
    types?: string[];
    distance_m?: number;
    clicked?: boolean;
    displayedAt?: string;
  }>;
  quizResults?: {
    recommendation?: any;
    places?: any[];
    timestamp?: number;
    travelType?: {
      travelTypeCode: string;
      travelTypeName?: string;
      travelTypeEmoji?: string;
      travelTypeDescription?: string;
      locationLat?: number;
      locationLng?: number;
      locationPermission?: boolean;
    };
    answers?: {
      walkingTolerance?: string;
      dietaryPreferences?: string[];
      languageComfort?: string[];
      photoSubjects?: string[];
      origin?: string;
    };
  };
  homeDurationPreference?: "under15" | "15-30" | "30-60" | "60+";
}

interface ToolUseBlock {
  type: "tool_use";
  id: string;
  name: string;
  input: Record<string, unknown>;
}

interface TextBlock {
  type: "text";
  text: string;
}

interface ToolResultBlock {
  type: "tool_result";
  tool_use_id: string;
  content: string;
}

type ContentBlock = ToolUseBlock | TextBlock | ToolResultBlock;

interface ClaudeMessage {
  role: "user" | "assistant";
  content: string | ContentBlock[];
}

// Bedrock configuration
const BEDROCK_MODEL =
  process.env.AWS_BEDROCK_MODEL_ID ||
  "us.anthropic.claude-3-haiku-20240307-v1:0";
const BEDROCK_REGION = process.env.AWS_BEDROCK_REGION || "us-east-1";

const bedrock = new BedrockRuntimeClient({
  region: BEDROCK_REGION,
  credentials:
    process.env.AWS_BEDROCK_ACCESS_KEY_ID &&
    process.env.AWS_BEDROCK_SECRET_ACCESS_KEY
      ? {
          accessKeyId: process.env.AWS_BEDROCK_ACCESS_KEY_ID,
          secretAccessKey: process.env.AWS_BEDROCK_SECRET_ACCESS_KEY,
          sessionToken: process.env.AWS_BEDROCK_SESSION_TOKEN,
        }
      : undefined,
});

// Convert FUNCTION_DEFINITIONS to Claude tool format
const CLAUDE_TOOLS = FUNCTION_DEFINITIONS.map((func) => ({
  name: func.name,
  description: func.description,
  input_schema: {
    type: "object",
    properties: func.parameters.properties,
    required: func.parameters.required || [],
  },
}));

// Constants
const MAX_TOOL_ITERATIONS = 2;

// Convert PromptMessage[] to Claude message format
function toClaudeMessages(promptMessages: PromptMessage[]): {
  system: string;
  messages: ClaudeMessage[];
} {
  let system = "";
  const messages: ClaudeMessage[] = [];

  for (const msg of promptMessages) {
    if (msg.role === "system") {
      system += (system ? "\n\n" : "") + msg.content;
    } else {
      messages.push({
        role: msg.role,
        content: msg.content,
      });
    }
  }

  return { system, messages };
}

// Check if response contains tool_use blocks
function extractToolUseBlocks(content: ContentBlock[]): ToolUseBlock[] {
  return content.filter(
    (block): block is ToolUseBlock => block.type === "tool_use",
  );
}

// Extract text content from response
function extractTextContent(content: ContentBlock[]): string {
  return content
    .filter((block): block is TextBlock => block.type === "text")
    .map((block) => block.text)
    .join("");
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  // CORS: プリフライトリクエストを処理
  if (handleCorsPreflightRequest(req, res)) {
    return;
  }
  setCorsHeaders(req, res);

  // Check Bedrock credentials
  if (
    !process.env.AWS_BEDROCK_ACCESS_KEY_ID ||
    !process.env.AWS_BEDROCK_SECRET_ACCESS_KEY
  ) {
    return res
      .status(500)
      .json({ error: "Bedrock credentials are not configured" });
  }

  try {
    // Validate and authenticate request
    const context = await validateAndAuthenticateChatRequest(req, res);

    // Initialize logging context
    const loggingContext = createLoggingContext(
      context.dbSessionId,
      context.accountId,
      context.message
    );

  // Log user message
    await logUserMessage(loggingContext);

  // Debug: Log request data first
  console.log("[send-message] Request data:", {
    hasCurrentLocation: !!currentLocation,
    currentLocation,
    hasQuizResults: !!quizResults,
    quizLocationLat: quizResults?.travelType?.locationLat,
    quizLocationLng: quizResults?.travelType?.locationLng,
  });

  // Determine effective location: prefer currentLocation, fallback to quiz location
    const effectiveLocation = context.currentLocation
      ? {
          lat: context.currentLocation.lat,
          lng: context.currentLocation.lng,
        }
      : undefined;

  // Debug: Log location information
  console.log("[send-message] Location debug:", {
    hasCurrentLocation: !!currentLocation,
    currentLocation: currentLocation
      ? {
          lat: currentLocation.lat,
          lng: currentLocation.lng,
          permission: currentLocation.permission,
        }
      : null,
    hasQuizLocation:
      quizResults?.travelType?.locationLat !== undefined &&
      quizResults?.travelType?.locationLng !== undefined,
    quizLocation: quizResults?.travelType
      ? {
          locationLat: quizResults.travelType.locationLat,
          locationLng: quizResults.travelType.locationLng,
          locationPermission: quizResults.travelType.locationPermission,
        }
      : null,
    effectiveLocation: effectiveLocation
      ? {
          lat: effectiveLocation.lat,
          lng: effectiveLocation.lng,
        }
      : null,
  });

  // Fetch weather information if location is available
  let weather = null;
  if (effectiveLocation) {
    console.log("[send-message] Fetching weather for location:", {
      lat: effectiveLocation.lat,
      lng: effectiveLocation.lng,
    });
    try {
      const weatherData = await fetchWeatherDataServer(
        effectiveLocation.lat,
        effectiveLocation.lng,
      );
      if (weatherData) {
        console.log("[send-message] Weather data fetched:", {
          temperature: weatherData.temperature,
          condition: weatherData.condition.main,
          description: weatherData.condition.description,
        });
        const recommendation = getWeatherRecommendation(weatherData);
        weather = {
          temperature: weatherData.temperature,
          feelsLike: weatherData.feelsLike,
          humidity: weatherData.humidity,
          condition: weatherData.condition,
          windSpeed: weatherData.windSpeed,
          visibility: weatherData.visibility,
          precipitation: weatherData.precipitation,
          clouds: weatherData.clouds,
          recommendation,
        };
        console.log("[send-message] Weather recommendation:", {
          activityType: recommendation.activityType,
          reason: recommendation.reason,
        });
      } else {
        console.log("[send-message] Weather data is null (API key might be missing)");
      }
    } catch (error) {
      console.error("[send-message] Failed to fetch weather:", error);
      // Continue without weather data
    }
  } else {
    console.log("[send-message] No location available, skipping weather fetch");
  }

  // Build prompt context with proper type conversions
  const promptContext = buildPromptContext({
    userMessage: message,
    conversationHistory,
    currentLocation: effectiveLocation,
    displayedCards: displayedCards?.map((card) => ({
      ...card,
      displayedAt: card.displayedAt ? new Date(card.displayedAt) : undefined,
    })),
    quizResults: quizResults
      ? {
          ...quizResults,
          travelType: quizResults.travelType
            ? {
                travelTypeCode: quizResults.travelType.travelTypeCode,
                travelTypeName: quizResults.travelType.travelTypeName ?? "",
                travelTypeEmoji: quizResults.travelType.travelTypeEmoji ?? "",
                travelTypeDescription:
                  quizResults.travelType.travelTypeDescription ?? "",
                locationLat: quizResults.travelType.locationLat,
                locationLng: quizResults.travelType.locationLng,
                locationPermission: quizResults.travelType.locationPermission,
              }
            : undefined,
        }
      : undefined,
    homeDurationPreference,
    weather,
  });

  // Check cache for non-recommendation queries
    const travelTypeCode = context.quizResults?.travelType?.travelTypeCode || "unknown";
  const locationKey = effectiveLocation
    ? `${effectiveLocation.lat.toFixed(4)},${effectiveLocation.lng.toFixed(4)}`
    : "no-location";
    const cacheKey = generateChatCacheKey(
      context.message,
      context.accountId,
    travelTypeCode,
      locationKey
  );

  // Skip cache for recommendation-type queries
    const isRecQuery = isRecommendationQuery(context.message);

    if (!isRecQuery) {
      const cachedResponse = getCachedChatResponse(cacheKey);
    if (cachedResponse) {
        const { sseChannel } = createSSEChannel(res);
        await processCachedResponse(cachedResponse, sseChannel);
    return res.end();
  }
  }

    // Setup FunctionExecutor with location
  const functionExecutor = FunctionExecutor.getInstance();
  if (effectiveLocation) {
    functionExecutor.setCurrentLocation({
      lat: effectiveLocation.lat,
      lng: effectiveLocation.lng,
    });
  }

  // Convert to Claude format
  const { system, messages: claudeMessages } = toClaudeMessages(
    promptContext.promptMessages,
  );

  // Debug: Log weather information in context
  console.log("[send-message] Weather in context:", {
    hasWeather: !!weather,
    weatherData: weather ? {
      temperature: weather.temperature,
      condition: weather.condition.main,
      recommendation: weather.recommendation.activityType,
    } : null,
  });
  
  // Debug: Check if weather is in system prompt
  if (system && weather) {
    const hasWeatherInPrompt = system.includes("weather") || system.includes("天気");
    console.log("[send-message] Weather in system prompt:", hasWeatherInPrompt);
    if (!hasWeatherInPrompt) {
      console.warn("[send-message] WARNING: Weather data exists but not found in system prompt!");
    }
  }

  // Collect results
  let places: PlaceSummary[] = [];
  const functionResults: Array<{ function: string; result: any }> = [];
  let finalResponse = "";

  const sseChannel = initSSE(res);

  // Track if we've already sent cards to avoid duplicates
  let cardsSent = false;

  const sendStatusUpdate = (payload: {
    id: string;
    state: "pending" | "success" | "error";
    label?: string;
  }): Promise<void> => sseChannel.sendStatus(payload);

  // Helper to send cards immediately with affiliates
  const sendCardsWithAffiliates = async (): Promise<void> => {
    if (cardsSent) {
      console.log("[send-message] Cards already sent, skipping");
      return;
    }
    if (places.length === 0) {
      console.log(
        "[send-message] No places found, skipping affiliate addition",
      );
      return;
    }

    cardsSent = true;

    // Run AI conversation with tool calling
    const { finalResponse, places, functionResults } = await runAIConversation(
      context,
      functionExecutor,
      sendStatusUpdate
    );

    // Log tool calls
    await logToolCalls(loggingContext, functionResults);

    // Send final response
    await streamFinalResponse(sseChannel, finalResponse, sendStatusUpdate);

    // Send final metadata
    await sendFinalMetadata(sseChannel, places, functionResults);

    // Log assistant message and session metrics
    await logAssistantMessageAndMetrics(
      loggingContext,
      finalResponse,
      places,
      functionResults
    );

    // Cache the response
    if (!isRecQuery && finalResponse) {
      setCachedChatResponse(cacheKey, finalResponse, places, functionResults);
    }

    return res.end();
  } catch (error) {
    console.error('[send-message] Unexpected error:', error);
    if (!res.headersSent) {
      return res.status(500).json({ error: 'Internal server error' });
    }
  }
}
