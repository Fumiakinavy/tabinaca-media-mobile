import { NextApiRequest, NextApiResponse } from "next";
import { supabaseServer } from "@/lib/supabaseServer";
import fs from "fs/promises";
import path from "path";

interface Activity {
  slug: string;
  title: string;
  duration_minutes: number;
  location: string;
  is_active: boolean;
}

// SQLファイルから活動データを解析
function parseActivitiesFromSQL(sqlContent: string): Activity[] {
  const activities: Activity[] = [];

  // VALUES句を抽出
  const valuesMatch = sqlContent.match(/values\s+(.*?)\s+on conflict/i);
  if (!valuesMatch) return activities;

  const valuesContent = valuesMatch[1];

  // 各行を解析（簡単な正規表現による解析）
  const lines = valuesContent.split("\n");

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed.startsWith("(")) continue;

    // 基本的な値の抽出（クォートとエスケープを考慮）
    const match = trimmed.match(
      /\('([^']+(?:''[^']*)*)','([^']+(?:''[^']*)*)','?(\d+)'?,'([^']*(?:''[^']*)*)',(true|false)\)/,
    );

    if (match) {
      activities.push({
        slug: match[1].replace(/''/g, "'"),
        title: match[2].replace(/''/g, "'"),
        duration_minutes: parseInt(match[3]),
        location: match[4].replace(/''/g, "'"),
        is_active: match[5] === "true",
      });
    }
  }

  return activities;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  if (req.method !== "POST") {
    return res.status(405).json({
      success: false,
      message: "Method not allowed",
    });
  }

  try {
    // SQLファイルを読み込み
    const sqlPath = path.join(process.cwd(), "scripts", "seed_activities.sql");
    const sqlContent = await fs.readFile(sqlPath, "utf-8");

    // SQLから活動データを解析
    const activities = parseActivitiesFromSQL(sqlContent);

    if (activities.length === 0) {
      return res.status(400).json({
        success: false,
        message: "No activities found in SQL file",
      });
    }

    console.log(`Found ${activities.length} activities to insert`);

    // UPSERTでデータを挿入
    const { data, error } = await supabaseServer
      .from("activities" as any)
      .upsert(activities as any, {
        onConflict: "slug",
        ignoreDuplicates: false,
      })
      .select();

    if (error) {
      console.error("Database error:", error);
      return res.status(500).json({
        success: false,
        message: "Failed to insert activities",
        error: error.message,
      });
    }

    return res.status(200).json({
      success: true,
      message: `Successfully inserted/updated ${activities.length} activities`,
      data: {
        inserted: activities.length,
        activities: data,
      },
    });
  } catch (error) {
    console.error("Setup error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
}
