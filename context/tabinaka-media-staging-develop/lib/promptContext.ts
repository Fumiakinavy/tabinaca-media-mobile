import {
  generateDynamicContextInfo,
  UserContext,
} from "./flexibleSystemPrompt";
import {
  buildConversationContext,
  type ConversationMessage,
} from "./conversationMemory";
import {
  getSystemPromptForTravelType,
  isValidTravelTypeCode,
} from "./travelTypeMapping";
import {
  classifyIntent as classifyIntentWithAI,
  classifyIntentWithRegex,
  type IntentLabel,
} from "./intentClassifier";

export type ChatHistoryMessage = ConversationMessage;

export interface PromptMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface PromptContextParams {
  userMessage: string;
  conversationHistory?: Array<{ role: "user" | "assistant"; content: string }>;
  currentLocation?: UserContext["currentLocation"];
  displayedCards?: UserContext["displayedCards"];
  quizResults?: UserContext["quizResults"];
  homeDurationPreference?: UserContext["homeDurationPreference"];
  weather?: UserContext["weather"];
}

export interface PromptContextResult {
  userContext: UserContext;
  promptMessages: PromptMessage[];
  systemPrompt: string;
  dynamicContext: string;
  historySummary: string | null;
  conversationLength: number;
}

const SYSTEM_PROMPT_FALLBACK =
  "You are an AI travel partner assisting people exploring their current location. Stay on the current thread using CONVERSATION_SUMMARY and CONTEXT_JSON, and only call tools when they improve the answer.";

// Feature flag for AI-powered intent classification
const USE_AI_INTENT_CLASSIFICATION =
  process.env.USE_AI_INTENT_CLASSIFICATION !== "false"; // Default to true

/**
 * Intent classification patterns (configurable and extensible)
 * These patterns are used as hints, but the main classification
 * is based on structural and semantic analysis
 */
const INTENT_PATTERNS = {
  details: {
    // Keywords that suggest user wants more information about something
    keywords: [
      /詳しく|詳細|review|口コミ|営業時間|住所|アクセス|予約|price|料金|電話|メニュー|menu|hours|address|phone/i,
    ],
    // Structural patterns: questions about specific attributes
    questionPatterns: [
      /(?:営業時間|開店|閉店|何時|when|hours?)/i,
      /(?:住所|場所|どこ|where|address|location)/i,
      /(?:電話|連絡|contact|phone)/i,
      /(?:料金|価格|いくら|price|cost|fee)/i,
      /(?:メニュー|menu|food|drink)/i,
      /(?:レビュー|口コミ|評価|review|rating)/i,
    ],
    // Reference patterns: referring to something already mentioned
    referencePatterns: [
      /(?:それ|そこ|あれ|これ|その|この|あの)/,
      /(?:1つ目|2つ目|最初|最後|上|下)/,
      /(?:that|this|the|it|first|last|top|bottom)/i,
    ],
  },
  inspiration: {
    // Keywords that suggest broad, exploratory queries
    keywords: [
      /アイデア|なんか|ざっくり|気分|mood|idea|suggest|recommend|何か|something|anything/i,
    ],
    // Structural patterns: vague or open-ended questions
    questionPatterns: [
      /(?:何か|なんか|何|what|anything|something)/i,
      /(?:おすすめ|推薦|suggest|recommend)/i,
      /(?:気分|mood|feel|feeling)/i,
      /(?:アイデア|idea|ideas)/i,
    ],
    // Length and structure: short, vague messages
    minLength: 3,
    maxLength: 50,
  },
  specific: {
    // Keywords that suggest concrete, specific queries
    keywords: [
      /ラーメン|寿司|焼肉|カフェ|レストラン|バー|ランチ|ディナー|カレー|スイーツ|飲み|activity|experience|探して|おすすめ|探す|find|search|look for/i,
    ],
    // Structural patterns: specific entity mentions
    entityPatterns: [
      /(?:ラーメン|ramen|sushi|寿司|焼肉|yakiniku)/i,
      /(?:カフェ|cafe|coffee|レストラン|restaurant)/i,
      /(?:バー|bar|居酒屋|izakaya)/i,
      /(?:ランチ|lunch|ディナー|dinner|breakfast)/i,
      /(?:スイーツ|sweets|dessert|デザート)/i,
    ],
  },
} as const;

