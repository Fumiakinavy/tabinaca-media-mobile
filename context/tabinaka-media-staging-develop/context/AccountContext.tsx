import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type { User } from "@supabase/supabase-js";
import { useRouter } from "next/router";
import { supabase, signInWithGoogle, signOut } from "@/lib/supabaseAuth";
import {
  migrateLegacyAccountData,
  moveAccountDataToAccountId,
} from "@/lib/accountStorage";
import { accountSync } from "@/lib/accountSync";
import {
  emitQuizResultEvent,
  flushPendingQuizResults,
  getStoredQuizResult,
  queueQuizResultSync,
  transferPendingQuizResult,
} from "@/lib/quizClientState";
import {
  readUtmCookie,
  shouldSyncUtmForAccount,
  markUtmSynced,
} from "@/lib/utm";

interface AccountSession {
  accountId: string | null;
  accountToken: string | null;
  expiresAt: number | null;
  status: "loading" | "ready" | "error";
}

type AuthState = "unknown" | "guest" | "authenticated";

interface AccountContextValue {
  accountId: string | null;
  accountToken: string | null;
  sessionStatus: AccountSession["status"];
  authState: AuthState;
  supabaseUser: User | null;
  supabaseAccessToken: string | null;
  accountProfile: Record<string, any> | null;
  accountDisplayName: string | null;
  accountAvatarUrl: string | null;
  authInitialized: boolean;
  refreshSession: () => Promise<void>;
  requireAuth: (returnTo?: string) => Promise<void>;
  resetToGuest: () => Promise<void>;
  ensureQuizBootstrap: () => Promise<void>;
  quizBootstrapReady: boolean;
}

const AccountContext = createContext<AccountContextValue | null>(null);

const LAST_ACCOUNT_ID_STORAGE_KEY = "quiz/last-account-id";
const AUTH_STATE_CACHE_KEY = "account/auth-state-cache";
const AUTH_STATE_CACHE_EXPIRY_KEY = "account/auth-state-cache-expiry";
const SUPABASE_USER_CACHE_KEY = "account/supabase-user-cache";
const AUTH_CACHE_DURATION_MS = 3 * 60 * 60 * 1000; // 3時間

type CachedSupabaseUserPayload = {
  user: User;
  expiry: number;
};

type AbortControllerLike = {
  abort: () => void;
  signal?: unknown;
};

const readLastAccountId = () => {
  if (typeof window === "undefined") {
    return null;
  }
  try {
    return window.localStorage.getItem(LAST_ACCOUNT_ID_STORAGE_KEY);
  } catch (error) {
    console.error("[AccountProvider] Failed to read last account id", error);
    return null;
  }
};

const writeLastAccountId = (accountId: string | null) => {
  if (typeof window === "undefined") {
    return;
  }
  try {
    if (accountId) {
      window.localStorage.setItem(LAST_ACCOUNT_ID_STORAGE_KEY, accountId);
    } else {
      window.localStorage.removeItem(LAST_ACCOUNT_ID_STORAGE_KEY);
    }
  } catch (error) {
    console.error("[AccountProvider] Failed to write last account id", error);
  }
};

const readCachedAuthState = (): AuthState | null => {
  if (typeof window === "undefined") {
    return null;
  }
  try {
    const cached = window.localStorage.getItem(AUTH_STATE_CACHE_KEY);
    const expiryStr = window.localStorage.getItem(AUTH_STATE_CACHE_EXPIRY_KEY);

    if (!cached || !expiryStr) {
      console.debug("[AccountProvider] No cached auth state found");
      return null;
    }

    const expiry = parseInt(expiryStr, 10);
    const now = Date.now();

    // キャッシュが期限切れの場合は無効
    if (isNaN(expiry) || now > expiry) {
      window.localStorage.removeItem(AUTH_STATE_CACHE_KEY);
      window.localStorage.removeItem(AUTH_STATE_CACHE_EXPIRY_KEY);
      console.debug("[AccountProvider] Cached auth state expired", {
        expiry: new Date(expiry).toISOString(),
        now: new Date(now).toISOString(),
      });
      return null;
    }

    if (cached === "authenticated" || cached === "guest") {
      console.debug("[AccountProvider] Read cached auth state", {
        cached,
        expiry: new Date(expiry).toISOString(),
      });
      return cached;
    }
    return null;
  } catch (error) {
    console.error("[AccountProvider] Failed to read cached auth state", error);
    return null;
  }
};

