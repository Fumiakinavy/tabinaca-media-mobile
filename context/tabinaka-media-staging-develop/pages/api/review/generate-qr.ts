/**
 * レビュー投稿用QRコード生成API
 * POST /api/review/generate-qr
 * 事業者がレビュー投稿用のQRコードを生成する
 */

import { NextApiRequest, NextApiResponse } from "next";
import { z } from "zod";
import { generateQRCodeDataURLFromUrl } from "@/lib/qrCodeGenerator";

// リクエストボディのバリデーションスキーマ
const generateReviewQRSchema = z.object({
  activityName: z.string().min(1, "Activity name is required"),
  bookingId: z.string().min(1, "Booking ID is required"),
  couponCode: z.string().min(1, "Coupon code is required"),
  userName: z.string().min(1, "User name is required"),
  userEmail: z.string().email("Please enter a valid email address"),
});

type GenerateReviewQRRequest = z.infer<typeof generateReviewQRSchema>;

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
    const validatedData = generateReviewQRSchema.parse(req.body);
    const { activityName, bookingId, couponCode, userName, userEmail } =
      validatedData;

    console.log("🔍 Generating review QR code:", {
      activityName,
      bookingId,
      couponCode,
      userName,
      userEmail,
    });

    // レビュー投稿用URLを生成（ユーザー情報を埋め込み）
    const baseUrl =
      process.env.NEXT_PUBLIC_BASE_URL ||
      (process.env.NODE_ENV === "development"
        ? "http://localhost:2098"
        : "https://gappy.app");

    console.log("🔗 Review QR base URL:", {
      baseUrl,
      nodeEnv: process.env.NODE_ENV,
      hasBaseUrlEnv: !!process.env.NEXT_PUBLIC_BASE_URL,
    });

    // URLパラメータとしてユーザー情報を埋め込む
    const reviewUrl =
      `${baseUrl}/review/${bookingId}?` +
      new URLSearchParams({
        activity: activityName,
        coupon: couponCode,
        user: userName,
        email: userEmail,
      }).toString();

    console.log("🔗 Review URL generated with user data:", {
      baseUrl,
      reviewUrl,
      embeddedData: {
        activityName,
        couponCode,
        userName,
        userEmail,
      },
    });

    // QRコードを生成
    const qrDataUrl = await generateQRCodeDataURLFromUrl(reviewUrl, {
      size: 300,
      margin: 2,
    });

    // 成功レスポンス
    res.status(200).json({
      success: true,
      data: {
        reviewUrl,
        qrDataUrl,
        activityName,
        bookingId,
        couponCode,
        userName,
        userEmail,
      },
    });
  } catch (error) {
    console.error("レビューQRコード生成エラー:", error);

    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: "Validation Error",
        message: "Invalid request data",
        details: error.errors,
      });
    }

    res.status(500).json({
      success: false,
      error: "Internal Server Error",
      message: "Internal server error occurred",
    });
  }
}
