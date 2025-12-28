import { NextApiRequest, NextApiResponse } from "next";
import { supabaseServer } from "@/lib/supabaseServer";
import { ApiResponse, ExperienceWithRelations } from "@/types/experiences-db";

// Node.js Runtimeを使用

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ApiResponse<ExperienceWithRelations>>,
) {
  if (req.method !== "GET") {
    return res.status(405).json({
      success: false,
      message: "Method not allowed",
    });
  }

  try {
    const { slug } = req.query;

    if (!slug || typeof slug !== "string") {
      return res.status(400).json({
        success: false,
        message: "Slug is required",
      });
    }

    // アクティビティ詳細を取得
    const { data, error } = (await supabaseServer
      .from("activities" as any)
      .select(
        `
        *,
        experience_categories!inner(
          id,
          name,
          slug,
          description,
          is_active,
          created_at
        ),
        experience_tags!inner(
          id,
          name,
          slug,
          color,
          is_active,
          created_at
        )
      `,
      )
      .eq("slug", slug)
      .eq("is_active", true)
      .single()) as any;

    if (error) {
      if (error.code === "PGRST116") {
        return res.status(404).json({
          success: false,
          message: "Experience not found",
        });
      }

      console.error("Database error:", error);
      return res.status(500).json({
        success: false,
        message: "Database error",
        error: error.message,
      });
    }

    // 閲覧数を増加
    await (supabaseServer.rpc as any)("increment_experience_view_count", {
      experience_slug_param: slug,
    });

    // データを整形
    const experience: ExperienceWithRelations = {
      ...(data as any),
      categories: (data as any)?.experience_categories || [],
      tags: (data as any)?.experience_tags || [],
    };

    return res.status(200).json({
      success: true,
      data: experience,
    });
  } catch (error) {
    console.error("API error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
}