const readCachedSupabaseUser = (): User | null => {
  if (typeof window === "undefined") {
    return null;
  }
  try {
    const cached = window.localStorage.getItem(SUPABASE_USER_CACHE_KEY);
    if (!cached) {
      return null;
    }
    const payload = JSON.parse(cached) as CachedSupabaseUserPayload | null;
    if (!payload || !payload.user || typeof payload.expiry !== "number") {
      window.localStorage.removeItem(SUPABASE_USER_CACHE_KEY);
      return null;
    }
    if (Date.now() > payload.expiry) {
      window.localStorage.removeItem(SUPABASE_USER_CACHE_KEY);
      console.debug("[AccountProvider] Cached supabase user expired", {
        expiry: new Date(payload.expiry).toISOString(),
      });
      return null;
    }
    return payload.user;
  } catch (error) {
    console.error(
      "[AccountProvider] Failed to read cached supabase user",
      error,
    );
    return null;
  }
};

const writeCachedSupabaseUser = (user: User | null) => {
  if (typeof window === "undefined") {
    return;
  }
  try {
    if (!user) {
      window.localStorage.removeItem(SUPABASE_USER_CACHE_KEY);
      return;
    }
    const payload: CachedSupabaseUserPayload = {
      user,
      expiry: Date.now() + AUTH_CACHE_DURATION_MS,
    };
    window.localStorage.setItem(
      SUPABASE_USER_CACHE_KEY,
      JSON.stringify(payload),
    );
  } catch (error) {
    console.error(
      "[AccountProvider] Failed to write cached supabase user",
      error,
    );
  }
};

const clearCachedSupabaseUser = () => {
  if (typeof window === "undefined") {
    return;
  }
  try {
    window.localStorage.removeItem(SUPABASE_USER_CACHE_KEY);
  } catch (error) {
    console.error(
      "[AccountProvider] Failed to clear cached supabase user",
      error,
    );
  }
};

const writeCachedAuthState = (state: AuthState) => {
  if (typeof window === "undefined") {
    return;
  }
  try {
    if (state === "unknown") {
      window.localStorage.removeItem(AUTH_STATE_CACHE_KEY);
      window.localStorage.removeItem(AUTH_STATE_CACHE_EXPIRY_KEY);
      console.debug("[AccountProvider] Removed cached auth state", { state });
    } else {
      const expiry = Date.now() + AUTH_CACHE_DURATION_MS;
      window.localStorage.setItem(AUTH_STATE_CACHE_KEY, state);
      window.localStorage.setItem(
        AUTH_STATE_CACHE_EXPIRY_KEY,
        expiry.toString(),
      );
      console.debug("[AccountProvider] Cached auth state", {
        state,
        expiry: new Date(expiry).toISOString(),
      });
    }
  } catch (error) {
    console.error("[AccountProvider] Failed to write cached auth state", error);
  }
};

async function fetchAccountSession(): Promise<{
  accountId: string;
  accountToken: string;
  expiresAt: number;
}> {
  const response = await fetch("/api/account/session", {
    method: "GET",
    credentials: "include",
  });
  if (!response.ok) {
    throw new Error("Failed to fetch account session");
  }
  return response.json();
}

