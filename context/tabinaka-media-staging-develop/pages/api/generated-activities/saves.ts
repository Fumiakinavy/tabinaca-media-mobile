import type { NextApiRequest, NextApiResponse } from "next";
import { supabaseServer } from "@/lib/supabaseServer";
import { resolveAccountId } from "@/lib/server/accountResolver";

type SaveSource = "chat" | "recommendation" | "manual";

interface GeneratedActivitySummary {
  id: string;
  draft_slug?: string | null;
  activity_id?: string | null;
  title?: string | null;
  summary?: string | null;
  status?: string | null;
  created_at?: string | null;
  metadata?: Record<string, any> | null;
}

interface SaveListItem {
  id: string;
  generated_activity_id: string;
  source: SaveSource;
  created_at: string;
  interaction_id?: string | null;
  generated_activity?: GeneratedActivitySummary | null;
}

interface SaveListResponse {
  success: boolean;
  saves?: SaveListItem[];
  error?: string;
  detail?: string;
}

const MAX_SAVES = 50;

async function handleGet(
  req: NextApiRequest,
  res: NextApiResponse<SaveListResponse>,
) {
  const resolved = await resolveAccountId(req);
  if (!resolved) {
    return res.status(401).json({
      success: false,
      error: "UNAUTHORIZED",
      detail: "Account session required",
    });
  }

  try {
    const { data, error } = await supabaseServer
      .from("generated_activity_saves")
      .select(
        `id,
         generated_activity_id,
         source,
         created_at,
         interaction_id,
         generated_activity:generated_activity_id (
           id,
           draft_slug,
           activity_id,
           title,
           summary,
           status,
           created_at,
           metadata
         )`,
      )
      .eq("account_id", resolved.accountId)
      .order("created_at", { ascending: false })
      .limit(MAX_SAVES);

    if (error) {
      throw error;
    }

    // Supabaseのリレーションクエリは配列を返す可能性があるため、単一オブジェクトに変換
    const saves: SaveListItem[] = (data ?? []).map((item: any) => ({
      id: item.id,
      generated_activity_id: item.generated_activity_id,
      source: item.source,
      created_at: item.created_at,
      interaction_id: item.interaction_id,
      generated_activity: Array.isArray(item.generated_activity)
        ? (item.generated_activity[0] ?? null)
        : (item.generated_activity ?? null),
    }));

    return res.status(200).json({ success: true, saves });
  } catch (error) {
    console.error("[API] Failed to list generated_activity_saves", { error });
    return res.status(500).json({
      success: false,
      error: "LIST_FAILED",
      detail: "Could not fetch saved activities",
    });
  }
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<SaveListResponse>,
) {
  if (req.method === "GET") {
    return handleGet(req, res);
  }

  res.setHeader("Allow", ["GET"]);
  return res.status(405).json({ success: false, error: "METHOD_NOT_ALLOWED" });
}
