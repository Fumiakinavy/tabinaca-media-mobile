/**
 * 完了済みアクティビティ一覧ページ
 * /completed-activities
 * 完了済みアクティビティの一覧を表示する
 */

import { useState, useEffect } from "react";
import Head from "next/head";
import Link from "next/link";

interface CompletedActivity {
  id: string;
  activity_name: string;
  completed_at: string;
  user_name: string;
  user_email: string;
  party_size: number;
  booking_id: string;
  coupon_code: string;
  created_at: string;
}

interface CompletedActivitiesResponse {
  success: boolean;
  data: {
    activities: CompletedActivity[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
    stats: {
      total_completed: number;
      unique_users: number;
      total_party_size: number;
      avg_party_size: number;
      most_popular_activity: string;
      completion_rate: number;
    } | null;
  };
}

export default function CompletedActivitiesPage() {
  const [activities, setActivities] = useState<CompletedActivity[]>([]);
  const [stats, setStats] =
    useState<CompletedActivitiesResponse["data"]["stats"]>(null);
  const [pagination, setPagination] = useState<
    CompletedActivitiesResponse["data"]["pagination"] | null
  >(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);

  const fetchActivities = async (page: number = 1) => {
    try {
      setLoading(true);
      const response = await fetch(
        `/api/completed-activities?page=${page}&limit=20`,
      );
      const result: CompletedActivitiesResponse = await response.json();

      if (result.success) {
        setActivities(result.data.activities);
        setStats(result.data.stats);
        setPagination(result.data.pagination);
        setError(null);
      } else {
        setError("Failed to fetch data");
      }
    } catch (err) {
      console.error("完了済みアクティビティ取得エラー:", err);
      setError("A network error occurred");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchActivities(currentPage);
  }, [currentPage]);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString("ja-JP", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const handlePageChange = (newPage: number) => {
    setCurrentPage(newPage);
  };

  if (loading) {
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
    <div className="min-h-screen bg-gray-50">
      <Head>
        <title>完了済みアクティビティ一覧 | Gappy</title>
        <meta name="robots" content="noindex, nofollow" />
        <link rel="canonical" href="https://gappytravel.com/completed-activities" />
      </Head>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* ヘッダー */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                完了済みアクティビティ
              </h1>
              <p className="mt-2 text-gray-600">
                完了確認されたアクティビティの一覧
              </p>
            </div>
            <Link
              href="/"
              className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors"
            >
              ホームに戻る
            </Link>
          </div>
        </div>

        {/* 統計情報（シンプル版） */}
        {stats && (
          <div className="bg-white p-6 rounded-lg shadow mb-8">
            <div className="text-center">
              <div className="text-3xl font-bold text-green-600">
                {stats.total_completed}
              </div>
              <div className="text-lg text-gray-600">
                完了済みアクティビティ
              </div>
            </div>
          </div>
        )}

        {/* エラー表示 */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <div className="flex">
              <svg
                className="w-5 h-5 text-red-400 mr-2"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                  clipRule="evenodd"
                ></path>
              </svg>
              <span className="text-red-800">{error}</span>
            </div>
          </div>
        )}

        {/* アクティビティ一覧 */}
        <div className="bg-white shadow rounded-lg">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-medium text-gray-900">
              完了済みアクティビティ一覧
            </h2>
          </div>

          {activities.length === 0 ? (
            <div className="px-6 py-12 text-center">
              <svg
                className="w-12 h-12 text-gray-400 mx-auto mb-4"
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
              <p className="text-gray-500">
                完了済みアクティビティがありません
              </p>
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {activities.map((activity) => (
                <div key={activity.id} className="px-6 py-4 hover:bg-gray-50">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <h3 className="text-lg font-medium text-gray-900">
                        {activity.activity_name}
                      </h3>
                      <div className="mt-2 grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-gray-600">
                        <div>
                          <span className="font-medium">予約者:</span>{" "}
                          {activity.user_name}
                        </div>
                        <div>
                          <span className="font-medium">参加人数:</span>{" "}
                          {activity.party_size}名
                        </div>
                        <div>
                          <span className="font-medium">完了日時:</span>{" "}
                          {formatDate(activity.completed_at)}
                        </div>
                      </div>
                    </div>
                    <div className="ml-4 text-right">
                      <div className="text-sm text-gray-500">
                        {activity.booking_id}
                      </div>
                      <div className="text-xs text-gray-400 mt-1">
                        {activity.coupon_code}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ページネーション */}
        {pagination && pagination.totalPages > 1 && (
          <div className="mt-6 flex items-center justify-between">
            <div className="text-sm text-gray-700">
              {pagination.total}件中{" "}
              {(pagination.page - 1) * pagination.limit + 1}-
              {Math.min(pagination.page * pagination.limit, pagination.total)}
              件を表示
            </div>
            <div className="flex space-x-2">
              <button
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 1}
                className="px-3 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                前へ
              </button>
              <span className="px-3 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-md">
                {currentPage} / {pagination.totalPages}
              </span>
              <button
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage === pagination.totalPages}
                className="px-3 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                次へ
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
