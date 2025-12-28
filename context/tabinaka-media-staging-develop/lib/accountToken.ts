import crypto from "crypto";

export const ACCOUNT_ID_COOKIE = "gappy_account_id";
export const ACCOUNT_TOKEN_COOKIE = "gappy_account_token";
export const ACCOUNT_TOKEN_TTL_MS = 1000 * 60 * 60 * 6; // 6 hours

export function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
    value,
  );
}

type VerifyResult = {
  accountId: string;
  issuedAt: number;
  expiresAt: number;
  token: string;
};

function getSecret() {
  const secret = process.env.ACCOUNT_TOKEN_SECRET;
  if (!secret) {
    // 開発環境ではダミーシークレットを使用（本番環境ではエラー）
    if (process.env.NODE_ENV === "development") {
      console.warn(
        "⚠️  ACCOUNT_TOKEN_SECRET is not set. Using dummy secret in development mode.",
      );
      return "dummy-account-token-secret-for-development-only";
    }
    throw new Error("ACCOUNT_TOKEN_SECRET is not set");
  }
  return secret;
}

export function createAccountId() {
  if (typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return crypto.randomBytes(16).toString("hex");
}

export function signAccountToken(accountId: string, issuedAt = Date.now()) {
  const payload = `${accountId}.${issuedAt}`;
  const signature = crypto
    .createHmac("sha256", getSecret())
    .update(payload)
    .digest("base64url");
  const token = `${payload}.${signature}`;
  return {
    accountId,
    token,
    issuedAt,
    expiresAt: issuedAt + ACCOUNT_TOKEN_TTL_MS,
  };
}

export function verifyAccountToken(
  token?: string | null,
  maxAgeMs = ACCOUNT_TOKEN_TTL_MS,
): VerifyResult | null {
  if (!token) {
    return null;
  }
  const [accountId, issuedAtRaw, signature] = token.split(".");
  if (!accountId || !issuedAtRaw || !signature) {
    return null;
  }
  const issuedAt = Number(issuedAtRaw);
  if (!Number.isFinite(issuedAt)) {
    return null;
  }
  const payload = `${accountId}.${issuedAt}`;
  const expected = crypto
    .createHmac("sha256", getSecret())
    .update(payload)
    .digest("base64url");
  const providedBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expected);
  if (providedBuffer.length !== expectedBuffer.length) {
    return null;
  }
  if (!crypto.timingSafeEqual(providedBuffer, expectedBuffer)) {
    return null;
  }
  const expiresAt = issuedAt + maxAgeMs;
  if (Date.now() > expiresAt) {
    return null;
  }
  return { accountId, issuedAt, expiresAt, token };
}

/**
 * Cookie設定オプション
 * 環境変数で制御可能
 */
interface CookieOptions {
  secure?: boolean;
  sameSite?: "Strict" | "Lax" | "None";
  domain?: string;
}

/**
 * 環境変数からCookie設定を取得
 */
function getCookieOptions(): CookieOptions {
  const isProduction = process.env.NODE_ENV === "production";

  // COOKIE_SAME_SITE: クロスオリジン対応時は "None" を設定
  // デフォルト: "Lax"
  const sameSite =
    (process.env.COOKIE_SAME_SITE as CookieOptions["sameSite"]) || "Lax";

  // COOKIE_DOMAIN: サブドメイン間でCookieを共有する場合に設定
  // 例: ".gappytravel.com" (先頭にドットを含める)
  const domain = process.env.COOKIE_DOMAIN || undefined;

  return {
    secure: isProduction || sameSite === "None", // SameSite=None の場合はSecure必須
    sameSite,
    domain,
  };
}

export function buildAccountCookie(
  name: string,
  value: string,
  maxAgeSeconds: number,
) {
  const options = getCookieOptions();

  const segments = [
    `${name}=${value}`,
    "Path=/",
    `Max-Age=${Math.max(0, Math.floor(maxAgeSeconds))}`,
    "HttpOnly",
    `SameSite=${options.sameSite}`,
  ];

  if (options.secure) {
    segments.push("Secure");
  }

  if (options.domain) {
    segments.push(`Domain=${options.domain}`);
  }

  return segments.join("; ");
}
