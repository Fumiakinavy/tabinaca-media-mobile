/**
 * レビュー投稿API
 * POST /api/review/submit
 * ユーザーがレビューを投稿する
 */

import { NextApiRequest, NextApiResponse } from "next";
import { z } from "zod";
import { supabaseServer } from "@/lib/supabaseServer";

// リクエストボディのバリデーションスキーマ
const submitReviewSchema = z.object({
  bookingId: z.string().min(1, "Booking ID is required"),
  activityName: z.string().min(1, "Activity name is required"),
  userName: z.string().min(1, "User name is required"),
  userEmail: z.string().email("Please enter a valid email address"),
  couponCode: z.string().min(1, "Coupon code is required"),
  rating: z
    .number()
    .min(1, "Rating must be at least 1")
    .max(5, "Rating must be at most 5"),
  reviewText: z
    .string()
    .min(10, "Review must be at least 10 characters")
    .max(1000, "Review must be at most 1000 characters"),
});

type SubmitReviewRequest = z.infer<typeof submitReviewSchema>;

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
    // リクエストボディの検証
    const validatedData = submitReviewSchema.parse(req.body);
    const {
      bookingId,
      activityName,
      userName,
      userEmail,
      couponCode,
      rating,
      reviewText,
    } = validatedData;

    console.log("🔍 Submitting review with user data:", {
      bookingId,
      activityName,
      userName,
      userEmail,
      couponCode,
      rating,
      reviewTextLength: reviewText.length,
    });

    // 既存のレビューがあるかチェック（booking_id + user_email の組み合わせで重複チェック）
    const { data: existingReview, error: checkError } = await supabaseServer
      .from("reviews" as any)
      .select("id, activity_name, user_name, submitted_at")
      .eq("booking_id", bookingId)
      .eq("user_email", userEmail)
      .single<{
        id: string;
        activity_name: string;
        user_name: string;
        submitted_at: string;
      }>();

    if (checkError && checkError.code !== "PGRST116") {
      // PGRST116は「データが見つからない」エラー
      console.error("既存レビューチェックエラー:", checkError);
      return res.status(500).json({
        success: false,
        error: "Database Error",
        message: "An error occurred while checking for existing reviews",
      });
    }

    if (existingReview) {
      console.log("⚠️ Duplicate review detected:", {
        existingReviewId: existingReview.id,
        activityName: existingReview.activity_name,
        userName: existingReview.user_name,
        submittedAt: existingReview.submitted_at,
      });
      return res.status(400).json({
        success: false,
        error: "Duplicate Review",
        message: "A review has already been submitted for this booking",
        details: {
          existingReviewId: existingReview.id,
          submittedAt: existingReview.submitted_at,
        },
      });
    }

    // レビューをデータベースに挿入
    const reviewData = {
      activity_name: activityName,
      review_text: reviewText,
      rating: rating,
      user_name: userName,
      user_email: userEmail,
      booking_id: bookingId,
      coupon_code: couponCode,
      is_approved: false, // デフォルトで未承認
    };

    console.log("📝 Inserting review:", reviewData);

    const { data: insertedReview, error: insertError } = (await supabaseServer
      .from("reviews" as any)
      .insert(reviewData as any)
      .select()
      .single()) as any;

    console.log("📝 Review insert result:", {
      data: insertedReview,
      error: insertError?.message,
      errorCode: insertError?.code,
    });

    if (insertError) {
      console.error("レビュー投稿エラー:", insertError);
      return res.status(500).json({
        success: false,
        error: "Database Error",
        message: "Failed to submit review",
        details: insertError.message,
      });
    }

    // 成功レスポンス
    res.status(200).json({
      success: true,
      message: "Review submitted",
      data: {
        reviewId: insertedReview.id,
        activityName: insertedReview.activity_name,
        rating: insertedReview.rating,
        submittedAt: insertedReview.submitted_at,
        isApproved: insertedReview.is_approved,
      },
    });
  } catch (error) {
    console.error("レビュー投稿エラー:", error);

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
