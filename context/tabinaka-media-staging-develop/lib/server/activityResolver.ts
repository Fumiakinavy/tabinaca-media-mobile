/**
 * 統一されたアクティビティ識別子解決ヘルパー
 *
 * activity_slugとactivity_idの相互変換を提供。
 * 原則としてactivity_slugを主要な識別子として使用。
 */

import { supabaseServer } from "@/lib/supabaseServer";

export type ActivitySlug = string;
export type ActivityId = string;

/**
 * activity_slugからactivity_idを取得（必要に応じて）
 *
 * @param slug アクティビティのslug
 * @returns activity_id、またはnull（見つからない場合）
 */
export async function getActivityIdBySlug(
  slug: string,
): Promise<ActivityId | null> {
  try {
    const { data, error } = await supabaseServer
      .from("activities")
      .select("id")
      .eq("slug", slug)
      .eq("is_active", true)
      .maybeSingle<{ id: string }>();

    if (error || !data) {
      return null;
    }

    return data.id;
  } catch (error) {
    console.error(
      "[activityResolver] Failed to get activity ID by slug",
      error,
    );
    return null;
  }
}

/**
 * activity_idからactivity_slugを取得（必要に応じて）
 *
 * @param id アクティビティのID
 * @returns activity_slug、またはnull（見つからない場合）
 */
export async function getActivitySlugById(
  id: string,
): Promise<ActivitySlug | null> {
  try {
    const { data, error } = await supabaseServer
      .from("activities")
      .select("slug")
      .eq("id", id)
      .eq("is_active", true)
      .maybeSingle<{ slug: string }>();

    if (error || !data) {
      return null;
    }

    return data.slug;
  } catch (error) {
    console.error(
      "[activityResolver] Failed to get activity slug by ID",
      error,
    );
    return null;
  }
}

/**
 * 複数のactivity_idをactivity_slugに変換
 *
 * @param ids activity_idの配列
 * @returns activity_slugの配列
 */
export async function getActivitySlugsByIds(
  ids: string[],
): Promise<ActivitySlug[]> {
  if (ids.length === 0) {
    return [];
  }

  try {
    const { data, error } = await supabaseServer
      .from("activities")
      .select("slug")
      .in("id", ids)
      .eq("is_active", true);

    if (error || !data) {
      return [];
    }

    const rows = data as Array<{ slug: string | null }>;
    return rows.map((row) => row.slug).filter((slug): slug is string => !!slug);
  } catch (error) {
    console.error(
      "[activityResolver] Failed to get activity slugs by IDs",
      error,
    );
    return [];
  }
}

/**
 * 複数のactivity_slugをactivity_idに変換
 *
 * @param slugs activity_slugの配列
 * @returns activity_idの配列
 */
export async function getActivityIdsBySlugs(
  slugs: string[],
): Promise<ActivityId[]> {
  if (slugs.length === 0) {
    return [];
  }

  try {
    const { data, error } = await supabaseServer
      .from("activities")
      .select("id")
      .in("slug", slugs)
      .eq("is_active", true);

    if (error || !data) {
      return [];
    }

    const rows = data as Array<{ id: string | null }>;
    return rows.map((row) => row.id).filter((id): id is string => !!id);
  } catch (error) {
    console.error(
      "[activityResolver] Failed to get activity IDs by slugs",
      error,
    );
    return [];
  }
}

/**
 * activity_slugの正規化（保存時と参照時で同じ規則を適用）
 *
 * @param raw 生のslug文字列
 * @returns 正規化されたslug
 */
export function normalizeActivitySlug(raw: string): ActivitySlug {
  return decodeURIComponent(raw)
    .trim()
    .toLowerCase()
    .replace(/[""]/g, '"') // スマートクォート→通常
    .replace(/[']/g, "'")
    .replace(/[\s_]+/g, "-") // 空白/連続アンダー→ハイフン
    .replace(/[^a-z0-9-]/g, "-") // 記号→ハイフン
    .replace(/-+/g, "-") // 連続ハイフン圧縮
    .replace(/^-|-$/g, ""); // 端のハイフン除去
}
