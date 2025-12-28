import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { CHAT_RESULT_PATH, buildQuizRedirect } from "./lib/chatAccess";
import {
  SUPABASE_AUTH_COOKIE_NAME,
  hasValidSupabaseSession,
} from "./lib/server/supabaseCookies";
// CORS configuration for middleware
const ALLOWED_ORIGINS_DEFAULT = [
  "https://gappytravel.com",
  "https://www.gappytravel.com",
  "https://gappytravel.com",
  "https://www.gappytravel.com",
];

const DEV_ORIGINS = [
  "http://localhost:2098",
  "http://localhost:3000",
  "http://127.0.0.1:2098",
  "http://127.0.0.1:3000",
];

function getAllowedOrigins(): string[] {
  const envOrigins = process.env.ALLOWED_ORIGINS;
  const origins = envOrigins
    ? envOrigins.split(",").map((o) => o.trim())
    : ALLOWED_ORIGINS_DEFAULT;

  if (process.env.NODE_ENV === "development") {
    return [...origins, ...DEV_ORIGINS];
  }

  return origins;
}

function isOriginAllowed(origin: string | undefined): boolean {
  if (!origin) return false;
  const allowedOrigins = getAllowedOrigins();
  return allowedOrigins.includes(origin);
}

const UTM_COOKIE_NAME = "gappy_utm";
const UTM_KEYS = [
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_term",
  "utm_content",
  "gclid",
];
const UTM_COOKIE_MAX_AGE = 60 * 60 * 24 * 90; // 90 days

const PROTECTED_PATHS = ["/liked-activities"];

export async function middleware(req: NextRequest) {
  const hostname = req.headers.get("host") || "";
  const { pathname } = req.nextUrl;

  const canonicalHost = (() => {
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;
    if (!siteUrl) return "gappytravel.com";
    try {
      return new URL(siteUrl).host;
    } catch {
      return "gappytravel.com";
    }
  })();
  
  // ステージング環境 → 本番ドメイン リダイレクト
  // develop などで canonicalHost が staging の場合はリダイレクトしない
  if (
    hostname.includes("tabinaka-media-staging.vercel.app") &&
    canonicalHost === "gappytravel.com"
  ) {
    const url = new URL(req.url);
    url.hostname = canonicalHost;
    url.protocol = "https";
    return NextResponse.redirect(url, 301); // 301は永久リダイレクト
  }

  // WWW → non-WWW リダイレクト (www.<canonical> → <canonical>)
  // ポート番号を除去して比較
  const hostnameWithoutPort = hostname.split(":")[0];
  const canonicalHostWithoutPort = canonicalHost.split(":")[0];
  
  if (hostnameWithoutPort === `www.${canonicalHostWithoutPort}`) {
    const url = req.nextUrl.clone();
    // プロトコルを明示的に設定
    url.protocol = "https:";
    // ホスト名を設定（ポート番号は除去）
    url.hostname = canonicalHostWithoutPort;
    // ポート番号をクリア
    url.port = "";
    return NextResponse.redirect(url, 301); // 301は永久リダイレクト
  }

  let response: NextResponse | null = null;

  if (SUPABASE_AUTH_COOKIE_NAME) {
    const { pathname } = req.nextUrl;
    const protectedPath = PROTECTED_PATHS.find((path) =>
      pathname.startsWith(path),
    );
    if (protectedPath) {
      const supabaseCookie = req.cookies.get(SUPABASE_AUTH_COOKIE_NAME);
      const hasSession = supabaseCookie?.value
        ? await hasValidSupabaseSession(supabaseCookie.value)
        : false;
      if (!hasSession) {
        const returnTo = `${pathname}${req.nextUrl.search}`;
        const url = req.nextUrl.clone();
        const destination = buildQuizRedirect(returnTo);
        url.pathname = destination.split("?")[0];
        const searchParams = destination.split("?")[1];
        url.search = searchParams ? `?${searchParams}` : "";
        response = NextResponse.redirect(url);
      }
    }
  }

  // Capture UTM parameters on every request (first-touch override allowed)
  const utmEntries = UTM_KEYS.map(
    (key) => [key, req.nextUrl.searchParams.get(key)] as const,
  ).filter(([, value]) => value);

  if (!response) {
    response = NextResponse.next();
  }

  // Set CORS headers for API routes
  if (pathname.startsWith("/api/")) {
    const origin = req.headers.get("origin");

    // オリジンが許可リストに含まれている場合のみ、そのオリジンを返す
    if (origin && isOriginAllowed(origin)) {
      response.headers.set("Access-Control-Allow-Origin", origin);
    } else if (process.env.CORS_ORIGIN) {
      // 環境変数で指定されたオリジンを使用
      response.headers.set("Access-Control-Allow-Origin", process.env.CORS_ORIGIN);
    }

    response.headers.set(
      "Access-Control-Allow-Methods",
      "GET, POST, PUT, DELETE, OPTIONS"
    );
    response.headers.set(
      "Access-Control-Allow-Headers",
      "Content-Type, Authorization, X-Gappy-Account-Id, X-Gappy-Account-Token, X-Requested-With"
    );
    response.headers.set("Access-Control-Allow-Credentials", "true");
    response.headers.set("Access-Control-Max-Age", "86400"); // 24時間
  }

  if (utmEntries.length > 0) {
    const utmObject = Object.fromEntries(utmEntries) as Record<string, string>;
    response.cookies.set(UTM_COOKIE_NAME, JSON.stringify(utmObject), {
      path: "/",
      maxAge: UTM_COOKIE_MAX_AGE,
      httpOnly: false,
      sameSite: "lax",
    });
  }

  return response;
}

export const config = {
  // 全ページでUTMを捕捉。_next配下などの静的アセットは除外。
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
