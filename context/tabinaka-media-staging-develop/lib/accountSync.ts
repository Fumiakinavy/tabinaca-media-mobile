import { accountStorage, ACCOUNT_STORAGE_KEYS } from "@/lib/accountStorage";

export type SyncResource = "quiz_results" | "recommendation";

type SyncStateRecord = {
  lastTimestamp?: number;
};

type SyncState = Partial<Record<SyncResource, SyncStateRecord>>;

const queue = new Set<SyncResource>();
let lastCredentials: {
  accountId: string | null;
  accountToken: string | null;
  supabaseAccessToken: string | null;
} = { accountId: null, accountToken: null, supabaseAccessToken: null };

let inFlight: Promise<void> | null = null;

const getSyncState = (accountId: string): SyncState => {
  return (
    accountStorage.getJSON<SyncState>(
      accountId,
      ACCOUNT_STORAGE_KEYS.SYNC_STATE,
    ) || {}
  );
};

const setSyncState = (accountId: string, next: SyncState) => {
  accountStorage.setJSON(accountId, ACCOUNT_STORAGE_KEYS.SYNC_STATE, next);
};

const determineResourcesToSync = (accountId: string, syncState: SyncState) => {
  const resources = new Set<SyncResource>(queue);

  // RECOMMENDATIONに統一されたため、recommendationのみをチェック
  const recommendationPayload = accountStorage.getJSON<any>(
    accountId,
    ACCOUNT_STORAGE_KEYS.RECOMMENDATION,
  );
  if (recommendationPayload) {
    const timestamp = recommendationPayload.timestamp || Date.now();
    if (
      !syncState.recommendation ||
      syncState.recommendation.lastTimestamp !== timestamp
    ) {
      resources.add("recommendation");
    }
  }

  return { resources, recommendationPayload };
};

const performSync = async (
  accountId: string,
  accountToken: string,
  supabaseAccessToken: string | null,
) => {
  const syncState = getSyncState(accountId);
  const { resources, recommendationPayload } = determineResourcesToSync(
    accountId,
    syncState,
  );

  if (resources.size === 0) {
    queue.clear();
    return;
  }

  const payload: Record<string, unknown> = {};
  if (resources.has("recommendation") && recommendationPayload) {
    payload.recommendation = recommendationPayload;
  }

  if (!payload.recommendation) {
    return;
  }

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "X-Gappy-Account-Id": accountId,
    "X-Gappy-Account-Token": accountToken,
  };
  if (supabaseAccessToken) {
    headers.Authorization = `Bearer ${supabaseAccessToken}`;
  }

  try {
    const response = await fetch("/api/account/state-sync", {
      method: "POST",
      headers,
      body: JSON.stringify({ resources: payload }),
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => "");
      let errorMessage = `State sync failed with status ${response.status}`;
      try {
        const errorData = JSON.parse(errorText);
        if (errorData.error) errorMessage += `: ${errorData.error}`;
        if (errorData.details) errorMessage += ` (${errorData.details})`;
        if (errorData.message) errorMessage += ` - ${errorData.message}`;
      } catch {
        if (errorText) errorMessage += `: ${errorText}`;
      }

      if (response.status === 409) {
        console.warn("[accountSync] State sync skipped", errorMessage);
        queue.clear();
        return;
      }

      throw new Error(errorMessage);
    }

    const data = (await response.json()) as { synced?: string[] };
    const updatedSynced = new Set(data.synced || []);
    const nextState: SyncState = { ...syncState };

    if (updatedSynced.has("recommendation") && recommendationPayload) {
      nextState.recommendation = {
        lastTimestamp: recommendationPayload.timestamp || Date.now(),
      };
    }

    setSyncState(accountId, nextState);
    queue.clear();
  } catch (error) {
    console.error("[accountSync] Failed to sync account state", error);
  }
};

export const accountSync = {
  enqueue(resource: SyncResource) {
    queue.add(resource);
    if (lastCredentials.accountId && lastCredentials.accountToken) {
      void accountSync.process(
        lastCredentials.accountId,
        lastCredentials.accountToken,
        lastCredentials.supabaseAccessToken,
      );
    }
  },
  clear() {
    queue.clear();
  },
  async process(
    accountId: string | null,
    accountToken: string | null,
    supabaseAccessToken?: string | null,
  ) {
    if (!accountId || !accountToken) {
      return;
    }
    lastCredentials = {
      accountId,
      accountToken,
      supabaseAccessToken: supabaseAccessToken ?? null,
    };

    if (inFlight) {
      return inFlight;
    }

    inFlight = performSync(
      accountId,
      accountToken,
      supabaseAccessToken ?? null,
    ).finally(() => {
      inFlight = null;
    });

    return inFlight;
  },
};
