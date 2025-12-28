type StorageBackend = Pick<Storage, "getItem" | "setItem" | "removeItem">;

const NAMESPACE_PREFIX = "account";
const LEGACY_USER_ID_KEY = "gappy_user_id";
const LEGACY_QUIZ_PAYLOAD_KEY = "gappy_travel_quiz_payload";
const LEGACY_SMART_RECOMMENDATION_PREFIX = "smart_recommendation_";
const LEGACY_ONBOARDING_PREFIX = "onboarding_";
const MIGRATION_MARKER_KEY = "migration/v1";

export const ACCOUNT_STORAGE_KEYS = {
  QUIZ_PAYLOAD: "quiz/payload",
  QUIZ_FORM: "quiz/form",
  QUIZ_STATUS: "quiz/status",
  RECOMMENDATION: "recommendation/latest",
  ONBOARDING: "onboarding/status",
  SYNC_STATE: "sync/state",
};

const getBackend = (): StorageBackend | null => {
  if (typeof window === "undefined") {
    return null;
  }
  return window.localStorage;
};

const buildKey = (accountId: string, key: string) =>
  `${NAMESPACE_PREFIX}/${accountId}/${key}`;

const parseJSON = <T>(value: string | null): T | null => {
  if (!value) {
    return null;
  }
  try {
    return JSON.parse(value) as T;
  } catch (error) {
    console.error("[accountStorage] Failed to parse JSON", error);
    return null;
  }
};

export const accountStorage = {
  get(accountId: string | null | undefined, key: string) {
    const backend = getBackend();
    if (!backend || !accountId) {
      return null;
    }
    return backend.getItem(buildKey(accountId, key));
  },
  set(accountId: string | null | undefined, key: string, value: string) {
    const backend = getBackend();
    if (!backend || !accountId) {
      return;
    }
    backend.setItem(buildKey(accountId, key), value);
  },
  remove(accountId: string | null | undefined, key: string) {
    const backend = getBackend();
    if (!backend || !accountId) {
      return;
    }
    backend.removeItem(buildKey(accountId, key));
  },
  getJSON<T>(accountId: string | null | undefined, key: string): T | null {
    const raw = accountStorage.get(accountId, key);
    return parseJSON<T>(raw);
  },
  setJSON(accountId: string | null | undefined, key: string, value: unknown) {
    if (!accountId) {
      return;
    }
    accountStorage.set(accountId, key, JSON.stringify(value));
  },
};

const ACCOUNT_MIGRATION_KEYS = [
  ACCOUNT_STORAGE_KEYS.QUIZ_PAYLOAD,
  ACCOUNT_STORAGE_KEYS.QUIZ_FORM,
  ACCOUNT_STORAGE_KEYS.QUIZ_STATUS,
  ACCOUNT_STORAGE_KEYS.RECOMMENDATION,
  ACCOUNT_STORAGE_KEYS.ONBOARDING,
  ACCOUNT_STORAGE_KEYS.SYNC_STATE,
];

export const moveAccountDataToAccountId = (
  sourceAccountId: string | null | undefined,
  targetAccountId: string | null | undefined,
) => {
  if (
    !sourceAccountId ||
    !targetAccountId ||
    sourceAccountId === targetAccountId
  ) {
    return false;
  }

  const backend = getBackend();
  if (!backend) {
    return false;
  }

  let moved = false;
  for (const key of ACCOUNT_MIGRATION_KEYS) {
    const value = accountStorage.get(sourceAccountId, key);
    if (!value) {
      continue;
    }
    accountStorage.set(targetAccountId, key, value);
    accountStorage.remove(sourceAccountId, key);
    moved = true;
  }

  return moved;
};

export function migrateLegacyAccountData(accountId: string | null | undefined) {
  if (!accountId) {
    return;
  }
  const backend = getBackend();
  if (!backend) {
    return;
  }

  const migrationKey = buildKey(accountId, MIGRATION_MARKER_KEY);
  if (backend.getItem(migrationKey) === "1") {
    return;
  }

  const legacyQuiz = backend.getItem(LEGACY_QUIZ_PAYLOAD_KEY);
  if (legacyQuiz) {
    accountStorage.set(
      accountId,
      ACCOUNT_STORAGE_KEYS.QUIZ_PAYLOAD,
      legacyQuiz,
    );
    backend.removeItem(LEGACY_QUIZ_PAYLOAD_KEY);
  }

  // Legacy User ID migration logic removed as it's no longer needed.
  // The primary data source is now `account_id` based storage.
  /*
  const legacyUserId = backend.getItem(LEGACY_USER_ID_KEY);
  if (legacyUserId) {
    // ... removed ...
  }
  */

  backend.setItem(migrationKey, "1");
}
