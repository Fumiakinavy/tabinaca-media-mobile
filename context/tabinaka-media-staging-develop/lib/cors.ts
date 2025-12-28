/**
 * CORS (Cross-Origin Resource Sharing) ユーティリティ
 * AWS App Runner環境でのクロスオリジンリクエストを適切に処理
 */

import type { NextApiRequest, NextApiResponse } from "next";

// 許可するオリジンのリスト
const ALLOWED_ORIGINS_DEFAULT = [
  "https://gappytravel.com",
  "https://www.gappytravel.com",
  "https://gappytravel.com",
  "https://www.gappytravel.com",
];

// 開発環境で追加で許可するオリジン
const DEV_ORIGINS = [
  "http://localhost:2098",
  "http://localhost:3000",
  "http://127.0.0.1:2098",
  "http://127.0.0.1:3000",
];

/**
 * 許可されたオリジンのリストを取得
 */
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

/**
 * リクエストのオリジンが許可されているかチェック
 */
function isOriginAllowed(origin: string | undefined): boolean {
  if (!origin) return false;
  const allowedOrigins = getAllowedOrigins();
  return allowedOrigins.includes(origin);
}

/**
 * CORSヘッダーをレスポンスに設定
 */
export function setCorsHeaders(
  req: NextApiRequest,
  res: NextApiResponse
): void {
  const origin = req.headers.origin;

  // オリジンが許可リストに含まれている場合のみ、そのオリジンを返す
  if (origin && isOriginAllowed(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
  } else if (process.env.CORS_ORIGIN) {
    // 環境変数で指定されたオリジンを使用
    res.setHeader("Access-Control-Allow-Origin", process.env.CORS_ORIGIN);
  }

  res.setHeader(
    "Access-Control-Allow-Methods",
    "GET, POST, PUT, DELETE, OPTIONS"
  );
  res.setHeader(
    "Access-Control-Allow-Headers",
    "Content-Type, Authorization, X-Gappy-Account-Id, X-Gappy-Account-Token, X-Requested-With"
  );
  res.setHeader("Access-Control-Allow-Credentials", "true");
  res.setHeader("Access-Control-Max-Age", "86400"); // 24時間
}

/**
 * OPTIONSリクエスト（プリフライト）を処理
 * @returns true if the request was handled (OPTIONS method), false otherwise
 */
export function handleCorsPreflightRequest(
  req: NextApiRequest,
  res: NextApiResponse
): boolean {
  setCorsHeaders(req, res);

  if (req.method === "OPTIONS") {
    res.status(200).end();
    return true;
  }

  return false;
}

/**
 * CORS対応のAPIハンドラーラッパー
 * 使用例:
 * ```
 * export default withCors(async (req, res) => {
 *   // APIロジック
 * });
 * ```
 */
export function withCors(
  handler: (req: NextApiRequest, res: NextApiResponse) => Promise<void> | void
) {
  return async (req: NextApiRequest, res: NextApiResponse) => {
    // プリフライトリクエストを処理
    if (handleCorsPreflightRequest(req, res)) {
      return;
    }

    // 通常のリクエストにもCORSヘッダーを設定
    setCorsHeaders(req, res);

    // 元のハンドラーを実行
    return handler(req, res);
  };
}

