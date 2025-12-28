/**
 * AI-powered intent classification using lightweight Claude model
 * Falls back to regex-based classification if AI is unavailable
 */

import {
  BedrockRuntimeClient,
  InvokeModelCommand,
} from "@aws-sdk/client-bedrock-runtime";

// Intent types
export type IntentLabel = "inspiration" | "specific" | "details" | "clarify";

export interface IntentClassificationResult {
  label: IntentLabel;
  reason: string;
  method: "ai" | "regex" | "fallback";
  confidence?: number;
}

// Bedrock client (lightweight model for fast classification)
const BEDROCK_REGION = process.env.AWS_BEDROCK_REGION || "us-east-1";
const CLASSIFICATION_MODEL = "us.anthropic.claude-3-5-haiku-20241022-v1:0";

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

// Simple in-memory cache for intent classification (5 minutes TTL)
const intentCache = new Map<
  string,
  { result: IntentClassificationResult; timestamp: number }
>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

/**
 * Classify user intent using lightweight Claude model
 */
export async function classifyIntentWithAI(
  message: string,
  conversationHistory?: Array<{ role: "user" | "assistant"; content: string }>
): Promise<IntentClassificationResult> {
  if (!message || typeof message !== "string" || message.trim().length === 0) {
    return {
      label: "clarify",
      reason: "empty message",
      method: "fallback",
    };
  }

  // Check cache first
  const cacheKey = `intent:${message.trim().toLowerCase()}`;
  const cached = intentCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return { ...cached.result, reason: `${cached.result.reason} (cached)` };
  }

  try {
    // Build context from recent conversation
    const recentContext =
      conversationHistory && conversationHistory.length > 0
        ? conversationHistory
            .slice(-2) // Last 2 turns
            .map((msg) => `${msg.role === "user" ? "User" : "Assistant"}: ${msg.content.slice(0, 100)}`)
            .join("\n")
        : "No prior conversation";

    const classificationPrompt = `Classify the user's intent for this travel chat message.

Recent conversation:
${recentContext}

Current user message: "${message}"

Intent types:
- "inspiration": Vague, exploratory queries (e.g., "何かいいところない？", "おすすめは？", "what should I do?")
- "specific": Concrete searches (e.g., "カフェを探して", "find ramen near me", "show me museums")
- "details": Asking for more info about something already mentioned (e.g., "それの営業時間は？", "what's the address?", "1つ目の場所について")
- "clarify": Unclear intent or off-topic

Respond with ONLY the intent label (inspiration/specific/details/clarify) and a brief reason (max 10 words), formatted as:
intent: <label>
reason: <reason>`;

    const requestBody = JSON.stringify({
      anthropic_version: "bedrock-2023-05-31",
      messages: [
        {
          role: "user",
          content: classificationPrompt,
        },
      ],
      max_tokens: 50,
      temperature: 0,
    });

    const command = new InvokeModelCommand({
      modelId: CLASSIFICATION_MODEL,
      contentType: "application/json",
      body: requestBody,
    });

    const response = await bedrock.send(command);
    const responseBody = JSON.parse(new TextDecoder().decode(response.body));

    const content = responseBody.content?.[0]?.text || "";

    // Parse response
    const intentMatch = content.match(/intent:\s*(\w+)/i);
    const reasonMatch = content.match(/reason:\s*(.+?)(?:\n|$)/i);

    const label = intentMatch?.[1]?.toLowerCase() as IntentLabel | undefined;
    const reason = reasonMatch?.[1]?.trim() || "AI classification";

    // Validate label
    const validLabels: IntentLabel[] = [
      "inspiration",
      "specific",
      "details",
      "clarify",
    ];
    const finalLabel = validLabels.includes(label!)
      ? label!
      : "clarify";

    const result: IntentClassificationResult = {
      label: finalLabel,
      reason,
      method: "ai",
      confidence: validLabels.includes(label!) ? 0.9 : 0.5,
    };

    // Cache the result
    intentCache.set(cacheKey, { result, timestamp: Date.now() });

    // Clean old cache entries
    if (intentCache.size > 100) {
      const now = Date.now();
      for (const [key, value] of intentCache.entries()) {
        if (now - value.timestamp > CACHE_TTL) {
          intentCache.delete(key);
        }
      }
    }

    return result;
  } catch (error) {
    console.warn("[classifyIntentWithAI] Error, falling back to regex:", error);
    // Fall back to regex-based classification
    return classifyIntentWithRegex(message);
  }
}

/**
 * Regex-based intent classification (fallback)
 */
export function classifyIntentWithRegex(message: string): IntentClassificationResult {
  if (!message || typeof message !== "string") {
    return { label: "clarify", reason: "empty message", method: "regex" };
  }

  const text = message.trim();
  const lowerText = text.toLowerCase();

  // Details intent patterns
  const hasReference =
    /(?:それ|そこ|あれ|これ|その|この|あの|that|this|the|it|first|last|top|bottom|1つ目|2つ目|最初|最後|上|下)/.test(
      text
    );
  const hasDetailKeywords =
    /詳しく|詳細|review|口コミ|営業時間|住所|アクセス|予約|price|料金|電話|メニュー|menu|hours|address|phone/.test(
      lowerText
    );
  const hasQuestionMark = text.includes("?") || text.includes("？");

  if (hasReference && (hasDetailKeywords || hasQuestionMark)) {
    return {
      label: "details",
      reason: "reference + detail request",
      method: "regex",
    };
  }

  // Inspiration intent patterns
  const hasInspirationKeywords =
    /アイデア|なんか|ざっくり|気分|mood|idea|suggest|何か|something|anything|おすすめ/.test(
      lowerText
    );
  const isShortAndVague = text.length >= 3 && text.length <= 50 && !hasReference;

  if (hasInspirationKeywords && isShortAndVague) {
    return {
      label: "inspiration",
      reason: "vague/exploratory",
      method: "regex",
    };
  }

  // Specific intent patterns
  const hasSpecificKeywords =
    /ラーメン|寿司|焼肉|カフェ|レストラン|バー|ランチ|ディナー|カレー|スイーツ|飲み|activity|experience|探して|探す|find|search|look for|ramen|sushi|cafe|restaurant|bar|museum/.test(
      lowerText
    );

  if (hasSpecificKeywords) {
    return {
      label: "specific",
      reason: "concrete search terms",
      method: "regex",
    };
  }

  // Default to clarify
  return {
    label: "clarify",
    reason: "no clear pattern",
    method: "regex",
  };
}

/**
 * Main intent classification function (tries AI first, falls back to regex)
 */
export async function classifyIntent(
  message: string,
  conversationHistory?: Array<{ role: "user" | "assistant"; content: string }>,
  useAI: boolean = true
): Promise<IntentClassificationResult> {
  if (!useAI) {
    return classifyIntentWithRegex(message);
  }

  try {
    return await classifyIntentWithAI(message, conversationHistory);
  } catch (error) {
    console.warn("[classifyIntent] AI classification failed, using regex");
    return classifyIntentWithRegex(message);
  }
}
