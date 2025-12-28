export interface ConversationMessage {
  role: "user" | "assistant";
  content: string;
}

export interface ConversationContextResult {
  summary: string | null;
  recentMessages: ConversationMessage[];
}

const DEFAULT_MAX_TURNS = 4;

export function buildConversationContext(
  history: ConversationMessage[],
  maxTurns: number = DEFAULT_MAX_TURNS,
): ConversationContextResult {
  if (!Array.isArray(history) || history.length === 0) {
    return { summary: null, recentMessages: [] };
  }

  const sanitizedHistory = history.filter(
    (msg): msg is ConversationMessage =>
      Boolean(msg) &&
      typeof msg.content === "string" &&
      msg.content.trim().length > 0,
  );

  if (!sanitizedHistory.length) {
    return { summary: null, recentMessages: [] };
  }

  const maxRecentMessages = Math.max(1, maxTurns * 2);
  const recentMessages = sanitizedHistory.slice(-maxRecentMessages);
  const earlierMessages = sanitizedHistory.slice(
    0,
    sanitizedHistory.length - recentMessages.length,
  );

  const summary = earlierMessages.length
    ? summarizeMessages(earlierMessages)
    : null;

  return {
    summary,
    recentMessages,
  };
}

function summarizeMessages(messages: ConversationMessage[]): string {
  const pairs: { user?: string; assistant?: string }[] = [];
  let currentPair: { user?: string; assistant?: string } = {};

  messages.forEach((msg) => {
    if (msg.role === "user") {
      if (currentPair.user || currentPair.assistant) {
        pairs.push(currentPair);
        currentPair = {};
      }
      currentPair.user = truncate(msg.content);
      return;
    }

    currentPair.assistant = truncate(msg.content);
    pairs.push(currentPair);
    currentPair = {};
  });

  if (currentPair.user || currentPair.assistant) {
    pairs.push(currentPair);
  }

  return pairs
    .slice(-3)
    .map((pair, index) => {
      const userPart = pair.user ? `U: ${pair.user}` : "";
      const assistantPart = pair.assistant ? `A: ${pair.assistant}` : "";
      return `Turn ${index + 1}: ${[userPart, assistantPart].filter(Boolean).join(" | ")}`;
    })
    .join("\n");
}

function truncate(text: string, maxLength = 300): string {
  const normalized = text.replace(/\s+/g, " ").trim();
  if (normalized.length <= maxLength) {
    return normalized;
  }
  return `${normalized.slice(0, maxLength - 1)}…`;
}
