import type { NextApiRequest, NextApiResponse } from "next";
import {
  ApiAuthError,
  resolveRequestAccountContext,
} from "@/lib/server/apiAuth";
import { fetchChatSessionById } from "@/lib/server/chatSessions";
import { createShareToken, getShareBaseUrl } from "@/lib/shareToken";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  if (req.method !== "POST") {
    res.setHeader("Allow", ["POST"]);
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { accountId } = await resolveRequestAccountContext(req);
    const sessionId = Array.isArray(req.query.sessionId)
      ? req.query.sessionId[0]
      : req.query.sessionId;

    if (!sessionId) {
      return res.status(400).json({ error: "Missing sessionId" });
    }

    const session = await fetchChatSessionById(sessionId, accountId);
    if (!session) {
      return res.status(404).json({ error: "Session not found" });
    }

    const token = createShareToken(session.id);
    const baseUrl = getShareBaseUrl(req);
    const shareUrl = `${baseUrl}/share/${token}`;

    return res.status(200).json({
      shareUrl,
      token,
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    });
  } catch (error) {
    if (error instanceof ApiAuthError) {
      return res.status(error.status).json({ error: error.message });
    }

    console.error("[api/chat/sessions/share] unexpected error", {
      error,
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
    return res.status(500).json({ error: "Internal server error" });
  }
}
