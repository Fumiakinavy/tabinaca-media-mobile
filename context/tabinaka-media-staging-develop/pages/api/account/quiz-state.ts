import type { NextApiRequest, NextApiResponse } from "next";
import { resolveAccountId } from "@/lib/server/accountResolver";
import { fetchQuizState, type QuizStateRecord } from "@/lib/server/quizState";
import { supabaseServer } from "@/lib/supabaseServer";
import type { StoredTravelType } from "@/lib/quizClientState";
import { getTravelTypeInfo } from "@/lib/travelTypeMapping";
import { handleCorsPreflightRequest, setCorsHeaders } from "@/lib/cors";

const normalizeTravelType = (
  travelType?: StoredTravelType | null,
): StoredTravelType | null => {
  if (!travelType?.travelTypeCode) {
    return null;
  }
  const base = getTravelTypeInfo(travelType.travelTypeCode);
  return {
    travelTypeCode: travelType.travelTypeCode,
    travelTypeName: travelType.travelTypeName || base.name,
    travelTypeEmoji: travelType.travelTypeEmoji || base.emoji,
    travelTypeDescription: travelType.travelTypeDescription || base.description,
    travelTypeShortDescription:
      travelType.travelTypeShortDescription || base.shortDescription,
    locationLat:
      typeof travelType.locationLat === "number"
        ? travelType.locationLat
        : undefined,
    locationLng:
      typeof travelType.locationLng === "number"
        ? travelType.locationLng
        : undefined,
    locationPermission:
      typeof travelType.locationPermission === "boolean"
        ? travelType.locationPermission
        : undefined,
    currentLocation: travelType.currentLocation,
  };
};

type ErrorResponse = {
  error: string;
  message?: string;
  details?: string;
  migrationFile?: string;
  hint?: string;
};
type QuizStateResponse = { quizState: QuizStateRecord | null };

type QuizStateUpsertPayload = {
  travelType?: StoredTravelType | null;
  places?: any[];
  answers?: any;
  timestamp?: number;
};

// Supabaseクエリ結果の型定義
type QuizSessionRow = {
  id: string;
  status: string;
  metadata: any;
  started_at: string;
  answers: any;
};

const isQuizCompleted = (answers: any): boolean => {
  if (!answers || typeof answers !== "object") return false;
  const travelTypeAnswers = answers.travelTypeAnswers;
  if (!travelTypeAnswers || typeof travelTypeAnswers !== "object") return false;
  // すべての設問に回答が入っているかを確認（null/undefined/空文字は未回答扱い）
  return Object.values(travelTypeAnswers).every(
    (value) => value !== null && value !== undefined && value !== "",
  );
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<QuizStateResponse | ErrorResponse>,
) {
  // CORS: プリフライトリクエストを処理
  if (handleCorsPreflightRequest(req, res)) {
    return;
  }
  setCorsHeaders(req, res);

  if (req.method === "GET") {
    return handleGet(req, res);
  }
  if (req.method === "POST") {
    return handlePost(req, res);
  }
  res.setHeader("Allow", ["GET", "POST"]);
  return res.status(405).json({ error: "Method not allowed" });
}

async function handleGet(
  req: NextApiRequest,
  res: NextApiResponse<QuizStateResponse | ErrorResponse>,
) {
  const resolved = await resolveAccountId(req, res, false); // Cookie設定を必須にしない
  if (!resolved) {
    // accountIdが解決できない場合は、nullを返してクライアント側でローカルストレージから取得を試みる
    console.log(
      "[account/quiz-state] No account session, returning null (client will use local storage)",
    );
    return res.status(200).json({ quizState: null });
  }

  try {
    const quizState = await fetchQuizState(resolved.accountId);
    // quizStateがnullの場合でも200を返す（テーブルが存在しない、またはデータが存在しない場合）
    // クライアント側でローカルストレージから取得を試みることができる
    return res.status(200).json({ quizState: quizState ?? null });
  } catch (error) {
    console.error("[account/quiz-state] failed to fetch quiz state", error);
    // エラーが発生した場合でも200を返し、quizStateをnullにする
    // これにより、クライアント側でローカルストレージから取得を試みることができる
    return res.status(200).json({ quizState: null });
  }
}

