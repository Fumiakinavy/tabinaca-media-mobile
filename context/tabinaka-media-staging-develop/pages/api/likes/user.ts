import { NextApiRequest, NextApiResponse } from "next";
import { resolveAccountId } from "@/lib/server/accountResolver";
import {
  LikeStorageUnavailableError,
  listLikes,
} from "@/lib/server/likeStorage";
import { handleCorsPreflightRequest, setCorsHeaders } from "@/lib/cors";

// ============================================
// ユーザーのいいね一覧取得API
// ============================================

interface LikedActivity {
  slug: string;
  title: string;
  coverImage: string;
  price: number | null;
  duration: string | null;
  summary: string | null;
  likedAt: string;
  tags?: string[];
  motivationTags?: string[];
  level?: string;
}

interface ApiResponse {
  success: boolean;
  activities?: LikedActivity[];
  count?: number;
  error?: string;
  detail?: string;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ApiResponse>,
) {
  // CORS: プリフライトリクエストを処理
  if (handleCorsPreflightRequest(req, res)) {
    return;
  }
  setCorsHeaders(req, res);

  // GETメソッドのみ許可
  if (req.method !== "GET") {
    return res.status(405).json({
      success: false,
      error: "METHOD_NOT_ALLOWED",
      detail: "Only GET method is allowed",
    });
  }

  // account_idを解決
  const resolved = await resolveAccountId(req);
  if (!resolved) {
    return res.status(401).json({
      success: false,
      error: "UNAUTHORIZED",
      detail: "Account session required",
    });
  }

  try {
    console.log("[API] Fetching likes for account_id:", resolved.accountId);
    const interactions = await listLikes(resolved.accountId);

    const activities: LikedActivity[] = interactions.map(
      (interaction: any) => ({
        slug: interaction.activity_slug,
        title: "",
        coverImage: "",
        price: null,
        duration: null,
        summary: null,
        likedAt: interaction.created_at,
        tags: [],
        motivationTags: [],
      }),
    );

    res.setHeader(
      "Cache-Control",
      "no-store, no-cache, must-revalidate, proxy-revalidate",
    );
    res.setHeader("Pragma", "no-cache");
    res.setHeader("Expires", "0");

    return res.status(200).json({
      success: true,
      activities,
      count: activities.length,
    });
  } catch (error) {
    if (error instanceof LikeStorageUnavailableError) {
      console.error(
        "[API] Like storage unavailable while listing likes",
        error,
      );
      return res.status(503).json({
        success: false,
        error: "LIKE_STORAGE_MISSING",
        detail:
          "activity_interactions/activity_likes tables are missing. Run the Supabase migration scripts to create them.",
      });
    }

    console.error("[API] Unexpected error:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    const errorStack = error instanceof Error ? error.stack : undefined;
    console.error("[API] Error stack:", errorStack);
    return res.status(500).json({
      success: false,
      error: "INTERNAL_ERROR",
      detail: errorMessage,
      ...(process.env.NODE_ENV === "development" && { stack: errorStack }),
    });
  }
}
