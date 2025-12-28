const projectRefMatch = process.env.NEXT_PUBLIC_SUPABASE_URL?.match(
  /https?:\/\/(.+?)\.supabase\.co/,
);

export const SUPABASE_AUTH_COOKIE_NAME = projectRefMatch
  ? `sb-${projectRefMatch[1]}-auth-token`
  : undefined;
export const SUPABASE_AUTH_COOKIE_TTL_SECONDS = 60 * 60 * 24 * 7; // 7 days

const textEncoder = new TextEncoder();
const textDecoder = new TextDecoder();

const getCrypto = () => {
  if (typeof globalThis.crypto === "undefined" || !globalThis.crypto.subtle) {
    throw new Error(
      "[supabaseCookies] Web Crypto API is not available in this environment",
    );
  }
  return globalThis.crypto;
};

const getSecret = () => {
  const secret = process.env.ACCOUNT_TOKEN_SECRET;
  if (!secret) {
    throw new Error("[supabaseCookies] ACCOUNT_TOKEN_SECRET is not set");
  }
  return secret;
};

const toBase64 = (input: ArrayBuffer | Uint8Array): string => {
  const view = input instanceof ArrayBuffer ? new Uint8Array(input) : input;
  if (typeof Buffer !== "undefined") {
    return Buffer.from(view).toString("base64");
  }
  let binary = "";
  for (let i = 0; i < view.length; i += 1) {
    binary += String.fromCharCode(view[i]);
  }
  return globalThis.btoa(binary);
};

const fromBase64 = (value: string): Uint8Array => {
  if (typeof Buffer !== "undefined") {
    return new Uint8Array(Buffer.from(value, "base64"));
  }
  const binary = globalThis.atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
};

const toBase64Url = (value: string) =>
  value.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/u, "");

const fromBase64Url = (value: string) => {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized.padEnd(
    normalized.length + ((4 - (normalized.length % 4 || 4)) % 4),
    "=",
  );
  return padded;
};

const encodePayload = (payload: SupabaseSessionCookiePayload) => {
  const json = JSON.stringify(payload);
  const bytes = textEncoder.encode(json);
  return toBase64Url(toBase64(bytes));
};

const decodePayload = (encoded: string): SupabaseSessionCookiePayload => {
  const base64 = fromBase64Url(encoded);
  const bytes = fromBase64(base64);
  const json = textDecoder.decode(bytes);
  return JSON.parse(json) as SupabaseSessionCookiePayload;
};

/**
 * Cookie設定オプション
 * 環境変数で制御可能
 */
interface CookieOptions {
  secure: boolean;
  sameSite: "Strict" | "Lax" | "None";
  domain?: string;
}

/**
 * 環境変数からCookie設定を取得
 */
function getCookieOptions(secureFlag: boolean): CookieOptions {
  // COOKIE_SAME_SITE: クロスオリジン対応時は "None" を設定
  // デフォルト: "Lax"
  const sameSite =
    (process.env.COOKIE_SAME_SITE as CookieOptions["sameSite"]) || "Lax";

  // COOKIE_DOMAIN: サブドメイン間でCookieを共有する場合に設定
  // 例: ".gappytravel.com" (先頭にドットを含める)
  const domain = process.env.COOKIE_DOMAIN || undefined;

  return {
    // SameSite=None の場合はSecure必須
    secure: secureFlag || sameSite === "None",
    sameSite,
    domain,
  };
}

const formatCookieHeader = (
  value: string,
  maxAgeSeconds: number,
  secure: boolean,
) => {
  if (!SUPABASE_AUTH_COOKIE_NAME) {
    return null;
  }

  const options = getCookieOptions(secure);

  const segments = [
    `${SUPABASE_AUTH_COOKIE_NAME}=${value}`,
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
};

let hmacKeyPromise: Promise<CryptoKey> | null = null;

const getHmacKey = () => {
  if (!hmacKeyPromise) {
    const cryptoImpl = getCrypto();
    hmacKeyPromise = cryptoImpl.subtle.importKey(
      "raw",
      textEncoder.encode(getSecret()),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign", "verify"],
    );
  }
  return hmacKeyPromise;
};

const signPayload = async (encodedPayload: string) => {
  const cryptoImpl = getCrypto();
  const key = await getHmacKey();
  const signature = await cryptoImpl.subtle.sign(
    "HMAC",
    key,
    textEncoder.encode(encodedPayload),
  );
  return toBase64Url(toBase64(signature));
};

const verifySignature = async (encodedPayload: string, signature: string) => {
  try {
    const cryptoImpl = getCrypto();
    const key = await getHmacKey();
    const signatureBytes = fromBase64(fromBase64Url(signature));
    // Ensure we have a proper ArrayBuffer by creating a new ArrayBuffer and copying the data
    const signatureBuffer = new Uint8Array(signatureBytes.length);
    signatureBuffer.set(signatureBytes);
    return cryptoImpl.subtle.verify(
      "HMAC",
      key,
      signatureBuffer,
      textEncoder.encode(encodedPayload),
    );
  } catch (error) {
    console.warn(
      "[supabaseCookies] Failed to verify auth cookie signature",
      error,
    );
    return false;
  }
};

export type SupabaseSessionCookiePayload = {
  accountId: string;
  supabaseUserId: string;
  issuedAt: number;
  expiresAt: number;
};

export type VerifiedSupabaseSession = SupabaseSessionCookiePayload;

export async function serializeSupabaseAuthCookie(options: {
  accountId: string;
  supabaseUserId: string;
  secure: boolean;
  maxAgeSeconds?: number;
}): Promise<string | null> {
  if (!SUPABASE_AUTH_COOKIE_NAME) {
    return null;
  }
  const {
    accountId,
    supabaseUserId,
    secure,
    maxAgeSeconds = SUPABASE_AUTH_COOKIE_TTL_SECONDS,
  } = options;
  const issuedAt = Date.now();
  const expiresAt = issuedAt + maxAgeSeconds * 1000;
  const payload: SupabaseSessionCookiePayload = {
    accountId,
    supabaseUserId,
    issuedAt,
    expiresAt,
  };
  const encoded = encodePayload(payload);
  const signature = await signPayload(encoded);
  return formatCookieHeader(`${encoded}.${signature}`, maxAgeSeconds, secure);
}

export const serializeSupabaseAuthCookieRemoval = (secure: boolean) =>
  formatCookieHeader("", 0, secure);

export const verifySupabaseSessionCookie = async (
  value?: string | null,
): Promise<VerifiedSupabaseSession | null> => {
  if (!value) {
    return null;
  }
  const [encoded, signature] = value.split(".");
  if (!encoded || !signature) {
    return null;
  }
  const isValid = await verifySignature(encoded, signature);
  if (!isValid) {
    return null;
  }
  try {
    const payload = decodePayload(encoded);
    if (!payload.accountId || !payload.supabaseUserId) {
      return null;
    }
    if (payload.expiresAt && Date.now() > payload.expiresAt) {
      return null;
    }
    return payload;
  } catch (error) {
    console.warn(
      "[supabaseCookies] Failed to decode auth cookie payload",
      error,
    );
    return null;
  }
};

export const hasValidSupabaseSession = async (
  value?: string | null,
): Promise<boolean> => {
  const payload = await verifySupabaseSessionCookie(value);
  return Boolean(payload);
};
