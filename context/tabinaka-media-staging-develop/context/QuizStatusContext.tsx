import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useRouter } from "next/router";
import { useAccount } from "@/context/AccountContext";
import { ACCOUNT_STORAGE_KEYS } from "@/lib/accountStorage";
import {
  QuizStatus,
  StoredQuizResult,
  StoredTravelType,
  emitQuizResultEvent,
  persistQuizResultLocal,
  resolveQuizResultState,
  queueQuizResultSync,
  flushPendingQuizResults,
  subscribeQuizResult,
} from "@/lib/quizClientState";
import {
  getTravelTypeResultContent,
  TravelTypeResultContent,
} from "@/content/travelTypeResults";
import { sendGA } from "@/lib/ga";

type RemoteQuizState = {
  travelType?: StoredTravelType | null;
  recommendation?: {
    places?: any[];
    timestamp?: number;
  } | null;
  timestamp?: number | null;
} | null;

type QuizStateApiResponse = {
  quizState: RemoteQuizState;
};

const toStoredQuizResult = (
  state: RemoteQuizState,
): StoredQuizResult | null => {
  if (!state?.travelType?.travelTypeCode) {
    return null;
  }
  return {
    travelType: state.travelType,
    places: state.recommendation?.places ?? [],
    timestamp: state.recommendation?.timestamp ?? state.timestamp ?? Date.now(),
    answers: (state as any).answers,
  };
};

export type EnhancedQuizResult = StoredQuizResult & {
  resultContent: TravelTypeResultContent | null;
};

type MergeOutcome =
  | {
    result: StoredQuizResult;
    source: "remote" | "local";
    needsResync: boolean;
  }
  | { result: null; source: "none"; needsResync: boolean };

const mergeStoredQuizResults = (
  local: StoredQuizResult | null,
  remote: StoredQuizResult | null,
): MergeOutcome => {
  if (!local && !remote) {
    return { result: null, source: "none", needsResync: false };
  }
  if (!local && remote) {
    return { result: remote, source: "remote", needsResync: false };
  }
  if (local && !remote) {
    return { result: local, source: "local", needsResync: false };
  }

  const localTimestamp = local?.timestamp ?? 0;
  const remoteTimestamp = remote?.timestamp ?? 0;
  const localPlaces = local?.places?.length ?? 0;
  const remotePlaces = remote?.places?.length ?? 0;

  let preferRemote = false;
  if (remoteTimestamp > localTimestamp) {
    preferRemote = true;
  } else if (remoteTimestamp < localTimestamp) {
    preferRemote = false;
  } else if (remotePlaces > localPlaces) {
    preferRemote = true;
  } else if (remotePlaces < localPlaces) {
    preferRemote = false;
  } else {
    // タイのときはリモートを優先（同一内容の場合はサーバーがソース）
    preferRemote = true;
  }

  const primary = preferRemote ? remote! : local!;
  const secondary = preferRemote ? local : remote;
  const merged: StoredQuizResult = {
    travelType:
      primary.travelType ?? secondary?.travelType ?? local!.travelType,
    places: preferRemote ? (primary.places ?? []) : (local!.places ?? []),
    answers: primary.answers ?? secondary?.answers ?? null,
    timestamp: Math.max(remoteTimestamp, localTimestamp),
  };

  return {
    result: merged,
    source: preferRemote ? "remote" : "local",
    needsResync:
      !preferRemote && Boolean(remote) && localTimestamp > remoteTimestamp,
  };
};

interface QuizStatusContextValue {
  status: QuizStatus;
  quizResult: EnhancedQuizResult | null;
  isModalOpen: boolean;
  openModal: () => void;
  closeModal: () => void;
  refresh: (force?: boolean) => Promise<void>;
  requestOpenModal: () => Promise<void>; // クイズ結果を読み込んでからモーダルを開く
  accountId: string | null;
}

const QuizStatusContext = createContext<QuizStatusContextValue | null>(null);

