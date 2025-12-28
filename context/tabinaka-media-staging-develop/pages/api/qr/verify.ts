/**
 * QRコード検証・スキャンAPI
 * POST /api/qr/verify
 */

import { NextApiRequest, NextApiResponse } from "next";
import { z } from "zod";
import {
  parseQRCodeData,
  isQRCodeValid,
  QRCodeData,
} from "@/lib/qrCodeGenerator";
import { supabaseServer } from "@/lib/supabaseServer";

// リクエストボディのバリデーションスキーマ
const verifyQRCodeSchema = z.object({
  qrContent: z.string().min(1, "QRコードの内容は必須です"),
  scanLocation: z
    .object({
      lat: z.number().optional(),
      lng: z.number().optional(),
      address: z.string().optional(),
    })
    .optional(),
  scannedBy: z
    .object({
      vendorId: z.string().optional(),
      vendorName: z.string().optional(),
      staffName: z.string().optional(),
    })
    .optional(),
});

type VerifyQRCodeRequest = z.infer<typeof verifyQRCodeSchema>;

// スキャン履歴をデータベースに記録
async function recordScanHistory(
  qrData: QRCodeData,
  scanResult: "success" | "failed",
  scanLocation?: VerifyQRCodeRequest["scanLocation"],
  scannedBy?: VerifyQRCodeRequest["scannedBy"],
  failureReason?: string,
) {
  try {
    const scanRecord = {
      booking_id: qrData.bookingId,
      coupon_code: qrData.couponCode,
      user_email: qrData.user.email,
      activity_slug: qrData.activity.slug,
      scan_result: scanResult,
      failure_reason: failureReason || null,
      scan_location: scanLocation || null,
      scanned_by: scannedBy || null,
      scanned_at: new Date().toISOString(),
    };

    const { error } = await supabaseServer
      .from("qr_scan_history" as any)
      .insert([scanRecord] as any);

    if (error) {
      console.error("スキャン履歴の記録に失敗:", error);
    }
  } catch (error) {
    console.error("スキャン履歴の記録中にエラー:", error);
  }
}

// スキャン回数を更新
async function updateScanCount(bookingId: string, couponCode: string) {
  try {
    // 現在のスキャン回数を取得
    const { data: currentData, error: fetchError } = await supabaseServer
      .from("bookings" as any)
      .select("scans_used")
      .eq("booking_id", bookingId)
      .eq("coupon_code", couponCode)
      .single<{ scans_used: number }>();

    if (fetchError) {
      console.error("現在のスキャン回数の取得に失敗:", fetchError);
      return false;
    }

    // スキャン回数を増加
    const newScansUsed = (currentData?.scans_used || 0) + 1;

    const updateQuery = supabaseServer.from("bookings" as any) as any;
    const { error: updateError } = await updateQuery
      .update({
        scans_used: newScansUsed,
        last_scanned_at: new Date().toISOString(),
      } as any)
      .eq("booking_id", bookingId)
      .eq("coupon_code", couponCode);

    if (updateError) {
      console.error("スキャン回数の更新に失敗:", updateError);
      return false;
    }

    return true;
  } catch (error) {
    console.error("スキャン回数の更新中にエラー:", error);
    return false;
  }
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  // POSTメソッドのみ許可
  if (req.method !== "POST") {
    return res.status(405).json({
      error: "Method Not Allowed",
      message: "このエンドポイントはPOSTメソッドのみサポートしています",
    });
  }

  try {
    // リクエストボディの検証
    const validatedData = verifyQRCodeSchema.parse(req.body);
    const { qrContent, scanLocation, scannedBy } = validatedData;

    // QRコードデータを解析
    let qrData: QRCodeData;
    try {
      qrData = parseQRCodeData(qrContent);
    } catch (parseError) {
      // 解析エラーを記録（可能な範囲で）
      await recordScanHistory(
        {
          bookingId: "unknown",
          couponCode: "unknown",
          user: { name: "unknown", email: "unknown", partySize: 0 },
          activity: {
            slug: "unknown",
            title: "unknown",
            duration: 0,
            location: "unknown",
          },
          booking: { date: "", status: "pending", maxScans: 0, scansUsed: 0 },
          signature: "",
          expiresAt: "",
          createdAt: "",
        } as QRCodeData,
        "failed",
        scanLocation,
        scannedBy,
        `QRコード解析エラー: ${parseError}`,
      );

      return res.status(400).json({
        success: false,
        error: "Invalid QR Code",
        message: "QRコードの形式が無効です",
        details:
          parseError instanceof Error ? parseError.message : "Unknown error",
      });
    }

    // QRコードの有効性をチェック
    const validationResult = isQRCodeValid(qrData);

    if (!validationResult.isValid) {
      // 無効なQRコードのスキャンを記録
      await recordScanHistory(
        qrData,
        "failed",
        scanLocation,
        scannedBy,
        `QRコード無効: ${validationResult.reasons.join(", ")}`,
      );

      return res.status(400).json({
        success: false,
        error: "Invalid QR Code",
        message: "QRコードが無効です",
        reasons: validationResult.reasons,
        data: {
          bookingId: qrData.bookingId,
          couponCode: qrData.couponCode,
          activityTitle: qrData.activity.title,
          expiresAt: qrData.expiresAt,
          scansUsed: qrData.booking.scansUsed,
          maxScans: qrData.booking.maxScans,
        },
      });
    }

    // スキャン回数を更新
    const scanUpdateSuccess = await updateScanCount(
      qrData.bookingId,
      qrData.couponCode,
    );

    if (!scanUpdateSuccess) {
      // データベース更新失敗を記録
      await recordScanHistory(
        qrData,
        "failed",
        scanLocation,
        scannedBy,
        "データベースのスキャン回数更新に失敗",
      );

      return res.status(500).json({
        success: false,
        error: "Database Error",
        message: "スキャン回数の更新に失敗しました",
      });
    }

    // 成功したスキャンを記録
    await recordScanHistory(qrData, "success", scanLocation, scannedBy);

    // 成功レスポンス
    res.status(200).json({
      success: true,
      message: "QRコードが正常にスキャンされました",
      data: {
        bookingId: qrData.bookingId,
        couponCode: qrData.couponCode,
        user: {
          name: qrData.user.name,
          email: qrData.user.email,
          partySize: qrData.user.partySize,
        },
        activity: {
          title: qrData.activity.title,
          duration: qrData.activity.duration,
          location: qrData.activity.location,
        },
        booking: {
          date: qrData.booking.date,
          status: qrData.booking.status,
          scansUsed: qrData.booking.scansUsed + 1, // 更新後の値
          maxScans: qrData.booking.maxScans,
          remainingScans:
            qrData.booking.maxScans - (qrData.booking.scansUsed + 1),
        },
        scannedAt: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error("QRコード検証エラー:", error);

    // バリデーションエラー
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: "Validation Error",
        message: "リクエストデータが無効です",
        details: error.errors.map((err) => ({
          field: err.path.join("."),
          message: err.message,
        })),
      });
    }

    // その他のエラー
    res.status(500).json({
      success: false,
      error: "Internal Server Error",
      message: "QRコードの検証中にエラーが発生しました",
    });
  }
}
