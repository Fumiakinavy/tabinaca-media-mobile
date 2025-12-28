/**
 * 事業者向けレビューQRコード表示ページ
 * /business/review-qr/[bookingId]
 * 事業者がレビュー投稿用のQRコードを表示する
 */

import { useState, useEffect, useCallback } from "react";
import Head from "next/head";
import { useRouter } from "next/router";
import Link from "next/link";

interface ReviewQRData {
  reviewUrl: string;
  qrDataUrl: string;
  activityName: string;
  bookingId: string;
  couponCode: string;
  userName: string;
  userEmail: string;
}

interface BusinessReviewQRPageProps {
  bookingData: {
    bookingId: string;
    couponCode: string;
    activityTitle: string;
    userName: string;
    userEmail: string;
    partySize: number;
  } | null;
  error: string | null;
}

export default function BusinessReviewQRPage({
  bookingData,
  error,
}: BusinessReviewQRPageProps) {
  const router = useRouter();
  const [qrData, setQrData] = useState<ReviewQRData | null>(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState<"success" | "error" | "info">(
    "info",
  );

  const generateReviewQR = useCallback(async () => {
    if (!bookingData) return;

    setLoading(true);
    setMessage("");

    try {
      const response = await fetch("/api/review/generate-qr", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          activityName: bookingData.activityTitle,
          bookingId: bookingData.bookingId,
          couponCode: bookingData.couponCode,
          userName: bookingData.userName,
          userEmail: bookingData.userEmail,
        }),
      });

      const result = await response.json();

      if (result.success) {
        setQrData(result.data);
        setMessage("Review QR code generated!");
        setMessageType("success");
      } else {
        setMessage(result.message || "Failed to generate QR code.");
        setMessageType("error");
      }
    } catch (error) {
      console.error("QRコード生成エラー:", error);
      setMessage("A network error occurred.");
      setMessageType("error");
    } finally {
      setLoading(false);
    }
  }, [bookingData]);

  // ページ読み込み時に自動でQRコードを生成
  useEffect(() => {
    if (bookingData) {
      generateReviewQR();
    }
  }, [bookingData, generateReviewQR]);

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
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
                d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">エラー</h1>
          <p className="text-gray-600 mb-6">{error}</p>
          <Link
            href="/"
            className="bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 transition-colors"
          >
            ホームに戻る
          </Link>
        </div>
      </div>
    );
  }

  if (!bookingData) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto mb-4"></div>
          <p className="text-gray-600">読み込み中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <Head>
        <title>レビュー投稿QRコード | Gappy</title>
        <meta name="robots" content="noindex, nofollow" />
      </Head>

      <div className="max-w-2xl mx-auto">
        {/* ヘッダー */}
        <div className="bg-green-600 text-white rounded-t-lg p-6 text-center">
          <h1 className="text-2xl font-bold">レビュー投稿QRコード</h1>
          <p className="mt-2 text-green-100">
            お客様にレビューを書いてもらいましょう
          </p>
        </div>

        {/* 予約情報 */}
        <div className="bg-white p-6 border-x border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            {bookingData.activityTitle}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-gray-600">予約者:</span>
              <span className="ml-2 font-medium">{bookingData.userName}</span>
            </div>
            <div>
              <span className="text-gray-600">参加人数:</span>
              <span className="ml-2 font-medium">
                {bookingData.partySize}名
              </span>
            </div>
          </div>
        </div>

        {/* メッセージ表示 */}
        {message && (
          <div
            className={`p-4 border-x border-gray-200 ${
              messageType === "success"
                ? "bg-green-50 text-green-800"
                : messageType === "error"
                  ? "bg-red-50 text-red-800"
                  : "bg-blue-50 text-blue-800"
            }`}
          >
            <div className="flex items-center">
              {messageType === "success" && (
                <svg
                  className="w-5 h-5 mr-2"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                    clipRule="evenodd"
                  ></path>
                </svg>
              )}
              {messageType === "error" && (
                <svg
                  className="w-5 h-5 mr-2"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                    clipRule="evenodd"
                  ></path>
                </svg>
              )}
              {messageType === "info" && (
                <svg
                  className="w-5 h-5 mr-2"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                    clipRule="evenodd"
                  ></path>
                </svg>
              )}
              <span className="text-sm font-medium">{message}</span>
            </div>
          </div>
        )}

        {/* QRコード表示 */}
        {loading ? (
          <div className="bg-white p-6 border-x border-gray-200">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto mb-4"></div>
              <p className="text-gray-600">QRコードを生成中...</p>
            </div>
          </div>
        ) : qrData ? (
          <div className="bg-white p-6 border-x border-gray-200">
            <div className="text-center">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Review QR Code
              </h3>
              <div className="bg-white p-4 rounded-lg border-2 border-gray-200 inline-block">
                <img
                  src={qrData.qrDataUrl}
                  alt="Review QR code"
                  className="w-64 h-64 mx-auto"
                />
              </div>
              <p className="mt-4 text-lg font-medium text-gray-800">
                Please scan this QR code and write a review!
              </p>
              <p className="mt-2 text-sm text-gray-600">
                このQRコードをスキャンしてレビューを書いてください
              </p>
            </div>
          </div>
        ) : (
          <div className="bg-white p-6 border-x border-gray-200">
            <div className="text-center">
              <p className="text-red-600">QRコードの生成に失敗しました。</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export const getServerSideProps = async (context: any) => {
  const { bookingId } = context.params;

  if (!bookingId || typeof bookingId !== "string") {
    return {
      props: {
        bookingData: null,
        error: "Invalid booking ID",
      },
    };
  }

  try {
    // 実際のデータベースから予約情報を取得
    const { createClient } = await import("@supabase/supabase-js");
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log("🔍 Fetching booking data for review QR:", bookingId);

    const { data: bookingData, error } = await supabase
      .from("form_submissions")
      .select(
        `
        booking_id,
        coupon_code,
        activity_title,
        user_name,
        user_email,
        party_size,
        status
      `,
      )
      .eq("booking_id", bookingId)
      .single();

    console.log("🔍 Database query result:", {
      bookingId,
      data: bookingData,
      error: error?.message,
    });

    if (error || !bookingData) {
      return {
        props: {
          bookingData: null,
          error: "Booking information not found",
        },
      };
    }

    return {
      props: {
        bookingData: {
          bookingId: bookingData.booking_id,
          couponCode: bookingData.coupon_code,
          activityTitle: bookingData.activity_title,
          userName: bookingData.user_name,
          userEmail: bookingData.user_email,
          partySize: bookingData.party_size,
        },
        error: null,
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
