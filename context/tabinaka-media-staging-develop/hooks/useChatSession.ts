import { useState, useEffect, useCallback, useRef } from "react";
import { Message } from "@/components/ChatInterface";
import { chatSessionStore } from "@/lib/chatSessionStore";
import {
  fetchChatSessionMessages,
  AuthHeaders,
  ChatSessionMessagesResponse,
} from "@/lib/chatSessionsClient";

const MAX_SESSION_MESSAGES = 50;

const transformServerMessageToClient = (
  row: ChatSessionMessagesResponse["messages"][number],
): Message => {
  const metadata = (row.metadata ?? {}) as Record<string, unknown>;
  const places = Array.isArray((metadata as any)?.places)
    ? (metadata as any)?.places
    : undefined;
  const functionResults = Array.isArray((metadata as any)?.functionResults)
    ? (metadata as any)?.functionResults
    : undefined;

  // Debug: log when places are found in metadata
  if (places && places.length > 0) {
    console.log("[useChatSession] Restored places from metadata:", {
      messageId: row.id,
      role: row.role,
      placesCount: places.length,
      placeNames: places.slice(0, 3).map((p: any) => p.name),
    });
  }

  return {
    id: row.id,
    role: row.role === "tool" ? "assistant" : row.role,
    content: row.content,
    timestamp: new Date(row.created_at),
    places,
    functionResults,
  };
};

interface UseChatSessionResult {
  messages: Message[];
  isLoading: boolean;
  error: string | null;
  setMessages: (messages: Message[] | ((prev: Message[]) => Message[])) => void;
  refreshMessages: () => Promise<void>;
}

export const useChatSession = (
  sessionId: string | null,
  authHeaders: AuthHeaders | null,
): UseChatSessionResult => {
  // Initialize from in-memory cache synchronously to avoid a 1-frame "empty"
  // state (e.g. intro/welcome flashing) when navigating within the SPA.
  const [messages, setMessagesState] = useState<Message[]>(() => {
    if (!sessionId) return [];
    return chatSessionStore.getMessages(sessionId) ?? [];
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const mountedRef = useRef(false);
  const requestSeqRef = useRef(0);
  const activeControllerRef = useRef<AbortController | null>(null);

  // Helper to update both local state and store
  const setMessages = useCallback(
    (updater: Message[] | ((prev: Message[]) => Message[])) => {
      if (!sessionId) return;

      setMessagesState((prev) => {
        const next = typeof updater === "function" ? updater(prev) : updater;
        chatSessionStore.setMessages(sessionId, next);
        return next;
      });
    },
    [sessionId],
  );

  // Initial load from store
  useEffect(() => {
    if (!sessionId) {
      setMessagesState([]);
      return;
    }

    const cached = chatSessionStore.getMessages(sessionId);
    if (cached) {
      setMessagesState(cached);
    } else {
      setMessagesState([]);
    }
  }, [sessionId]);

  const safeAbortActive = (reason = "cleanup") => {
    const controller = activeControllerRef.current;
    if (!controller) return;
    if (controller.signal.aborted) {
      activeControllerRef.current = null;
      return;
    }
    try {
      controller.abort(reason);
    } catch (abortError) {
      console.warn("[useChatSession] abort failed", abortError);
    } finally {
      activeControllerRef.current = null;
    }
  };

  const refreshMessages = useCallback(async () => {
    if (!sessionId || !authHeaders) return;

    // 増分シーケンスで最新リクエストのみを反映する
    const seq = requestSeqRef.current + 1;
    requestSeqRef.current = seq;

    // 直前のリクエストを中断
    safeAbortActive("refresh");
    const controller = new AbortController();
    activeControllerRef.current = controller;

    // If we already have cached messages (SPA navigation, returning to a session, etc.),
    // avoid toggling `isLoading` just for background revalidation to prevent a 1-frame
    // loading placeholder flash in the UI.
    const cached = chatSessionStore.getMessages(sessionId);
    if (!cached || cached.length === 0) {
      setIsLoading(true);
    }
    setError(null);

    try {
      const response = await fetchChatSessionMessages(authHeaders, sessionId, {
        limit: MAX_SESSION_MESSAGES,
        signal: controller.signal,
      });

      if (controller.signal.aborted || seq !== requestSeqRef.current) {
        return;
      }
      if (response.notFound) {
        // Session no longer exists for this account; clear local cache
        setMessagesState([]);
        chatSessionStore.setMessages(sessionId, []);
        setError("Chat session not found");
        return;
      }
      const serverMessages = response.messages.map(
        transformServerMessageToClient,
      );

      setMessagesState((prev) => {
        // Merge strategy:
        // 1. Keep local optimistic messages (those with isLoading or isTyping or temporary IDs)
        // 2. Replace confirmed messages with server data
        // 3. Deduplicate based on content and timestamp to avoid showing the same message twice
        //    (e.g. when a local message is persisted and returned by the server with a new ID)

        const serverIds = new Set(serverMessages.map((m) => m.id));

        const localPending = prev.filter((m) => {
          // If it has a server ID, it's already in serverMessages (or removed if deleted), so skip
          if (serverIds.has(m.id)) return false;

          // Deduplication by content and role for recent messages
          const isDuplicate = serverMessages.some(
            (sm) =>
              sm.role === m.role &&
              sm.content === m.content &&
              // Check if timestamps are close (within 10 seconds)
              Math.abs(
                new Date(sm.timestamp).getTime() -
                  new Date(m.timestamp).getTime(),
              ) < 10000,
          );
          if (isDuplicate) return false;

          // Otherwise keep it if it's pending/local
          return (
            m.isLoading ||
            m.isTyping ||
            m.id.startsWith("user-") ||
            m.id.startsWith("assistant-") ||
            m.id.startsWith("quiz-results-")
          );
        });

        const next = [...serverMessages, ...localPending];

        // Sort by timestamp to ensure correct order
        next.sort(
          (a, b) =>
            new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(),
        );

        chatSessionStore.setMessages(sessionId, next);
        return next;
      });
    } catch (err) {
      // AbortError is expected when request is cancelled (e.g., page navigation, unmount)
      // Don't treat it as an error or log it as an error
      if (err instanceof Error && err.name === "AbortError") {
        // Silently ignore abort errors - they're expected during cleanup
        return;
      }
      
      console.error("[useChatSession] Failed to load messages", err);
      if (!controller.signal.aborted && seq === requestSeqRef.current) {
        setError("Failed to load messages");
      }
    } finally {
      if (!controller.signal.aborted && seq === requestSeqRef.current) {
        setIsLoading(false);
        activeControllerRef.current = null;
      }
    }
  }, [sessionId, authHeaders]);

  // Fetch on mount / sessionId change if not fully cached or to revalidate
  useEffect(() => {
    mountedRef.current = true;
    if (sessionId && authHeaders) {
      // We always revalidate in background to get latest
      void refreshMessages();
    }
    return () => {
      mountedRef.current = false;
      safeAbortActive("unmount");
    };
  }, [sessionId, authHeaders, refreshMessages]);

  return {
    messages,
    isLoading,
    error,
    setMessages,
    refreshMessages,
  };
};
