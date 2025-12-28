import { resolveQuizResultState } from "@/lib/quizClientState";
import type { TravelTypeUserState } from "@/components/TravelTypeQuiz";

export type RecommendationStatus =
  | "idle"
  | "loading"
  | "ready"
  | "empty"
  | "error";

export interface RecommendationState {
  status: RecommendationStatus;
  places: any[];
  updatedAt?: number;
  error?: string | null;
}

interface RecommendationRequest {
  accountId: string;
  accountToken: string;
  authToken: string;
  travelType: TravelTypeUserState;
}

const DEFAULT_STATE: RecommendationState = { status: "idle", places: [] };
const store = new Map<string, RecommendationState>();
const listeners = new Map<string, Set<() => void>>();
const inFlight = new Map<string, Promise<void>>();

const CACHE_TTL_MS = 1000 * 60 * 5;

const buildKey = (accountId: string, travelTypeCode: string) =>
  `${accountId}:${travelTypeCode}`;

const notify = (key: string) => {
  const set = listeners.get(key);
  if (!set) return;
  set.forEach((listener) => listener());
};

const getState = (key: string): RecommendationState => {
  if (!store.has(key)) {
    store.set(key, { ...DEFAULT_STATE });
  }
  return store.get(key)!;
};

const setState = (key: string, next: RecommendationState) => {
  store.set(key, next);
  notify(key);
};

export const subscribeRecommendation = (key: string, listener: () => void) => {
  if (!listeners.has(key)) {
    listeners.set(key, new Set());
  }
  listeners.get(key)!.add(listener);
  return () => {
    listeners.get(key)?.delete(listener);
  };
};

const loadFromStorage = (
  key: string,
  accountId: string,
  travelTypeCode: string,
) => {
  if (getState(key).status !== "idle") {
    return;
  }
  const storedState = resolveQuizResultState(accountId);
  if (storedState.status === "missing") {
    return;
  }
  if (storedState.record.travelType.travelTypeCode !== travelTypeCode) {
    return;
  }
  const places = storedState.record.places ?? [];
  if (Array.isArray(places) && places.length > 0) {
    setState(key, {
      status: "ready",
      places,
      updatedAt: storedState.record.timestamp || Date.now(),
    });
  }
};

export const getRecommendationSnapshot = (key: string) => getState(key);

export const requestRecommendation = async ({
  accountId,
  accountToken,
  authToken,
  travelType,
}: RecommendationRequest) => {
  const key = buildKey(accountId, travelType.travelTypeCode);
  loadFromStorage(key, accountId, travelType.travelTypeCode);
  const current = getState(key);
  const now = Date.now();
  if (current.status === "loading") {
    return inFlight.get(key);
  }
  if (
    current.status === "ready" &&
    current.updatedAt &&
    now - current.updatedAt < CACHE_TTL_MS
  ) {
    return Promise.resolve();
  }
  const controller = new AbortController();
  // 位置情報がない場合は推奨APIを呼ばない（サーバー位置に基づく不正確な結果を防ぐ）
  if (
    typeof travelType.locationLat !== "number" ||
    typeof travelType.locationLng !== "number"
  ) {
    console.log(
      "[recommendationOrchestrator] Skipping recommendation: location not available",
      {
        hasLocationLat: typeof travelType.locationLat === "number",
        hasLocationLng: typeof travelType.locationLng === "number",
      },
    );
    setState(key, {
      status: "empty",
      places: [],
      updatedAt: Date.now(),
    });
    return Promise.resolve();
  }

  const fetchPromise = fetch("/api/recommend", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Gappy-Account-Id": accountId,
      "X-Gappy-Account-Token": accountToken,
      Authorization: `Bearer ${authToken}`,
    },
    body: JSON.stringify({
      travelTypeCode: travelType.travelTypeCode,
      location: {
        lat: travelType.locationLat,
        lng: travelType.locationLng,
      },
    }),
    signal: controller.signal,
  })
    .then(async (response) => {
      if (!response.ok) {
        const text = await response.text();
        throw new Error(text || "Failed to fetch recommendation");
      }
      const data = await response.json();
      const items = Array.isArray(data.items) ? data.items : [];
      const status =
        (data.status as RecommendationStatus) ||
        (items.length ? "ready" : "empty");
      if (status === "ready" && items.length > 0) {
        const nextState: RecommendationState = {
          status: "ready",
          places: items,
          updatedAt: Date.now(),
        };
        setState(key, nextState);
        return;
      }
      if (status === "empty") {
        setState(key, { status: "empty", places: [], updatedAt: Date.now() });
        return;
      }
      throw new Error("Unknown recommendation status");
    })
    .catch((error: Error) => {
      setState(key, {
        status: "error",
        places: [],
        updatedAt: Date.now(),
        error: error.message,
      });
    })
    .finally(() => {
      inFlight.delete(key);
    });

  inFlight.set(key, fetchPromise);
  setState(key, { ...current, status: "loading" });
  return fetchPromise;
};
