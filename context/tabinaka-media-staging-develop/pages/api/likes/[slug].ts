import { NextApiRequest, NextApiResponse } from "next";
import { resolveAccountId } from "@/lib/server/accountResolver";
import {
  getActivityIdBySlug,
  normalizeActivitySlug,
} from "@/lib/server/activityResolver";
import {
  fetchLikeCount,
  fetchLikeState,
  LikeStorageUnavailableError,
  recordLike,
  removeLike,
  type LikeBackend,
} from "@/lib/server/likeStorage";
import { handleCorsPreflightRequest, setCorsHeaders } from "@/lib/cors";

interface LikeStateResponse {
  success: boolean;
  slug?: string;
  activityId?: string | null;
  liked?: boolean;
  count?: number;
  backend?: {
    state?: LikeBackend | null;
    count: LikeBackend;
  };
  error?: string;
  detail?: string;
}

function logBackendUsage(
  phase: "GET" | "POST",
  payload: {
    slug: string;
    accountId?: string | null;
    stateBackend?: LikeBackend | null;
    countBackend?: LikeBackend;
  },
) {
  try {
    const accountIdSuffix = payload.accountId
      ? payload.accountId.slice(-6)
      : undefined;
    console.info("[API][likes] backend usage", {
      phase,
      slug: payload.slug,
      accountIdPresent: Boolean(payload.accountId),
      accountIdSuffix,
      backend: {
        state: payload.stateBackend ?? null,
        count: payload.countBackend,
      },
    });
  } catch (error) {
    console.warn("[API][likes] failed to log backend usage", error);
  }
}

function extractSlug(value: string | string[] | undefined): string | null {
  if (!value) {
    return null;
  }
  if (Array.isArray(value)) {
    const candidate = value.find(
      (item) => typeof item === "string" && item.trim().length > 0,
    );
    return candidate ? candidate.trim() : null;
  }
  return value.trim().length > 0 ? value.trim() : null;
}

// ============================================
// キャッシュ無効化ヘッダー設定
// ============================================
function setNoCacheHeaders(res: NextApiResponse) {
  res.setHeader(
    "Cache-Control",
    "no-store, no-cache, must-revalidate, proxy-revalidate",
  );
  res.setHeader("Pragma", "no-cache");
  res.setHeader("Expires", "0");
}

// ============================================
// GET: いいね状態取得
// ============================================
async function handleGet(
  req: NextApiRequest,
  res: NextApiResponse<LikeStateResponse>,
) {
  setNoCacheHeaders(res);

  const slugParam = extractSlug(req.query.slug);
  if (!slugParam) {
    return res.status(400).json({
      success: false,
      error: "INVALID_SLUG",
      detail: "Slug is required and must be a string",
    });
  }

  const normalizedSlug = normalizeActivitySlug(slugParam);
  const activityId = await getActivityIdBySlug(normalizedSlug);

  // account_idを解決（オプショナル - いいね状態の取得は認証不要）
  const resolved = await resolveAccountId(req);
  const accountId = resolved?.accountId ?? null;

  let liked = false;
  let stateBackend: LikeBackend | null = null;
  let countBackend: LikeBackend | null = null;
  let countValue = 0;

  try {
    if (accountId) {
      const stateResult = await fetchLikeState(accountId, normalizedSlug);
      liked = stateResult.liked;
      stateBackend = stateResult.backend;
    }

    const countResult = await fetchLikeCount(normalizedSlug);
    countValue = countResult.count;
    countBackend = countResult.backend;

    return res.status(200).json({
      success: true,
      slug: normalizedSlug,
      activityId,
      liked,
      count: countValue,
      backend: {
        state: stateBackend,
        count: countBackend,
      },
    });
  } catch (error) {
    if (error instanceof LikeStorageUnavailableError) {
      console.error("[API] Like storage unavailable during GET", error);
      return res.status(503).json({
        success: false,
        slug: normalizedSlug,
        activityId,
        liked: false,
        count: 0,
        error: "LIKE_STORAGE_MISSING",
        detail:
          "Neither activity_interactions nor activity_likes tables are available. Apply the latest Supabase migrations or run scripts/create_activity_interactions_manual.sql.",
      });
    }

    console.error("[API] GET error:", error);
    return res.status(500).json({
      success: false,
      slug: normalizedSlug,
      activityId,
      liked: false,
      count: 0,
      error: "LIKE_STATE_UNAVAILABLE",
      detail: error instanceof Error ? error.message : "Unknown error",
    });
  } finally {
    logBackendUsage("GET", {
      slug: normalizedSlug,
      accountId,
      stateBackend,
      countBackend: countBackend ?? undefined,
    });
  }
}

