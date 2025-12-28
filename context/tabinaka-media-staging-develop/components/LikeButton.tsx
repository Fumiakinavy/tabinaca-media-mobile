"use client";
import { useState, useEffect } from "react";
import { supabase, signInWithGoogle } from "@/lib/supabaseAuth";
import { sendGA } from "@/lib/ga";
import { getAuthRedirectUrl } from "@/lib/env";

interface LikeButtonProps {
  activitySlug: string;
  source?: "card" | "detail";
  className?: string;
  variant?: "icon" | "button";
}

interface LikeState {
  liked: boolean;
  count: number;
}

export default function LikeButton({
  activitySlug,
  source = "card",
  className = "",
  variant = "icon",
}: LikeButtonProps) {
  const [user, setUser] = useState<any>(null);
  const [likeState, setLikeState] = useState<LikeState>({
    liked: false,
    count: 0,
  });
  const [isLoading, setIsLoading] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);

  // ユーザーセッションを監視
  useEffect(() => {
    // 初回のユーザー取得
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user);
    });

    // セッション変更を監視
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  // いいね状態を取得（リロード時も確実に）
  useEffect(() => {
    const fetchLikeState = async () => {
      try {
        // セッションを待つ
        const {
          data: { session },
        } = await supabase.auth.getSession();
        const headers: HeadersInit = {};

        if (session?.access_token) {
          headers["Authorization"] = `Bearer ${session.access_token}`;
        }

        const response = await fetch(
          `/api/likes/${encodeURIComponent(activitySlug)}`,
          {
            headers,
            cache: "no-store",
          },
        );

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const result = await response.json();

        if (result.success) {
          setLikeState({
            liked: result.liked ?? false,
            count: result.count ?? 0,
          });
        } else {
          setLikeState({ liked: false, count: 0 });
        }
      } catch (error) {
        console.error("[LikeButton] Failed to fetch like state:", error);
        setLikeState({ liked: false, count: 0 });
      } finally {
        setIsInitialized(true);
      }
    };

    // 少し遅延させてセッション復元を待つ
    const timeoutId = setTimeout(fetchLikeState, 200);
    return () => clearTimeout(timeoutId);
  }, [activitySlug]);

  // ユーザーが変わったら再取得
  useEffect(() => {
    if (user && isInitialized) {
      const fetchLikeState = async () => {
        try {
          const {
            data: { session },
          } = await supabase.auth.getSession();
          const headers: HeadersInit = {};
          if (session?.access_token) {
            headers["Authorization"] = `Bearer ${session.access_token}`;
          }

          const response = await fetch(
            `/api/likes/${encodeURIComponent(activitySlug)}`,
            {
              headers,
              cache: "no-store",
            },
          );

          if (!response.ok) {
            // エラーレスポンスでもJSONをパースして詳細を取得
            const errorText = await response.text();
            let errorDetail = errorText;
            try {
              const errorJson = JSON.parse(errorText);
              errorDetail = errorJson.detail || errorJson.error || errorText;
            } catch (e) {
              // JSONでない場合はそのまま使用
            }
            console.warn(
              "[LikeButton] API returned error:",
              response.status,
              errorDetail,
            );
            // エラーでもデフォルト値で続行
            setLikeState({
              liked: false,
              count: 0,
            });
            return;
          }

          const result = await response.json();

          if (result.success) {
            setLikeState({
              liked: result.liked ?? false,
              count: result.count ?? 0,
            });
          } else {
            // success: false の場合もデフォルト値で続行
            console.warn("[LikeButton] API returned success: false:", result);
            setLikeState({
              liked: false,
              count: 0,
            });
          }
        } catch (error) {
          console.error("[LikeButton] Failed to fetch like state:", error);
          // エラー時もデフォルト値で続行
          setLikeState({
            liked: false,
            count: 0,
          });
        }
      };

      fetchLikeState();
    }
  }, [user, activitySlug, isInitialized]);

  const handleLikeToggle = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!isInitialized || isLoading) return;

    // 未ログインの場合はGoogleログインを表示（自動リダイレクトURL使用）
    if (!user) {
      const currentUrl =
        typeof window !== "undefined" ? window.location.href : "";
      const redirectUrl = getAuthRedirectUrl(currentUrl);

      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: redirectUrl,
        },
      });

      if (error) {
        console.error("Sign in error:", error);
        alert("Login failed. Please try again.");
      }
      return;
    }

    setIsLoading(true);

    // 楽観的更新
    const previousState = { ...likeState };
    const newLiked = !likeState.liked;
    const newCount = likeState.count + (newLiked ? 1 : -1);

    setLikeState({
      liked: newLiked,
      count: newCount,
    });

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.access_token) {
        setLikeState(previousState);
        alert("Session expired. Please log in again.");
        return;
      }

      // POSTメソッドで統一されたエンドポイントを使用
      const response = await fetch(
        `/api/likes/${encodeURIComponent(activitySlug)}`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
        },
      );

      if (!response.ok) {
        // エラーレスポンスをパース
        let errorDetail = `HTTP ${response.status}: ${response.statusText}`;
        try {
          const errorText = await response.text();
          try {
            const errorJson = JSON.parse(errorText);
            errorDetail = errorJson.detail || errorJson.error || errorText;
          } catch (e) {
            errorDetail = errorText || errorDetail;
          }
        } catch (e) {
          // パースに失敗した場合はデフォルトメッセージを使用
        }

        console.error("[LikeButton] API error:", response.status, errorDetail);
        setLikeState(previousState);

        if (response.status === 401) {
          alert("Session expired. Please log in again.");
        } else if (response.status === 503) {
          alert("Service temporarily unavailable. Please try again later.");
        } else {
          alert(`Failed to save: ${errorDetail}`);
        }
        return;
      }

      const result = await response.json();

      if (result.success) {
        // サーバーからの実際の状態で更新
        setLikeState({
          liked: result.liked ?? false,
          count: result.count ?? 0,
        });

        // GA4イベント送信
        sendGA("like_activity", {
          activity_slug: activitySlug,
          status: result.liked ? "like" : "unlike",
          source: source,
          timestamp: new Date().toISOString(),
        });
      } else {
        // エラー時はロールバック
        setLikeState(previousState);
        const errorMessage =
          result.detail ||
          result.error ||
          "Failed to save. Please try again later.";
        alert(errorMessage);
      }
    } catch (error) {
      console.error("[LikeButton] Like toggle error:", error);
      // エラー時はロールバック
      setLikeState(previousState);
      alert("Network error occurred. Please try again later.");
    } finally {
      setIsLoading(false);
    }
  };

  if (!isInitialized) {
    if (variant === "button") {
      return (
        <button
          disabled
          className={`w-full rounded-lg bg-gray-300 px-3 py-1.5 text-[11px] font-semibold text-white ${className}`}
          aria-label="Loading"
        >
          <span className="flex items-center justify-center gap-1">
            <div className="w-3 h-3 border-2 border-white/50 border-t-transparent rounded-full animate-spin" />
            Like
          </span>
        </button>
      );
    }
    return (
      <button
        disabled
        className={`inline-flex items-center gap-1 text-gray-400 ${className}`}
        aria-label="Loading"
      >
        <div className="w-6 h-6 flex items-center justify-center rounded-full border-2 border-gray-300 bg-gray-100">
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="gray"
            strokeWidth="2"
          >
            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
          </svg>
        </div>
      </button>
    );
  }

  if (variant === "button") {
    return (
      <button
        onClick={handleLikeToggle}
        disabled={isLoading}
        aria-pressed={likeState.liked}
        aria-label={likeState.liked ? "Liked" : "Like"}
        className={`w-full rounded-lg px-3 py-1.5 text-[11px] font-semibold shadow hover:shadow-lg transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 disabled:opacity-50 ${
          likeState.liked
            ? "bg-gradient-to-r from-red-500 to-red-600 text-white focus-visible:outline-red-500"
            : "bg-gradient-to-r from-green-500 to-green-600 text-white focus-visible:outline-green-500"
        } ${className}`}
      >
        <span className="flex items-center justify-center gap-1">
          {isLoading ? (
            <div className="w-3 h-3 border-2 border-white/50 border-t-transparent rounded-full animate-spin" />
          ) : (
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill={likeState.liked ? "white" : "none"}
              stroke="white"
              strokeWidth="2"
            >
              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
            </svg>
          )}
          {likeState.liked ? "Liked" : "Like"}
        </span>
      </button>
    );
  }

  return (
    <button
      onClick={handleLikeToggle}
      disabled={isLoading}
      aria-pressed={likeState.liked}
      aria-label={likeState.liked ? "Saved" : "Save"}
      className={`inline-flex items-center gap-1 transition-all duration-200 hover:scale-110 disabled:opacity-50 ${className}`}
    >
      {isLoading ? (
        <div className="w-6 h-6 flex items-center justify-center">
          <div className="w-4 h-4 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin" />
        </div>
      ) : (
        <div
          className={`w-6 h-6 flex items-center justify-center rounded-full border-2 transition-colors duration-200 ${
            likeState.liked
              ? "bg-red-500 border-red-500"
              : "bg-white border-black"
          }`}
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill={likeState.liked ? "white" : "none"}
            stroke={likeState.liked ? "white" : "black"}
            strokeWidth="2"
            className="transition-colors duration-200"
          >
            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
          </svg>
        </div>
      )}
      {source === "detail" && (
        <span className="text-sm font-medium">{likeState.count}</span>
      )}
    </button>
  );
}
