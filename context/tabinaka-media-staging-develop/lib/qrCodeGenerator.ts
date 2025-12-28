/**
 * QRコード生成ユーティリティ
 * ユーザー情報とアクティビティ情報を含んだQRコードを生成
 */

import QRCode from "qrcode";
import crypto from "crypto";

// QRコードに含めるデータの型定義
export interface QRCodeData {
  // 予約情報
  bookingId: string;
  couponCode: string;

  // ユーザー情報
  user: {
    name: string;
    email: string;
    phone?: string;
    partySize: number;
  };

  // アクティビティ情報
  activity: {
    slug: string;
    title: string;
    duration: number; // 分単位
    location: string;
  };

  // 予約詳細
  booking: {
    date: string; // ISO 8601 format
    status: "confirmed" | "pending" | "cancelled";
    maxScans: number; // 最大スキャン回数
    scansUsed: number; // 使用済みスキャン回数
  };

  // セキュリティ
  signature: string; // データ改ざん防止用の署名
  expiresAt: string; // 有効期限 (ISO 8601)
  createdAt: string; // 作成日時 (ISO 8601)
}

// QRコード生成オプション
export interface QRCodeGenerationOptions {
  size?: number; // QRコードのサイズ (px)
  margin?: number; // マージン
  errorCorrectionLevel?: "L" | "M" | "Q" | "H";
  type?: "png" | "svg";
  color?: {
    dark?: string;
    light?: string;
  };
}

// デフォルトオプション
const DEFAULT_OPTIONS: Required<QRCodeGenerationOptions> = {
  size: 300,
  margin: 2,
  errorCorrectionLevel: "M",
  type: "png",
  color: {
    dark: "#000000",
    light: "#FFFFFF",
  },
};

/**
 * データの署名を生成（改ざん防止）
 */
function generateSignature(data: Omit<QRCodeData, "signature">): string {
  const secretKey =
    process.env.QR_CODE_SECRET_KEY || "gappy-default-secret-key";
  const dataString = JSON.stringify(data);
  return crypto
    .createHmac("sha256", secretKey)
    .update(dataString)
    .digest("hex");
}

/**
 * 署名を検証
 */
export function verifyQRCodeSignature(qrData: QRCodeData): boolean {
  const { signature, ...dataWithoutSignature } = qrData;
  const expectedSignature = generateSignature(dataWithoutSignature);
  return signature === expectedSignature;
}

/**
 * QRコード用のデータを準備
 */
export function prepareQRCodeData(
  bookingId: string,
  couponCode: string,
  user: QRCodeData["user"],
  activity: QRCodeData["activity"],
  bookingDate: Date,
  maxScans: number = 3,
): QRCodeData {
  const now = new Date();
  const expiresAt = new Date(bookingDate);
  expiresAt.setDate(expiresAt.getDate() + 1); // 予約日の翌日まで有効

  const dataWithoutSignature: Omit<QRCodeData, "signature"> = {
    bookingId,
    couponCode,
    user,
    activity,
    booking: {
      date: bookingDate.toISOString(),
      status: "confirmed",
      maxScans,
      scansUsed: 0,
    },
    expiresAt: expiresAt.toISOString(),
    createdAt: now.toISOString(),
  };

  const signature = generateSignature(dataWithoutSignature);

  return {
    ...dataWithoutSignature,
    signature,
  };
}

/**
 * QRコードを生成（Buffer形式）
 */
export async function generateQRCodeBuffer(
  qrData: QRCodeData,
  options: QRCodeGenerationOptions = {},
): Promise<Buffer> {
  const mergedOptions = { ...DEFAULT_OPTIONS, ...options };

  // データをJSON文字列に変換
  const qrContent = JSON.stringify(qrData);

  try {
    const qrOptions = {
      width: mergedOptions.size,
      margin: mergedOptions.margin,
      errorCorrectionLevel: mergedOptions.errorCorrectionLevel,
      color: {
        dark: mergedOptions.color.dark,
        light: mergedOptions.color.light,
      },
    };

    if (mergedOptions.type === "svg") {
      const svgString = await QRCode.toString(qrContent, {
        ...qrOptions,
        type: "svg",
      });
      return Buffer.from(svgString);
    } else {
      return await QRCode.toBuffer(qrContent, qrOptions);
    }
  } catch (error) {
    throw new Error(`QRコード生成に失敗しました: ${error}`);
  }
}

/**
 * QRコードを生成（Data URL形式）
 */
export async function generateQRCodeDataURL(
  qrData: QRCodeData,
  options: QRCodeGenerationOptions = {},
): Promise<string> {
  const mergedOptions = { ...DEFAULT_OPTIONS, ...options };

  // データをJSON文字列に変換
  const qrContent = JSON.stringify(qrData);

  try {
    const qrOptions = {
      width: mergedOptions.size,
      margin: mergedOptions.margin,
      errorCorrectionLevel: mergedOptions.errorCorrectionLevel,
      color: {
        dark: mergedOptions.color.dark,
        light: mergedOptions.color.light,
      },
    };

    return await QRCode.toDataURL(qrContent, qrOptions);
  } catch (error) {
    throw new Error(`QRコード生成に失敗しました: ${error}`);
  }
}

/**
 * QRコードのデータを解析
 */
