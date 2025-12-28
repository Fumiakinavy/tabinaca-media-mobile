// チャットセッションとメッセージのロギング機能
import { createClient } from "@supabase/supabase-js";
import { classifyIntentWithRegex } from "@/lib/intentClassifier";
import { detectLanguage } from "@/lib/languageDetector";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

interface ChatSessionData {
  accountId: string;
  sessionType?: "assistant" | "vendor_support" | "system";
  state?: Record<string, any>;
  metadata?: Record<string, any>;
}

interface ChatMessageData {
  sessionId: string;
  role: "user" | "assistant" | "tool";
  content: string;
  toolCalls?: any[];
  latencyMs?: number;
  sequence?: number;
  metadata?: Record<string, any>;
}

interface ChatSessionMetrics {
  totalMessages: number;
  totalTokens: number;
  totalLatencyMs: number;
  functionsUsed: string[];
  placesFound: number;
  errors: number;
}

export class ChatLogger {
  private supabase;

  constructor() {
    this.supabase = createClient(supabaseUrl, supabaseServiceKey);
  }

  private async getNextSequence(sessionId: string): Promise<number> {
    const { data, error } = await this.supabase
      .from("chat_messages")
      .select("sequence")
      .eq("session_id", sessionId)
      .order("sequence", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error("Failed to read chat message sequence:", error);
      return Date.now(); // fallback to timestamp to avoid null constraint
    }

    const lastSequence = data?.sequence ?? 0;
    return lastSequence + 1;
  }

  /**
   * セッションを取得または作成
   */
  async getOrCreateSession(
    accountId: string,
    conversationId?: string,
  ): Promise<string | null> {
    try {
      // conversationId があれば、まずは session.id 直指定でヒットさせる
      if (conversationId) {
        const { data: existingById } = await this.supabase
          .from("chat_sessions")
          .select("id")
          .eq("id", conversationId)
          .eq("account_id", accountId)
          .maybeSingle();

        if (existingById) {
          await this.supabase
            .from("chat_sessions")
            .update({ last_activity_at: new Date().toISOString() })
            .eq("id", existingById.id);

          return existingById.id;
        }

        // metadata 経由でも探す（後方互換）
        const { data: existingSession } = await this.supabase
          .from("chat_sessions")
          .select("id")
          .eq("metadata->>conversationId", conversationId)
          .eq("account_id", accountId)
          .maybeSingle();

        if (existingSession) {
          await this.supabase
            .from("chat_sessions")
            .update({ last_activity_at: new Date().toISOString() })
            .eq("id", existingSession.id);

          return existingSession.id;
        }
      }

      // 新しいセッションを作成
      const sessionData: ChatSessionData = {
        accountId,
        sessionType: "assistant",
        state: {},
        metadata: {
          conversationId: conversationId || null,
          startedAt: new Date().toISOString(),
        },
      };

      const { data: newSession, error } = await this.supabase
        .from("chat_sessions")
        .insert({
          account_id: sessionData.accountId,
          session_type: sessionData.sessionType,
          status: "active",
          state: sessionData.state,
          metadata: sessionData.metadata,
        })
        .select("id")
        .single();

      if (error) {
        console.error("Failed to create chat session:", error);
        return null;
      }

      return newSession?.id || null;
    } catch (error) {
      console.error("Error in getOrCreateSession:", error);
      return null;
    }
  }

  /**
   * メッセージを記録
   */
  async logMessage(
    sessionId: string,
    role: "user" | "assistant" | "tool",
    content: string,
    options?: {
      toolCalls?: any[];
      latencyMs?: number;
      metadata?: Record<string, any>;
    },
  ): Promise<void> {
    try {
      const language = detectLanguage(content);
      const intent =
        role === "user" ? classifyIntentWithRegex(content).label : null;
      const messageData: ChatMessageData = {
        sessionId,
        role,
        content,
        toolCalls: options?.toolCalls,
        latencyMs: options?.latencyMs,
        sequence: await this.getNextSequence(sessionId),
        metadata: options?.metadata,
      };

      const { error } = await this.supabase.from("chat_messages").insert({
        session_id: messageData.sessionId,
        sequence: messageData.sequence,
        role: messageData.role,
        content: messageData.content,
        language,
        intent,
        tool_calls: messageData.toolCalls || null,
        latency_ms: messageData.latencyMs || null,
        metadata: messageData.metadata || {},
      });

      if (error) {
        console.error("Failed to log message:", error);
      }

      // last_activity_atを更新
      await this.supabase
        .from("chat_sessions")
        .update({ last_activity_at: new Date().toISOString() })
        .eq("id", sessionId);
    } catch (error) {
      console.error("Error in logMessage:", error);
    }
  }

  /**
   * ユーザーメッセージを記録
   */
  async logUserMessage(sessionId: string, message: string): Promise<void> {
    await this.logMessage(sessionId, "user", message);
  }

  /**
   * アシスタントレスポンスを記録
   */
  async logAssistantMessage(
    sessionId: string,
    response: string,
    latencyMs?: number,
    metadata?: Record<string, any>,
  ): Promise<void> {
    await this.logMessage(sessionId, "assistant", response, {
      latencyMs,
      metadata,
    });
  }

  /**
   * ツールコールを記録
   */
  async logToolCall(
    sessionId: string,
    toolName: string,
    toolInput: any,
    toolOutput: any,
  ): Promise<void> {
    const content = `Tool: ${toolName}`;
    const toolCalls = [
      {
        tool: toolName,
        input: toolInput,
        output: toolOutput,
        timestamp: new Date().toISOString(),
      },
    ];

    await this.logMessage(sessionId, "tool", content, { toolCalls });
  }

