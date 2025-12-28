/**
 * QRコードトラッキングページ（事業者向け）
 * /track/[bookingId]
 * 事業者がQRコードをスキャンしてアクティビティの完了を確認するページ
 */

import { GetServerSideProps } from "next";
import { useState } from "react";
import Head from "next/head";
import { supabaseServer } from "@/lib/supabaseServer";
import { cookieNameForVendor, verifyToken } from "@/lib/vendorAuth";

interface TrackingPageProps {
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
    activitySlug: string;
  } | null;
  requireAuth?: boolean;
  error?: string;
}

export default function TrackingPage({
  bookingData,
  error,
  requireAuth,
}: TrackingPageProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState<"success" | "error" | "info">(
    "info",
  );
  const [password, setPassword] = useState("");
  const [authenticating, setAuthenticating] = useState(false);

  if (error || !bookingData) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Head>
          <title>QRコードトラッキング - Gappy</title>
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
            Booking Not Found
          </h1>
          <p className="text-gray-600 mb-4">
            {error || "The specified booking does not exist or has expired."}
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

  if (requireAuth) {
    return (
      <div className="min-h-screen bg-gray-50 p-4">
        <Head>
          <title>Vendor Login | Gappy</title>
          <meta name="robots" content="noindex, nofollow" />
        </Head>

        <div className="max-w-md mx-auto">
          <div className="bg-green-600 text-white rounded-t-lg p-4 text-center">
            <h1 className="text-lg font-bold">GAPPY</h1>
          </div>
          <div className="bg-white p-6 border-x border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Enter vendor password
            </h2>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password"
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
            />
            <button
              onClick={async () => {
                if (!bookingData) return;
                setAuthenticating(true);
                setMessage("");
                try {
                  const res = await fetch("/api/vendor/login", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                      bookingId: bookingData.bookingId,
                      password,
                    }),
                  });
                  if (res.ok) {
                    window.location.reload();
                  } else {
                    const r = await res.json();
                    setMessage(r.error || "Authentication failed");
                    setMessageType("error");
                  }
                } finally {
                  setAuthenticating(false);
                }
              }}
              disabled={authenticating || !password}
              className="mt-4 w-full bg-green-600 text-white py-3 px-6 rounded-lg font-medium hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {authenticating ? "Verifying..." : "Unlock"}
            </button>
            {message && (
              <div className="mt-3 text-sm text-red-600">{message}</div>
            )}
          </div>
        </div>
      </div>
    );
  }

  const bookingDate = new Date(bookingData.bookingDate);
  const isExpired = bookingDate < new Date();
  const isCompleted = bookingData.status === "completed";

  const handleActivityCompletion = async () => {
    if (isExpired || isCompleted) {
      setMessage("This booking has already been used or has expired.");
      setMessageType("error");
      return;
    }

    setIsLoading(true);
    setMessage("");

    // デバッグ情報を出力
    console.log("🔍 Sending completion request:", {
      bookingId: bookingData.bookingId,
      couponCode: bookingData.couponCode,
      activityTitle: bookingData.activityTitle,
      userName: bookingData.userName,
    });

    try {
      const response = await fetch("/api/track/complete", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          bookingId: bookingData.bookingId,
          couponCode: bookingData.couponCode,
          completedAt: new Date().toISOString(),
          completedBy: "vendor", // 事業者が完了を確認
        }),
      });

      const result = await response.json();

      console.log("🔍 API response:", result);

      if (result.success) {
        setMessage("Activity completion confirmed!");
        setMessageType("success");
        // レビューQR画面に遷移
        setTimeout(() => {
          window.location.href = `/business/review-qr/${bookingData.bookingId}`;
        }, 2000);
      } else {
        setMessage(result.message || "An error occurred.");
        setMessageType("error");
      }
    } catch (error) {
      console.error("アクティビティ完了確認エラー:", error);
      setMessage("A network error occurred.");
      setMessageType("error");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <Head>
        <title>{bookingData.activityTitle} - トラッキング | Gappy</title>
        <meta name="robots" content="noindex, nofollow" />
      </Head>

      <div className="max-w-md mx-auto">
        {/* ヘッダー */}
        <div className="bg-green-600 text-white rounded-t-lg p-4 text-center">
          <h1 className="text-lg font-bold">GAPPY</h1>
        </div>

        {/* 予約情報（シンプル版） */}
        <div className="bg-white p-6 border-x border-gray-200">
          {/* 認証済みでもログイン画面を再表示できるリンク */}
          <div className="mb-3 text-right">
            <a
              href={`?showLogin=1`}
              className="text-xs text-gray-500 hover:text-gray-700 underline"
            >
              Show Login
            </a>
          </div>
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            {bookingData.activityTitle}
          </h2>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">Reserved by:</span>
              <span className="font-medium">{bookingData.userName}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Party Size:</span>
              <span className="font-medium">
                {bookingData.partySize} people
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
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              )}
              {messageType === "error" && (
                <svg
                  className="w-5 h-5 mr-2"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              )}
              <span className="text-sm font-medium">{message}</span>
            </div>
          </div>
        )}

        {/* アクションエリア（シンプル版） */}
        <div className="bg-white p-6 border-x border-gray-200">
          {isExpired ? (
            <div className="text-center py-4">
              <div className="text-red-500 mb-2">
                <svg
                  className="w-8 h-8 mx-auto"
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
              <p className="text-gray-600 text-sm">
                この予約の有効期限が切れています。
              </p>
            </div>
          ) : isCompleted ? (
            <div className="text-center py-4">
              <div className="text-green-500 mb-4">
                <svg
                  className="w-8 h-8 mx-auto"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-green-600 mb-2">
                アクティビティ完了済み
              </h3>
              <p className="text-gray-600 text-sm mb-4">
                この予約は既に完了しています。
              </p>
              <button
                onClick={() => {
                  window.location.href = `/business/review-qr/${bookingData.bookingId}`;
                }}
                className="w-full bg-green-600 text-white py-3 px-6 rounded-lg font-medium hover:bg-green-700 transition-colors"
              >
                レビューQRコードを表示
              </button>
            </div>
          ) : (
            <div className="text-center">
              <button
                onClick={handleActivityCompletion}
                disabled={isLoading}
                className="w-full bg-green-600 text-white py-4 px-6 rounded-lg font-medium text-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isLoading ? (
                  <div className="flex items-center justify-center">
                    <svg
                      className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      ></circle>
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      ></path>
                    </svg>
                    確認中...
                  </div>
                ) : (
                  "Confirm Completion"
                )}
              </button>
            </div>
          )}
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
    // デバッグ情報を出力
    console.log("🔍 Searching for booking:", bookingId);

    // データベースから予約情報を取得（form_submissionsテーブルから）
    const { data, error } = (await supabaseServer
      .from("form_submissions" as any)
      .select(
        `
        booking_id,
        coupon_code,
        activity_title,
        activity_location,
        experience_slug,
        user_name,
        user_email,
        party_size,
        booking_date,
        status,
        scans_used,
        max_scans
      `,
      )
      .eq("booking_id", bookingId)
      .single()) as any;

    // デバッグ情報を出力
    console.log("🔍 Database query result:", {
      bookingId,
      data,
      error: error?.message,
      errorCode: error?.code,
    });

    if (error || !data) {
      return {
        props: {
          bookingData: null,
          error: "Booking not found",
        },
      };
    }

    // vendor auth cookie check + 強制ログイン画面表示フラグ
    let requireAuth = false;
    const showLoginForced =
      String((context.query?.showLogin as string) || "") === "1";
    try {
      const slug = data.experience_slug as string;
      const cookieHeader = context.req.headers.cookie || "";
      const cookieName = cookieNameForVendor(slug);
      const match = cookieHeader
        .split(";")
        .map((v) => v.trim())
        .find((v) => v.startsWith(`${cookieName}=`));
      if (match) {
        const token = match.split("=")[1];
        const payload = verifyToken(token);
        if (!payload || payload.vendorId !== slug) {
          requireAuth = true;
        }
      } else {
        requireAuth = true;
      }
    } catch {
      requireAuth = true;
    }

    if (showLoginForced) {
      requireAuth = true;
    }

    return {
      props: {
        bookingData: {
          bookingId: data.booking_id,
          couponCode: data.coupon_code,
          activityTitle: data.activity_title,
          activityLocation: data.activity_location,
          activitySlug: data.experience_slug,
          userName: data.user_name,
          userEmail: data.user_email,
          partySize: data.party_size,
          bookingDate: data.booking_date,
          status: data.status,
          scansUsed: data.scans_used || 0,
          maxScans: data.max_scans || 3,
        },
        requireAuth,
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
