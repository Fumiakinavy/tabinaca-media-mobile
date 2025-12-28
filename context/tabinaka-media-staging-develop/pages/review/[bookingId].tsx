/**
 * ユーザー向けレビュー投稿ページ
 * /review/[bookingId]
 * ユーザーがレビューを投稿する
 */

import { useState, useEffect } from "react";
import Head from "next/head";
import { useRouter } from "next/router";
import Link from "next/link";
import ReviewList from "@/components/ReviewList";

interface ReviewFormData {
  rating: number;
  reviewText: string;
  categories: {
    satisfaction: number;
    host: number;
    cost: number;
  };
  reviewer: {
    nationality: string;
    travelStyle: string;
    ageGroup: string;
  };
}

interface ReviewPageProps {
  bookingData: {
    bookingId: string;
    activityName: string;
    userName: string;
    userEmail: string;
    couponCode: string;
  } | null;
  error: string | null;
}

// ユーザー属性の選択肢
const nationalityOptions = [
  { value: "🇺🇸", label: "United States" },
  { value: "🇬🇧", label: "United Kingdom" },
  { value: "🇨🇦", label: "Canada" },
  { value: "🇦🇺", label: "Australia" },
  { value: "🇯🇵", label: "Japan" },
  { value: "🇰🇷", label: "South Korea" },
  { value: "🇨🇳", label: "China" },
  { value: "🇫🇷", label: "France" },
  { value: "🇩🇪", label: "Germany" },
  { value: "🇮🇹", label: "Italy" },
  { value: "🇪🇸", label: "Spain" },
  { value: "Other", label: "Other" },
];

const travelStyleOptions = [
  { value: "Solo", label: "Solo Travel" },
  { value: "Couple", label: "Couple" },
  { value: "Family", label: "Family" },
  { value: "Friends", label: "Friends" },
];

const ageGroupOptions = [
  { value: "10s", label: "10s" },
  { value: "20s", label: "20s" },
  { value: "30s", label: "30s" },
  { value: "40s", label: "40s" },
  { value: "50s", label: "50s" },
  { value: "60+", label: "60+" },
];