// ============================================
// POST: いいねトグル
// ============================================
async function handlePost(
  req: NextApiRequest,
  res: NextApiResponse<LikeStateResponse>,
) {
  setNoCacheHeaders(res);

  const slugParam = extractSlug(req.query.slug);
  if (!slugParam) {
    return res.status(400).json({
      success: false,
      error: "INVALID_SLUG",
      detail: "Slug is required and must be a string",
    });
  }

  const normalizedSlug = normalizeActivitySlug(slugParam);
  const activityId = await getActivityIdBySlug(normalizedSlug);

  // account_idを解決（必須）
  const resolved = await resolveAccountId(req);
  if (!resolved) {
    return res.status(401).json({
      success: false,
      error: "UNAUTHORIZED",
      detail: "Account session required",
    });
  }

  try {
    const existing = await fetchLikeState(resolved.accountId, normalizedSlug);

    if (existing.liked) {
      await removeLike(resolved.accountId, normalizedSlug);
    } else {
      await recordLike(resolved.accountId, normalizedSlug, activityId);
    }

    const updatedState = await fetchLikeState(
      resolved.accountId,
      normalizedSlug,
    );
    const countResult = await fetchLikeCount(normalizedSlug);

    const responsePayload: LikeStateResponse = {
      success: true,
      slug: normalizedSlug,
      activityId,
      liked: updatedState.liked,
      count: countResult.count,
      backend: {
        state: updatedState.backend,
        count: countResult.backend,
      },
    };

    logBackendUsage("POST", {
      slug: normalizedSlug,
      accountId: resolved.accountId,
      stateBackend: responsePayload.backend?.state ?? null,
      countBackend: responsePayload.backend?.count,
    });

    return res.status(200).json(responsePayload);
  } catch (error) {
    if (error instanceof LikeStorageUnavailableError) {
      console.error("[API] Like storage unavailable during POST", {
        error,
        accountId: resolved.accountId,
        slug: normalizedSlug,
        activityId,
      });
      return res.status(503).json({
        success: false,
        error: "LIKE_STORAGE_MISSING",
        detail:
          "Like storage tables are missing. Run the pending Supabase migrations or create activity_interactions manually.",
      });
    }

    console.error("[API] POST error:", {
      error,
      errorMessage: error instanceof Error ? error.message : String(error),
      errorStack: error instanceof Error ? error.stack : undefined,
      accountId: resolved.accountId,
      slug: normalizedSlug,
      activityId,
    });
    return res.status(500).json({
      success: false,
      slug: normalizedSlug,
      activityId,
      error: "INTERNAL_ERROR",
      detail: error instanceof Error ? error.message : "Unknown error",
    });
  }
}

// ============================================
// メインハンドラー
// ============================================
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<LikeStateResponse>,
) {
  // CORS: プリフライトリクエストを処理
  if (handleCorsPreflightRequest(req, res)) {
    return;
  }
  setCorsHeaders(req, res);

  if (req.method === "GET") {
    return handleGet(req, res);
  } else if (req.method === "POST") {
    return handlePost(req, res);
  } else {
    return res.status(405).json({
      success: false,
      error: "METHOD_NOT_ALLOWED",
      detail: "Only GET and POST are supported",
    });
  }
}
