import { accountStorage, ACCOUNT_STORAGE_KEYS } from "@/lib/accountStorage";
import { TravelTypeCode, getTravelTypeInfo } from "@/lib/travelTypeMapping";

export const QUIZ_RESULT_EVENT = "gappy-quiz-result-updated";
export const QUIZ_RESULT_TTL_MS = 1000 * 60 * 60 * 24 * 30; // 30 days

export type StoredTravelType = {
  travelTypeCode: TravelTypeCode;
  travelTypeName?: string;
  travelTypeEmoji?: string;
  travelTypeDescription?: string;
  travelTypeShortDescription?: string;
  locationLat?: number;
  locationLng?: number;
  locationPermission?: boolean;
  currentLocation?: string;
};

export type StoredQuizResult = {
  travelType: StoredTravelType;
  places?: any[];
  answers?: any;
  timestamp?: number;
};

export type QuizStatus = "pending" | "missing" | "completed";

export type LocalQuizRecordStatus = "synced" | "pending" | "failed";

type StoredQuizStatusMeta = {
  version: 1;
  status: LocalQuizRecordStatus;
  lastSyncedAt?: number;
  lastAttemptAt?: number;
  error?: string | null;
  retriable?: boolean;
};

const DEFAULT_STATUS_META: StoredQuizStatusMeta = {
  version: 1,
  status: "pending",
  retriable: true,
};

const PENDING_QUIZ_RESULT_KEY = "quiz/pending-result";

type PendingQuizResultRecord = {
  version: 1;
  storedAt: number;
  result: StoredQuizResult;
  accountId?: string | null;
};

export const isFreshQuizResult = (timestamp?: number) => {
  if (!timestamp) return false;
  const age = Date.now() - timestamp;
  return age < QUIZ_RESULT_TTL_MS;
};

const normalizeTravelType = (
  travelType: StoredTravelType,
): StoredTravelType => {
  if (!travelType?.travelTypeCode) {
    throw new Error("Missing travelTypeCode");
  }

  const baseInfo = getTravelTypeInfo(travelType.travelTypeCode);
  return {
    ...travelType,
    travelTypeCode: travelType.travelTypeCode,
    travelTypeName: travelType.travelTypeName || baseInfo.name,
    travelTypeEmoji: travelType.travelTypeEmoji || baseInfo.emoji,
    travelTypeDescription:
      travelType.travelTypeDescription || baseInfo.description,
    travelTypeShortDescription:
      travelType.travelTypeShortDescription || baseInfo.shortDescription,
  };
};

const normalizeQuizResult = (result: StoredQuizResult): StoredQuizResult => ({
  travelType: normalizeTravelType(result.travelType),
  places: result.places ?? [],
  answers: result.answers ?? null,
  timestamp: result.timestamp ?? Date.now(),
});

type ResolveStateOptions = {
  accountId?: string | null;
};

type QuizResultStateMissing = {
  status: "missing";
  record: null;
};

type QuizResultStatePresent = {
  status: LocalQuizRecordStatus | "stale";
  record: StoredQuizResult;
  lastSyncedAt?: number;
  lastAttemptAt?: number;
  error?: string | null;
  retriable?: boolean;
};

export type QuizResultState = QuizResultStateMissing | QuizResultStatePresent;

type PersistOptions = {
  status?: LocalQuizRecordStatus;
  lastSyncedAt?: number;
  lastAttemptAt?: number;
  error?: string | null;
  retriable?: boolean;
  emitEvent?: boolean;
};

type SyncContext = {
  accountId: string;
  authToken?: string | null;
  force?: boolean;
};

const readStatusMeta = (accountId: string): StoredQuizStatusMeta => {
  const stored = accountStorage.getJSON<StoredQuizStatusMeta>(
    accountId,
    ACCOUNT_STORAGE_KEYS.QUIZ_STATUS,
  );
  if (!stored) {
    return { ...DEFAULT_STATUS_META, status: "synced", retriable: true };
  }
  return {
    ...DEFAULT_STATUS_META,
    ...stored,
    status: stored.status ?? "synced",
  };
};

