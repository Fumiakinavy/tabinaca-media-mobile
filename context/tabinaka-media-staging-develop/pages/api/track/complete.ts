/**
 * アクティビティ完了確認API
 * POST /api/track/complete
 * 事業者がアクティビティの完了を確認する
 */

import { NextApiRequest, NextApiResponse } from "next";
import { z } from "zod";
import { supabaseServer } from "@/lib/supabaseServer";

// リクエストボディのバリデーションスキーマ
const completeActivitySchema = z.object({
  bookingId: z.string().min(1, "Booking ID is required"),
  couponCode: z.string().min(1, "Coupon code is required"),
  completedAt: z.string().refine((date) => {
    const parsedDate = new Date(date);
    return !isNaN(parsedDate.getTime());
  }, "Please enter a valid completion date and time"),
  completedBy: z
    .enum(["vendor", "user", "system"])
    .refine(() => true, "Completion confirmed by is required"),
  notes: z.string().optional(),
});

type CompleteActivityRequest = z.infer<typeof completeActivitySchema>;

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  // POSTメソッドのみ許可
  if (req.method !== "POST") {
    return res.status(405).json({
      error: "Method Not Allowed",
      message: "This endpoint only supports POST method",
    });
  }

  try {
    // デバッグ情報を出力
    console.log("🔍 Activity completion request:", {
      method: req.method,
      body: req.body,
      headers: req.headers,
    });

    // リクエストボディの検証
    const validatedData = completeActivitySchema.parse(req.body);
    const { bookingId, couponCode, completedAt, completedBy, notes } =
      validatedData;

    console.log("✅ Validated data:", {
      bookingId,
      couponCode,
      completedAt,
      completedBy,
      notes,
    });

    // 予約情報を取得（form_submissionsテーブルから）
    const { data: bookingData, error: fetchError } = (await supabaseServer
      .from("form_submissions" as any)
      .select(
        `
        booking_id,
        coupon_code,
        activity_title,
        experience_slug,
        user_name,
        user_email,
        party_size,
        booking_date,
        status,
        scans_used,
        max_scans,
        created_at
      `,
      )
      .eq("booking_id", bookingId)
      .eq("coupon_code", couponCode)
      .single()) as any;

    console.log("🔍 Database query result:", {
      bookingId,
      couponCode,
      data: bookingData,
      error: fetchError?.message,
      errorCode: fetchError?.code,
    });

    if (fetchError || !bookingData) {
      console.error("❌ Booking not found:", {
        bookingId,
        couponCode,
        error: fetchError?.message,
      });
      return res.status(404).json({
        success: false,
        error: "Booking Not Found",
        message: "The specified booking was not found",
      });
    }

    // 予約の有効性をチェック
    const bookingDate = new Date(bookingData.booking_date);
    const now = new Date();

    // 有効期限チェック（予約日の翌日まで）
    const expiryDate = new Date(bookingDate);
    expiryDate.setDate(expiryDate.getDate() + 1);

    if (now > expiryDate) {
      return res.status(400).json({
        success: false,
        error: "Booking Expired",
        message: "This booking has expired",
      });
    }

    // ステータスチェック（1回スキャン用に簡素化）
    if (bookingData.status === "completed") {
      return res.status(400).json({
        success: false,
        error: "Already Completed",
        message: "This booking has already been completed",
      });
    }

    // 1回スキャンで完了とする
    const newScansUsed = 1;

    console.log("🔄 Updating form_submissions:", {
      bookingId,
      couponCode,
      newScansUsed,
      newStatus: "completed",
    });

    const updateQuery = supabaseServer.from("form_submissions" as any) as any;
    const { error: updateError } = await updateQuery
      .update({
        scans_used: newScansUsed,
        last_scanned_at: completedAt,
        status: "completed",
      } as any)
      .eq("booking_id", bookingId)
      .eq("coupon_code", couponCode);

    console.log("🔄 Update result:", {
      updateError: updateError?.message,
      updateErrorCode: updateError?.code,
    });

    if (updateError) {
      console.error("予約情報の更新エラー:", updateError);
      return res.status(500).json({
        success: false,
        error: "Database Error",
        message: "Failed to update booking information",
        details: updateError.message,
      });
    }

    // アクティビティ完了を記録（シンプル版）
    const completionData = {
      activity_name: bookingData.activity_title,
      experience_slug: bookingData.experience_slug,
      completed_at: completedAt,
      user_name: bookingData.user_name,
      user_email: bookingData.user_email,
      party_size: bookingData.party_size,
      booking_id: bookingId,
      coupon_code: couponCode,
    };

    console.log("📝 Inserting into activity_completions:", completionData);

    const { error: completionError } = await supabaseServer
      .from("activity_completions" as any)
      .insert(completionData as any);

    console.log("📝 Activity completion insert result:", {
      completionError: completionError?.message,
      completionErrorCode: completionError?.code,
    });

    if (completionError) {
      console.error("アクティビティ完了の記録エラー:", completionError);
      // 完了記録の失敗は致命的ではないので、警告のみ
      console.log(
        "⚠️ アクティビティ完了の記録に失敗しましたが、form_submissionsの更新は成功しています",
      );
    } else {
      console.log("✅ アクティビティ完了を記録しました:", {
        bookingId,
        activityName: bookingData.activity_title,
        userName: bookingData.user_name,
      });
    }

    // 成功レスポンス
    res.status(200).json({
      success: true,
      message: "Activity completion confirmed",
      data: {
        bookingId,
        couponCode,
        activityTitle: bookingData.activity_title,
        userName: bookingData.user_name,
        partySize: bookingData.party_size,
        completedAt,
        completedBy,
      },
    });
  } catch (error) {
    console.error("アクティビティ完了確認エラー:", error);

    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: "Validation Error",
        message: "Request data is invalid",
        details: error.errors,
      });
    }

    res.status(500).json({
      success: false,
      error: "Internal Server Error",
      message: "An internal server error occurred",
    });
  }
}
