import type { NextApiRequest, NextApiResponse } from "next";
import {
  ACCOUNT_ID_COOKIE,
  ACCOUNT_TOKEN_COOKIE,
  ACCOUNT_TOKEN_TTL_MS,
  buildAccountCookie,
  createAccountId,
  isUuid,
  signAccountToken,
  verifyAccountToken,
} from "@/lib/accountToken";
import { handleCorsPreflightRequest, setCorsHeaders } from "@/lib/cors";

const TOKEN_TTL_SECONDS = Math.floor(ACCOUNT_TOKEN_TTL_MS / 1000);

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  // CORS: プリフライトリクエストを処理
  if (handleCorsPreflightRequest(req, res)) {
    return;
  }
  setCorsHeaders(req, res);

  if (req.method !== "GET") {
    res.setHeader("Allow", ["GET"]);
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  try {
    const existingIdRaw = req.cookies[ACCOUNT_ID_COOKIE];
    const existingId = existingIdRaw && isUuid(existingIdRaw) ? existingIdRaw : null;
    const existingToken = req.cookies[ACCOUNT_TOKEN_COOKIE];

    let accountId = existingId;
    let tokenRecord = verifyAccountToken(existingToken);

    if (!accountId || !tokenRecord || tokenRecord.accountId !== accountId) {
      accountId = createAccountId();
      tokenRecord = signAccountToken(accountId);
    } else {
      const remaining = tokenRecord.expiresAt - Date.now();
      if (remaining < ACCOUNT_TOKEN_TTL_MS / 2) {
        tokenRecord = signAccountToken(accountId);
      }
    }

    const cookieSameSite =
      (process.env.COOKIE_SAME_SITE as "Strict" | "Lax" | "None") || "Lax";
    const cookieSecure =
      process.env.NODE_ENV === "production" || cookieSameSite === "None";
    const cookieDomain = process.env.COOKIE_DOMAIN || undefined;

    const cookies = [
      buildAccountCookie(ACCOUNT_ID_COOKIE, accountId, TOKEN_TTL_SECONDS),
      buildAccountCookie(
        ACCOUNT_TOKEN_COOKIE,
        tokenRecord.token,
        TOKEN_TTL_SECONDS,
      ),
    ];

    res.setHeader("Set-Cookie", cookies);

    return res.status(200).json({
      accountId,
      accountToken: tokenRecord.token,
      expiresAt: tokenRecord.expiresAt,
    });
  } catch (error) {
    console.error("[account/session] unexpected error", error);
    return res.status(500).json({ error: "Failed to create session" });
  }
}