const writeStatusMeta = (accountId: string, meta: StoredQuizStatusMeta) => {
  accountStorage.setJSON(accountId, ACCOUNT_STORAGE_KEYS.QUIZ_STATUS, {
    ...DEFAULT_STATUS_META,
    ...meta,
    version: 1,
  });
};

export const persistQuizResultLocal = (
  accountId: string | null,
  result: StoredQuizResult,
  options: PersistOptions = {},
): boolean => {
  if (!accountId) {
    return false;
  }
  try {
    const normalized = normalizeQuizResult(result);
    const statusMeta: StoredQuizStatusMeta = {
      version: 1,
      status: options.status ?? "pending",
      lastSyncedAt: options.lastSyncedAt,
      lastAttemptAt: options.lastAttemptAt,
      error: options.error ?? null,
      retriable: options.retriable ?? true,
    };

    accountStorage.setJSON(
      accountId,
      ACCOUNT_STORAGE_KEYS.RECOMMENDATION,
      normalized,
    );
    if (normalized.answers) {
      accountStorage.setJSON(
        accountId,
        ACCOUNT_STORAGE_KEYS.QUIZ_FORM,
        normalized.answers,
      );
    }
    accountStorage.setJSON(accountId, ACCOUNT_STORAGE_KEYS.QUIZ_PAYLOAD, {
      travelTypeCode: normalized.travelType.travelTypeCode,
      travelTypeName: normalized.travelType.travelTypeName,
      travelTypeEmoji: normalized.travelType.travelTypeEmoji,
      travelTypeDescription: normalized.travelType.travelTypeDescription,
      travelTypeShortDescription:
        normalized.travelType.travelTypeShortDescription,
      timestamp: normalized.timestamp,
      status: statusMeta.status,
      lastSyncedAt: statusMeta.lastSyncedAt ?? null,
    });
    writeStatusMeta(accountId, statusMeta);

    if (options.emitEvent !== false) {
      emitQuizResultEvent();
    }
    return true;
  } catch (error) {
    console.error("[QuizClientState] Failed to persist quiz result", error);
    return false;
  }
};

export const resolveQuizResultState = (
  accountId?: string | null,
  options: ResolveStateOptions = {},
): QuizResultState => {
  const targetAccountId = options.accountId ?? accountId;
  if (!targetAccountId) {
    return { status: "missing", record: null };
  }

  const recommendation = accountStorage.getJSON<StoredQuizResult>(
    targetAccountId,
    ACCOUNT_STORAGE_KEYS.RECOMMENDATION,
  );

  if (!recommendation?.travelType) {
    return { status: "missing", record: null };
  }

  try {
    const normalized = normalizeQuizResult(recommendation);
    const meta = readStatusMeta(targetAccountId);
    let status: QuizResultStatePresent["status"] = meta.status;

    if (status === "synced" && !isFreshQuizResult(normalized.timestamp)) {
      status = "stale";
    }

    return {
      status,
      record: normalized,
      lastSyncedAt: meta.lastSyncedAt,
      lastAttemptAt: meta.lastAttemptAt,
      error: meta.error ?? undefined,
      retriable: meta.retriable ?? true,
    };
  } catch (error) {
    console.error(
      "[QuizClientState] Failed to resolve quiz result state",
      error,
    );
    return { status: "missing", record: null };
  }
};

export const getStoredQuizResult = (
  accountId?: string | null,
): StoredQuizResult | null => {
  const state = resolveQuizResultState(accountId);
  if (state.status === "missing") {
    return null;
  }
  return state.record;
};

export const clearQuizData = (accountId?: string | null) => {
  if (typeof window === "undefined") return;
  accountStorage.remove(accountId, ACCOUNT_STORAGE_KEYS.RECOMMENDATION);
  accountStorage.remove(accountId, ACCOUNT_STORAGE_KEYS.QUIZ_PAYLOAD);
  accountStorage.remove(accountId, ACCOUNT_STORAGE_KEYS.QUIZ_FORM);
  accountStorage.remove(accountId, ACCOUNT_STORAGE_KEYS.QUIZ_STATUS);
  clearPendingQuizResult();
  emitQuizResultEvent();
};