export const QuizStatusProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const {
    accountId,
    supabaseAccessToken,
    authState,
    ensureQuizBootstrap,
    quizBootstrapReady,
  } = useAccount();
  const router = useRouter();
  const [status, setStatus] = useState<QuizStatus>("pending");
  const [quizResult, setQuizResult] = useState<EnhancedQuizResult | null>(null);
  const [isModalOpen, setModalOpen] = useState(false);
  const refreshingRef = useRef(false);
  const lastFetchAtRef = useRef<number>(0);
  // pendingModalRequest を ref で管理して、refresh() 内から参照可能にする
  const pendingModalRequestRef = useRef(false);

  const applyStoredResult = useCallback((stored: StoredQuizResult | null) => {
    if (!stored?.travelType?.travelTypeCode) {
      console.log("[QuizStatusContext] applyStoredResult: No travelTypeCode");
      return false;
    }

    try {
      const resultContent = getTravelTypeResultContent(
        stored.travelType.travelTypeCode,
      );
      console.log(
        "[QuizStatusContext] applyStoredResult: Setting quiz result",
        {
          travelTypeCode: stored.travelType.travelTypeCode,
          hasResultContent: !!resultContent,
        },
      );

      setQuizResult({
        ...stored,
        resultContent,
      });
      setStatus("completed");

      return true;
    } catch (error) {
      console.error(
        "[QuizStatusContext] applyStoredResult: Error getting result content",
        error,
      );
      return false;
    }
  }, []);

  const persistRemoteResult = useCallback(
    (
      currentAccountId: string,
      stored: StoredQuizResult | null,
      options: { status?: "synced" | "pending"; lastSyncedAt?: number } = {},
    ) => {
      if (!stored) {
        return;
      }

      persistQuizResultLocal(currentAccountId, stored, {
        status: options.status ?? "synced",
        lastSyncedAt:
          options.lastSyncedAt ??
          (options.status === "synced" ? Date.now() : undefined),
        emitEvent: false,
      });
    },
    [],
  );

  const fetchRemoteQuizResult = useCallback(
    async (currentAccountId: string): Promise<StoredQuizResult | null> => {
      try {
        const headers: Record<string, string> = {
          "X-Gappy-Client": "quiz-status-context",
        };
        if (supabaseAccessToken) {
          headers.Authorization = `Bearer ${supabaseAccessToken}`;
        }

        console.log("[QuizStatusContext] Fetching remote quiz result", {
          hasToken: !!supabaseAccessToken,
          accountId: currentAccountId,
        });

        const response = await fetch("/api/account/quiz-state", {
          method: "GET",
          credentials: "include",
          headers,
        });

        if (!response.ok) {
          // 401エラーの場合は認証が必要だが、ローカルストレージがあればそれを使用する
          if (response.status === 401) {
            console.log(
              "[QuizStatusContext] 401 Unauthorized - will use local storage if available",
            );
          } else {
            console.warn(
              "[QuizStatusContext] Failed to fetch remote quiz result",
              response.status,
              response.statusText,
            );
          }
          return null;
        }

        const data = (await response.json()) as QuizStateApiResponse;
        const stored = toStoredQuizResult(data.quizState);
        const localState = resolveQuizResultState(currentAccountId);
        const localCached =
          localState.status === "missing" ? null : localState.record;
        const mergeOutcome = mergeStoredQuizResults(localCached, stored);

        if (mergeOutcome.result) {
          console.log(
            "[QuizStatusContext] Persisting merged quiz result to local storage",
            {
              source: mergeOutcome.source,
              needsResync: mergeOutcome.needsResync,
            },
          );
          const statusToPersist =
            mergeOutcome.source === "remote" ? "synced" : "pending";
          persistRemoteResult(currentAccountId, mergeOutcome.result, {
            status: statusToPersist,
            lastSyncedAt:
              statusToPersist === "synced"
                ? Date.now()
                : localState.status === "missing"
                  ? undefined
                  : localState.lastSyncedAt,
          });
          if (mergeOutcome.needsResync || statusToPersist === "pending") {
            queueQuizResultSync({
              accountId: currentAccountId,
              authToken: supabaseAccessToken,
              force: true,
            });
          }
          return mergeOutcome.result;
        }
      } catch (error) {
        // AbortError はページ遷移時に発生する正常な動作なので、エラーとして扱わない
        if (error instanceof Error && error.name === "AbortError") {
          console.debug(
            "[QuizStatusContext] Fetch aborted (page navigation)",
          );
          return null;
        }
        console.error(
          "[QuizStatusContext] Failed to restore quiz state",
          error,
        );
      }
      return null;
    },
    [persistRemoteResult, supabaseAccessToken],
  );

  const trackRefreshEvent = useCallback(
    (event: string, payload: Record<string, unknown> = {}) => {
      if (typeof window === "undefined") {
        return;
      }
      sendGA("quiz_status_refresh", {
        event,
        authState,
        accountId: accountId ?? "none",
        ...payload,
      });
      console.debug("[QuizStatusContext] metric", { event, payload });
    },
    [accountId, authState],
  );

  // 統一されたrefresh関数
  const refresh = useCallback(async (force = false) => {
    if (typeof window === "undefined") {
      return;
    }

    const now = Date.now();
    if (refreshingRef.current) {
      return;
    }
    if (!force && now - lastFetchAtRef.current < 5000) {
      return;
    }
    refreshingRef.current = true;
    lastFetchAtRef.current = now;

    try {
      if (!accountId) {
        console.log(
          "[QuizStatusContext] No accountId available; waiting for session bootstrap",
        );
        setStatus("pending");
        setQuizResult(null);
        // accountId がない場合は、セッションブートストラップを待つ
        // pendingModalRequest がある場合でも、すぐに missing 状態にせず待機を続ける
        // （クイズ完了直後はアカウントの準備中の可能性があるため）
        return;
      }

      if (!quizBootstrapReady) {
        await ensureQuizBootstrap();
      }

      // ensureQuizBootstrap() 後も準備できていない場合
      // （注意: quizBootstrapReady はクロージャなので、最新の状態を取得するには別の方法が必要）
      // ここでは accountId が存在すれば続行する設計に変更

      console.log(
        "[QuizStatusContext] Refreshing quiz result for accountId:",
        accountId,
      );

      // 1. ローカルキャッシュを即時反映
      const localState = resolveQuizResultState(accountId);
      let localApplied = false;
      if (localState.status !== "missing") {
        localApplied = applyStoredResult(localState.record);
        if (localApplied) {
          const travelTypeCode = localState.record.travelType.travelTypeCode;
          const event =
            localState.status === "synced"
              ? "cache_hit"
              : `cache_${localState.status}`;
          trackRefreshEvent(event, {
            travelType: travelTypeCode,
          });

          const forceSync = localState.status === "stale";
          const shouldQueue =
            localState.status === "pending" ||
            localState.status === "failed" ||
            localState.status === "stale";

          const syncResult = await flushPendingQuizResults({
            accountId,
            authToken: supabaseAccessToken,
            force: forceSync,
          });

          if (syncResult.success && forceSync) {
            trackRefreshEvent("cache_resync_success", {
              travelType: travelTypeCode,
            });
          } else if (!syncResult.success) {
            trackRefreshEvent("cache_resync_failed", {
              status: syncResult.status ?? "unknown",
              retriable: syncResult.retriable ?? false,
              message: syncResult.message,
            });
          }

          if (shouldQueue && (!syncResult.success || syncResult.retriable)) {
            queueQuizResultSync({
              accountId,
              authToken: supabaseAccessToken,
            });
          }
        }
      } else {
        console.log(
          "[QuizStatusContext] No local quiz result cached; waiting for remote",
        );
        // ローカルキャッシュがない場合でも status を pending に設定しない
        // （リモート取得後に適切に設定される）
      }

      // 2. サーバーをソース・オブ・トゥルースとして参照
      const remoteResult = await fetchRemoteQuizResult(accountId);
      if (remoteResult && applyStoredResult(remoteResult)) {
        trackRefreshEvent("remote_success", {
          travelType: remoteResult.travelType.travelTypeCode,
        });
        return;
      }

      if (remoteResult === null) {
        trackRefreshEvent("remote_empty");
      }

      if (localApplied) {
        return;
      }

      console.log(
        "[QuizStatusContext] No quiz result found in remote or cache",
      );
      trackRefreshEvent("missing");
      setQuizResult(null);
      setStatus("missing");
      // pendingModalRequest がある場合は setModalOpen(false) を呼ばない
      // （useEffect でモーダルが開かれるのを妨げないため）
    } finally {
      refreshingRef.current = false;
    }
  }, [
    accountId,
    applyStoredResult,
    ensureQuizBootstrap,
    fetchRemoteQuizResult,
    supabaseAccessToken,
    trackRefreshEvent,
  ]);

  // accountId、supabaseAccessTokenの変更時にrefreshを実行
  useEffect(() => {
    if (typeof window === "undefined" || !quizBootstrapReady || !accountId) {
      return;
    }

    void refresh();
  }, [accountId, quizBootstrapReady, refresh]);

  // クイズ結果イベントの購読
  useEffect(() => {
    if (!accountId || !quizBootstrapReady) {
      return;
    }

    const unsubscribe = subscribeQuizResult(() => {
      if (!quizBootstrapReady) {
        return;
      }
      console.log("[QuizStatusContext] Quiz result event received");
      void refresh();
    });
    return unsubscribe;
  }, [accountId, quizBootstrapReady, refresh]);

  // ストレージイベントの監視
  useEffect(() => {
    if (typeof window === "undefined" || !accountId || !quizBootstrapReady) {
      return;
    }

    const handleStorage = (event: StorageEvent) => {
      if (!event.key) return;
      const isAccountStorage = event.key.startsWith(`account/${accountId}`);
      if (!isAccountStorage) return;
      if (
        event.key.endsWith(ACCOUNT_STORAGE_KEYS.QUIZ_PAYLOAD) ||
        event.key.endsWith(ACCOUNT_STORAGE_KEYS.RECOMMENDATION) ||
        event.key.endsWith(ACCOUNT_STORAGE_KEYS.QUIZ_STATUS)
      ) {
        console.log("[QuizStatusContext] Storage event detected:", event.key);
        void refresh();
      }
    };

    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, [accountId, quizBootstrapReady, refresh]);

  const openModal = useCallback(() => {
    setModalOpen(true);
  }, []);

  const closeModal = useCallback(() => {
    setModalOpen(false);
  }, []);

  // requestOpenModal後にクイズ結果が読み込まれたらモーダルを開く
  // pendingModalRequest の状態変化を追跡するための state（useEffect トリガー用）
  const [pendingModalTrigger, setPendingModalTrigger] = useState(0);

  useEffect(() => {
    if (!pendingModalRequestRef.current) {
      return;
    }
    if (status === "pending") {
      return;
    }
    // status が completed または missing に変わったらモーダルを開く
    console.log("[QuizStatusContext] useEffect: Opening modal", {
      status,
      hasQuizResult: !!quizResult,
    });
    pendingModalRequestRef.current = false;
    openModal();
  }, [pendingModalTrigger, status, quizResult, openModal]);

  // accountId が変更されたときに pendingModalRequest が設定されていれば再度リフレッシュを試みる
  useEffect(() => {
    if (!pendingModalRequestRef.current) {
      return;
    }
    if (!accountId || !quizBootstrapReady) {
      return;
    }
    console.log(
      "[QuizStatusContext] accountId ready while pendingModalRequest, triggering refresh",
    );
    // accountId が準備できたので、再度リフレッシュを試みる
    void refresh(true).then(() => {
      // refresh 完了後、status が更新されると上記の useEffect でモーダルが開く
      // ただし、status が既に pending でない場合は手動でトリガー
      if (pendingModalRequestRef.current) {
        setPendingModalTrigger((prev) => prev + 1);
      }
    });
  }, [accountId, quizBootstrapReady, refresh]);

  // クイズ結果を読み込んでからモーダルを開く（必要に応じてrefreshを実行）
  const requestOpenModal = useCallback(async () => {
    console.log("[QuizStatusContext] requestOpenModal called", {
      quizResult: !!quizResult,
      status,
    });

    // If we already have a completed result, open immediately
    if (status === "completed" && quizResult) {
      console.log("[QuizStatusContext] Opening modal immediately");
      openModal();
      return;
    }

    if (!quizBootstrapReady) {
      await ensureQuizBootstrap();
    }

    // Whether pending or missing, we try to refresh if explicitly requested
    console.log(
      "[QuizStatusContext] Setting pending modal request and refreshing...",
    );
    pendingModalRequestRef.current = true;
    // useEffect をトリガーするために state を更新
    setPendingModalTrigger((prev) => prev + 1);
    try {
      await refresh(true);
      // refresh完了後、useEffectでモーダルが開かれる
      // refresh 内で status が更新されると useEffect が発火
      // ただし、refresh が同期的に完了した場合は手動でトリガー
      if (pendingModalRequestRef.current && status !== "pending") {
        console.log(
          "[QuizStatusContext] Refresh completed but modal not opened, triggering manually",
        );
        setPendingModalTrigger((prev) => prev + 1);
      }
    } catch (error) {
      console.error("[QuizStatusContext] Failed to refresh quiz status", error);
      // エラー時もモーダルを開いて "missing" 状態を表示
      if (pendingModalRequestRef.current) {
        console.log(
          "[QuizStatusContext] Opening modal in missing state due to error",
        );
        pendingModalRequestRef.current = false;
        openModal();
      }
    }
  }, [
    status,
    quizResult,
    openModal,
    refresh,
    ensureQuizBootstrap,
    quizBootstrapReady,
  ]);

  const value = useMemo(
    () => ({
      status,
      quizResult,
      isModalOpen,
      openModal,
      closeModal,
      refresh,
      requestOpenModal,
      accountId,
    }),
    [
      status,
      quizResult,
      isModalOpen,
      openModal,
      closeModal,
      refresh,
      requestOpenModal,
      accountId,
    ],
  );

  return (
    <QuizStatusContext.Provider value={value}>
      {children}
    </QuizStatusContext.Provider>
  );
};

export const useQuizStatus = () => {
  const context = useContext(QuizStatusContext);
  if (!context) {
    throw new Error("useQuizStatus must be used within QuizStatusProvider");
  }
  return context;
};

export const requestQuizStatusRefresh = () => emitQuizResultEvent();
