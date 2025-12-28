import { supabaseServer } from "@/lib/supabaseServer";

export interface ChatSessionRecord {
  id: string;
  account_id: string;
  title: string;
  session_type: string;
  status?: string;
  state: Record<string, unknown>;
  started_at: string;
  last_activity_at: string;
  closed_at: string | null;
  session_end_reason?: string | null;
  metadata: Record<string, unknown>;
}

export interface ChatMessageRow {
  id: string;
  session_id: string;
  role: "user" | "assistant" | "tool";
  content: string;
  sequence: number;
  created_at: string;
  language?: string | null;
  intent?: string | null;
  metadata: Record<string, unknown> | null;
}

interface InsertChatMessageInput {
  sessionId: string;
  sequence: number;
  role: "user" | "assistant" | "tool";
  content: string;
  toolCalls?: Record<string, unknown> | null;
  latencyMs?: number | null;
  metadata?: Record<string, unknown>;
}

type CreateSessionOptions = {
  title?: string;
  sessionType?: string;
  state?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
};

export async function createChatSessionForAccount(
  accountId: string,
  options: CreateSessionOptions = {},
): Promise<ChatSessionRecord> {
  console.log(
    "[createChatSessionForAccount] Creating session for account:",
    accountId,
    "with options:",
    options,
  );

  const { data, error } = await supabaseServer
    .from("chat_sessions" as any)
    .insert({
      account_id: accountId,
      title: options.title?.trim() || "New chat",
      session_type: options.sessionType || "assistant",
      status: "active",
      state: options.state ?? {},
      metadata: options.metadata ?? {},
    } as any)
    .select("*")
    .single();

  if (error || !data) {
    console.error("[createChatSessionForAccount] Failed to create session:", {
      error,
      errorMessage: error?.message,
      errorDetails: error?.details,
      errorHint: error?.hint,
      accountId,
      options,
    });
    throw new Error(
      `Failed to create chat session: ${error?.message || "unknown error"}`,
    );
  }

  const sessionRow = data as ChatSessionRecord;
  console.log(
    "[createChatSessionForAccount] Session created successfully:",
    sessionRow.id,
  );
  return sessionRow;
}

export async function fetchChatSessionById(
  sessionId: string,
  accountId: string,
): Promise<ChatSessionRecord | null> {
  const { data, error } = await supabaseServer
    .from("chat_sessions")
    .select("*")
    .eq("account_id", accountId)
    .eq("id", sessionId)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to fetch chat session: ${error.message}`);
  }

  return data ? (data as ChatSessionRecord) : null;
}

export async function fetchLatestChatSession(
  accountId: string,
): Promise<ChatSessionRecord | null> {
  const { data, error } = await supabaseServer
    .from("chat_sessions")
    .select("*")
    .eq("account_id", accountId)
    .is("closed_at", null)
    .order("last_activity_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to fetch latest chat session: ${error.message}`);
  }

  return data ? (data as ChatSessionRecord) : null;
}

export async function resolveOrCreateChatSession(
  accountId: string,
  sessionId?: string,
  options: CreateSessionOptions = {},
): Promise<ChatSessionRecord> {
  if (sessionId) {
    const existing = await fetchChatSessionById(sessionId, accountId);
    if (!existing) {
      throw new Error("Chat session not found");
    }
    return existing;
  }

  const latestSession = await fetchLatestChatSession(accountId);
  if (latestSession) {
    return latestSession;
  }

  return createChatSessionForAccount(accountId, options);
}

export async function fetchRecentChatMessages(
  sessionId: string,
  limit = 40,
): Promise<ChatMessageRow[]> {
  const { data, error } = await supabaseServer
    .from("chat_messages")
    .select("id, session_id, role, content, sequence, created_at, language, intent, metadata")
    .eq("session_id", sessionId)
    .order("sequence", { ascending: false })
    .limit(limit);

  if (error) {
    throw new Error(`Failed to fetch chat messages: ${error.message}`);
  }

  if (!data) {
    return [];
  }

  return (data as ChatMessageRow[]).sort((a, b) => a.sequence - b.sequence);
}

export async function getLastMessageSequence(
  sessionId: string,
): Promise<number> {
  const { data, error } = await supabaseServer
    .from("chat_messages")
    .select("sequence")
    .eq("session_id", sessionId)
    .order("sequence", { ascending: false })
    .limit(1)
    .maybeSingle<{ sequence: number }>();

  if (error) {
    throw new Error(`Failed to read chat message sequence: ${error.message}`);
  }

  return (data as { sequence?: number } | null)?.sequence ?? 0;
}

export async function updateChatSession(
  sessionId: string,
  accountId: string,
  patch: Partial<
    Pick<
      ChatSessionRecord,
      | "title"
      | "state"
      | "metadata"
      | "last_activity_at"
      | "closed_at"
      | "status"
      | "session_end_reason"
    >
  >,
): Promise<void> {
  if (!Object.keys(patch).length) {
    return;
  }

  const { error } = await (supabaseServer as any)
    .from("chat_sessions")
    .update(patch)
    .eq("id", sessionId)
    .eq("account_id", accountId);

  if (error) {
    throw new Error(`Failed to update chat session: ${error.message}`);
  }
}

export async function insertChatMessage({
  sessionId,
  sequence,
  role,
  content,
  toolCalls,
  latencyMs,
  metadata,
}: InsertChatMessageInput): Promise<ChatMessageRow> {
  const { data, error } = await (supabaseServer as any)
    .from("chat_messages")
    .insert({
      session_id: sessionId,
      sequence,
      role,
      content,
      tool_calls: toolCalls ?? null,
      latency_ms: typeof latencyMs === "number" ? latencyMs : null,
      metadata: metadata ?? {},
    } as any)
    .select("id, session_id, role, content, sequence, created_at, language, intent, metadata")
    .single();

  if (error || !data) {
    throw new Error(
      `Failed to insert chat message: ${error?.message || "unknown error"}`,
    );
  }

  return data as ChatMessageRow;
}
