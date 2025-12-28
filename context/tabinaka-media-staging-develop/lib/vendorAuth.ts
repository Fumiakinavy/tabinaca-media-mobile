import crypto from "crypto";

const COOKIE_PREFIX = "vendor_auth_";
const COOKIE_MAX_AGE_SEC = 60 * 60 * 24; // 24h

function getSecret(): string {
  const secret = process.env.VENDOR_AUTH_SECRET;
  if (!secret) {
    throw new Error("VENDOR_AUTH_SECRET is not set");
  }
  return secret;
}

export function signPayload(payload: object): string {
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const sig = crypto
    .createHmac("sha256", getSecret())
    .update(body)
    .digest("base64url");
  return `${body}.${sig}`;
}

export function verifyToken(token: string): any | null {
  const [body, sig] = token.split(".");
  if (!body || !sig) return null;
  const expected = crypto
    .createHmac("sha256", getSecret())
    .update(body)
    .digest("base64url");
  if (expected !== sig) return null;
  try {
    return JSON.parse(Buffer.from(body, "base64url").toString("utf8"));
  } catch {
    return null;
  }
}

export function cookieNameForVendor(vendorId: string): string {
  return `${COOKIE_PREFIX}${vendorId}`;
}

export function buildAuthCookie(name: string, token: string): string {
  return `${name}=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${COOKIE_MAX_AGE_SEC}`;
}

export function clearAuthCookie(name: string): string {
  return `${name}=deleted; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`;
}
