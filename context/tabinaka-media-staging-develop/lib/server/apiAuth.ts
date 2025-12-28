import type { NextApiRequest } from "next";
import type { User } from "@supabase/supabase-js";
import {
  verifyAccountToken,
  ACCOUNT_ID_COOKIE,
  ACCOUNT_TOKEN_COOKIE,
} from "@/lib/accountToken";
import { supabaseServer } from "@/lib/supabaseServer";
import fetch from "node-fetch";

export class ApiAuthError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
    this.name = "ApiAuthError";
  }
}

export interface RequestAccountContext {
  accountId: string;
  accountToken: string;
  supabaseAccessToken: string;
  supabaseUser: User;
}

const getHeaderValue = (
  value: string | string[] | undefined,
): string | null => {
  if (!value) return null;
  return Array.isArray(value) ? value[0] : value;
};

/**
 * JWTのペイロード部分だけを安全にデコード（署名検証は行わない）
 */
const decodeJwtPayload = (token: string): Record<string, unknown> | null => {
  try {
    const [, payloadB64] = token.split(".");
    if (!payloadB64) return null;
    const normalized = payloadB64.replace(/-/g, "+").replace(/_/g, "/");
    const padded = normalized.padEnd(
      normalized.length + ((4 - (normalized.length % 4 || 4)) % 4),
      "=",
    );
    const json = Buffer.from(padded, "base64").toString("utf8");
    return JSON.parse(json);
  } catch {
    return null;
  }
};

export async function resolveRequestAccountContext(
  req: NextApiRequest,
): Promise<RequestAccountContext> {
  let accountId = getHeaderValue(req.headers["x-gappy-account-id"]);
  let accountToken = getHeaderValue(req.headers["x-gappy-account-token"]);

  // Fallback to cookies if headers are missing
  if (!accountId || !accountToken) {
    accountId = req.cookies[ACCOUNT_ID_COOKIE] || null;
    accountToken = req.cookies[ACCOUNT_TOKEN_COOKIE] || null;
  }

  if (!accountId || !accountToken) {
    const receivedHeaders = Object.keys(req.headers).join(", ");
    throw new ApiAuthError(
      401,
      `Missing account credentials. Received headers: ${receivedHeaders}`,
    );
  }

  const tokenRecord = verifyAccountToken(accountToken);
  if (!tokenRecord || tokenRecord.accountId !== accountId) {
    throw new ApiAuthError(401, "Invalid account session");
  }

  const rawAuthHeader = (req.headers.authorization ||
    req.headers.Authorization) as string | undefined;
  if (
    !rawAuthHeader ||
    typeof rawAuthHeader !== "string" ||
    !rawAuthHeader.toLowerCase().startsWith("bearer ")
  ) {
    throw new ApiAuthError(401, "Authorization required");
  }

  const supabaseAccessToken = rawAuthHeader.slice(7).trim();
  if (!supabaseAccessToken) {
    throw new ApiAuthError(401, "Authorization required");
  }

  const { data, error } = await supabaseServer.auth.getUser(supabaseAccessToken);
  if (error || !data?.user) {
    const decoded = decodeJwtPayload(supabaseAccessToken);
    let authUserStatus: number | undefined;
    let authUserBody: string | undefined;

    // 追加診断: 直接 Auth API を叩いて理由を確認し、レスポンスを401メッセージに含める
    try {
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
      if (supabaseUrl && supabaseKey) {
        const resp = await fetch(`${supabaseUrl}/auth/v1/user`, {
          method: "GET",
          headers: {
            Authorization: `Bearer ${supabaseAccessToken}`,
            apikey: supabaseKey,
          },
        });
        authUserStatus = resp.status;
        authUserBody = await resp.text();
        console.error("[apiAuth] direct auth/v1/user response", {
          status: resp.status,
          statusText: resp.statusText,
          body: authUserBody,
        });
      } else {
        console.error("[apiAuth] missing supabase URL or service key for debug");
      }
    } catch (e) {
      console.error("[apiAuth] direct auth/v1/user fetch failed", e);
    }

    console.error("[apiAuth] supabase getUser failed", {
      error: error?.message,
      status: error?.status,
      supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
      iss: decoded?.iss,
      aud: decoded?.aud,
      sub: decoded?.sub,
      exp: decoded?.exp,
      now: Math.floor(Date.now() / 1000),
      authUserStatus,
    });

    const msgParts = [
      "Invalid Supabase session",
      decoded?.iss ? `iss=${decoded.iss}` : null,
      decoded?.aud ? `aud=${decoded.aud}` : null,
      decoded?.exp ? `exp=${decoded.exp}` : null,
      authUserStatus ? `auth_user_status=${authUserStatus}` : null,
    ].filter(Boolean);

    throw new ApiAuthError(401, msgParts.join("; "));
  }

  return {
    accountId,
    accountToken,
    supabaseAccessToken,
    supabaseUser: data.user,
  };
}