export function parseQRCodeData(qrContent: string): QRCodeData {
  try {
    const qrData: QRCodeData = JSON.parse(qrContent);

    // 基本的な構造検証
    if (
      !qrData.bookingId ||
      !qrData.couponCode ||
      !qrData.user ||
      !qrData.activity ||
      !qrData.booking ||
      !qrData.signature
    ) {
      throw new Error("QRコードデータの構造が不正です");
    }

    // 署名検証
    if (!verifyQRCodeSignature(qrData)) {
      throw new Error("QRコードの署名が無効です");
    }

    // 有効期限チェック
    const now = new Date();
    const expiresAt = new Date(qrData.expiresAt);
    if (now > expiresAt) {
      throw new Error("QRコードの有効期限が切れています");
    }

    return qrData;
  } catch (error) {
    throw new Error(`QRコードの解析に失敗しました: ${error}`);
  }
}

/**
 * QRコードが有効かチェック
 */
export function isQRCodeValid(qrData: QRCodeData): {
  isValid: boolean;
  reasons: string[];
} {
  const reasons: string[] = [];

  // 有効期限チェック
  const now = new Date();
  const expiresAt = new Date(qrData.expiresAt);
  if (now > expiresAt) {
    reasons.push("有効期限が切れています");
  }

  // スキャン回数チェック
  if (qrData.booking.scansUsed >= qrData.booking.maxScans) {
    reasons.push("最大スキャン回数に達しています");
  }

  // ステータスチェック
  if (qrData.booking.status !== "confirmed") {
    reasons.push(`予約ステータスが無効です: ${qrData.booking.status}`);
  }

  // 署名チェック
  if (!verifyQRCodeSignature(qrData)) {
    reasons.push("署名が無効です");
  }

  return {
    isValid: reasons.length === 0,
    reasons,
  };
}

/**
 * QRコード用の短縮URL生成（オプション）
 */
export function generateQRCodeUrl(bookingId: string): string {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "https://gappy.app";
  return `${baseUrl}/qr/${bookingId}`;
}

/**
 * トラッキング用の短縮URL生成
 * 事業者がQRコードをスキャンしてアクティビティ完了を確認するためのURL
 */
export function generateTrackingUrl(bookingId: string): string {
  // 環境変数からベースURLを取得、フォールバック値を設定
  const baseUrl =
    process.env.NEXT_PUBLIC_BASE_URL ||
    (process.env.NODE_ENV === "development"
      ? "http://localhost:2098"
      : "https://gappy.app");

  const trackingUrl = `${baseUrl}/track/${bookingId}`;

  // デバッグ情報を出力
  console.log("🔗 Tracking URL generated:", {
    bookingId,
    baseUrl,
    trackingUrl,
    nodeEnv: process.env.NODE_ENV,
    hasBaseUrlEnv: !!process.env.NEXT_PUBLIC_BASE_URL,
    isServer: typeof window === "undefined",
  });

  return trackingUrl;
}

/**
 * メール用のQRコードデータ構造
 */
export interface EmailQRCodeData {
  qrUrl: string;
  qrBuffer: Buffer;
  qrDataUrl: string;
}

/**
 * メール送信用のQRコードデータを生成
 */
export async function generateEmailQRCode(
  bookingId: string,
  couponCode: string,
  user: QRCodeData["user"],
  activity: QRCodeData["activity"],
  bookingDate: Date,
  options: QRCodeGenerationOptions = {},
  maxScans: number = 3,
): Promise<EmailQRCodeData> {
  // トラッキング用URL（事業者がスキャンするURL）
  const trackingUrl = generateTrackingUrl(bookingId);

  // QRコードの内容はシンプルなトラッキングURLにする
  // 事業者がスキャンしやすいように、複雑なJSONデータではなくURLのみ
  const [qrBuffer, qrDataUrl] = await Promise.all([
    generateQRCodeBufferFromUrl(trackingUrl, options),
    generateQRCodeDataURLFromUrl(trackingUrl, options),
  ]);

  return {
    qrUrl: trackingUrl, // トラッキングURLを使用
    qrBuffer,
    qrDataUrl,
  };
}

/**
 * URLからQRコードを生成（Buffer形式）
 */
export async function generateQRCodeBufferFromUrl(
  url: string,
  options: QRCodeGenerationOptions = {},
): Promise<Buffer> {
  const mergedOptions = { ...DEFAULT_OPTIONS, ...options };

  // デバッグ情報を出力
  console.log("📱 QR Code content:", {
    url,
    size: mergedOptions.size,
    errorCorrectionLevel: mergedOptions.errorCorrectionLevel,
  });

  try {
    const qrOptions = {
      width: mergedOptions.size,
      margin: mergedOptions.margin,
      errorCorrectionLevel: mergedOptions.errorCorrectionLevel,
      color: {
        dark: mergedOptions.color.dark,
        light: mergedOptions.color.light,
      },
    };

    if (mergedOptions.type === "svg") {
      const svgString = await QRCode.toString(url, {
        ...qrOptions,
        type: "svg",
      });
      return Buffer.from(svgString);
    } else {
      return await QRCode.toBuffer(url, qrOptions);
    }
  } catch (error) {
    throw new Error(`QRコード生成に失敗しました: ${error}`);
  }
}

/**
 * URLからQRコードを生成（Data URL形式）
 */
export async function generateQRCodeDataURLFromUrl(
  url: string,
  options: QRCodeGenerationOptions = {},
): Promise<string> {
  const mergedOptions = { ...DEFAULT_OPTIONS, ...options };

  try {
    const qrOptions = {
      width: mergedOptions.size,
      margin: mergedOptions.margin,
      errorCorrectionLevel: mergedOptions.errorCorrectionLevel,
      color: {
        dark: mergedOptions.color.dark,
        light: mergedOptions.color.light,
      },
    };

    return await QRCode.toDataURL(url, qrOptions);
  } catch (error) {
    throw new Error(`QRコード生成に失敗しました: ${error}`);
  }
}
