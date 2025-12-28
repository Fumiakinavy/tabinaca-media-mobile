import { createClient } from "@supabase/supabase-js";

// CI環境対応: 環境変数がない場合はダミー値を使用
const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder.supabase.co";
const supabaseAnonKey =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBsYWNlaG9sZGVyIiwicm9sZSI6ImFub24iLCJpYXQiOjE2NDUxOTI4MDAsImV4cCI6MTk2MDc2ODgwMH0.placeholder";

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Googleでサインイン
type SignInOptions = {
  returnTo?: string;
};

export async function signInWithGoogle(options?: SignInOptions) {
  // リダイレクトURLを明示的に指定（Supabaseダッシュボード/Google OAuthの許可URIと一致させる）
  let redirectTo: string | undefined = undefined;
  if (typeof window !== "undefined") {
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || window.location.origin;
    const desiredReturnTo =
      options?.returnTo || window.location.pathname + window.location.search;
    const returnTo = desiredReturnTo.startsWith("/")
      ? desiredReturnTo
      : `/${desiredReturnTo.replace(/^\/+/, "")}`;
    const query = `returnTo=${encodeURIComponent(returnTo)}`;
    redirectTo = `${siteUrl}/auth/callback?${query}`;
  }

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo,
    },
  });

  if (error) {
    console.error("Sign in error:", error);
    return { error };
  }

  return { data };
}

// サインアウト
export async function signOut() {
  const { error } = await supabase.auth.signOut();

  if (error) {
    console.error("Sign out error:", error);
    return { error };
  }

  try {
    await fetch("/api/account/link", {
      method: "DELETE",
      credentials: "include",
    });
  } catch (cookieError) {
    console.warn(
      "[supabaseAuth] Failed to clear Supabase auth cookie",
      cookieError,
    );
  }

  return { error: null };
}

// 現在のユーザーを取得
export async function getCurrentUser() {
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error) {
    console.error("Get user error:", error);
    return { user: null, error };
  }

  return { user, error: null };
}
