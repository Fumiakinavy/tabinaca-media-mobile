/**
 * QRコード表示ページ
 * /qr/[bookingId]
 */

import { GetServerSideProps } from "next";
import { useState, useEffect } from "react";
import Head from "next/head";
import { supabaseServer } from "@/lib/supabaseServer";
import {
  QRCodeData,
  generateQRCodeDataURLFromUrl,
} from "@/lib/qrCodeGenerator";

interface QRCodePageProps {
  bookingData: {
    bookingId: string;
    couponCode: string;
    activityTitle: string;
    activityLocation: string;
    userName: string;
    userEmail: string;
    partySize: number;
    bookingDate: string;
    status: string;
    scansUsed: number;
    maxScans: number;
    qrCodeData?: string; // JSON文字列として保存されたQRコードデータ
  } | null;
  error?: string;
}

export default function QRCodePage({ bookingData, error }: QRCodePageProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [scanMessage, setScanMessage] = useState("");
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string | null>(null);

  const bookingDate = new Date(bookingData?.bookingDate || new Date());
  const remainingScans =
    (bookingData?.maxScans || 3) - (bookingData?.scansUsed || 0);
  const isExpired = bookingDate < new Date();
  const isMaxScansReached = remainingScans <= 0;

  // QRコードを生成
  useEffect(() => {
    if (bookingData && !isExpired && !isMaxScansReached) {
      const generateQRCode = async () => {
        try {
          // トラッキング用URLを生成（クライアントサイドでは現在のoriginを使用）
          const baseUrl =
            typeof window !== "undefined"
              ? window.location.origin
              : "https://gappy.app";
          const trackingUrl = `${baseUrl}/track/${bookingData.bookingId}`;

          console.log("🔗 Client-side QR code generation:", {
            baseUrl,
            trackingUrl,
            bookingId: bookingData.bookingId,
          });

          // QRコードを生成
          const qrDataUrl = await generateQRCodeDataURLFromUrl(trackingUrl, {
            size: 200,
            margin: 2,
          });

          setQrCodeDataUrl(qrDataUrl);
        } catch (error) {
          console.error("QRコード生成エラー:", error);
        }
      };

      generateQRCode();
    }
  }, [bookingData, isExpired, isMaxScansReached]);

  if (error || !bookingData) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Head>
          <title>QRコード - Gappy</title>
          <meta name="robots" content="noindex, nofollow" />
        </Head>

        <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-6 text-center">
          <div className="text-red-500 mb-4">
            <svg
              className="w-16 h-16 mx-auto"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.502 0L4.732 15.5c-.77.833.192 2.5 1.732 2.5z"
              />
            </svg>
          </div>
          <h1 className="text-xl font-bold text-gray-900 mb-2">
            QR Code Not Found
          </h1>
          <p className="text-gray-600 mb-4">
            {error || "The specified QR code does not exist or has expired."}
          </p>
          <a
            href="/"
            className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
          >
            Return to Home
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <Head>
        <title>{bookingData.activityTitle} - QRコード | Gappy</title>
        <meta name="robots" content="noindex, nofollow" />
      </Head>

      <div className="max-w-md mx-auto">
        {/* ヘッダー */}
        <div className="bg-green-600 text-white rounded-t-lg p-4 text-center">
          <h1 className="text-lg font-bold">GAPPY</h1>
          <p className="text-sm opacity-90">Authentic Japanese Experiences</p>
        </div>

        {/* 予約情報 */}
        <div className="bg-white p-6 border-x border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900 mb-2">
            {bookingData.activityTitle}
          </h2>
          <div className="space-y-2 text-sm text-gray-600">
            <p>
              <span className="font-medium">予約者:</span>{" "}
              {bookingData.userName}
            </p>
            <p>
              <span className="font-medium">参加人数:</span>{" "}
              {bookingData.partySize}名
            </p>
            <p>
              <span className="font-medium">予約日:</span>{" "}
              {bookingDate.toLocaleDateString("ja-JP")}
            </p>
            <p>
              <span className="font-medium">場所:</span>{" "}
              {bookingData.activityLocation}
            </p>
            <p>
              <span className="font-medium">予約ID:</span>{" "}
              {bookingData.bookingId}
            </p>
          </div>
        </div>

        {/* QRコードセクション */}
        <div className="bg-white p-6 border-x border-gray-200">
          {isExpired ? (
            <div className="text-center py-8">
              <div className="text-red-500 mb-4">
                <svg
                  className="w-12 h-12 mx-auto"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-red-600 mb-2">
                有効期限切れ
              </h3>
              <p className="text-gray-600">
                このQRコードの有効期限が切れています。
              </p>
            </div>
          ) : isMaxScansReached ? (
            <div className="text-center py-8">
              <div className="text-orange-500 mb-4">
                <svg
                  className="w-12 h-12 mx-auto"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-orange-600 mb-2">
                使用済み
              </h3>
              <p className="text-gray-600">
                このQRコードは既に最大回数使用されています。
              </p>
            </div>
          ) : (
            <div className="text-center">
              <h3 className="text-lg font-semibold text-green-600 mb-4">
                Your QR Code
              </h3>
              <div className="bg-gray-50 rounded-lg p-4 mb-4 inline-block">
                <div className="w-48 h-48 bg-white rounded border-2 border-gray-200 flex items-center justify-center">
                  {qrCodeDataUrl ? (
                    <img
                      src={qrCodeDataUrl}
                      alt="QR Code"
                      className="w-full h-full object-contain"
                    />
                  ) : (
                    <div className="text-gray-400 text-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-400 mx-auto mb-2"></div>
                      <p className="text-xs">生成中...</p>
                    </div>
                  )}
                </div>
              </div>
              <p className="text-sm text-green-700 mb-2">
                店舗でこのQRコードを提示してください
              </p>
              <p className="text-xs text-gray-500">
                残り{remainingScans}回まで使用可能
              </p>
              <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                <p className="text-sm text-blue-800">
                  <strong>予約ID:</strong> {bookingData.bookingId}
                </p>
                <p className="text-sm text-blue-800">
                  <strong>クーポンコード:</strong> {bookingData.couponCode}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* ステータス情報 */}
        <div className="bg-white p-4 border-x border-gray-200">
          <div className="flex justify-between items-center text-sm">
            <span className="text-gray-600">スキャン回数</span>
            <span className="font-medium">
              {bookingData.scansUsed} / {bookingData.maxScans}
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
            <div
              className="bg-green-600 h-2 rounded-full transition-all"
              style={{
                width: `${(bookingData.scansUsed / bookingData.maxScans) * 100}%`,
              }}
            />
          </div>
        </div>

        {/* 使用方法 */}
        <div className="bg-white p-4 rounded-b-lg border border-gray-200">
          <h4 className="font-medium text-gray-900 mb-2">使用方法</h4>
          <ol className="text-sm text-gray-600 space-y-1">
            <li>1. 店舗でこのQRコードを提示してください</li>
            <li>2. スタッフがQRコードをスキャンします</li>
            <li>3. 体験をお楽しみください！</li>
          </ol>
        </div>

        {/* フッター */}
        <div className="text-center mt-6">
          <a
            href="/"
            className="text-green-600 hover:text-green-700 text-sm font-medium"
          >
            ← Gappyホームに戻る
          </a>
        </div>
      </div>
    </div>
  );
}

