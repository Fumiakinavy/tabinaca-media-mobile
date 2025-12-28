import crypto from "crypto";

const DEFAULT_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

type ShareTokenPayload = {
  sid: string; // session id
  exp: number; // epoch millis
};

const getSecret = () => {
  const secret =
    process.env.CHAT_SHARE_SECRET || process.env.ACCOUNT_TOKEN_SECRET;
  if (!secret) {
    throw new Error("CHAT_SHARE_SECRET or ACCOUNT_TOKEN_SECRET must be set");
  }
  return secret;
};

const toBase64Url = (value: string) => Buffer.from(value).toString("base64url");
const fromBase64Url = (value: string) =>
  Buffer.from(value, "base64url").toString("utf8");

export function createShareToken(
  sessionId: string,
  ttlMs = DEFAULT_TTL_MS,
): string {
  const payload: ShareTokenPayload = {
    sid: sessionId,
    exp: Date.now() + Math.max(ttlMs, 60 * 1000),
  };

  const payloadB64 = toBase64Url(JSON.stringify(payload));
  const hmac = crypto.createHmac("sha256", getSecret());
  hmac.update(payloadB64);
  const sig = hmac.digest("base64url");
  return `${payloadB64}.${sig}`;
}

export function verifyShareToken(token: string): ShareTokenPayload | null {
  if (!token || typeof token !== "string") return null;
  const [payloadB64, sig] = token.split(".");
  if (!payloadB64 || !sig) return null;

  const hmac = crypto.createHmac("sha256", getSecret());
  hmac.update(payloadB64);
  const expected = hmac.digest("base64url");
  const sigBuf = Buffer.from(sig);
  const expBuf = Buffer.from(expected);
  if (
    sigBuf.length !== expBuf.length ||
    !crypto.timingSafeEqual(sigBuf, expBuf)
  ) {
    return null;
  }

  try {
    const payload = JSON.parse(fromBase64Url(payloadB64)) as ShareTokenPayload;
    if (!payload?.sid || typeof payload.exp !== "number") {
      return null;
    }
    if (Date.now() > payload.exp) {
      return null;
    }
    return payload;
  } catch (error) {
    console.error("[verifyShareToken] Failed to parse payload", error);
    return null;
  }
}

export function getShareBaseUrl(req?: {
  headers?: Record<string, string | string[] | undefined>;
}): string {
  const envUrl =
    process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXT_PUBLIC_BASE_URL;
  if (envUrl) {
    return envUrl.replace(/\/$/, "");
  }

  const host = req?.headers?.host;
  const protoHeader = req?.headers?.["x-forwarded-proto"];
  const proto = Array.isArray(protoHeader) ? protoHeader[0] : protoHeader;
  if (host) {
    return `${proto || "https"}://${host}`.replace(/\/$/, "");
  }

  return "";
}
