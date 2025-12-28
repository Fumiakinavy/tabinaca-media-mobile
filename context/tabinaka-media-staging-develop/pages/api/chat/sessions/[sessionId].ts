import type { NextApiRequest, NextApiResponse } from "next";
import {
  ApiAuthError,
  resolveRequestAccountContext,
} from "@/lib/server/apiAuth";
import {
  fetchChatSessionById,
  updateChatSession,
} from "@/lib/server/chatSessions";
import { supabaseServer } from "@/lib/supabaseServer";

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  Boolean(value && typeof value === "object" && !Array.isArray(value));

const sanitizeUpdate = (
  value: unknown,
): Record<string, unknown> | undefined => {
  return isPlainObject(value) ? (value as Record<string, unknown>) : undefined;
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  try {
    const { accountId } = await resolveRequestAccountContext(req);
    const sessionId = Array.isArray(req.query.sessionId)
      ? req.query.sessionId[0]
      : req.query.sessionId;

    if (!sessionId) {
      return res.status(400).json({ error: "sessionId is required" });
    }

    if (req.method === "GET") {
      const session = await fetchChatSessionById(sessionId, accountId);
      if (!session) {
        return res.status(404).json({ error: "Chat session not found" });
      }

      const { data: summaryRows } = await supabaseServer
        .from("chat_session_summaries" as any)
        .select("summary, title_suggestion, last_message_excerpt, updated_at")
        .eq("session_id", sessionId)
        .maybeSingle<{
          summary: string | null;
          title_suggestion: string | null;
          last_message_excerpt: string | null;
          updated_at: string | null;
        }>();

      return res.status(200).json({
        ...session,
        summary: summaryRows?.summary ?? null,
        summaryUpdatedAt: summaryRows?.updated_at ?? null,
        lastMessageExcerpt: summaryRows?.last_message_excerpt ?? null,
        titleSuggestion: summaryRows?.title_suggestion ?? null,
      });
    }

    if (req.method === "PATCH") {
      const body = req.body ?? {};
      const patch: Record<string, unknown> = {};

      if (typeof body.title === "string") {
        patch.title = body.title.trim()
          ? body.title.trim().slice(0, 80)
          : "New chat";
      }

      if (body.closed === true) {
        patch.closed_at = new Date().toISOString();
        patch.status = "closed";
        if (typeof body.session_end_reason === "string") {
          patch.session_end_reason = body.session_end_reason;
        }
      } else if (body.closed === false) {
        patch.closed_at = null;
        patch.status = "active";
      } else if (typeof body.closed_at === "string") {
        patch.closed_at = body.closed_at;
      }

      const stateUpdate = sanitizeUpdate(body.state);
      if (stateUpdate) {
        patch.state = stateUpdate;
      }

      const metadataUpdate = sanitizeUpdate(body.metadata);
      if (metadataUpdate) {
        patch.metadata = metadataUpdate;
      }

      if (typeof body.status === "string") {
        patch.status = body.status;
      }

      if (typeof body.session_end_reason === "string") {
        patch.session_end_reason = body.session_end_reason;
      }

      if (!Object.keys(patch).length) {
        return res.status(400).json({ error: "No updates provided" });
      }

      await updateChatSession(sessionId, accountId, patch);
      const updatedSession = await fetchChatSessionById(sessionId, accountId);

      return res.status(200).json(updatedSession);
    }

    if (req.method === "DELETE") {
      const { error } = await supabaseServer
        .from("chat_sessions" as any)
        .delete()
        .eq("id", sessionId)
        .eq("account_id", accountId);

      if (error) {
        console.error("[api/chat/sessions/[id]] delete error", error);
        return res.status(500).json({ error: "Failed to delete chat session" });
      }

      return res.status(204).end();
    }

    res.setHeader("Allow", ["GET", "PATCH", "DELETE"]);
    return res.status(405).json({ error: "Method not allowed" });
  } catch (error) {
    if (error instanceof ApiAuthError) {
      return res.status(error.status).json({ error: error.message });
    }

    console.error("[api/chat/sessions/[id]] unexpected error", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}
