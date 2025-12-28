import { NextApiRequest, NextApiResponse } from "next";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const {
      account_id,
      session_id,
      search_query,
      search_source,
      search_context,
      page_url,
      results_count,
      clicked_result_id,
      clicked_result_position,
      location,
      radius_meters,
      inferred_category,
      has_results,
    } = req.body;

    // 必須フィールドチェック
    if (!search_query) {
      return res.status(400).json({ error: "search_query is required" });
    }

    // Supabaseに保存
    const context = search_context || {};
    const normalizedLocation = location ?? context.location ?? null;
    const normalizedRadius =
      radius_meters ??
      context.radius_meters ??
      context.radiusMeters ??
      context.radius ??
      null;
    const normalizedCategory =
      inferred_category ?? context.inferred_category ?? context.category ?? null;
    const normalizedHasResults =
      typeof has_results === "boolean"
        ? has_results
        : typeof context.has_results === "boolean"
          ? context.has_results
          : typeof context.hasResults === "boolean"
            ? context.hasResults
            : typeof results_count === "number"
              ? results_count > 0
              : null;

    const { error } = await supabase.from("search_queries").insert({
      account_id: account_id || null,
      session_id: session_id || null,
      search_query: search_query.trim(),
      search_source: search_source || "unknown",
      search_context: context,
      location: normalizedLocation,
      radius_meters: normalizedRadius,
      inferred_category: normalizedCategory,
      has_results: normalizedHasResults,
      page_url: page_url || null,
      results_count: results_count || null,
      clicked_result_id: clicked_result_id || null,
      clicked_result_position: clicked_result_position || null,
      searched_at: new Date().toISOString(),
    });

    if (error) {
      console.error("[track/search] Database error:", error);
      return res.status(500).json({ error: "Failed to save search query" });
    }

    res.status(200).json({ success: true });
  } catch (error) {
    console.error("[track/search] Error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
}