  /**
   * セッションメトリクスを更新
   */
  async updateSessionMetrics(
    sessionId: string,
    metrics: Partial<ChatSessionMetrics>,
  ): Promise<void> {
    try {
      // 既存のメトリクスを取得
      const { data: session } = await this.supabase
        .from("chat_sessions")
        .select("metadata")
        .eq("id", sessionId)
        .single();

      if (!session) return;

      const existingMetrics = (session.metadata as any)?.metrics || {};
      const updatedMetrics = {
        totalMessages:
          (existingMetrics.totalMessages || 0) + (metrics.totalMessages || 0),
        totalTokens:
          (existingMetrics.totalTokens || 0) + (metrics.totalTokens || 0),
        totalLatencyMs:
          (existingMetrics.totalLatencyMs || 0) + (metrics.totalLatencyMs || 0),
        functionsUsed: [
          ...new Set([
            ...(existingMetrics.functionsUsed || []),
            ...(metrics.functionsUsed || []),
          ]),
        ],
        placesFound:
          (existingMetrics.placesFound || 0) + (metrics.placesFound || 0),
        errors: (existingMetrics.errors || 0) + (metrics.errors || 0),
      };

      await this.supabase
        .from("chat_sessions")
        .update({
          metadata: {
            ...(session.metadata as any),
            metrics: updatedMetrics,
          },
        })
        .eq("id", sessionId);
    } catch (error) {
      console.error("Error updating session metrics:", error);
    }
  }

  /**
   * セッションをクローズ
   */
  async closeSession(sessionId: string, reason: string = "user"): Promise<void> {
    try {
      await this.supabase
        .from("chat_sessions")
        .update({
          closed_at: new Date().toISOString(),
          status: "closed",
          session_end_reason: reason,
        })
        .eq("id", sessionId);
    } catch (error) {
      console.error("Error closing session:", error);
    }
  }

  /**
   * タイトルが空または 'New chat' の場合のみ更新
   */
  async setTitleIfEmpty(sessionId: string, title: string): Promise<void> {
    try {
      const { data, error } = await this.supabase
        .from("chat_sessions")
        .select("title, account_id")
        .eq("id", sessionId)
        .maybeSingle();

      if (error) {
        console.error("Failed to read chat session title:", error);
        return;
      }

      const row = data as any;
      const currentTitle = row?.title?.trim?.() || "";
      if (currentTitle && currentTitle !== "New chat") {
        return;
      }

      const nextTitle = title.trim() || "New chat";
      const { error: updateError } = await this.supabase
        .from("chat_sessions")
        .update({ title: nextTitle })
        .eq("id", sessionId)
        .eq("account_id", row?.account_id);

      if (updateError) {
        console.error("Failed to update chat session title:", updateError);
      }
    } catch (err) {
      console.error("Error setting session title:", err);
    }
  }

  /**
   * エラーを記録
   */
  async logError(
    sessionId: string,
    error: any,
    context?: Record<string, any>,
  ): Promise<void> {
    try {
      const errorMessage = error?.message || "Unknown error";
      const errorStack = error?.stack || "";

      await this.logMessage(sessionId, "assistant", `Error: ${errorMessage}`);

      // メトリクスにエラーカウントを追加
      await this.updateSessionMetrics(sessionId, { errors: 1 });

      // セッションのメタデータにエラー情報を追加
      const { data: session } = await this.supabase
        .from("chat_sessions")
        .select("metadata")
        .eq("id", sessionId)
        .single();

      if (session) {
        const errors = (session.metadata as any)?.errors || [];
        errors.push({
          message: errorMessage,
          stack: errorStack,
          context,
          timestamp: new Date().toISOString(),
        });

        await this.supabase
          .from("chat_sessions")
          .update({
            metadata: {
              ...(session.metadata as any),
              errors,
            },
          })
          .eq("id", sessionId);
      }
    } catch (err) {
      console.error("Error logging error:", err);
    }
  }

  /**
   * セッション統計を取得
   */
  async getSessionStats(accountId: string): Promise<{
    totalSessions: number;
    totalMessages: number;
    avgMessagesPerSession: number;
    lastActivityAt: string | null;
  } | null> {
    try {
      const { data: sessions, error } = await this.supabase
        .from("chat_sessions")
        .select("id, last_activity_at")
        .eq("account_id", accountId);

      if (error || !sessions) {
        return null;
      }

      const totalSessions = sessions.length;

      // メッセージ数を集計
      const { count: totalMessages } = await this.supabase
        .from("chat_messages")
        .select("id", { count: "exact", head: true })
        .in(
          "session_id",
          sessions.map((s) => s.id),
        );

      const lastActivityAt =
        sessions.length > 0
          ? sessions.sort(
              (a, b) =>
                new Date(b.last_activity_at).getTime() -
                new Date(a.last_activity_at).getTime(),
            )[0].last_activity_at
          : null;

      return {
        totalSessions,
        totalMessages: totalMessages || 0,
        avgMessagesPerSession:
          totalSessions > 0 ? (totalMessages || 0) / totalSessions : 0,
        lastActivityAt,
      };
    } catch (error) {
      console.error("Error getting session stats:", error);
      return null;
    }
  }
}

// シングルトンインスタンス
let chatLoggerInstance: ChatLogger | null = null;

export function getChatLogger(): ChatLogger {
  if (!chatLoggerInstance) {
    chatLoggerInstance = new ChatLogger();
  }
  return chatLoggerInstance;
}
