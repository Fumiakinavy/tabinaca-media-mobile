/**
 * QRコード生成API
 * POST /api/qr/generate
 */

import { NextApiRequest, NextApiResponse } from "next";
import { z } from "zod";
import { generateEmailQRCode, QRCodeData } from "@/lib/qrCodeGenerator";

// リクエストボディのバリデーションスキーマ
const generateQRCodeSchema = z.object({
  bookingId: z.string().min(1, "Booking IDは必須です"),
  couponCode: z.string().min(1, "クーポンコードは必須です"),
  user: z.object({
    name: z.string().min(1, "ユーザー名は必須です"),
    email: z.string().email("有効なメールアドレスを入力してください"),
    phone: z.string().optional(),
    partySize: z
      .number()
      .min(1, "参加人数は1人以上である必要があります")
      .max(20, "参加人数は20人以下である必要があります"),
  }),
  activity: z.object({
    slug: z.string().min(1, "アクティビティスラグは必須です"),
    title: z.string().min(1, "アクティビティタイトルは必須です"),
    duration: z.number().min(1, "所要時間は1分以上である必要があります"),
    location: z.string().min(1, "場所は必須です"),
  }),
  bookingDate: z.string().refine((date) => {
    const parsedDate = new Date(date);
    return !isNaN(parsedDate.getTime());
  }, "有効な予約日を入力してください"),
  options: z
    .object({
      size: z.number().optional(),
      margin: z.number().optional(),
      errorCorrectionLevel: z.enum(["L", "M", "Q", "H"]).optional(),
      maxScans: z.number().min(1).max(10).optional(),
    })
    .optional(),
});

type GenerateQRCodeRequest = z.infer<typeof generateQRCodeSchema>;

// Edge RuntimeはQRコード生成と互換性がないため削除
// export const runtime = 'edge';

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
    const validatedData = generateQRCodeSchema.parse(req.body);
    const { bookingId, couponCode, user, activity, bookingDate, options } =
      validatedData;

    // 予約日をDateオブジェクトに変換
    const bookingDateObj = new Date(bookingDate);

    // 過去の日付チェック
    const now = new Date();
    now.setHours(0, 0, 0, 0); // 今日の00:00:00に設定
    if (bookingDateObj < now) {
      return res.status(400).json({
        error: "Invalid Booking Date",
        message: "予約日は今日以降である必要があります",
      });
    }

    // QRコードを生成
    const emailQRCode = await generateEmailQRCode(
      bookingId,
      couponCode,
      user,
      activity,
      bookingDateObj,
      options || {},
      options?.maxScans || 3,
    );

    // レスポンス
    res.status(200).json({
      success: true,
      data: {
        bookingId,
        qrUrl: emailQRCode.qrUrl,
        qrDataUrl: emailQRCode.qrDataUrl,
        // セキュリティ上、qrBufferは直接返さない
        hasQRBuffer: true,
        createdAt: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error("QRコード生成エラー:", error);

    // バリデーションエラー
    if (error instanceof z.ZodError) {
      return res.status(400).json({
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
      error: "Internal Server Error",
      message: "QRコードの生成中にエラーが発生しました",
    });
  }
}
