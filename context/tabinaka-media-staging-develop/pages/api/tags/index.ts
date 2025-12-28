import { NextApiRequest, NextApiResponse } from "next";
import { supabaseServer } from "@/lib/supabaseServer";
import { ApiResponse, ExperienceTag } from "@/types/experiences-db";

// Node.js Runtimeを使用

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ApiResponse<ExperienceTag[]>>,
) {
  if (req.method !== "GET") {
    return res.status(405).json({
      success: false,
      message: "Method not allowed",
    });
  }

  try {
    const { data, error } = await supabaseServer
      .from("experience_tags")
      .select("*")
      .eq("is_active", true)
      .order("name");

    if (error) {
      console.error("Database error:", error);
      return res.status(500).json({
        success: false,
        message: "Database error",
        error: error.message,
      });
    }

    return res.status(200).json({
      success: true,
      data: data || [],
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