export const AccountProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  // Next.jsのルーターを使用（ページ遷移時のキャッシュ確認用）
  // 注意: _app.tsxで使用されているため、ルーターは利用可能
  // useRouterは条件付きで呼び出せないため、常に呼び出す（SSR時は動作しないが問題なし）
  const router = useRouter();

  const [session, setSession] = useState<AccountSession>({
    accountId: null,
    accountToken: null,
    expiresAt: null,
    status: "loading",
  });
  // サーバーとクライアントで同じ初期状態を保証（ハイドレーションエラーを防ぐ）
  const [authState, setAuthState] = useState<AuthState>("unknown");
  const [authInitialized, setAuthInitialized] = useState(false);
  const [supabaseUser, setSupabaseUser] = useState<User | null>(null);
  const [supabaseAccessToken, setSupabaseAccessToken] = useState<string | null>(
    null,
  );
  const [accountProfile, setAccountProfile] = useState<Record<string, any> | null>(
    null,
  );
  const [accountDisplayName, setAccountDisplayName] = useState<string | null>(
    null,
  );
  const [accountAvatarUrl, setAccountAvatarUrl] = useState<string | null>(null);
  const refreshPromiseRef = useRef<Promise<void> | null>(null);
  const linkAttemptedRef = useRef<string | null>(null);
  const previousAccountIdRef = useRef<string | null>(null);
  const quizBootstrapPromiseRef = useRef<Promise<void> | null>(null);
  const profileLoadedForAccountRef = useRef<string | null>(null);
  const profileFetchInFlightRef = useRef(false);
  const cacheHydratedRef = useRef(false);
  const sessionRetryStateRef = useRef<{
    attempts: number;
    timeoutId: ReturnType<typeof setTimeout> | null;
  }>({
    attempts: 0,
    timeoutId: null,
  });
  const MAX_SESSION_RETRY_ATTEMPTS = 5;
  const [quizBootstrapReady, setQuizBootstrapReady] = useState(false);
  const quizBootstrapReadyRef = useRef(false);
  const lastBootstrappedAccountRef = useRef<string | null>(null);
  const linkRetryStateRef = useRef<{
    attempts: number;
    timeoutId: ReturnType<typeof setTimeout> | null;
  }>({
    attempts: 0,
    timeoutId: null,
  });

  const loadSession = useCallback(async () => {
    if (refreshPromiseRef.current) {
      return refreshPromiseRef.current;
    }
    setSession((prev) => {
      if (prev.status === "ready") {
        return prev;
      }
      return {
        ...prev,
        status: "loading",
      };
    });
    const promise = fetchAccountSession()
      .then((data) => {
        setSession({
          accountId: data.accountId,
          accountToken: data.accountToken,
          expiresAt: data.expiresAt,
          status: "ready",
        });
        if (sessionRetryStateRef.current.timeoutId) {
          clearTimeout(sessionRetryStateRef.current.timeoutId);
          sessionRetryStateRef.current.timeoutId = null;
        }
        sessionRetryStateRef.current.attempts = 0;
      })
      .catch((error) => {
        console.error("[AccountProvider] Failed to load session", error);
        setSession((prev) => ({ ...prev, status: "error" }));
        const nextAttempt = sessionRetryStateRef.current.attempts + 1;
        if (nextAttempt <= MAX_SESSION_RETRY_ATTEMPTS) {
          const delay = Math.min(2 ** (nextAttempt - 1) * 1000, 30000);
          if (sessionRetryStateRef.current.timeoutId) {
            clearTimeout(sessionRetryStateRef.current.timeoutId);
          }
          sessionRetryStateRef.current.attempts = nextAttempt;
          sessionRetryStateRef.current.timeoutId = setTimeout(() => {
            sessionRetryStateRef.current.timeoutId = null;
            void loadSession();
          }, delay);
          console.warn("[AccountProvider] Retrying session fetch", {
            attempt: nextAttempt,
            delay,
          });
        } else {
          console.error("[AccountProvider] Session retry limit reached");
        }
      })
      .finally(() => {
        refreshPromiseRef.current = null;
      });
    refreshPromiseRef.current = promise;
    return promise;
  }, []);

  useEffect(() => {
    loadSession();
  }, [loadSession]);

  useEffect(() => {
    return () => {
      if (sessionRetryStateRef.current.timeoutId) {
        clearTimeout(sessionRetryStateRef.current.timeoutId);
        sessionRetryStateRef.current.timeoutId = null;
      }
    };
  }, []);

  // クライアント側でのみキャッシュから状態を復元（ハイドレーションエラーを防ぐ）
  // useEffectを使用して、初回レンダリング後に実行
  useEffect(() => {
    if (cacheHydratedRef.current) {
      return;
    }
    cacheHydratedRef.current = true;
    if (typeof window === "undefined") {
      return;
    }

    const cachedState = readCachedAuthState();
    if (cachedState) {
      setAuthState(cachedState);
      setAuthInitialized(true);
      if (cachedState === "authenticated") {
        const cachedUser = readCachedSupabaseUser();
        if (cachedUser) {
          setSupabaseUser((current) => current ?? cachedUser);
        }
      } else if (cachedState === "guest") {
        clearCachedSupabaseUser();
      }
      return;
    }

    const cachedUser = readCachedSupabaseUser();
    if (cachedUser) {
      setSupabaseUser((current) => current ?? cachedUser);
    }
  }, []);

  // Client-only recovery of session/supabase user; avoid useLayoutEffect to prevent SSR warning
  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    // useStateの遅延初期化で既にキャッシュが読み込まれている場合
    if (authState === "authenticated" && authInitialized && !supabaseUser) {
      let cancelled = false;
      // セッションからユーザー情報を取得
      supabase.auth
        .getSession()
        .then(({ data: { session } }) => {
          if (cancelled) return;
          if (session?.user) {
            setSupabaseUser(session.user);
            setSupabaseAccessToken(session.access_token ?? null);
            console.debug(
              "[AccountProvider] Loaded user info from session on init",
              { userId: session.user.id },
            );
          } else {
            // セッションがない場合は、キャッシュが無効だった可能性がある
            console.warn(
              "[AccountProvider] Session not found but cache says authenticated, clearing cache",
            );
            const cachedState = readCachedAuthState();
            if (cachedState === "authenticated") {
              // キャッシュをクリアして、実際の状態に更新
              window.localStorage.removeItem(AUTH_STATE_CACHE_KEY);
              window.localStorage.removeItem(AUTH_STATE_CACHE_EXPIRY_KEY);
              clearCachedSupabaseUser();
              setAuthState("guest");
              setAuthInitialized(true);
            }
          }
        })
        .catch((error) => {
          if (cancelled) return;
          console.error(
            "[AccountProvider] Failed to get session on init",
            error,
          );
          // エラー時はキャッシュをクリアして、実際の状態に更新
          const cachedState = readCachedAuthState();
          if (cachedState === "authenticated") {
            window.localStorage.removeItem(AUTH_STATE_CACHE_KEY);
            window.localStorage.removeItem(AUTH_STATE_CACHE_EXPIRY_KEY);
            clearCachedSupabaseUser();
            setAuthState("guest");
            setAuthInitialized(true);
          }
        });
      return () => {
        cancelled = true;
      };
    }
  }, [authState, authInitialized, supabaseUser]);

  // 状態の整合性チェックとキャッシュの更新
  useEffect(() => {
    if (authState === "authenticated" || authState === "guest") {
      writeCachedAuthState(authState);

      // 状態の整合性チェック
      if (authState === "authenticated" && !supabaseUser) {
        // authenticatedなのにユーザー情報がない場合は、セッションを再取得
        console.warn(
          "[AccountProvider] State inconsistency: authenticated but no user, fetching session",
        );
        supabase.auth
          .getSession()
          .then(({ data: { session } }) => {
            if (session?.user) {
              setSupabaseUser(session.user);
              setSupabaseAccessToken(session.access_token ?? null);
            } else {
              // セッションがない場合は、実際の状態に更新
              console.warn(
                "[AccountProvider] No session found, updating state to guest",
              );
              setAuthState("guest");
              setAuthInitialized(true);
            }
          })
          .catch((error) => {
            console.error(
              "[AccountProvider] Failed to get session for consistency check",
              error,
            );
          });
      } else if (authState === "guest" && supabaseUser) {
        // guestなのにユーザー情報がある場合は、ユーザー情報をクリア
        console.warn(
          "[AccountProvider] State inconsistency: guest but user exists, clearing user",
        );
        setSupabaseUser(null);
        setSupabaseAccessToken(null);
      }
    }
  }, [authState, supabaseUser]);

  useEffect(() => {
    if (authState === "authenticated" && supabaseUser) {
      writeCachedSupabaseUser(supabaseUser);
    } else if (authState === "guest") {
      clearCachedSupabaseUser();
    }
  }, [authState, supabaseUser]);

  // このuseEffectは削除（onAuthStateChangeで処理されるため重複）
  // useEffect(() => {
  //   supabase.auth.getSession().then(({ data }) => {
  //     setSupabaseAccessToken(data.session?.access_token ?? null);
  //     if (data.session?.user) {
  //       setSupabaseUser(data.session.user);
  //       setAuthState('authenticated');
  //     }
  //   });
  // }, []);

  useEffect(() => {
    if (session.status === "ready" && session.accountId) {
      migrateLegacyAccountData(session.accountId);
    }
  }, [session.status, session.accountId]);

  useEffect(() => {
    if (typeof window === "undefined" || session.status !== "ready") {
      return;
    }
    try {
      if (session.accountId && session.accountToken) {
        window.localStorage.setItem("gappy_account_id", session.accountId);
        window.localStorage.setItem("gappy_account_token", session.accountToken);
      } else {
        window.localStorage.removeItem("gappy_account_id");
        window.localStorage.removeItem("gappy_account_token");
      }
    } catch (error) {
      console.error("[AccountProvider] Failed to sync account storage", error);
    }
  }, [session.status, session.accountId, session.accountToken]);

  useEffect(() => {
    if (session.status !== "ready" || !session.accountId) {
      return;
    }

    const utm = readUtmCookie();
    if (!utm) {
      return;
    }

    if (shouldSyncUtmForAccount(session.accountId, utm)) {
      fetch("/api/account/utm", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ utm }),
      })
        .then((res) => {
          if (res.ok && session.accountId) {
            markUtmSynced(session.accountId, utm);
            console.debug("[AccountProvider] Synced UTM for account", {
              accountId: session.accountId,
            });
          }
        })
        .catch((error) => {
          console.error("[AccountProvider] Failed to sync UTM", error);
        });
    }
  }, [session.status, session.accountId]);

  useEffect(() => {
    profileLoadedForAccountRef.current = null;
  }, [supabaseUser?.id]);

  useEffect(() => {
    if (session.status !== "ready" || !session.accountId) {
      profileLoadedForAccountRef.current = null;
      setAccountProfile(null);
      setAccountDisplayName(null);
      setAccountAvatarUrl(null);
      return;
    }

    if (profileFetchInFlightRef.current) {
      return;
    }

    if (profileLoadedForAccountRef.current === session.accountId) {
      return;
    }

    profileFetchInFlightRef.current = true;
    let cancelled = false;

    fetch("/api/account/profile")
      .then(async (res) => {
        if (!res.ok) {
          throw new Error(`Failed to fetch profile: ${res.status}`);
        }
        return res.json();
      })
      .then((data) => {
        if (cancelled) return;
        setAccountProfile(data?.profile ?? {});
        setAccountDisplayName(
          typeof data?.displayName === "string" ? data.displayName : null,
        );
        setAccountAvatarUrl(
          typeof data?.avatarUrl === "string" ? data.avatarUrl : null,
        );
        profileLoadedForAccountRef.current = session.accountId;
      })
      .catch((error) => {
        if (!cancelled) {
          console.warn("[AccountProvider] Failed to fetch account profile", error);
        }
      })
      .finally(() => {
        if (!cancelled) {
          profileFetchInFlightRef.current = false;
        }
      });

    return () => {
      cancelled = true;
      profileFetchInFlightRef.current = false;
    };
  }, [session.status, session.accountId]);

  useEffect(() => {
    quizBootstrapReadyRef.current = quizBootstrapReady;
  }, [quizBootstrapReady]);

  const bootstrapQuizState = useCallback(async () => {
    if (session.status !== "ready" || !session.accountId) {
      return;
    }

    const currentAccountId = session.accountId;
    const lastKnownAccountId =
      previousAccountIdRef.current ?? readLastAccountId();
    let forceSync = false;

    if (lastKnownAccountId && lastKnownAccountId !== currentAccountId) {
      const moved = moveAccountDataToAccountId(
        lastKnownAccountId,
        currentAccountId,
      );
      if (moved) {
        console.debug("[AccountProvider] Moved quiz data to new accountId", {
          from: lastKnownAccountId,
          to: currentAccountId,
        });
        emitQuizResultEvent();
        forceSync = true;
      }
    }

    const pendingResult = transferPendingQuizResult(currentAccountId);
    if (pendingResult) {
      console.debug(
        "[AccountProvider] Pending quiz result transferred on bootstrap",
        {
          accountId: currentAccountId,
        },
      );
      forceSync = true;
    }

    previousAccountIdRef.current = currentAccountId;
    writeLastAccountId(currentAccountId);

    const localResult = getStoredQuizResult(currentAccountId);
    if (!localResult) {
      return;
    }

    // Run sync in background to allow immediate UI access
    void flushPendingQuizResults({
      accountId: currentAccountId,
      authToken: supabaseAccessToken,
      force: forceSync,
    }).then((syncResult) => {
      if (syncResult.success) {
        console.debug("[AccountProvider] Quiz result synced during bootstrap", {
          accountId: currentAccountId,
          forced: forceSync,
        });
        return;
      }

      if (
        syncResult.message === "no local result" ||
        syncResult.message === "missing accountId"
      ) {
        return;
      }

      if (syncResult.retriable) {
        console.warn("[AccountProvider] Quiz bootstrap sync pending retry", {
          accountId: currentAccountId,
          status: syncResult.status,
          message: syncResult.message,
        });
        queueQuizResultSync({
          accountId: currentAccountId,
          authToken: supabaseAccessToken,
          force: true,
        });
        return;
      }

      console.error("[AccountProvider] Quiz bootstrap sync failed", {
        accountId: currentAccountId,
        status: syncResult.status,
        message: syncResult.message,
      });
    });
  }, [session.status, session.accountId, supabaseAccessToken]);

  const ensureQuizBootstrap = useCallback(async () => {
    if (quizBootstrapReadyRef.current) {
      return;
    }

    if (quizBootstrapPromiseRef.current) {
      return quizBootstrapPromiseRef.current;
    }

    if (session.status !== "ready" || !session.accountId) {
      return;
    }

    const promise = bootstrapQuizState()
      .then(() => {
        setQuizBootstrapReady(true);
      })
      .catch((error) => {
        console.error(
          "[AccountProvider] Failed to bootstrap quiz state",
          error,
        );
        setQuizBootstrapReady(false);
      })
      .finally(() => {
        quizBootstrapPromiseRef.current = null;
      });

    quizBootstrapPromiseRef.current = promise;
    return promise;
  }, [bootstrapQuizState, session.status, session.accountId]);

  useEffect(() => {
    if (session.status !== "ready" || !session.accountId) {
      lastBootstrappedAccountRef.current = null;
      setQuizBootstrapReady(false);
      quizBootstrapPromiseRef.current = null;
      return;
    }

    if (
      lastBootstrappedAccountRef.current === session.accountId &&
      quizBootstrapReadyRef.current
    ) {
      return;
    }

    lastBootstrappedAccountRef.current = session.accountId;
    setQuizBootstrapReady(false);
    void ensureQuizBootstrap();
  }, [session.status, session.accountId, ensureQuizBootstrap]);

  useEffect(() => {
    if (
      session.status === "ready" &&
      session.accountId &&
      session.accountToken
    ) {
      accountSync.process(
        session.accountId,
        session.accountToken,
        supabaseAccessToken,
      );
    }
  }, [
    session.status,
    session.accountId,
    session.accountToken,
    supabaseAccessToken,
  ]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const clearRetryTimeout = () => {
      if (linkRetryStateRef.current.timeoutId) {
        clearTimeout(linkRetryStateRef.current.timeoutId);
        linkRetryStateRef.current.timeoutId = null;
      }
    };

    const resetLinkState = () => {
      clearRetryTimeout();
      linkRetryStateRef.current.attempts = 0;
    };

    let controller: AbortControllerLike | null = null;

    const abortCurrent = () => {
      if (controller && typeof controller.abort === "function") {
        controller.abort();
      }
    };

    const scheduleRetry = (nextAttempt: number) => {
      if (nextAttempt > 3) {
        console.warn("[AccountProvider] Link retry limit reached");
        return;
      }
      const delay = Math.min(2 ** (nextAttempt - 1) * 1000, 10000);
      clearRetryTimeout();
      linkRetryStateRef.current.timeoutId = setTimeout(() => {
        linkRetryStateRef.current.timeoutId = null;
        linkRetryStateRef.current.attempts = nextAttempt;
        void performLink();
      }, delay);
    };

    const performLink = async () => {
      if (
        authState !== "authenticated" ||
        session.status !== "ready" ||
        !session.accountId ||
        !supabaseUser?.id ||
        !supabaseAccessToken
      ) {
        return;
      }

      const signature = `${session.accountId}:${supabaseUser.id}`;
      if (
        linkAttemptedRef.current === signature &&
        linkRetryStateRef.current.attempts === 0
      ) {
        return;
      }
      linkAttemptedRef.current = signature;

      abortCurrent();
      controller =
        typeof AbortController === "undefined" ? null : new AbortController();

      try {
        const response = await fetch("/api/account/link", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${supabaseAccessToken}`,
          },
          signal: controller?.signal as AbortSignal | undefined,
        });

        if (response.ok) {
          console.debug("[AccountProvider] Accounts linked successfully");
          resetLinkState();
          // サーバー側で account_id が差し替わった場合に備え、最新のセッションを再取得
          await loadSession();
          return;
        }

        if (response.status === 401) {
          console.warn(
            "[AccountProvider] Link API returned 401, refreshing session",
          );
          linkAttemptedRef.current = null;
          await loadSession();
          scheduleRetry(linkRetryStateRef.current.attempts + 1 || 1);
          return;
        }

        if (response.status === 409) {
          console.warn(
            "[AccountProvider] Link API detected conflicting linkage",
            {
              accountId: session.accountId,
              supabaseUserId: supabaseUser.id,
            },
          );
          linkAttemptedRef.current = null;
          resetLinkState();
          return;
        }

        console.error("[AccountProvider] Link API failed", {
          status: response.status,
          statusText: response.statusText,
        });
        linkAttemptedRef.current = null;
        scheduleRetry(linkRetryStateRef.current.attempts + 1 || 1);
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") {
          return;
        }
        console.error(
          "[AccountProvider] Unexpected error while linking account",
          error,
        );
        linkAttemptedRef.current = null;
        scheduleRetry(linkRetryStateRef.current.attempts + 1 || 1);
      }
    };

    if (
      authState === "authenticated" &&
      session.status === "ready" &&
      session.accountId &&
      supabaseUser?.id &&
      supabaseAccessToken
    ) {
      resetLinkState();
      void performLink();
    } else {
      abortCurrent();
      resetLinkState();
      linkAttemptedRef.current = null;
    }

    return () => {
      abortCurrent();
      resetLinkState();
    };
  }, [
    authState,
    session.status,
    session.accountId,
    supabaseUser?.id,
    supabaseAccessToken,
    loadSession,
  ]);

  useEffect(() => {
    if (!session.expiresAt) {
      return;
    }
    const now = Date.now();
    const refreshIn = Math.max(1, session.expiresAt - now - 60_000);
    const timer = setTimeout(() => {
      loadSession();
    }, refreshIn);
    return () => clearTimeout(timer);
  }, [session.expiresAt, loadSession]);

  useEffect(() => {
    let mounted = true;
    let isFirstAuthStateChange = true;

    // 認証状態の変更を監視
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!mounted) return;

      const actualState: AuthState = session?.user ? "authenticated" : "guest";
      const cachedState = readCachedAuthState();

      // 初回の認証状態変更時のみ、キャッシュを確認
      if (isFirstAuthStateChange) {
        isFirstAuthStateChange = false;

        // キャッシュが有効で、実際の状態と一致している場合はキャッシュを維持
        if (cachedState && cachedState === actualState) {
          // キャッシュを維持し、ユーザー情報のみ更新
          if (session?.user) {
            setSupabaseUser(session.user);
            setSupabaseAccessToken(session.access_token ?? null);
          } else {
            setSupabaseUser(null);
            setSupabaseAccessToken(null);
          }
          // キャッシュを維持するため、authStateは更新しない
          // setAuthState(cachedState); // 既に初期化時に設定されているため、更新不要
          setAuthInitialized((prev) => {
            if (!prev) {
              return true;
            }
            return prev;
          });
          console.debug(
            "[AccountProvider] Maintained cached auth state on first auth change",
            { cachedState, actualState },
          );
          return;
        }
      }

      // キャッシュが有効で、実際の状態と一致している場合はキャッシュを維持
      // （2回目以降の変更でも、キャッシュが有効な場合は維持）
      if (cachedState && cachedState === actualState) {
        // キャッシュを維持し、ユーザー情報のみ更新
        if (session?.user) {
          setSupabaseUser(session.user);
          setSupabaseAccessToken(session.access_token ?? null);
        } else {
          setSupabaseUser(null);
          setSupabaseAccessToken(null);
        }
        // キャッシュを維持するため、authStateは更新しない
        setAuthInitialized((prev) => {
          if (!prev) {
            return true;
          }
          return prev;
        });
        console.debug("[AccountProvider] Maintained cached auth state", {
          cachedState,
          actualState,
        });
        return;
      }

      // キャッシュと異なる場合、またはキャッシュが無効な場合は実際の状態に更新
      if (session?.user) {
        setSupabaseUser(session.user);
        setAuthState("authenticated");
        setSupabaseAccessToken(session.access_token ?? null);
      } else {
        setSupabaseUser(null);
        setAuthState("guest");
        setSupabaseAccessToken(null);
        // サインアウト時は前のアカウントIDとのリンクを切断する
        writeLastAccountId(null);
      }
      setAuthInitialized(true);
      console.debug(
        "[AccountProvider] Updated auth state (cache mismatch or invalid)",
        { cachedState, actualState },
      );
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  // ページ遷移時にキャッシュを確認して、状態を確実に適用
  useEffect(() => {
    if (typeof window === "undefined" || !router?.events) {
      return;
    }

    const handleRouteChange = () => {
      // ページ遷移時にキャッシュを確認
      const cachedState = readCachedAuthState();
      if (cachedState && cachedState !== authState) {
        // キャッシュと現在の状態が異なる場合は、キャッシュを適用
        console.debug(
          "[AccountProvider] Route change detected, applying cache",
          { cachedState, currentState: authState },
        );
        setAuthState(cachedState);
        setAuthInitialized(true);

        // authenticatedの場合、ユーザー情報を取得
        if (cachedState === "authenticated" && !supabaseUser) {
          supabase.auth
            .getSession()
            .then(({ data: { session } }) => {
              if (session?.user) {
                setSupabaseUser(session.user);
                setSupabaseAccessToken(session.access_token ?? null);
              }
            })
            .catch((error) => {
              console.error(
                "[AccountProvider] Failed to get session on route change",
                error,
              );
            });
        }
      }
    };

    // Next.jsのルーターイベントを監視
    router.events?.on("routeChangeStart", handleRouteChange);
    router.events?.on("routeChangeComplete", handleRouteChange);

    return () => {
      router.events?.off("routeChangeStart", handleRouteChange);
      router.events?.off("routeChangeComplete", handleRouteChange);
    };
  }, [router, authState, supabaseUser]);

  const requireAuth = useCallback(
    async (returnTo?: string) => {
      if (authState === "authenticated") {
        return;
      }
      const target =
        returnTo && returnTo.trim().length > 0 ? returnTo : "/chat";
      await signInWithGoogle({ returnTo: target });
    },
    [authState],
  );

  const resetToGuest = useCallback(async () => {
    await signOut();
    setAuthState("guest");
    setSupabaseUser(null);
    setSupabaseAccessToken(null);
    // サインアウト時は前のアカウントIDとのリンクを切断する
    writeLastAccountId(null);
    await loadSession();
  }, [loadSession]);

  const value = useMemo<AccountContextValue>(
    () => ({
      accountId: session.accountId,
      accountToken: session.accountToken,
      sessionStatus: session.status,
      authState,
      supabaseUser,
      supabaseAccessToken,
      accountProfile,
      accountDisplayName,
      accountAvatarUrl,
      authInitialized,
      refreshSession: loadSession,
      requireAuth,
      resetToGuest,
      ensureQuizBootstrap,
      quizBootstrapReady,
    }),
    [
      session.accountId,
      session.accountToken,
      session.status,
      authState,
      authInitialized,
      supabaseUser,
      supabaseAccessToken,
      accountProfile,
      accountDisplayName,
      accountAvatarUrl,
      loadSession,
      requireAuth,
      resetToGuest,
      ensureQuizBootstrap,
      quizBootstrapReady,
    ],
  );

  return (
    <AccountContext.Provider value={value}>{children}</AccountContext.Provider>
  );
};

export const useAccount = () => {
  const context = useContext(AccountContext);
  if (!context) {
    throw new Error("useAccount must be used within AccountProvider");
  }
  return context;
};