export const getStoredQuizFormAnswers = (accountId?: string | null) => {
  return accountStorage.getJSON(
    accountId ?? null,
    ACCOUNT_STORAGE_KEYS.QUIZ_FORM,
  );
};

export const saveQuizFormAnswers = (
  accountId: string | null | undefined,
  answers: unknown,
) => {
  if (!accountId || !answers) {
    return;
  }
  accountStorage.setJSON(accountId, ACCOUNT_STORAGE_KEYS.QUIZ_FORM, answers);
};

export const emitQuizResultEvent = () => {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(QUIZ_RESULT_EVENT));
};

export const subscribeQuizResult = (listener: () => void) => {
  if (typeof window === "undefined") return () => undefined;
  window.addEventListener(QUIZ_RESULT_EVENT, listener);
  return () => window.removeEventListener(QUIZ_RESULT_EVENT, listener);
};

export type QuizSyncResult = {
  success: boolean;
  status?: number;
  message?: string;
  retriable?: boolean;
};

const postQuizResult = async (
  result: StoredQuizResult,
  authToken?: string | null,
): Promise<QuizSyncResult> => {
  if (typeof window === "undefined") {
    return { success: false, retriable: false, message: "window unavailable" };
  }

  const payload = {
    travelType: result.travelType,
    answers: result.answers ?? null,
    places: result.places ?? [],
    timestamp: result.timestamp ?? Date.now(),
  };

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (authToken) {
    headers.Authorization = `Bearer ${authToken}`;
  }

  try {
    const response = await fetch("/api/account/quiz-state", {
      method: "POST",
      credentials: "include",
      headers,
      body: JSON.stringify(payload),
    });

    if (response.ok) {
      return { success: true, retriable: false };
    }

    const errorText = await response.text().catch(() => "");
    const message = `[QuizClientState] Failed to sync quiz state: ${response.status} ${response.statusText} ${errorText}`;

    if (response.status === 401 || response.status === 403) {
      console.warn(message);
      return {
        success: false,
        status: response.status,
        message: errorText,
        retriable: true,
      };
    }

    if (response.status === 503) {
      console.warn(message);
      return {
        success: false,
        status: response.status,
        message: errorText,
        retriable: true,
      };
    }

    console.error(message);
    return {
      success: false,
      status: response.status,
      message: errorText,
      retriable: true,
    };
  } catch (error) {
    // AbortError はページ遷移時に発生する正常な動作なので、エラーとして扱わない
    if (error instanceof Error && error.name === "AbortError") {
      console.debug("[QuizClientState] Fetch aborted (page navigation)");
      return {
        success: false,
        retriable: true,
        message: "fetch aborted",
      };
    }
    console.error("[QuizClientState] Failed to sync quiz state", error);
    return {
      success: false,
      retriable: true,
      message: error instanceof Error ? error.message : String(error),
    };
  }
};

const inFlightSyncs = new Map<string, Promise<QuizSyncResult>>();

// ============================================
// Quiz Session Management
// ============================================

export type QuizSessionStatus = "in_progress" | "completed" | "abandoned";

export type QuizSession = {
  sessionId: string;
  status: QuizSessionStatus;
  startedAt: string;
  completedAt?: string;
};

/**
 * クイズセッションを作成（クイズ開始時）
 */
export const createQuizSession = async (
  locationPermission?: boolean | null,
  metadata?: Record<string, any>,
): Promise<QuizSession | null> => {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const response = await fetch("/api/quiz/session", {
      method: "POST",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        locationPermission,
        metadata,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => "");
      console.warn(
        "[QuizSession] Failed to create session:",
        response.status,
        errorText,
      );
      return null;
    }

    const data = await response.json();
    return data as QuizSession;
  } catch (error) {
    console.error("[QuizSession] Failed to create session", error);
    return null;
  }
};

/**
 * クイズセッションを更新（状態変更、メタデータ更新など）
 */
