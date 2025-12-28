const UTM_COOKIE_NAME = "gappy_utm";
const UTM_KEYS = [
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_term",
  "utm_content",
  "gclid",
] as const;

export type UtmParams = Partial<Record<(typeof UTM_KEYS)[number], string>>;

const STORAGE_PREFIX = "utm/synced/";

const safeParseJSON = <T>(value: string | null): T | null => {
  if (!value) return null;
  try {
    return JSON.parse(value) as T;
  } catch (error) {
    console.warn("[utm] Failed to parse JSON", error);
    return null;
  }
};

const normalizeUtm = (input: unknown): UtmParams | null => {
  if (!input || typeof input !== "object") {
    return null;
  }

  const result: UtmParams = {};
  for (const key of UTM_KEYS) {
    const value = (input as Record<string, unknown>)[key];
    if (typeof value === "string") {
      const trimmed = value.trim();
      if (trimmed) {
        result[key] = trimmed;
      }
    }
  }

  return Object.keys(result).length > 0 ? result : null;
};

const serializeUtm = (utm: UtmParams): string => {
  return UTM_KEYS.map((key) => `${key}:${utm[key] ?? ""}`).join("|");
};

const getCookieValue = (name: string): string | null => {
  if (typeof document === "undefined") return null;
  const cookies = document.cookie ? document.cookie.split("; ") : [];
  const target = cookies.find((row) => row.startsWith(`${name}=`));
  if (!target) return null;
  return decodeURIComponent(target.split("=").slice(1).join("="));
};

const getStorage = () => {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage;
  } catch (error) {
    console.warn("[utm] localStorage unavailable", error);
    return null;
  }
};

export const readUtmCookie = (): UtmParams | null => {
  const raw = getCookieValue(UTM_COOKIE_NAME);
  if (!raw) return null;
  const parsed = safeParseJSON<unknown>(raw);
  return normalizeUtm(parsed);
};

export const shouldSyncUtmForAccount = (
  accountId: string,
  utm: UtmParams,
): boolean => {
  const storage = getStorage();
  if (!storage) return true;
  const key = `${STORAGE_PREFIX}${accountId}`;
  const serialized = serializeUtm(utm);
  const stored = storage.getItem(key);
  return stored !== serialized;
};

export const markUtmSynced = (accountId: string, utm: UtmParams) => {
  const storage = getStorage();
  if (!storage) return;
  const key = `${STORAGE_PREFIX}${accountId}`;
  storage.setItem(key, serializeUtm(utm));
};

export const normalizeUtmPayload = (input: unknown): UtmParams | null =>
  normalizeUtm(input);
