import type { NextApiRequest, NextApiResponse } from "next";
import { resolveAccountId } from "@/lib/server/accountResolver";
import { supabaseServer } from "@/lib/supabaseServer";
import { handleCorsPreflightRequest, setCorsHeaders } from "@/lib/cors";

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

type CreateSessionPayload = {
  locationPermission?: boolean | null;
  metadata?: Record<string, any>;
};

type UpdateSessionPayload = {
  sessionId: string;
  status?: "in_progress" | "completed" | "abandoned";
  locationPermission?: boolean | null;
  metadata?: Record<string, any>;
  currentStep?: number;
  lastQuestionId?: string;
  answers?: Record<string, any>;
  travelTypeCode?: string;
  travelTypePayload?: any;
  requestId?: string;
  diagnosisType?: string;
  personaHistory?: Record<string, any> | any[];
};

// セッションを作成
// セッションを作成
async function handleCreateSession(
  req: NextApiRequest,
  res: NextApiResponse<QuizSessionResponse | ErrorResponse>,
) {
  const resolved = await resolveAccountId(req, res, false);
  if (!resolved) {
    return res.status(401).json({ error: "Missing account session" });
  }

  const payload = req.body as CreateSessionPayload;

  try {
    // Check for existing in_progress session to prevent duplicates
    const { data: existingSession, error: fetchError } = await (supabaseServer
      .from("quiz_sessions" as any) as any)
      .select("id, status, started_at, completed_at")
      .eq("account_id", resolved.accountId)
      .eq("status", "in_progress")
      .order("started_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (fetchError) {
      console.error("[quiz/session] Failed to check existing session", fetchError);
    }

    if (existingSession) {
      return res.status(200).json({
        sessionId: existingSession.id,
        status: existingSession.status as "in_progress" | "completed" | "abandoned",
        startedAt: existingSession.started_at,
        completedAt: existingSession.completed_at,
      });
    }

    const { data: session, error } = await (supabaseServer
      .from("quiz_sessions" as any) as any)
      .insert({
        account_id: resolved.accountId,
        status: "in_progress",
        started_at: new Date().toISOString(),
        metadata: {
          ...(payload.metadata || {}),
          locationPermission: payload.locationPermission,
        },
      })
      .select("id, status, started_at, completed_at")
      .single();

    if (error) {
      console.error("[quiz/session] Failed to create session", error);
      return res.status(500).json({
        error: "Failed to create session",
        details: error.message,
      });
    }

    return res.status(200).json({
      sessionId: session.id,
      status: session.status as "in_progress" | "completed" | "abandoned",
      startedAt: session.started_at,
      completedAt: session.completed_at,
    });
  } catch (error) {
    console.error("[quiz/session] Unexpected error", error);
    return res.status(500).json({
      error: "Internal server error",
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
}

// セッションを更新（状態変更、メタデータ更新など）
async function handleUpdateSession(
  req: NextApiRequest,
  res: NextApiResponse<QuizSessionResponse | ErrorResponse>,
) {
  const resolved = await resolveAccountId(req, res, false);
  if (!resolved) {
    return res.status(401).json({ error: "Missing account session" });
  }

  const payload = req.body as UpdateSessionPayload;
  const requestId = payload.requestId;

  if (!payload.sessionId) {
    return res.status(400).json({ error: "sessionId is required" });
  }

  try {
    const needsMetadata =
      payload.metadata !== undefined ||
      payload.locationPermission !== undefined ||
      Boolean(requestId);
    const needsAnswers = payload.answers !== undefined;

    const selectFields = [
      "id",
      "account_id",
      "status",
      "started_at",
      "completed_at",
      ...(needsAnswers ? (["answers"] as const) : []),
      ...(needsMetadata ? (["metadata"] as const) : []),
    ].join(", ");

    // セッションが存在し、該当アカウントのものか確認
    const { data: existingSession, error: fetchError } =
      await supabaseServer
        .from("quiz_sessions" as any)
        .select(selectFields)
        .eq("id", payload.sessionId)
        .single<{
          id: string;
          account_id: string;
          status: string;
          started_at: string;
          completed_at?: string;
          answers?: Record<string, any>;
          metadata?: Record<string, any>;
        }>();

    if (fetchError || !existingSession) {
      return res.status(404).json({ error: "Session not found" });
    }

    if (existingSession.account_id !== resolved.accountId) {
      return res.status(403).json({ error: "Forbidden" });
    }

    // Idempotency: 同一requestIdでの重複更新はスキップ
    if (requestId && existingSession.metadata?.lastRequestId === requestId) {
      return res.status(200).json({
        sessionId: existingSession.id,
        status: existingSession.status as "in_progress" | "completed" | "abandoned",
        startedAt: existingSession.started_at,
        completedAt: existingSession.completed_at,
      });
    }

    // 更新データを構築
    const updateData: any = {};

    if (payload.status) {
      updateData.status = payload.status;
      if (
        (payload.status === "completed" || payload.status === "abandoned") &&
        !existingSession.completed_at
      ) {
        // Mark completion time only if not already set
        updateData.completed_at = new Date().toISOString();
      }
    }

    // Metadata Update Logic
    const nextMetadata = { ...(existingSession.metadata || {}) };
    let hasMetadataUpdates = false;

    if (payload.metadata) {
      Object.assign(nextMetadata, payload.metadata);
      hasMetadataUpdates = true;
    }

    if (payload.locationPermission !== undefined) {
      nextMetadata.locationPermission = payload.locationPermission;
      hasMetadataUpdates = true;
    }

    if (requestId) {
      nextMetadata.lastRequestId = requestId;
      hasMetadataUpdates = true;
    }

    if (hasMetadataUpdates) {
      updateData.metadata = nextMetadata;
    }

    // Analytics Fields
    if (payload.currentStep !== undefined) {
      updateData.current_step = payload.currentStep;
    }
    if (payload.lastQuestionId !== undefined) {
      updateData.last_question_id = payload.lastQuestionId;
    }

    // Answers Merge Logic
    if (payload.answers) {
      updateData.answers = {
        ...(existingSession.answers || {}),
        ...payload.answers,
      };
    }

    // Result & Travel Type
    // resultに保存される値の例:
    // {
    //   type: "travel_type",
    //   travelTypeCode: "GRLP",
    //   payload: {
    //     name: "The Itinerary CEO",
    //     emoji: "📍",
    //     description: "Travel is a spreadsheet...",
    //     shortDescription: "Plans never falter..."
    //   },
    //   snapshot: null
    // }
    // travel_type_codeに保存される値の例: "GRLP"
    // travel_type_payloadに保存される値の例:
    // {
    //   name: "The Itinerary CEO",
    //   emoji: "📍",
    //   description: "Travel is a spreadsheet...",
    //   shortDescription: "Plans never falter..."
    // }
    
    if (payload.travelTypeCode) {
      updateData.travel_type_code = payload.travelTypeCode;
    }

    if (payload.travelTypePayload) {
      updateData.travel_type_payload = payload.travelTypePayload;
    }

    if (payload.diagnosisType !== undefined) {
      updateData.diagnosis_type = payload.diagnosisType;
    }

    if (payload.personaHistory !== undefined) {
      updateData.persona_history = payload.personaHistory;
    }

    // resultオブジェクトを完全に構築
    if (payload.travelTypeCode && payload.travelTypePayload) {
      updateData.result = {
        type: "travel_type",
        travelTypeCode: payload.travelTypeCode,
        payload: payload.travelTypePayload,
        snapshot: null,
      };
    } else if (payload.travelTypeCode) {
      // travelTypeCodeだけが送られてきた場合でも、既存のtravel_type_payloadを使ってresultを構築
      // 既存セッションからtravel_type_payloadを取得する必要があるが、
      // 今回はtravelTypeCodeとtravelTypePayloadの両方が送られてきた場合のみresultを構築する
      // (他のケースは既存のresultを維持)
    }

    const { data: updatedSession, error: updateError } = await (supabaseServer
      .from("quiz_sessions" as any) as any)
      .update(updateData)
      .eq("id", payload.sessionId)
      .select("id, status, started_at, completed_at")
      .single();

    if (updateError) {
      console.error(
        "[quiz/session] Failed to update quiz session",
        updateError,
      );
      return res.status(500).json({
        error: "Failed to update quiz session",
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
    console.error("[quiz/session] Unexpected error", error);
    return res.status(500).json({
      error: "Internal server error",
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
}

// セッションを取得（最新の進行中セッションまたは指定されたセッション）
async function handleGetSession(
  req: NextApiRequest,
  res: NextApiResponse<QuizSessionResponse | ErrorResponse>,
) {
  const resolved = await resolveAccountId(req, res, false);
  if (!resolved) {
    return res.status(401).json({ error: "Missing account session" });
  }

  const sessionId = req.query.sessionId as string | undefined;

  try {
    let query = supabaseServer
      .from("quiz_sessions" as any)
      .select("id, status, started_at, completed_at")
      .eq("account_id", resolved.accountId);

    if (sessionId) {
      query = query.eq("id", sessionId);
    } else {
      // 最新の進行中セッションを取得
      query = query.eq("status", "in_progress");
    }

    query = query.order("started_at", { ascending: false }).limit(1);

    const { data: sessions, error: fetchError } = await query;

    if (fetchError) {
      console.error("[quiz/session] Failed to fetch session", fetchError);
      return res.status(500).json({
        error: "Failed to fetch session",
        details: fetchError.message,
      });
    }

    if (!sessions || sessions.length === 0) {
      return res.status(404).json({ error: "Session not found" });
    }

    const session = sessions[0] as any;
    return res.status(200).json({
      sessionId: session.id,
      status: session.status as "in_progress" | "completed" | "abandoned",
      startedAt: session.started_at,
      completedAt: session.completed_at,
    });
  } catch (error) {
    console.error("[quiz/session] Unexpected error", error);
    return res.status(500).json({
      error: "Internal server error",
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<QuizSessionResponse | ErrorResponse>,
) {
  if (req.method === "POST") {
    return handleCreateSession(req, res);
  } else if (req.method === "PATCH") {
    return handleUpdateSession(req, res);
  } else if (req.method === "GET") {
    return handleGetSession(req, res);
  }

  res.setHeader("Allow", ["POST", "PATCH", "GET"]);
  return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
  // CORS: プリフライトリクエストを処理
  if (handleCorsPreflightRequest(req, res)) {
    return;
  }
  setCorsHeaders(req, res);

  switch (req.method) {
    case "GET":
      return handleGetSession(req, res);
    case "POST":
      return handleCreateSession(req, res);
    case "PUT":
    case "PATCH":
      return handleUpdateSession(req, res);
    default:
      res.setHeader("Allow", ["GET", "POST", "PUT", "PATCH"]);
      return res.status(405).json({ error: "Method Not Allowed" });
  }
}