export const updateQuizSession = async (
  sessionId: string,
  updates: {
    status?: QuizSessionStatus;
    locationPermission?: boolean | null;
    metadata?: Record<string, any>;
    currentStep?: number;
    lastQuestionId?: string;
    answers?: Record<string, any>;
    travelTypeCode?: string;
    travelTypePayload?: any;
    requestId?: string;
  },
): Promise<QuizSession | null> => {
  if (typeof window === "undefined") {
    return null;
  }

  const ensuredRequestId =
    updates.requestId ??
    `qsession_${sessionId}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

  try {
    const response = await fetch("/api/quiz/session", {
      method: "PATCH",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        sessionId,
        ...updates,
        requestId: ensuredRequestId,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => "");
      console.warn(
        "[QuizSession] Failed to update session:",
        response.status,
        errorText,
      );
      return null;
    }

    const data = await response.json();
    return data as QuizSession;
  } catch (error) {
    console.error("[QuizSession] Failed to update session", error);
    return null;
  }
};

/**
 * クイズセッションを取得（最新の進行中セッションまたは指定されたセッション）
 */
export const getQuizSession = async (
  sessionId?: string,
): Promise<QuizSession | null> => {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const url = sessionId
      ? `/api/quiz/session?sessionId=${sessionId}`
      : "/api/quiz/session";
    const response = await fetch(url, {
      method: "GET",
      credentials: "include",
    });

    if (!response.ok) {
      if (response.status === 404) {
        return null; // セッションが見つからない場合はnullを返す
      }
      const errorText = await response.text().catch(() => "");
      console.warn(
        "[QuizSession] Failed to get session:",
        response.status,
        errorText,
      );
      return null;
    }

    const data = await response.json();
    return data as QuizSession;
  } catch (error) {
    console.error("[QuizSession] Failed to get session", error);
    return null;
  }
};

const shouldAttemptSync = (state: QuizResultState, force?: boolean) => {
  if (force) {
    return state.status !== "missing";
  }

  if (state.status === "pending") {
    return true;
  }

  if (state.status === "failed") {
    return (state.retriable ?? true) === true;
  }

  return false;
};

export const flushPendingQuizResults = async ({
  accountId,
  authToken,
  force,
}: SyncContext): Promise<QuizSyncResult> => {
  if (!accountId) {
    return { success: false, retriable: false, message: "missing accountId" };
  }

  const state = resolveQuizResultState(accountId);
  if (state.status === "missing") {
    return { success: false, retriable: false, message: "no local result" };
  }

  if (!shouldAttemptSync(state, force)) {
    const retriable =
      state.status === "synced" ? false : (state.retriable ?? false);
    const success =
      state.status === "synced" ||
      state.status === "stale" ||
      retriable === false;

    return {
      success,
      retriable,
    };
  }

  const attemptStartedAt = Date.now();
  writeStatusMeta(accountId, {
    version: 1,
    status: "pending",
    lastSyncedAt: state.lastSyncedAt,
    lastAttemptAt: attemptStartedAt,
    error: null,
    retriable: true,
  });

  const syncResult = await postQuizResult(state.record, authToken);

  if (syncResult.success) {
    persistQuizResultLocal(accountId, state.record, {
      status: "synced",
      lastSyncedAt: Date.now(),
      lastAttemptAt: attemptStartedAt,
      error: null,
      retriable: true,
      emitEvent: false,
    });
    emitQuizResultEvent();
  } else {
    persistQuizResultLocal(accountId, state.record, {
      status: syncResult.retriable ? "pending" : "failed",
      lastSyncedAt: state.lastSyncedAt,
      lastAttemptAt: attemptStartedAt,
      error: syncResult.message ?? null,
      retriable: syncResult.retriable ?? true,
      emitEvent: false,
    });
    emitQuizResultEvent();
  }

  return syncResult;
};

export const queueQuizResultSync = (context: SyncContext) => {
  const { accountId } = context;
  if (!accountId) {
    return;
  }

  if (inFlightSyncs.has(accountId)) {
    const existing = inFlightSyncs.get(accountId)!;
    if (context.force) {
      const chained = existing
        .catch(() => undefined)
        .then(() => flushPendingQuizResults(context))
        .finally(() => {
          inFlightSyncs.delete(accountId);
        });
      inFlightSyncs.set(accountId, chained);
    }
    return;
  }

  const promise = flushPendingQuizResults(context).finally(() => {
    inFlightSyncs.delete(accountId);
  });
  inFlightSyncs.set(accountId, promise);
};

const readPendingQuizResultRaw = (): PendingQuizResultRecord | null => {
  if (typeof window === "undefined") {
    return null;
  }
  try {
    const raw = window.localStorage.getItem(PENDING_QUIZ_RESULT_KEY);
    if (!raw) {
      return null;
    }
    const parsed = JSON.parse(raw) as PendingQuizResultRecord;
    if (!parsed?.result?.travelType?.travelTypeCode) {
      return null;
    }
    if (!parsed.storedAt || Date.now() - parsed.storedAt > QUIZ_RESULT_TTL_MS) {
      window.localStorage.removeItem(PENDING_QUIZ_RESULT_KEY);
      return null;
    }
    return parsed;
  } catch (error) {
    console.error(
      "[QuizClientState] Failed to read pending quiz result",
      error,
    );
    return null;
  }
};

export const savePendingQuizResult = (
  result: StoredQuizResult,
  accountId?: string | null,
) => {
  if (typeof window === "undefined") {
    return false;
  }
  try {
    const ownerAccountId = accountId ?? null;
    const payload: PendingQuizResultRecord = {
      version: 1,
      storedAt: Date.now(),
      result: normalizeQuizResult(result),
      accountId: ownerAccountId,
    };
    window.localStorage.setItem(
      PENDING_QUIZ_RESULT_KEY,
      JSON.stringify(payload),
    );
    console.debug("[QuizClientState] Saved pending quiz result", {
      hasAccountId: Boolean(ownerAccountId),
    });
    return true;
  } catch (error) {
    console.error(
      "[QuizClientState] Failed to save pending quiz result",
      error,
    );
    return false;
  }
};

export const getPendingQuizResult = (): PendingQuizResultRecord | null => {
  return readPendingQuizResultRaw();
};

export const clearPendingQuizResult = () => {
  if (typeof window === "undefined") {
    return;
  }
  try {
    window.localStorage.removeItem(PENDING_QUIZ_RESULT_KEY);
  } catch (error) {
    console.error(
      "[QuizClientState] Failed to clear pending quiz result",
      error,
    );
  }
};

export const transferPendingQuizResult = (
  accountId: string | null,
): StoredQuizResult | null => {
  if (!accountId) {
    return null;
  }
  const pending = getPendingQuizResult();
  if (!pending?.result) {
    return null;
  }

  if (pending.accountId && pending.accountId !== accountId) {
    console.warn(
      "[QuizClientState] transferPendingQuizResult: pending belongs to different account",
      {
        accountId,
        pendingAccountId: pending.accountId,
      },
    );
    return null;
  }

  console.debug(
    "[QuizClientState] transferPendingQuizResult: pending detected",
    {
      accountId,
      storedAt: pending.storedAt,
    },
  );

  const persisted = persistQuizResultLocal(accountId, pending.result, {
    status: "pending",
    emitEvent: false,
  });

  if (!persisted) {
    console.error(
      "[QuizClientState] transferPendingQuizResult: failed to persist pending result",
      {
        accountId,
      },
    );
    return null;
  }

  clearPendingQuizResult();
  emitQuizResultEvent();
  console.debug(
    "[QuizClientState] transferPendingQuizResult: pending transferred",
    { accountId },
  );
  return pending.result;
};

export const syncQuizResultToServer = async (
  result: StoredQuizResult,
  authToken?: string | null,
): Promise<QuizSyncResult> => {
  if (!result?.travelType?.travelTypeCode) {
    return { success: false, retriable: false, message: "missing travelType" };
  }
  return postQuizResult(result, authToken);
};