/**
 * Classify intent - tries AI classification first, falls back to regex
 * @deprecated Use classifyIntentAsync instead for better accuracy
 */
function classifyIntentSync(message: string): {
  label: IntentLabel;
  reason: string;
} {
  // Synchronous fallback - use regex-based classification
  const result = classifyIntentWithRegex(message);
  return {
    label: result.label,
    reason: result.reason,
  };
}

/**
 * Async intent classification using AI (preferred method)
 */
async function classifyIntentAsync(
  message: string,
  conversationHistory?: ConversationMessage[]
): Promise<{
  label: IntentLabel;
  reason: string;
  method?: string;
}> {
  if (USE_AI_INTENT_CLASSIFICATION) {
    try {
      const result = await classifyIntentWithAI(message, conversationHistory);
      console.log("[classifyIntent] AI classification:", {
        label: result.label,
        reason: result.reason,
        method: result.method,
        confidence: result.confidence,
      });
      return {
        label: result.label,
        reason: result.reason,
        method: result.method,
      };
    } catch (error) {
      console.warn("[classifyIntent] AI failed, using regex fallback");
      const result = classifyIntentWithRegex(message);
      return {
        label: result.label,
        reason: result.reason,
        method: "regex_fallback",
      };
    }
  } else {
    const result = classifyIntentWithRegex(message);
    return {
      label: result.label,
      reason: result.reason,
      method: "regex",
    };
  }
}

function sanitizeConversationHistory(
  history?: Array<{ role?: string; content?: unknown }>,
): ConversationMessage[] {
  if (!Array.isArray(history)) {
    return [];
  }

  return history
    .filter(
      (msg): msg is ConversationMessage =>
        Boolean(msg) &&
        (msg.role === "user" || msg.role === "assistant") &&
        typeof msg.content === "string",
    )
    .map((msg) => ({
      role: msg.role,
      content: msg.content,
    }));
}

function resolveBaseSystemPrompt(travelTypeCode?: string | null): string {
  if (!travelTypeCode || !isValidTravelTypeCode(travelTypeCode)) {
    return SYSTEM_PROMPT_FALLBACK;
  }
  return getSystemPromptForTravelType(travelTypeCode);
}

export async function buildPromptContext({
  userMessage,
  conversationHistory,
  currentLocation,
  displayedCards,
  quizResults,
  homeDurationPreference,
  weather,
}: PromptContextParams): PromptContextResult {
  const sanitizedHistory = sanitizeConversationHistory(conversationHistory);
  const { summary, recentMessages } =
    buildConversationContext(sanitizedHistory);

  // Use async AI-powered intent classification
  const intent = await classifyIntentAsync(userMessage, sanitizedHistory);

  const userContext: UserContext = {
    currentLocation,
    displayedCards: displayedCards?.map((card) => ({
      ...card,
      displayedAt: card.displayedAt ? new Date(card.displayedAt) : new Date(),
    })),
    quizResults,
    intent,
    homeDurationPreference,
    weather,
  };

  const baseSystemPrompt = resolveBaseSystemPrompt(
    quizResults?.travelType?.travelTypeCode,
  );
  const dynamicContextInfo = generateDynamicContextInfo(userContext);

  const systemMessages: PromptMessage[] = [
    {
      role: "system",
      content: `${baseSystemPrompt}\n\n${dynamicContextInfo}`,
    },
  ];

  if (weather) {
    systemMessages.push({
      role: "system",
      content: `WEATHER_CONTEXT:\n${formatWeatherForPrompt(weather)}`,
    });
  }

  if (summary) {
    systemMessages.push({
      role: "system",
      content: `CONVERSATION_SUMMARY:\n${summary}`,
    });
  }

  const promptMessages: PromptMessage[] = [
    ...systemMessages,
    ...recentMessages,
    {
      role: "user",
      content: userMessage,
    },
  ];

  return {
    userContext,
    promptMessages,
    systemPrompt: baseSystemPrompt,
    dynamicContext: dynamicContextInfo,
    historySummary: summary,
    conversationLength: sanitizedHistory.length,
  };
}
