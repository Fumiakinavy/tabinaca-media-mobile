import type { NextApiRequest, NextApiResponse } from "next";
import {
  ApiAuthError,
  resolveRequestAccountContext,
} from "@/lib/server/apiAuth";
import { supabaseServer } from "@/lib/supabaseServer";

const MAX_LIMIT = 100;

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  try {
    const { accountId } = await resolveRequestAccountContext(req);
    const sessionIdParam = Array.isArray(req.query.sessionId)
      ? req.query.sessionId[0]
      : req.query.sessionId;

    if (!sessionIdParam) {
      return res.status(400).json({ error: "sessionId is required" });
    }

    if (req.method !== "GET") {
      res.setHeader("Allow", ["GET"]);
      return res.status(405).json({ error: "Method not allowed" });
    }

    const { data: sessionRow } = await supabaseServer
      .from("chat_sessions" as any)
      .select("id")
      .eq("id", sessionIdParam)
      .eq("account_id", accountId)
      .maybeSingle<{ id: string }>();

    if (!sessionRow) {
      return res.status(404).json({ error: "Chat session not found" });
    }

    const limitRaw = Array.isArray(req.query.limit)
      ? req.query.limit[0]
      : req.query.limit;
    const beforeRaw = Array.isArray(req.query.before)
      ? req.query.before[0]
      : req.query.before;

    const limit = Math.min(
      Math.max(parseInt(String(limitRaw ?? "50"), 10) || 50, 1),
      MAX_LIMIT,
    );
    const beforeSequence = beforeRaw ? Number(beforeRaw) : undefined;

    let query = supabaseServer
      .from("chat_messages" as any)
      .select(
        "id, role, content, sequence, created_at, language, intent, metadata, tool_calls, latency_ms",
      )
      .eq("session_id", sessionIdParam)
      .order("sequence", { ascending: false })
      .limit(limit) as any;

    if (Number.isFinite(beforeSequence)) {
      query = query.lt("sequence", beforeSequence as number);
    }

    const { data, error } = await query;

    if (error) {
      throw new Error(`Failed to fetch chat messages: ${error.message}`);
    }

    const rows = (data ?? []) as Array<{
      id: string;
      role: string;
      content: string;
      sequence: number;
      created_at: string;
      language?: string | null;
      intent?: string | null;
      metadata: any;
      tool_calls: any;
      latency_ms: number | null;
    }>;
    const messages = rows.sort((a, b) => a.sequence - b.sequence);
    const nextBefore =
      rows.length === limit ? rows[rows.length - 1].sequence : null;

    // Debug: log messages with places in metadata
    const messagesWithPlaces = messages.filter(
      (m) => Array.isArray(m.metadata?.places) && m.metadata.places.length > 0,
    );
    if (messagesWithPlaces.length > 0) {
      console.log(
        "[api/chat/sessions/:id/messages] Found messages with places:",
        {
          sessionId: sessionIdParam,
          messagesWithPlacesCount: messagesWithPlaces.length,
          details: messagesWithPlaces.map((m) => ({
            id: m.id,
            role: m.role,
            placesCount: m.metadata?.places?.length,
          })),
        },
      );
    }

    return res.status(200).json({
      messages,
      nextBefore,
    });
  } catch (error) {
    if (error instanceof ApiAuthError) {
      return res.status(error.status).json({ error: error.message });
    }

    console.error("[api/chat/sessions/:id/messages] unexpected error", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}