export default function ReviewPage({ bookingData, error }: ReviewPageProps) {
  const router = useRouter();
  const [formData, setFormData] = useState<ReviewFormData>({
    rating: 0,
    reviewText: "",
    categories: {
      satisfaction: 0,
      host: 0,
      cost: 0,
    },
    reviewer: {
      nationality: "",
      travelStyle: "",
      ageGroup: "",
    },
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState<"success" | "error" | "info">(
    "info",
  );
  const [submitted, setSubmitted] = useState(false);

  const handleRatingChange = (rating: number) => {
    setFormData((prev) => ({ ...prev, rating }));
  };

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setFormData((prev) => ({ ...prev, reviewText: e.target.value }));
  };

  const handleCategoryChange = (
    category: keyof ReviewFormData["categories"],
    rating: number,
  ) => {
    setFormData((prev) => ({
      ...prev,
      categories: {
        ...prev.categories,
        [category]: rating,
      },
    }));
  };

  const handleReviewerChange = (
    field: keyof ReviewFormData["reviewer"],
    value: string,
  ) => {
    setFormData((prev) => ({
      ...prev,
      reviewer: {
        ...prev.reviewer,
        [field]: value,
      },
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!bookingData) return;
    if (formData.rating === 0) {
      setMessage("Please select a rating.");
      setMessageType("error");
      return;
    }
    if (formData.reviewText.trim().length < 10) {
      setMessage("Please enter a review with at least 10 characters.");
      setMessageType("error");
      return;
    }

    setLoading(true);
    setMessage("");

    try {
      const response = await fetch("/api/review/submit", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          bookingId: bookingData.bookingId,
          activityName: bookingData.activityName,
          userName: bookingData.userName,
          userEmail: bookingData.userEmail,
          couponCode: bookingData.couponCode,
          rating: formData.rating,
          reviewText: formData.reviewText.trim(),
        }),
      });

      const result = await response.json();

      if (result.success) {
        setMessage("Review submitted! Thank you.");
        setMessageType("success");
        setSubmitted(true);
      } else {
        setMessage(result.message || "Failed to submit review.");
        setMessageType("error");
      }
    } catch (error) {
      console.error("レビュー投稿エラー:", error);
      setMessage("A network error occurred.");
      setMessageType("error");
    } finally {
      setLoading(false);
    }
  };

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

  if (submitted) {
    return (
      <div className="min-h-screen bg-gray-50 p-4">
        <Head>
          <title>Review Submitted | Gappy</title>
          <meta name="robots" content="noindex, nofollow" />
        </Head>

        <div className="max-w-4xl mx-auto">
          {/* 成功メッセージ */}
          <div className="bg-white rounded-2xl shadow-md p-8 mb-8">
            <div className="text-center">
              <div className="text-green-500 mb-4">
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
                    d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </div>
              <h1 className="text-3xl font-bold text-gray-900 mb-4">
                Review Submitted!
              </h1>
              <p className="text-gray-600 mb-6 text-lg">
                Thank you for your valuable feedback. Your review helps other
                travelers discover amazing experiences!
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link
                  href="/"
                  className="bg-green-600 text-white px-8 py-3 rounded-lg hover:bg-green-700 transition-colors font-medium"
                >
                  Return to Gappy Home
                </Link>
                <button
                  onClick={() => setSubmitted(false)}
                  className="bg-gray-100 text-gray-700 px-8 py-3 rounded-lg hover:bg-gray-200 transition-colors font-medium"
                >
                  Write Another Review
                </button>
              </div>
            </div>
          </div>

          {/* 他のユーザーのレビュー */}
          <div className="bg-white rounded-2xl shadow-md p-6">
            <div className="text-center mb-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                What Others Say
              </h2>
              <p className="text-gray-600">
                See what other travelers thought about this experience
              </p>
            </div>
            <ReviewList />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <Head>
        <title>Submit Review | Gappy</title>
        <meta name="robots" content="noindex, nofollow" />
      </Head>

      <div className="max-w-2xl mx-auto">
        {/* ヘッダー */}
        <div className="bg-green-600 text-white rounded-t-lg p-6 text-center">
          <h1 className="text-2xl font-bold">Submit Review</h1>
          <p className="mt-2 text-green-100">
            Please share your experience with us
          </p>
        </div>

        {/* アクティビティ情報 */}
        <div className="bg-white p-6 border-x border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            {bookingData.activityName}
          </h2>
          <div className="text-sm text-gray-600">
            <p>Guest: {bookingData.userName}</p>
            <p>Email: {bookingData.userEmail}</p>
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

        {/* レビューフォーム */}
        <form
          onSubmit={handleSubmit}
          className="bg-gradient-to-br from-white to-gray-50 p-8 border-x border-gray-200 rounded-b-lg shadow-inner"
        >
          {/* 評価 */}
          <div className="mb-8">
            <label className="block text-lg font-semibold text-gray-800 mb-4">
              How would you rate your experience?{" "}
              <span className="text-red-500">*</span>
            </label>
            <div className="flex justify-center space-x-3">
              {[1, 2, 3, 4, 5].map((rating) => (
                <button
                  key={rating}
                  type="button"
                  onClick={() => handleRatingChange(rating)}
                  className={`text-4xl transition-colors duration-200 ${
                    formData.rating >= rating
                      ? "text-yellow-400"
                      : "text-gray-300 hover:text-yellow-200"
                  }`}
                >
                  ★
                </button>
              ))}
            </div>
          </div>

          {/* レビューテキスト */}
          <div className="mb-8">
            <label className="block text-lg font-semibold text-gray-800 mb-4">
              Share your experience <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <textarea
                value={formData.reviewText}
                onChange={handleTextChange}
                placeholder="Tell us about your experience! What did you enjoy most? Any recommendations for other travelers?"
                className="w-full p-4 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 resize-none transition-all duration-300 text-gray-700 placeholder-gray-400 bg-gradient-to-br from-gray-50 to-white"
                rows={6}
                maxLength={1000}
              />
              <div className="absolute bottom-3 right-3 flex items-center space-x-2">
                <div
                  className={`w-2 h-2 rounded-full ${
                    formData.reviewText.length >= 10
                      ? "bg-green-400"
                      : "bg-gray-300"
                  }`}
                ></div>
                <span
                  className={`text-xs font-medium ${
                    formData.reviewText.length >= 10
                      ? "text-green-600"
                      : "text-gray-500"
                  }`}
                >
                  {formData.reviewText.length}/1000
                </span>
              </div>
            </div>
            {formData.reviewText.length > 0 &&
              formData.reviewText.length < 10 && (
                <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <p className="text-xs text-yellow-700">
                    Please write at least 10 characters to help others
                    understand your experience better.
                  </p>
                </div>
              )}
          </div>

          {/* 項目別評価 */}
          <div className="mb-8">
            <label className="block text-lg font-semibold text-gray-800 mb-4">
              Detailed Rating
            </label>
            <div className="space-y-4">
              {/* Experience Satisfaction */}
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700">
                  Experience Satisfaction
                </span>
                <div className="flex space-x-1">
                  {[1, 2, 3, 4, 5].map((rating) => (
                    <button
                      key={rating}
                      type="button"
                      onClick={() =>
                        handleCategoryChange("satisfaction", rating)
                      }
                      className={`text-3xl transition-colors duration-200 ${
                        formData.categories.satisfaction >= rating
                          ? "text-yellow-400"
                          : "text-gray-300 hover:text-yellow-200"
                      }`}
                    >
                      ★
                    </button>
                  ))}
                </div>
              </div>

              {/* Host Service */}
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700">
                  Host Service
                </span>
                <div className="flex space-x-1">
                  {[1, 2, 3, 4, 5].map((rating) => (
                    <button
                      key={rating}
                      type="button"
                      onClick={() => handleCategoryChange("host", rating)}
                      className={`text-3xl transition-colors duration-200 ${
                        formData.categories.host >= rating
                          ? "text-yellow-400"
                          : "text-gray-300 hover:text-yellow-200"
                      }`}
                    >
                      ★
                    </button>
                  ))}
                </div>
              </div>

              {/* Cost Performance */}
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700">
                  Cost Performance
                </span>
                <div className="flex space-x-1">
                  {[1, 2, 3, 4, 5].map((rating) => (
                    <button
                      key={rating}
                      type="button"
                      onClick={() => handleCategoryChange("cost", rating)}
                      className={`text-3xl transition-colors duration-200 ${
                        formData.categories.cost >= rating
                          ? "text-yellow-400"
                          : "text-gray-300 hover:text-yellow-200"
                      }`}
                    >
                      ★
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* ユーザー属性 */}
          <div className="mb-8">
            <label className="block text-lg font-semibold text-gray-800 mb-4">
              About You (Optional)
            </label>
            <div className="space-y-4">
              {/* 国籍 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Nationality
                </label>
                <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
                  {nationalityOptions.map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() =>
                        handleReviewerChange("nationality", option.value)
                      }
                      className={`p-2 text-sm rounded-lg border transition-colors duration-200 ${
                        formData.reviewer.nationality === option.value
                          ? "border-green-500 bg-green-50 text-green-700"
                          : "border-gray-200 bg-white text-gray-700 hover:border-gray-300"
                      }`}
                    >
                      <div className="text-center">
                        <div className="text-lg mb-1">{option.value}</div>
                        <div className="text-xs">{option.label}</div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* 旅行スタイル */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Travel Style
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {travelStyleOptions.map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() =>
                        handleReviewerChange("travelStyle", option.value)
                      }
                      className={`p-3 text-sm rounded-lg border transition-colors duration-200 ${
                        formData.reviewer.travelStyle === option.value
                          ? "border-green-500 bg-green-50 text-green-700"
                          : "border-gray-200 bg-white text-gray-700 hover:border-gray-300"
                      }`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* 年齢層 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Age Group
                </label>
                <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                  {ageGroupOptions.map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() =>
                        handleReviewerChange("ageGroup", option.value)
                      }
                      className={`p-3 text-sm rounded-lg border transition-colors duration-200 ${
                        formData.reviewer.ageGroup === option.value
                          ? "border-green-500 bg-green-50 text-green-700"
                          : "border-gray-200 bg-white text-gray-700 hover:border-gray-300"
                      }`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* 送信ボタン */}
          <button
            type="submit"
            disabled={
              loading ||
              formData.rating === 0 ||
              formData.reviewText.trim().length < 10
            }
            className="w-full bg-green-600 text-white py-4 px-8 rounded-lg font-semibold text-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
          >
            {loading ? (
              <div className="flex items-center justify-center">
                <svg
                  className="animate-spin -ml-1 mr-3 h-6 w-6 text-white"
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
                <span>Submitting your review...</span>
              </div>
            ) : (
              <span>Submit Your Review</span>
            )}
          </button>
        </form>

        {/* フッター */}
        <div className="text-center mt-6">
          <Link
            href="/"
            className="text-green-600 hover:text-green-700 text-sm font-medium"
          >
            ← Return to Gappy Home
          </Link>
        </div>
      </div>
    </div>
  );
}

export const getServerSideProps = async (context: any) => {
  const { bookingId } = context.params;
  const { activity, coupon, user, email } = context.query;

  console.log("🔍 Review page data:", {
    bookingId,
    activity,
    coupon,
    user,
    email,
  });

  if (!bookingId || typeof bookingId !== "string") {
    return {
      props: {
        bookingData: null,
        error: "Invalid booking ID",
      },
    };
  }

  // URLパラメータからユーザー情報を取得
  const activityName = activity ? decodeURIComponent(activity as string) : null;
  const userName = user ? decodeURIComponent(user as string) : null;
  const userEmail = email ? decodeURIComponent(email as string) : null;
  const couponCode = (coupon as string) || null;

  // 必要な情報が不足している場合はエラー
  if (!activityName || !userName || !userEmail || !couponCode) {
    console.error("❌ Missing required parameters:", {
      activityName: !!activityName,
      userName: !!userName,
      userEmail: !!userEmail,
      couponCode: !!couponCode,
    });
    return {
      props: {
        bookingData: null,
        error:
          "Required information is missing. Please access from the correct QR code.",
      },
    };
  }

  try {
    return {
      props: {
        bookingData: {
          bookingId,
          activityName,
          userName,
          userEmail,
          couponCode,
        },
        error: null,
      },
    };
  } catch (error) {
    console.error("レビューページデータ取得エラー:", error);
    return {
      props: {
        bookingData: null,
        error: "An error occurred while fetching data",
      },
    };
  }
};