export const getServerSideProps: GetServerSideProps = async (context) => {
  const { bookingId } = context.params!;

  if (!bookingId || typeof bookingId !== "string") {
    return {
      props: {
        bookingData: null,
        error: "Invalid booking ID",
      },
    };
  }

  try {
    console.log("🔍 Server-side QR page request:", {
      bookingId,
      nodeEnv: process.env.NODE_ENV,
      hasSupabaseUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
      hasServiceKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
    });

    // データベースから予約情報を取得
    const { data, error } = (await supabaseServer
      .from("form_submissions" as any)
      .select(
        `
        booking_id,
        coupon_code,
        activity_title,
        activity_location,
        user_name,
        user_email,
        party_size,
        booking_date,
        status,
        scans_used,
        max_scans,
        qr_code_data,
        experience_title,
        first_name,
        last_name,
        email
      `,
      )
      .eq("booking_id", bookingId)
      .single()) as any;

    if (error) {
      console.error("Database query error:", error);
      return {
        props: {
          bookingData: null,
          error: `Database error: ${error.message}`,
        },
      };
    }

    if (!data) {
      return {
        props: {
          bookingData: null,
          error: "Data for the specified booking ID was not found",
        },
      };
    }

    return {
      props: {
        bookingData: {
          bookingId: data.booking_id || bookingId,
          couponCode: data.coupon_code || "N/A",
          activityTitle:
            data.activity_title || data.experience_title || "Unknown Activity",
          activityLocation: data.activity_location || "Tokyo, Japan",
          userName:
            data.user_name ||
            `${data.first_name || ""} ${data.last_name || ""}`.trim() ||
            "Guest",
          userEmail: data.user_email || data.email || "N/A",
          partySize: data.party_size || 1,
          bookingDate: data.booking_date || new Date().toISOString(),
          status: data.status || "confirmed",
          scansUsed: data.scans_used || 0,
          maxScans: data.max_scans || 3,
          qrCodeData: data.qr_code_data,
        },
      },
    };
  } catch (error) {
    console.error("予約情報の取得エラー:", error);
    return {
      props: {
        bookingData: null,
        error: "An error occurred while fetching data",
      },
    };
  }
};