async function handlePost(
  req: NextApiRequest,
  res: NextApiResponse<QuizStateResponse | ErrorResponse>,
) {
  const resolved = await resolveAccountId(req, res, true);
  if (!resolved) {
    return res.status(401).json({ error: "Missing account session" });
  }

  const payload = (req.body ?? {}) as QuizStateUpsertPayload;
  const normalized = normalizeTravelType(payload.travelType);
  if (!normalized) {
    return res.status(400).json({ error: "Missing travelType" });
  }

  const timestamp = payload.timestamp || Date.now();
  const now = new Date().toISOString();

  // answers が空なら保存をスキップ
  const hasAnswers = Array.isArray(payload.answers)
    ? payload.answers.length > 0
    : payload.answers && Object.keys(payload.answers).length > 0;

  if (!hasAnswers) {
    console.warn("[account/quiz-state] skip saving because answers are empty", {
      accountId: resolved.accountId,
      timestamp,
    });
    return res.status(200).json({ quizState: null });
  }

  // クイズ完了判定
  const isCompleted = isQuizCompleted(payload.answers);
  if (!isCompleted) {
    console.warn(
      "[account/quiz-state] skip saving because quiz is not completed",
      { accountId: resolved.accountId, timestamp },
    );
    return res.status(200).json({ quizState: null });
  }

  // 結果オブジェクトの構築
  const travelTypePayload = {
    name: normalized.travelTypeName,
    emoji: normalized.travelTypeEmoji,
    description: normalized.travelTypeDescription,
    shortDescription: normalized.travelTypeShortDescription,
  };

  const resultObject = {
    type: "travel_type",
    travelTypeCode: normalized.travelTypeCode,
    payload: travelTypePayload,
    snapshot: payload.places
      ? {
        places: payload.places,
        timestamp,
      }
      : null,
  };

  try {
    // 進行中のセッションを探す (最新1件)
    const { data: existingSessions, error: fetchError } = await (supabaseServer
      .from("quiz_sessions" as any) as any)
      .select("id, metadata")
      .eq("account_id", resolved.accountId)
      .eq("status", "in_progress")
      .order("started_at", { ascending: false })
      .limit(1);

    if (fetchError) {
      console.error("[account/quiz-state] Error fetching session", fetchError);
      throw fetchError;
    }

    const existingSession = existingSessions?.[0];

    if (existingSession) {
      // 既存セッションを完了にする
      const updateQuery = supabaseServer.from("quiz_sessions" as any) as any;
      const { error: updateError } = await updateQuery
        .update({
          status: "completed",
          completed_at: now,
          answers: payload.answers,
          result: resultObject,
          travel_type_code: normalized.travelTypeCode,
          travel_type_payload: travelTypePayload,
          metadata: {
            ...(existingSession.metadata || {}),
            lastUpdatedAt: now,
            completion_timestamp: timestamp,
          },
        })
        .eq("id", existingSession.id);

      if (updateError) throw updateError;
    } else {
      // セッションが見つからない場合は新規作成 (完了状態で)
      const { error: insertError } = await (supabaseServer
        .from("quiz_sessions" as any) as any)
        .insert({
          account_id: resolved.accountId,
          status: "completed",
          started_at: new Date(timestamp).toISOString(),
          completed_at: now,
          answers: payload.answers,
          result: resultObject,
          travel_type_code: normalized.travelTypeCode,
          travel_type_payload: travelTypePayload,
          metadata: {
            created_via: "api/account/quiz-state",
            completion_timestamp: timestamp,
          },
        });

      if (insertError) throw insertError;
    }

    // クライアントに返すレスポンス（以前と同じ形式を維持）
    const nextQuizState = {
      travelType: normalized,
      completed: true,
      timestamp,
      recommendation: payload.places
        ? {
          places: payload.places,
          timestamp,
        }
        : undefined,
      answers: payload.answers,
    };

    return res.status(200).json({ quizState: nextQuizState });

  } catch (error: any) {
    console.error("[account/quiz-state] Failed to save quiz result:", error);
    return res.status(500).json({
      error: "Failed to store quiz result",
      details: error.message,
    });
  }
}
