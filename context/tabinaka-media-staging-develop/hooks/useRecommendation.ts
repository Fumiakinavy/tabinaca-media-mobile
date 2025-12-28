import { useEffect, useMemo } from "react";
import { useSyncExternalStore } from "react";
import {
  getRecommendationSnapshot,
  requestRecommendation,
  subscribeRecommendation,
  RecommendationState,
} from "@/lib/recommendationOrchestrator";
import type { TravelTypeUserState } from "@/components/TravelTypeQuiz";

interface UseRecommendationParams {
  accountId: string | null;
  accountToken: string | null;
  authToken?: string | null;
  travelType?: TravelTypeUserState | null;
}

const emptyState: RecommendationState = { status: "idle", places: [] };

export const useRecommendation = ({
  accountId,
  accountToken,
  authToken,
  travelType,
}: UseRecommendationParams) => {
  const key = useMemo(() => {
    if (!accountId || !travelType?.travelTypeCode) {
      return null;
    }
    return `${accountId}:${travelType.travelTypeCode}`;
  }, [accountId, travelType?.travelTypeCode]);

  const snapshot = useSyncExternalStore(
    (listener) => {
      if (!key) {
        return () => undefined;
      }
      return subscribeRecommendation(key, listener);
    },
    () => {
      if (!key) {
        return emptyState;
      }
      return getRecommendationSnapshot(key);
    },
    () => emptyState,
  );

  useEffect(() => {
    if (!key || !accountId || !accountToken || !travelType || !authToken) {
      return;
    }
    if (snapshot.status === "ready" || snapshot.status === "empty") {
      return;
    }
    requestRecommendation({
      accountId,
      accountToken,
      authToken,
      travelType,
    });
  }, [key, accountId, accountToken, authToken, travelType, snapshot.status]);

  return snapshot;
};
