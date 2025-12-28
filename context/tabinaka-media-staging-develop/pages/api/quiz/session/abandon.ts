import type { NextApiRequest, NextApiResponse } from "next";
import { resolveAccountId } from "@/lib/server/accountResolver";
import { supabaseServer } from "@/lib/supabaseServer";

type ErrorResponse = {
  error: string;
  message?: string;
  details?: string;
};

type QuizSessionResponse = {
  sessionId: string;
  status: "in_progress" | "completed" | "abandoned";
  startedAt: string;
  completedAt?: string;
};

type AbandonSessionPayload = {
  sessionId: string;
  metadata?: Record<string, any>;
  currentStep?: number;
  lastQuestionId?: string;
  answers?: Record<string, any>;
  requestId?: string;
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<QuizSessionResponse | ErrorResponse>,
) {
  if (req.method !== "POST") {
    res.setHeader("Allow", ["POST"]);
    return res
      .status(405)
      .json({ error: `Method ${req.method ?? "UNKNOWN"} Not Allowed` });
  }

  const resolved = await resolveAccountId(req, res, false);
  if (!resolved) {
    return res.status(401).json({ error: "Missing account session" });
  }

  const payload = req.body as AbandonSessionPayload;
  if (!payload.sessionId) {
    return res.status(400).json({ error: "sessionId is required" });
  }

  const requestId = payload.requestId;

  try {
    const { data: existingSession, error: fetchError } = await supabaseServer
      .from("quiz_sessions" as any)
      .select(
        "id, account_id, status, started_at, completed_at, answers, metadata",
      )
      .eq("id", payload.sessionId)
      .single<{
        id: string;
        account_id: string;
        status: string;
        started_at: string;
        completed_at?: string;
        answers: Record<string, any>;
        metadata: Record<string, any>;
      }>();

    if (fetchError || !existingSession) {
      return res.status(404).json({ error: "Session not found" });
    }

    if (existingSession.account_id !== resolved.accountId) {
      return res.status(403).json({ error: "Forbidden" });
    }

    if (requestId && existingSession.metadata?.lastRequestId === requestId) {
      return res.status(200).json({
        sessionId: existingSession.id,
        status: existingSession.status as "in_progress" | "completed" | "abandoned",
        startedAt: existingSession.started_at,
        completedAt: existingSession.completed_at,
      });
    }

    const updateData: any = {
      status: "abandoned",
    };

    if (!existingSession.completed_at) {
      updateData.completed_at = new Date().toISOString();
    }

    const nextMetadata = { ...(existingSession.metadata || {}) };
    let hasMetadataUpdates = false;

    if (payload.metadata) {
      Object.assign(nextMetadata, payload.metadata);
      hasMetadataUpdates = true;
    }

    if (requestId) {
      nextMetadata.lastRequestId = requestId;
      hasMetadataUpdates = true;
    }

    if (hasMetadataUpdates) {
      updateData.metadata = nextMetadata;
    }

    if (payload.currentStep !== undefined) {
      updateData.current_step = payload.currentStep;
    }

    if (payload.lastQuestionId !== undefined) {
      updateData.last_question_id = payload.lastQuestionId;
    }

    if (payload.answers) {
      updateData.answers = {
        ...(existingSession.answers || {}),
        ...payload.answers,
      };
    }

    const { data: updatedSession, error: updateError } = await (supabaseServer
      .from("quiz_sessions" as any) as any)
      .update(updateData)
      .eq("id", payload.sessionId)
      .select("id, status, started_at, completed_at")
      .single();

    if (updateError) {
      console.error("[quiz/session/abandon] Failed to update session", updateError);
      return res.status(500).json({
        error: "Failed to abandon quiz session",
        details: updateError?.message || "Session not found after update",
      });
    }

    return res.status(200).json({
      sessionId: updatedSession.id,
      status: updatedSession.status as "in_progress" | "completed" | "abandoned",
      startedAt: updatedSession.started_at,
      completedAt: updatedSession.completed_at,
    });
  } catch (error) {
    console.error("[quiz/session/abandon] Unexpected error", error);
    return res.status(500).json({
      error: "Internal server error",
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
}







