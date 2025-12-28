import type { NextApiRequest, NextApiResponse } from "next";
import {
  ApiAuthError,
  resolveRequestAccountContext,
} from "@/lib/server/apiAuth";
import { supabaseServer } from "@/lib/supabaseServer";
import { createChatSessionForAccount } from "@/lib/server/chatSessions";

const MAX_LIMIT = 50;

const isPlainObject = (value: unknown): value is Record<string, unknown> => {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
};

const sanitizeJson = (value: unknown): Record<string, unknown> => {
  return isPlainObject(value) ? (value as Record<string, unknown>) : {};
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  try {
    const { accountId } = await resolveRequestAccountContext(req);

    if (req.method === "GET") {
      const limitRaw = Array.isArray(req.query.limit)
        ? req.query.limit[0]
        : req.query.limit;
      const cursorRaw = Array.isArray(req.query.cursor)
        ? req.query.cursor[0]
        : req.query.cursor;
      const limit = Math.min(
        Math.max(parseInt(String(limitRaw ?? "20"), 10) || 20, 1),
        MAX_LIMIT,
      );

      let query = supabaseServer
        .from("chat_sessions" as any)
        .select(
          "id, title, session_type, status, session_end_reason, state, started_at, last_activity_at, closed_at, metadata",
        )
        .eq("account_id", accountId)
        .order("last_activity_at", { ascending: false })
        .limit(limit) as any;

      if (cursorRaw && typeof cursorRaw === "string") {
        query = query.lt("last_activity_at", cursorRaw);
      }

      const { data, error } = await query;
      if (error) {
        throw new Error(`Failed to fetch chat sessions: ${error.message}`);
      }

      const sessions = (data ?? []) as Array<{
        id: string;
        title: string | null;
        session_type: string | null;
        status?: string | null;
        session_end_reason?: string | null;
        state: any;
        started_at: string;
        last_activity_at: string;
        closed_at: string | null;
        metadata: any;
      }>;
      const sessionIds = sessions.map((session) => session.id);
      let summaries: Record<string, any> = {};

      if (sessionIds.length > 0) {
        const { data: summaryRows, error: summaryError } = (await supabaseServer
          .from("chat_session_summaries" as any)
          .select(
            "session_id, summary, title_suggestion, last_message_excerpt, updated_at",
          )
          .in("session_id", sessionIds)) as any;

        if (summaryError) {
          throw new Error(
            `Failed to fetch chat session summaries: ${summaryError.message}`,
          );
        }

        summaries = (
          (summaryRows ?? []) as Array<{
            session_id: string;
            summary: string | null;
            title_suggestion: string | null;
            last_message_excerpt: string | null;
            updated_at: string | null;
          }>
        ).reduce<Record<string, any>>((acc, row) => {
          acc[row.session_id] = row;
          return acc;
        }, {});
      }

      const responsePayload = sessions.map((session) => ({
        ...session,
        summary: summaries[session.id]?.summary || null,
        summaryUpdatedAt: summaries[session.id]?.updated_at || null,
        lastMessageExcerpt: summaries[session.id]?.last_message_excerpt || null,
        titleSuggestion: summaries[session.id]?.title_suggestion || null,
      }));

      const nextCursor =
        sessions.length === limit
          ? sessions[sessions.length - 1].last_activity_at
          : null;

      return res.status(200).json({
        sessions: responsePayload,
        nextCursor,
      });
    }

    if (req.method === "POST") {
      const body = req.body ?? {};
      const title =
        typeof body.title === "string" && body.title.trim()
          ? body.title.trim().slice(0, 80)
          : undefined;
      const sessionType =
        typeof body.sessionType === "string" ? body.sessionType : undefined;
      const state = sanitizeJson(body.state);
      const metadata = { ...sanitizeJson(body.metadata) };
      if (!metadata.source) {
        metadata.source = "new_page";
      }

      const session = await createChatSessionForAccount(accountId, {
        title,
        sessionType,
        state,
        metadata,
      });

      return res.status(201).json({ session });
    }

    res.setHeader("Allow", ["GET", "POST"]);
    return res.status(405).json({ error: "Method not allowed" });
  } catch (error) {
    if (error instanceof ApiAuthError) {
      return res.status(error.status).json({ error: error.message });
    }

    console.error("[api/chat/sessions] unexpected error", {
      error,
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      method: req.method,
      body: req.body,
    });
    return res.status(500).json({ error: "Internal server error" });
  }
}
