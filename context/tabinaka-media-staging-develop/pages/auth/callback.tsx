import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { supabase } from "@/lib/supabaseAuth";

/**
 * リダイレクト先URLを取得・検証する
 */
function getRedirectUrl(returnToParam: string | string[] | undefined): string {
  if (!returnToParam) {
    return "/";
  }

  // 配列の場合は最初の要素を使用
  const returnTo = Array.isArray(returnToParam)
    ? returnToParam[0]
    : returnToParam;

  // URLデコード
  let decodedUrl: string;
  try {
    decodedUrl = decodeURIComponent(returnTo);
  } catch (e) {
    console.warn("Failed to decode returnTo parameter:", returnTo);
    return "/";
  }

  // セキュリティチェック: 相対パスのみ許可
  if (!decodedUrl.startsWith("/")) {
    console.warn(
      "[AuthCallback] Invalid returnTo parameter (must be relative path):",
      decodedUrl,
    );
    return "/";
  }

  // 危険なスキームを防ぐ（javascript:, data:, など）
  // 相対パスでない場合（http://, https://など）は拒否
  if (decodedUrl.match(/^[a-zA-Z][a-zA-Z0-9+.-]*:/)) {
    console.warn(
      "[AuthCallback] Invalid returnTo parameter (absolute URL not allowed):",
      decodedUrl,
    );
    return "/";
  }

  return decodedUrl;
}

export default function AuthCallback() {
  const router = useRouter();
  const [status, setStatus] = useState<"loading" | "success" | "error">(
    "loading",
  );
  const [message, setMessage] = useState("Processing authentication...");

  useEffect(() => {
    // router.isReadyを待つ
    if (!router.isReady) {
      return;
    }

    const handleAuthCallback = async () => {
      try {
        // URLのハッシュフラグメントから認証情報を取得
        const { data, error } = await supabase.auth.getSession();

        if (error) {
          console.error("[AuthCallback] Session error:", error);
          setStatus("error");
          setMessage("Authentication failed.");
          setTimeout(() => {
            router.push("/").catch((err) => {
              console.error("[AuthCallback] Redirect error:", err);
            });
          }, 3000);
          return;
        }

        if (!data.session) {
          console.warn("[AuthCallback] No session found");
          setStatus("error");
          setMessage("Session not found.");
          setTimeout(() => {
            router.push("/").catch((err) => {
              console.error("[AuthCallback] Redirect error:", err);
            });
          }, 3000);
          return;
        }

        // HTTP-onlyクッキーを設定するためにAPIを呼び出す
        // AccountProviderのlink処理と統合されるが、OAuthコールバック時点で
        // accountTokenが設定されていることを確認する必要がある
        try {
          // まずaccountTokenを取得（AccountProviderが既に設定している可能性がある）
          const sessionResponse = await fetch("/api/account/session", {
            method: "GET",
            credentials: "include",
          });

          if (sessionResponse.ok) {
            // accountTokenが取得できたら、link APIを呼び出してHTTP-onlyクッキーを設定
            const linkResponse = await fetch("/api/account/link", {
              method: "POST",
              headers: {
                Authorization: `Bearer ${data.session.access_token}`,
              },
              credentials: "include",
            });

            if (!linkResponse.ok) {
              console.warn(
                "[AuthCallback] Failed to set auth cookie, but session is available",
              );
            }
          } else {
            console.warn(
              "[AuthCallback] Account session not ready yet, cookie will be set by AccountProvider",
            );
          }
        } catch (cookieError) {
          console.warn(
            "[AuthCallback] Error setting auth cookie:",
            cookieError,
          );
          // クッキー設定に失敗してもセッションは取得できているので続行
          // AccountProviderが後でlink処理を実行する
        }

        // リダイレクト先を取得
        const returnTo = getRedirectUrl(router.query.returnTo);
        console.log("[AuthCallback] Redirecting to:", returnTo);

        setStatus("success");
        setMessage("Login completed!");

        // 少し待ってからリダイレクト（UIの更新を待つ）
        setTimeout(() => {
          router.push(returnTo).catch((err) => {
            console.error("[AuthCallback] Redirect failed:", err);
            // フォールバック: ホームにリダイレクト
            router.push("/").catch(() => {
              // 最終的なフォールバック
              window.location.href = "/";
            });
          });
        }, 1000);
      } catch (err) {
        console.error("[AuthCallback] Unexpected error:", err);
        setStatus("error");
        setMessage("An unexpected error occurred.");
        setTimeout(() => {
          router.push("/").catch(() => {
            window.location.href = "/";
          });
        }, 3000);
      }
    };

    handleAuthCallback();
  }, [router.isReady, router.query.returnTo, router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
        <div className="mb-6">
          {status === "loading" && (
            <div className="w-16 h-16 mx-auto mb-4 bg-blue-100 rounded-full flex items-center justify-center">
              <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
            </div>
          )}
          {status === "success" && (
            <div className="w-16 h-16 mx-auto mb-4 bg-green-100 rounded-full flex items-center justify-center">
              <svg
                className="w-8 h-8 text-green-500"
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
            </div>
          )}
          {status === "error" && (
            <div className="w-16 h-16 mx-auto mb-4 bg-red-100 rounded-full flex items-center justify-center">
              <svg
                className="w-8 h-8 text-red-500"
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
            </div>
          )}
        </div>

        <h2 className="text-xl font-semibold text-gray-900 mb-2">
          {status === "loading" && "Authenticating..."}
          {status === "success" && "Login Complete!"}
          {status === "error" && "An error occurred"}
        </h2>

        <p className="text-gray-600 mb-6">{message}</p>

        {status === "loading" && (
          <div className="text-sm text-gray-500">
            Please wait while redirecting...
          </div>
        )}

        {status === "success" && (
          <div className="text-sm text-green-600">
            Returning to your previous page...
          </div>
        )}

        {status === "error" && (
          <button
            onClick={() => router.push("/")}
            className="bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600 transition-colors"
          >
            ホームに戻る
          </button>
        )}
      </div>
    </div>
  );
}
