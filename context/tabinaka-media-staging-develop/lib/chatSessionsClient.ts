export interface ChatSessionSummary {
  id: string;
  title: string;
  session_type: string;
  status?: string | null;
  session_end_reason?: string | null;
  state: Record<string, unknown>;
  started_at: string;
  last_activity_at: string;
  closed_at: string | null;
  metadata: Record<string, unknown>;
  summary?: string | null;
  summaryUpdatedAt?: string | null;
  lastMessageExcerpt?: string | null;
  titleSuggestion?: string | null;
}

export interface ChatSessionListResponse {
  sessions: ChatSessionSummary[];
  nextCursor: string | null;
}

export interface ChatSessionMessagesResponse {
  messages: Array<{
    id: string;
    role: "user" | "assistant" | "tool";
    content: string;
    sequence: number;
    created_at: string;
    language?: string | null;
    intent?: string | null;
    metadata?: Record<string, unknown> | null;
    tool_calls?: Record<string, unknown> | null;
  }>;
  nextBefore: number | null;
  /** true when the session was not found (HTTP 404) */
  notFound?: boolean;
}

export interface AuthHeaders {
  accountId: string;
  accountToken: string;
  accessToken: string;
}

export interface ChatSessionShareResponse {
  shareUrl: string;
  token: string;
  expiresAt: string;
}

const buildAuthHeaders = (auth: AuthHeaders): HeadersInit => ({
  "X-Gappy-Account-Id": auth.accountId,
  "X-Gappy-Account-Token": auth.accountToken,
  Authorization: `Bearer ${auth.accessToken}`,
  "Content-Type": "application/json",
});

export async function fetchChatSessions(
  auth: AuthHeaders,
  params?: { limit?: number; cursor?: string | null },
): Promise<ChatSessionListResponse> {
  const query = new URLSearchParams();
  if (params?.limit) {
    query.set("limit", String(params.limit));
  }
  if (params?.cursor) {
    query.set("cursor", params.cursor);
  }

  const queryString = query.toString();

  const res = await fetch(
    `/api/chat/sessions${queryString ? `?${queryString}` : ""}`,
    {
      method: "GET",
      headers: buildAuthHeaders(auth),
    },
  );

  if (!res.ok) {
    throw new Error(`Failed to fetch chat sessions: ${res.status}`);
  }

  return res.json();
}

export async function createChatSessionShare(
  auth: AuthHeaders,
  sessionId: string,
): Promise<ChatSessionShareResponse> {
  const res = await fetch(`/api/chat/sessions/${sessionId}/share`, {
    method: "POST",
    headers: buildAuthHeaders(auth),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Failed to create share link: ${res.status} ${text}`);
  }

  return res.json();
}

export async function createChatSession(
  auth: AuthHeaders,
  payload?: {
    title?: string;
    sessionType?: string;
    state?: Record<string, unknown>;
    metadata?: Record<string, unknown>;
  },
): Promise<ChatSessionSummary> {
  const res = await fetch("/api/chat/sessions", {
    method: "POST",
    headers: buildAuthHeaders(auth),
    body: JSON.stringify(payload ?? {}),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Failed to create chat session: ${res.status} ${text}`);
  }

  const data = await res.json();
  return data.session as ChatSessionSummary;
}

export async function fetchChatSessionMessages(
  auth: AuthHeaders,
  sessionId: string,
  params?: { limit?: number; before?: number; signal?: AbortSignal },
): Promise<ChatSessionMessagesResponse> {
  const query = new URLSearchParams();
  if (params?.limit) {
    query.set("limit", String(params.limit));
  }
  if (typeof params?.before === "number") {
    query.set("before", String(params.before));
  }

  const queryString = query.toString();
  const url = queryString
    ? `/api/chat/sessions/${sessionId}/messages?${queryString}`
    : `/api/chat/sessions/${sessionId}/messages`;

  const res = await fetch(url, {
    method: "GET",
    headers: buildAuthHeaders(auth),
    signal: params?.signal,
  });

  if (res.status === 404) {
    // Session has been deleted or does not belong to this account
    return { messages: [], nextBefore: null, notFound: true };
  }
  if (!res.ok) {
    throw new Error(`Failed to fetch chat messages: ${res.status}`);
  }

  return res.json();
}
