/**
 * 完了済みアクティビティ一覧取得API
 * GET /api/completed-activities
 * 完了済みアクティビティの一覧を取得する
 */

import { NextApiRequest, NextApiResponse } from "next";
import { supabaseServer } from "@/lib/supabaseServer";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  // GETメソッドのみ許可
  if (req.method !== "GET") {
    return res.status(405).json({
      error: "Method Not Allowed",
      message: "このエンドポイントはGETメソッドのみサポートしています",
    });
  }

  try {
    const {
      page = "1",
      limit = "20",
      start_date,
      end_date,
      experience_slug,
      user_email,
    } = req.query;

    const pageNum = parseInt(page as string, 10);
    const limitNum = parseInt(limit as string, 10);
    const offset = (pageNum - 1) * limitNum;

    // クエリビルダー
    let query = supabaseServer.from("activity_completions").select(
      `
        id,
        activity_name,
        completed_at,
        user_name,
        user_email,
        party_size,
        booking_id,
        coupon_code,
        created_at
      `,
      { count: "exact" },
    );

    // フィルタリング
    if (start_date) {
      query = query.gte("completed_at", `${start_date}T00:00:00.000Z`);
    }
    if (end_date) {
      query = query.lte("completed_at", `${end_date}T23:59:59.999Z`);
    }
    if (experience_slug) {
      query = query.eq("activity_name", experience_slug);
    }
    if (user_email) {
      query = query.eq("user_email", user_email);
    }

    // ソートとページネーション
    query = query
      .order("completed_at", { ascending: false })
      .range(offset, offset + limitNum - 1);

    const { data, error, count } = await query;

    if (error) {
      console.error("完了済みアクティビティ取得エラー:", error);
      return res.status(500).json({
        success: false,
        error: "Database Error",
        message: "完了済みアクティビティの取得に失敗しました",
      });
    }

    // 統計情報を取得（シンプル版）
    const { data: statsData, error: statsError } = await supabaseServer
      .from("activity_completions")
      .select("*", { count: "exact" });

    if (statsError) {
      console.error("統計情報取得エラー:", statsError);
    }

    // 成功レスポンス
    res.status(200).json({
      success: true,
      data: {
        activities: data || [],
        pagination: {
          page: pageNum,
          limit: limitNum,
          total: count || 0,
          totalPages: Math.ceil((count || 0) / limitNum),
        },
        stats: {
          total_completed: count || 0,
          unique_users: 0, // 簡素化のため削除
          total_party_size: 0, // 簡素化のため削除
          avg_party_size: 0, // 簡素化のため削除
          most_popular_activity: "", // 簡素化のため削除
          completion_rate: 0, // 簡素化のため削除
        },
      },
    });
  } catch (error) {
    console.error("完了済みアクティビティ取得エラー:", error);
    res.status(500).json({
      success: false,
      error: "Internal Server Error",
      message: "サーバー内部エラーが発生しました",
    });
  }
}
