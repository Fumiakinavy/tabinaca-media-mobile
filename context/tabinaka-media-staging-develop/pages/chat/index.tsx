import React, {
  useState,
  useEffect,
  useRef,
  useCallback,
  useMemo,
} from "react";
import dynamic from "next/dynamic";
import Script from "next/script";
import Head from "next/head";
import type { GetServerSideProps } from "next";
import { serverSideTranslations } from "next-i18next/serverSideTranslations";
import { useRouter } from "next/router";
import ChatInterface, {
  Message,
  ChatInterfaceRef,
} from "../../components/ChatInterface";
import Header from "../../components/Header";
import type { TravelTypeUserState } from "../../components/TravelTypeQuiz";
import { useAccount } from "@/context/AccountContext";
import { useQuizStatus } from "@/context/QuizStatusContext";
import { useLocation } from "@/context/LocationContext";
import { useRecommendation } from "@/hooks/useRecommendation";
import { searchTracker } from "@/lib/searchTracker";
import {
  resolveQuizResultState,
  persistQuizResultLocal,
  type StoredQuizResult,
} from "@/lib/quizClientState";
import { getTravelTypeInfo } from "@/lib/travelTypeMapping";
import { requestRecommendation } from "@/lib/recommendationOrchestrator";
import { PanelsTopLeft, MoreHorizontal } from "lucide-react";
import {
  fetchChatSessions,
  createChatSession,
  createChatSessionShare,
  type ChatSessionSummary,
  type AuthHeaders,
} from "@/lib/chatSessionsClient";
import { copyTextToClipboard } from "@/lib/clipboard";

const EnhancedInteractiveMap = dynamic(
  () => import("../../components/EnhancedInteractiveMap"),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full w-full items-center justify-center bg-white text-sm text-gray-500">
        Loading map…
      </div>
    ),
  },
);
const QuizResultModal = dynamic(() => import("@/components/QuizResultModal"), {
  ssr: false,
  loading: () => null,
});

// Extend Window interface to include chatInterfaceRef
declare global {
  interface Window {
    chatInterfaceRef?: ChatInterfaceRef;
  }
}

interface Place {
  place_id: string;
  name: string;
  formatted_address?: string;
  geometry?: {
    location: {
      lat: number;
      lng: number;
    };
  };
  rating?: number;
  user_ratings_total?: number;
  photos?: Array<{
    photo_reference: string;
    width: number;
    height: number;
  }>;
  types?: string[];
  price_level?: number;
  opening_hours?: {
    open_now?: boolean;
  };
}

const MAX_SESSION_MESSAGES = 50;
const FALLBACK_SESSION_TITLE = "New chat";
const SESSION_REUSE_WINDOW_MS = 60 * 60 * 1000; // 1 hour
const LAST_SESSION_STORAGE_KEY = "gappy:last-session";
const SESSIONS_PAGE_SIZE = 15;
const SESSION_TITLE_MAX_CHARS = 15;
const GOOGLE_MAPS_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
const GOOGLE_MAPS_LIBRARIES = "places";
const GOOGLE_MAPS_LANGUAGE = "en";

const formatSessionTitleForDisplay = (rawTitle: string) => {
  const chars = Array.from(rawTitle);
  if (chars.length <= SESSION_TITLE_MAX_CHARS) {
    return rawTitle;
  }
  return `${chars.slice(0, SESSION_TITLE_MAX_CHARS).join("")}...`;
};

interface SessionPreference {
  sessionId: string;
  visitedAt: number;
}

const formatSessionTimestamp = (isoString: string) => {
  const date = new Date(isoString);
  if (Number.isNaN(date.getTime())) {
    return "";
  }

  const diffMs = Date.now() - date.getTime();
  if (diffMs < 60000) {
    return "just now";
  }
  const diffMinutes = Math.floor(diffMs / 60000);
  if (diffMinutes < 60) {
    return `${diffMinutes}m ago`;
  }
  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) {
    return `${diffHours}h ago`;
  }
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) {
    return `${diffDays}d ago`;
  }
  return date.toLocaleDateString();
};

const ChatPage: React.FC = () => {
  const [currentPlaces, setCurrentPlaces] = useState<Place[]>([]);
  const [selectedPlace, setSelectedPlace] = useState<Place | null>(null);
  const [viewMode, setViewMode] = useState<"chat" | "map" | "split">("chat");
  const [shouldLoadMapScript, setShouldLoadMapScript] = useState(false);
  const [hasLoadedMapScript, setHasLoadedMapScript] = useState(false);
  const [mapScriptError, setMapScriptError] = useState<string | null>(null);
  // Note: userLocation is now managed globally by LocationContext
  // Location status is now managed globally by LocationContext
  const {
    accountId,
    accountToken,
    authState,
    sessionStatus,
    authInitialized,
    supabaseAccessToken,
    supabaseUser,
    accountAvatarUrl,
    requireAuth,
  } = useAccount();
  const {
    userLocation,
    isLoadingLocation: isLoadingGlobalLocation,
    locationError,
    locationErrorCode,
    locationStatus,
    browserPermission,
    requestLocation,
  } = useLocation();
  const { quizResult, requestOpenModal } = useQuizStatus();
  const router = useRouter();
  const querySessionId =
    typeof router.query.session === "string" ? router.query.session : null;
  const [sessions, setSessions] = useState<ChatSessionSummary[]>([]);
  const [sessionsLoading, setSessionsLoading] = useState(false);
  const [sessionsError, setSessionsError] = useState<string | null>(null);
  const [sessionsNextCursor, setSessionsNextCursor] = useState<string | null>(
    null,
  );
  const [isFetchingMoreSessions, setIsFetchingMoreSessions] = useState(false);
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(
    null,
  );
  const previousSessionIdRef = useRef<string | null>(null);
  const [creatingSession, setCreatingSession] = useState(false);
  const [isSessionSidebarOpen, setIsSessionSidebarOpen] = useState(false);
  const [isHeaderMenuOpen, setIsHeaderMenuOpen] = useState(false);
  const [isHeaderVisible, setIsHeaderVisible] = useState(true);
  const [activeSessionMenu, setActiveSessionMenu] = useState<string | null>(
    null,
  );
  const [sharingSessionId, setSharingSessionId] = useState<string | null>(null);
  const [copiedSessionId, setCopiedSessionId] = useState<string | null>(null);
  const [sessionPreference, setSessionPreference] =
    useState<SessionPreference | null>(null);
  const [sessionsInitialized, setSessionsInitialized] = useState(false);

  const handleRequestLocation = useCallback(() => {
    void requestLocation({ source: "user" });
  }, [requestLocation]);

  const isRequestingLocation =
    locationStatus === "requesting" || isLoadingGlobalLocation;
  const locationPermissionHint =
    browserPermission === "prompt"
      ? "位置情報を使うにはブラウザの許可が必要です。ボタンを押すと許可ダイアログが表示されます。"
      : browserPermission === "denied" || locationStatus === "denied"
        ? "ブラウザの設定で位置情報を許可してください。"
        : null;
  const safariPermissionHint =
    browserPermission === "denied" || locationStatus === "denied"
      ? "Safari の場合は aA → Webサイトの設定 → 位置情報 を確認してください。"
      : null;
  const browserPermissionLabel =
    {
      granted: "許可",
      denied: "拒否",
      prompt: "未許可",
      unknown: "不明",
      unsupported: "未対応",
    }[browserPermission] ?? browserPermission;
  const locationStatusLabel =
    {
      idle: "未要求",
      requesting: "取得中",
      granted: "取得済",
      denied: "拒否",
      unsupported: "未対応",
      insecure: "HTTPS必須",
      error: "エラー",
    }[locationStatus] ?? locationStatus;
  const locationStatusNote = `状態: browser=${browserPermissionLabel}, location=${locationStatusLabel}${
    locationErrorCode ? `, error=${locationErrorCode}` : ""
  }`;
  useEffect(() => {
    if (viewMode !== "chat") {
      setShouldLoadMapScript((prev) => (prev ? prev : true));
    }
  }, [viewMode]);
  useEffect(() => {
    if (shouldLoadMapScript && !GOOGLE_MAPS_API_KEY) {
      setMapScriptError("Google Maps APIキーが設定されていません。");
    }
  }, [shouldLoadMapScript]);

  const hasHandledShowQuizResultRef = useRef(false);
  const chatInterfaceRef = useRef<ChatInterfaceRef>(null);
  const hasHandledInitialQueryRef = useRef(false);
  const sessionListRef = useRef<HTMLDivElement | null>(null);
  type DurationFilter = "under15" | "15-30" | "30-60" | "60+";
  const [homeDurationFilter, setHomeDurationFilter] =
    useState<DurationFilter | null>(null);
  const [initialDetailPlace, setInitialDetailPlace] = useState<Place | null>(
    null,
  );
  const [hasTriggeredInitialDetail, setHasTriggeredInitialDetail] =
    useState(false);

  const userAvatarUrl = useMemo(() => {
    const metadata = supabaseUser?.user_metadata as
      | Record<string, unknown>
      | undefined;
    const candidates = [
      accountAvatarUrl,
      metadata.avatar_url,
      metadata.picture,
      metadata.image_url,
      metadata.avatar,
    ];
    return (
      (candidates.find(
        (value) => typeof value === "string" && value.length > 0,
      ) as string | undefined) ?? null
    );
  }, [supabaseUser, accountAvatarUrl]);

  const authHeaders = useMemo<AuthHeaders | null>(() => {
    if (!accountId || !accountToken || !supabaseAccessToken) {
      return null;
    }
    return {
      accountId,
      accountToken,
      accessToken: supabaseAccessToken,
    };
  }, [accountId, accountToken, supabaseAccessToken]);

  const hasMoreSessions = Boolean(sessionsNextCursor);
  const isAuthLoading = !authInitialized || sessionStatus === "loading";
  const isSignedIn = authState === "authenticated";
  const isAuthReady = isSignedIn && Boolean(authHeaders);

  // Location handling is now managed globally by LocationContext

  // Location handling is now managed globally by LocationContext

  const handleSignIn = useCallback(() => {
    void requireAuth("/chat");
  }, [requireAuth]);

  // Load last visited session from storage to honor the reuse window
  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    try {
      const raw = window.localStorage.getItem(LAST_SESSION_STORAGE_KEY);
      if (!raw) {
        return;
      }
      const parsed = JSON.parse(raw) as SessionPreference;
      if (parsed?.sessionId && typeof parsed.visitedAt === "number") {
        if (Date.now() - parsed.visitedAt < SESSION_REUSE_WINDOW_MS) {
          setSessionPreference(parsed);
        } else {
          window.localStorage.removeItem(LAST_SESSION_STORAGE_KEY);
        }
      }
    } catch (error) {
      console.warn(
        "[ChatPage] Failed to parse stored session preference",
        error,
      );
      if (typeof window !== "undefined") {
        window.localStorage.removeItem(LAST_SESSION_STORAGE_KEY);
      }
    }
  }, []);

  // Persist current session as the latest visited session
  useEffect(() => {
    if (typeof window === "undefined" || !selectedSessionId) {
      return;
    }
    const payload: SessionPreference = {
      sessionId: selectedSessionId,
      visitedAt: Date.now(),
    };
    setSessionPreference(payload);
    try {
      window.localStorage.setItem(
        LAST_SESSION_STORAGE_KEY,
        JSON.stringify(payload),
      );
    } catch (error) {
      console.warn("[ChatPage] Failed to persist session preference", error);
    }
  }, [selectedSessionId]);

  // Show modal via query parameter
  useEffect(() => {
    if (!router.isReady) {
      return;
    }

    const placeId =
      typeof router.query.placeId === "string" ? router.query.placeId : null;
    if (!placeId) {
      return;
    }

    const initialPlace: Place = {
      place_id: placeId,
      name:
        typeof router.query.placeName === "string"
          ? router.query.placeName
          : "this place",
    };

    if (typeof router.query.placeAddress === "string") {
      initialPlace.formatted_address = router.query.placeAddress;
    }
    if (typeof router.query.placeRating === "string") {
      const rating = Number(router.query.placeRating);
      if (!Number.isNaN(rating)) {
        initialPlace.rating = rating;
      }
    }
    if (typeof router.query.placeReviews === "string") {
      const reviews = Number(router.query.placeReviews);
      if (!Number.isNaN(reviews)) {
        initialPlace.user_ratings_total = reviews;
      }
    }
    if (typeof router.query.placePriceLevel === "string") {
      const priceLevel = Number(router.query.placePriceLevel);
      if (!Number.isNaN(priceLevel)) {
        initialPlace.price_level = priceLevel;
      }
    }

    setInitialDetailPlace(initialPlace);

    const newQuery = { ...router.query };
    delete newQuery.placeId;
    delete newQuery.placeName;
    delete newQuery.placeAddress;
    delete newQuery.placeRating;
    delete newQuery.placeReviews;
    delete newQuery.placePriceLevel;

    router
      .replace({ pathname: "/chat", query: newQuery }, undefined, {
        shallow: true,
      })
      .catch(() => {
        /* noop */
      });
  }, [
    router.isReady,
    router.query.placeId,
    router.query.placeName,
    router.query.placeAddress,
    router.query.placeRating,
    router.query.placeReviews,
    router.query.placePriceLevel,
    router,
  ]);

  // Trigger initial detail fetch after chat is ready
  useEffect(() => {
    if (hasTriggeredInitialDetail) return;
    if (!initialDetailPlace) return;
    if (!chatInterfaceRef.current) return;
    if (!selectedSessionId) return;
    if (sessionsLoading) return;

    setHasTriggeredInitialDetail(true);
    chatInterfaceRef.current
      .fetchPlaceDetails(initialDetailPlace)
      .catch((error) => {
        console.error("[ChatPage] Failed to fetch initial place detail", error);
        setHasTriggeredInitialDetail(false);
      });
  }, [
    hasTriggeredInitialDetail,
    initialDetailPlace,
    selectedSessionId,
    sessionsLoading,
  ]);

  // Handle initial query parameter from home search
  useEffect(() => {
    if (!router.isReady) {
      return;
    }

    if (hasHandledShowQuizResultRef.current) {
      return;
    }

    const shouldShow = router.query.showQuizResult === "true";
    if (!shouldShow) {
      return;
    }

    hasHandledShowQuizResultRef.current = true;

    const triggerModal = async () => {
      try {
        await requestOpenModal();
      } finally {
        router.replace("/chat", undefined, { shallow: true }).catch(() => {
          // Ignore errors
        });
      }
    };

    void triggerModal();
  }, [router.isReady, router.query.showQuizResult, router, requestOpenModal]);

  // Handle initial query parameter from home search
  useEffect(() => {
    if (!router.isReady) {
      return;
    }

    // Sync Home duration filter (e.g., under15 / 15-30 / 30-60 / 60+)
    const rawDuration =
      typeof router.query.duration === "string" ? router.query.duration : null;
    const allowed: DurationFilter[] = ["under15", "15-30", "30-60", "60+"];
    setHomeDurationFilter(
      rawDuration && allowed.includes(rawDuration as DurationFilter)
        ? (rawDuration as DurationFilter)
        : null,
    );

    if (hasHandledInitialQueryRef.current) {
      return;
    }

    const query = router.query.q;
    if (typeof query === "string" && query.trim()) {
      console.log("[ChatPage] Initial query detected:", query.trim(), {
        selectedSessionId,
        sessionsLoading,
        chatInterfaceRefExists: !!chatInterfaceRef.current,
      });

      const radiusMetersFromDuration = (() => {
        switch (homeDurationFilter) {
          case "under15":
            return 1200;
          case "15-30":
            return 3000;
          case "30-60":
            return 6000;
          case "60+":
            return 10000;
          default:
            return null;
        }
      })();

      void searchTracker.trackSearch({
        searchQuery: query.trim(),
        searchSource: "chat",
        location:
          userLocation &&
          typeof userLocation.lat === "number" &&
          typeof userLocation.lng === "number"
            ? {
                lat: userLocation.lat,
                lng: userLocation.lng,
                accuracy: userLocation.accuracy,
              }
            : null,
        radiusMeters: radiusMetersFromDuration,
        searchContext: {
          location:
            userLocation &&
            typeof userLocation.lat === "number" &&
            typeof userLocation.lng === "number"
              ? {
                  lat: userLocation.lat,
                  lng: userLocation.lng,
                  accuracy: userLocation.accuracy,
                }
              : null,
          radius_meters: radiusMetersFromDuration,
          locationStatus,
          locationPermission: browserPermission,
          savedPermission,
          durationFilter: homeDurationFilter,
        },
      });

      // セッションが選択されるまで待つ
      if (!selectedSessionId) {
        console.log("[ChatPage] Waiting for session selection...");
        return;
      }

      // セッション読み込みが完了するまで待つ
      if (sessionsLoading) {
        console.log("[ChatPage] Waiting for sessions to load...");
        return;
      }

      // chatInterfaceRefが利用可能になるまで待つ
      if (!chatInterfaceRef.current) {
        console.log("[ChatPage] Waiting for ChatInterface to mount...");
        return;
      }

      console.log(
        "[ChatPage] All conditions met, preparing to send message...",
      );
      hasHandledInitialQueryRef.current = true;

      // クエリパラメータとactionパラメータを削除し、現在のセッションIDを保持
      const newQuery = { ...router.query };
      delete newQuery.q;
      delete newQuery.action;
      newQuery.session = selectedSessionId;

      router
        .replace({ pathname: "/chat", query: newQuery }, undefined, {
          shallow: true,
        })
        .catch(() => {
          // Ignore errors
        });

      // ChatInterfaceが完全にマウントされて準備完了するまで少し待つ
      setTimeout(() => {
        console.log("[ChatPage] Sending initial message:", query.trim());
        if (chatInterfaceRef.current) {
          chatInterfaceRef.current.sendMessage(query.trim()).catch((error) => {
            console.error("Failed to send initial query:", error);
          });
        } else {
          console.error("[ChatPage] ChatInterface ref lost after timeout");
        }
      }, 300);
    }
  }, [
    router.isReady,
    router.query.q,
    router.query.action,
    router.query.duration,
    selectedSessionId,
    sessionsLoading,
    router,
    userLocation,
    locationStatus,
    browserPermission,
    savedPermission,
  ]);

  // Authentication is required for chat; quiz is optional

  // Set initial view mode based on screen size
  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const handleResize = () => {
      if (window.innerWidth >= 1024) {
        // Desktop: use split view
        setViewMode((prev) =>
          prev === "chat" || prev === "map" ? "split" : prev,
        );
      } else {
        // Mobile/Tablet: use chat view if currently in split
        setViewMode((prev) => (prev === "split" ? "chat" : prev));
      }
    };

    // Set initial view mode
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const handleSessionActivity = useCallback(
    (sessionId: string, payload: { lastActivityAt: string }) => {
      setSessions((prev) => {
        const idx = prev.findIndex((session) => session.id === sessionId);
        if (idx === -1) {
          return prev;
        }
        const updated = [...prev];
        updated[idx] = {
          ...updated[idx],
          last_activity_at: payload.lastActivityAt,
        };
        updated.sort(
          (a, b) =>
            new Date(b.last_activity_at).getTime() -
            new Date(a.last_activity_at).getTime(),
        );
        return updated;
      });
    },
    [],
  );

  const handleSelectSession = useCallback(
    (sessionId: string) => {
      if (sessionId === selectedSessionId) {
        return;
      }

      // 先にマップの状態をリセットしてから新しいセッションへ切り替える
      setCurrentPlaces([]);
      setSelectedPlace(null);

      setSelectedSessionId(sessionId);
      void router
        .replace(
          { pathname: "/chat", query: { session: sessionId } },
          undefined,
          { shallow: true },
        )
        .catch(() => {
          /* noop */
        });
    },
    [router, selectedSessionId],
  );

  const handleCreateSession = useCallback(async () => {
    if (!authHeaders) {
      console.warn("[ChatPage] Missing auth context for creating session");
      return;
    }
    setCreatingSession(true);
    try {
      const session = await createChatSession(authHeaders, {
        title: FALLBACK_SESSION_TITLE,
        metadata: { source: "new_page" },
      });
      setSessions((prev) => [
        session,
        ...prev.filter((item) => item.id !== session.id),
      ]);
      setSelectedSessionId(session.id);
      // 既存のクエリパラメータを保持しつつ、actionパラメータは削除（無限ループ防止）
      const currentQuery = { ...router.query };
      currentQuery.session = session.id;
      delete currentQuery.action;

      void router
        .replace({ pathname: "/chat", query: currentQuery }, undefined, {
          shallow: true,
        })
        .catch(() => {
          /* noop */
        });
    } catch (error) {
      console.error("[ChatPage] Failed to create chat session", error);
    } finally {
      setCreatingSession(false);
    }
  }, [authHeaders, router]);

  // セッション欠落時のリカバリ（新規作成して選択）
  const recoverSession = useCallback(async () => {
    if (!authHeaders) {
      console.warn("[ChatPage] Missing auth context for recovering session");
      return null;
    }
    setCreatingSession(true);
    try {
      const session = await createChatSession(authHeaders, {
        title: FALLBACK_SESSION_TITLE,
        metadata: { source: "recovered_session" },
      });
      setSessions((prev) => [
        session,
        ...prev.filter((item) => item.id !== session.id),
      ]);
      setSelectedSessionId(session.id);
      const currentQuery = { ...router.query, session: session.id };
      delete (currentQuery as any).action;

      void router
        .replace({ pathname: "/chat", query: currentQuery }, undefined, {
          shallow: true,
        })
        .catch(() => {
          /* noop */
        });

      return session.id;
    } catch (error) {
      console.error("[ChatPage] Failed to recover chat session", error);
      return null;
    } finally {
      setCreatingSession(false);
    }
  }, [authHeaders, router]);

  useEffect(() => {
    if (!authHeaders) {
      setSessions([]);
      setSelectedSessionId(null);
      setSessionsInitialized(false);
      setSessionsLoading(false);
      setIsFetchingMoreSessions(false);
      setSessionsNextCursor(null);
      setSessionsError(null);
      return;
    }

    let cancelled = false;
    setSessionsLoading(true);
    setSessionsError(null);
    setSessionsInitialized(false);

    fetchChatSessions(authHeaders, { limit: SESSIONS_PAGE_SIZE })
      .then((response) => {
        if (cancelled) return;
        setSessions(response.sessions);
        setSessionsNextCursor(response.nextCursor);
      })
      .catch((error) => {
        if (cancelled) return;
        setSessionsError(
          error instanceof Error ? error.message : "Failed to load sessions",
        );
      })
      .finally(() => {
        if (!cancelled) {
          setSessionsLoading(false);
          setSessionsInitialized(true);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [authHeaders]);

  useEffect(() => {
    if (
      !authHeaders ||
      sessionsLoading ||
      creatingSession ||
      !sessionsInitialized
    ) {
      return;
    }
    if (sessions.length === 0 && router.query.action !== "new") {
      void handleCreateSession();
    }
  }, [
    authHeaders,
    sessions,
    sessionsLoading,
    creatingSession,
    sessionsInitialized,
    handleCreateSession,
  ]);

  // Handle explicit new session request via query param
  useEffect(() => {
    if (!router.isReady || !authHeaders) {
      return;
    }
    if (router.query.action === "new" && !creatingSession) {
      void handleCreateSession();
    }
  }, [
    router.isReady,
    router.query.action,
    authHeaders,
    creatingSession,
    handleCreateSession,
  ]);

  useEffect(() => {
    if (!router.isReady || sessions.length === 0) {
      return;
    }

    // Skip auto-selection if we are explicitly creating a new session
    if (router.query.action === "new") {
      return;
    }

    if (
      querySessionId &&
      sessions.some((session) => session.id === querySessionId)
    ) {
      if (selectedSessionId !== querySessionId) {
        setSelectedSessionId(querySessionId);
      }
      return;
    }

    if (!selectedSessionId) {
      const now = Date.now();
      if (
        sessionPreference &&
        now - sessionPreference.visitedAt < SESSION_REUSE_WINDOW_MS
      ) {
        const preferredSession = sessions.find(
          (session) => session.id === sessionPreference.sessionId,
        );
        if (preferredSession) {
          setSelectedSessionId(preferredSession.id);
          void router
            .replace(
              { pathname: "/chat", query: { session: preferredSession.id } },
              undefined,
              { shallow: true },
            )
            .catch(() => {
              /* noop */
            });
          return;
        }
      } else if (sessionPreference && typeof window !== "undefined") {
        window.localStorage.removeItem(LAST_SESSION_STORAGE_KEY);
        setSessionPreference(null);
      }

      const fallback = sessions[0]?.id;
      if (fallback) {
        setSelectedSessionId(fallback);
        void router
          .replace(
            { pathname: "/chat", query: { session: fallback } },
            undefined,
            { shallow: true },
          )
          .catch(() => {
            /* noop */
          });
      }
    }
  }, [
    router.isReady,
    querySessionId,
    sessions,
    selectedSessionId,
    router,
    sessionPreference,
  ]);

  // セッションを切り替えたときにマップ上のピンをリセットする
  useEffect(() => {
    const prevSessionId = previousSessionIdRef.current;

    // 初回選択時は保持し、それ以降の切り替え時のみリセットする
    if (
      (prevSessionId &&
        selectedSessionId &&
        prevSessionId !== selectedSessionId) ||
      (!selectedSessionId && prevSessionId)
    ) {
      setCurrentPlaces([]);
      setSelectedPlace(null);
    }

    previousSessionIdRef.current = selectedSessionId;
  }, [selectedSessionId]);

  const recommendationState = useRecommendation({
    accountId,
    accountToken,
    authToken: supabaseAccessToken,
    travelType: quizResult?.travelType as TravelTypeUserState | undefined,
  });
  const {
    status: recommendationStatus,
    updatedAt: recommendationUpdatedAt,
    places: recommendationPlaces = [],
  } = recommendationState;

  // Load quiz result from storage only on client side (to prevent hydration errors)
  const [storedQuizResult, setStoredQuizResult] =
    useState<StoredQuizResult | null>(null);
  const [isQuizResultHydrated, setIsQuizResultHydrated] = useState(false);

  // Load from storage only on client side
  useEffect(() => {
    if (typeof window === "undefined" || !accountId) {
      return;
    }
    if (quizResult) {
      setStoredQuizResult(null);
      setIsQuizResultHydrated(true);
      return;
    }
    try {
      const state = resolveQuizResultState(accountId);
      const result = state.status === "missing" ? null : state.record;
      setStoredQuizResult(result);
      setIsQuizResultHydrated(true);
    } catch (error) {
      console.error("[ChatPage] Failed to load stored quiz result", error);
      setIsQuizResultHydrated(true);
    }
  }, [quizResult, accountId]);

  // Use only quizResult before hydration (to ensure same value on server and client)
  const baseQuizResult =
    quizResult ?? (isQuizResultHydrated ? storedQuizResult : null);
  const resolvedQuizResult = useMemo(() => {
    if (!baseQuizResult) {
      return null;
    }

    if (recommendationStatus === "ready" && recommendationPlaces.length > 0) {
      return {
        ...baseQuizResult,
        places: recommendationPlaces,
        timestamp: recommendationUpdatedAt || baseQuizResult.timestamp,
      } as StoredQuizResult;
    }

    if (recommendationStatus === "empty") {
      return {
        ...baseQuizResult,
        places: [],
        timestamp: recommendationUpdatedAt || baseQuizResult.timestamp,
      } as StoredQuizResult;
    }

    return baseQuizResult;
  }, [
    baseQuizResult,
    recommendationStatus,
    recommendationPlaces,
    recommendationUpdatedAt,
  ]);

  // Location prompt is now managed globally by LocationContext

  // Location prompt logic is now managed globally by LocationContext

  // When location is granted, update quiz result and re-run recommendation
  useEffect(() => {
    if (
      !userLocation ||
      !resolvedQuizResult?.travelType ||
      !accountId ||
      !accountToken ||
      !supabaseAccessToken
    ) {
      return;
    }

    const travelType = resolvedQuizResult.travelType;
    // Only update if location is missing
    if (
      typeof travelType.locationLat === "number" &&
      typeof travelType.locationLng === "number"
    ) {
      return;
    }

    console.log(
      "[ChatPage] Location granted, updating quiz result and requesting recommendation",
      {
        userLocation,
        hasTravelType: !!travelType,
      },
    );

    // Update quiz result with location
    const baseInfo = getTravelTypeInfo(travelType.travelTypeCode);
    const updatedTravelType: TravelTypeUserState = {
      travelTypeCode: travelType.travelTypeCode,
      travelTypeName: travelType.travelTypeName ?? baseInfo.name,
      travelTypeEmoji: travelType.travelTypeEmoji ?? baseInfo.emoji,
      travelTypeDescription:
        travelType.travelTypeDescription ?? baseInfo.description,
      locationLat: userLocation.lat,
      locationLng: userLocation.lng,
      locationPermission: true,
      currentLocation: `${userLocation.lat},${userLocation.lng}`,
    };

    // Update stored quiz result
    const updatedResult: StoredQuizResult = {
      ...resolvedQuizResult,
      travelType: {
        travelTypeCode: updatedTravelType.travelTypeCode,
        travelTypeName: updatedTravelType.travelTypeName,
        travelTypeEmoji: updatedTravelType.travelTypeEmoji,
        travelTypeDescription: updatedTravelType.travelTypeDescription,
        locationLat: userLocation.lat,
        locationLng: userLocation.lng,
        locationPermission: true,
        currentLocation: `${userLocation.lat},${userLocation.lng}`,
      },
    };

    persistQuizResultLocal(accountId, updatedResult, {
      status: "pending",
    });

    // Request recommendation with updated location
    requestRecommendation({
      accountId,
      accountToken,
      authToken: supabaseAccessToken,
      travelType: updatedTravelType,
    }).catch((error) => {
      console.error(
        "[ChatPage] Failed to request recommendation after location update",
        error,
      );
    });
  }, [
    userLocation,
    resolvedQuizResult,
    accountId,
    accountToken,
    supabaseAccessToken,
  ]);

  // Do not auto-open quiz modal; rely on browser location prompt only

  useEffect(() => {
    if (!resolvedQuizResult) {
      setCurrentPlaces((prev) => {
        if (prev.length === 0) {
          return prev;
        }
        return [];
      });
      return;
    }

    const nextPlaces = resolvedQuizResult.places || [];
    setCurrentPlaces((prev) => {
      if (
        prev.length === nextPlaces.length &&
        prev.every(
          (place, index) => place.place_id === nextPlaces[index]?.place_id,
        )
      ) {
        return prev;
      }
      return nextPlaces;
    });
  }, [resolvedQuizResult]);

  const handlePlacesUpdate = (places: Place[]) => {
    setCurrentPlaces(places);
    setSelectedPlace(null);
  };

  const handlePlaceClick = useCallback((place: Place | null) => {
    setSelectedPlace(place);

    if (place) {
      setViewMode((mode) => (mode === "split" ? mode : "map"));
    }
  }, []);
  const mapPlaces = currentPlaces;
  useEffect(() => {
    if (!activeSessionMenu) {
      return;
    }
    const handlePointerDown = (event: MouseEvent) => {
      const target = event.target as HTMLElement | null;
      if (target?.closest('[data-session-menu-container="true"]')) {
        return;
      }
      setActiveSessionMenu(null);
    };
    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, [activeSessionMenu]);

  const authorizedRequest = useCallback(
    async (url: string, init: RequestInit = {}) => {
      if (!authHeaders) {
        throw new Error("Missing auth headers");
      }
      const baseHeaders: HeadersInit = {
        "Content-Type": "application/json",
        "X-Gappy-Account-Id": authHeaders.accountId,
        "X-Gappy-Account-Token": authHeaders.accountToken,
        Authorization: `Bearer ${authHeaders.accessToken}`,
      };
      const response = await fetch(url, {
        ...init,
        headers: {
          ...baseHeaders,
          ...(init.headers || {}),
        },
      });
      if (!response.ok) {
        const message = await response.text();
        throw new Error(message || `Request failed: ${response.status}`);
      }
      return response;
    },
    [authHeaders],
  );

  const handleRenameSession = useCallback(
    async (session: ChatSessionSummary) => {
      if (!authHeaders) {
        return;
      }
      const nextTitle = window.prompt(
        "Rename session",
        session.title ?? FALLBACK_SESSION_TITLE,
      );
      if (
        !nextTitle ||
        !nextTitle.trim() ||
        nextTitle.trim() === session.title
      ) {
        setActiveSessionMenu(null);
        return;
      }
      try {
        await authorizedRequest(`/api/chat/sessions/${session.id}`, {
          method: "PATCH",
          body: JSON.stringify({ title: nextTitle.trim() }),
        });
        setSessions((prev) =>
          prev.map((item) =>
            item.id === session.id
              ? { ...item, title: nextTitle.trim() }
              : item,
          ),
        );
      } catch (error) {
        console.error("[ChatPage] Failed to rename session", error);
        alert("Failed to rename session. Please try again.");
      } finally {
        setActiveSessionMenu(null);
      }
    },
    [authorizedRequest, authHeaders, setSessions],
  );

  const handleDeleteSession = useCallback(
    async (sessionId: string) => {
      if (!authHeaders) {
        return;
      }
      if (!window.confirm("Delete this chat session? This cannot be undone.")) {
        return;
      }
      try {
        await authorizedRequest(`/api/chat/sessions/${sessionId}`, {
          method: "DELETE",
        });
        const nextSessions = sessions.filter(
          (session) => session.id !== sessionId,
        );
        setSessions(nextSessions);
        if (selectedSessionId === sessionId) {
          const fallback = nextSessions[0]?.id ?? null;
          setSelectedSessionId(fallback);
          if (fallback) {
            router
              .replace(
                { pathname: "/chat", query: { session: fallback } },
                undefined,
                { shallow: true },
              )
              .catch(() => {
                /* noop */
              });
          } else {
            router.replace("/chat", undefined, { shallow: true }).catch(() => {
              /* noop */
            });
          }
        }
      } catch (error) {
        console.error("[ChatPage] Failed to delete session", error);
        alert("Failed to delete session. Please try again.");
      } finally {
        setActiveSessionMenu(null);
      }
    },
    [authorizedRequest, authHeaders, sessions, selectedSessionId, router],
  );

  const handleShareSession = useCallback(
    async (sessionId: string) => {
      if (!authHeaders) {
        alert("Please sign in to create a shareable link.");
        return;
      }

      setActiveSessionMenu(null);
      setSharingSessionId(sessionId);
      try {
        const { shareUrl } = await createChatSessionShare(
          authHeaders,
          sessionId,
        );

        const copied = await copyTextToClipboard(shareUrl);
        if (copied) {
          setCopiedSessionId(sessionId);
          window.setTimeout(() => {
            setCopiedSessionId((prev) => (prev === sessionId ? null : prev));
          }, 1800);
        } else {
          window.prompt("Copy this share link", shareUrl);
        }
      } catch (error) {
        console.error("[ChatPage] Failed to create share link", error);
        alert(
          "We could not create a share link. Please try again in a moment.",
        );
      } finally {
        setSharingSessionId(null);
      }
    },
    [authHeaders],
  );

  const loadMoreSessions = useCallback(async () => {
    if (
      !authHeaders ||
      !sessionsNextCursor ||
      isFetchingMoreSessions ||
      sessionsLoading
    ) {
      return;
    }

    setIsFetchingMoreSessions(true);
    try {
      const response = await fetchChatSessions(authHeaders, {
        limit: SESSIONS_PAGE_SIZE,
        cursor: sessionsNextCursor,
      });

      setSessions((prev) => {
        const merged = [...prev, ...response.sessions];
        const map = new Map<string, ChatSessionSummary>();
        merged.forEach((session) => {
          map.set(session.id, session);
        });
        return Array.from(map.values()).sort(
          (a, b) =>
            new Date(b.last_activity_at).getTime() -
            new Date(a.last_activity_at).getTime(),
        );
      });

      setSessionsNextCursor(response.nextCursor);
    } catch (error) {
      setSessionsError(
        error instanceof Error ? error.message : "Failed to load sessions",
      );
    } finally {
      setIsFetchingMoreSessions(false);
    }
  }, [
    authHeaders,
    isFetchingMoreSessions,
    sessionsLoading,
    sessionsNextCursor,
  ]);

  const handleSessionListScroll = useCallback(
    (event: React.UIEvent<HTMLDivElement>) => {
      const target = event.currentTarget;
      const threshold = 120; // px from bottom
      const distanceToBottom =
        target.scrollHeight - target.scrollTop - target.clientHeight;
      if (distanceToBottom <= threshold) {
        void loadMoreSessions();
      }
    },
    [loadMoreSessions],
  );

  useEffect(() => {
    if (!querySessionId || !authHeaders) {
      return;
    }
    if (
      !sessionsInitialized ||
      sessionsLoading ||
      isFetchingMoreSessions ||
      !hasMoreSessions
    ) {
      return;
    }
    if (sessions.some((session) => session.id === querySessionId)) {
      return;
    }
    void loadMoreSessions();
  }, [
    querySessionId,
    authHeaders,
    sessions,
    sessionsInitialized,
    sessionsLoading,
    isFetchingMoreSessions,
    hasMoreSessions,
    loadMoreSessions,
  ]);

  const sessionListContent = isSessionSidebarOpen ? (
    <div
      className={`flex h-full flex-col ${
        isHeaderMenuOpen
          ? "shadow-[0_28px_80px_rgba(0,0,0,0.55)]"
          : "shadow-[0_20px_60px_rgba(0,0,0,0.45)]"
      }`}
    >
      <div className="border-b border-gray-200 p-4">
        <div className="flex items-center justify-between gap-2">
          <div>
            <p className="text-xs uppercase tracking-wide text-gray-500">
              Sessions
            </p>
            <p className="text-sm font-semibold text-gray-900">
              Your chat pages
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleCreateSession}
              disabled={creatingSession || !authHeaders}
              className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${creatingSession || !authHeaders
                ? "bg-gray-200 text-gray-500 cursor-not-allowed"
                : "bg-green-500 text-white hover:bg-green-600"
                }`}
            >
              {creatingSession ? "Creating…" : "New Page"}
            </button>
          </div>
        </div>
        <p className="mt-1 text-xs text-gray-500">
          Switch topics anytime. Older chats stay here.
        </p>
        {sessionsError && (
          <p className="mt-2 text-xs text-red-500">{sessionsError}</p>
        )}
      </div>
      <div
        ref={sessionListRef}
        onScroll={handleSessionListScroll}
        className="flex-1 overflow-y-auto"
      >
        {sessionsLoading && (
          <div className="p-4 text-sm text-gray-500">Loading sessions…</div>
        )}
        {!sessionsLoading && sessions.length === 0 && (
          <div className="p-4 text-sm text-gray-500">
            Create your first chat page to get started.
          </div>
        )}
        {sessions.map((session) => {
          const isActive = session.id === selectedSessionId;
          const title = session.title?.trim() || FALLBACK_SESSION_TITLE;
          const formattedTitle = formatSessionTitleForDisplay(title);
          const excerpt =
            session.lastMessageExcerpt ||
            session.summary ||
            "Ask anything to start the conversation.";
          const isMenuOpen = activeSessionMenu === session.id;
          return (
            <div
              key={session.id}
              className={`relative border-b border-gray-100 px-4 py-3 transition ${isActive ? "bg-green-50" : "hover:bg-gray-50"
                }`}
              data-session-menu-container="true"
            >
              <div className="flex items-start gap-2">
                <button
                  type="button"
                  onClick={() => {
                    handleSelectSession(session.id);
                    setIsSessionSidebarOpen(false);
                    setActiveSessionMenu(null);
                  }}
                  className="flex-1 text-left"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span
                      className={`text-sm font-semibold truncate flex-1 max-w-full ${isActive ? "text-green-700" : "text-gray-900"}`}
                    >
                      {formattedTitle}
                    </span>
                    <span className="text-xs text-gray-500 flex-shrink-0">
                      {formatSessionTimestamp(session.last_activity_at)}
                    </span>
                  </div>
                  <p className="mt-1 line-clamp-2 text-xs text-gray-600">
                    {excerpt}
                  </p>
                </button>
                <div className="relative" data-session-menu-container="true">
                  <button
                    type="button"
                    onClick={() =>
                      setActiveSessionMenu(isMenuOpen ? null : session.id)
                    }
                    className="rounded-full border border-transparent p-1 text-gray-500 hover:text-gray-900 focus:outline-none"
                    aria-label="Open session actions"
                  >
                    <MoreHorizontal className="h-4 w-4" />
                  </button>
                  {isMenuOpen && (
                    <div
                      className="absolute right-0 z-10 mt-2 w-36 rounded-md border border-gray-200 bg-white py-1 text-sm shadow-lg"
                      data-session-menu-container="true"
                    >
                      <button
                        type="button"
                        onClick={() => handleRenameSession(session)}
                        className="flex w-full items-center px-3 py-1.5 text-left text-gray-700 hover:bg-gray-100"
                      >
                        Rename
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteSession(session.id)}
                        className="flex w-full items-center px-3 py-1.5 text-left text-red-600 hover:bg-red-50"
                      >
                        Delete
                      </button>
                      <button
                        type="button"
                        onClick={() => handleShareSession(session.id)}
                        disabled={sharingSessionId === session.id}
                        className={`flex w-full items-center px-3 py-1.5 text-left ${sharingSessionId === session.id ? "text-gray-400 cursor-not-allowed" : "text-gray-700 hover:bg-gray-100"}`}
                      >
                        {sharingSessionId === session.id
                          ? "Copying…"
                          : copiedSessionId === session.id
                            ? "Copied!"
                            : "Share"}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
        {isFetchingMoreSessions && (
          <div className="p-3 text-center text-xs text-gray-500">
            Loading more…
          </div>
        )}
        {!sessionsLoading &&
          !isFetchingMoreSessions &&
          !hasMoreSessions &&
          sessions.length > 0 && (
            <div className="p-3 text-center text-xs text-gray-400">
              All sessions loaded
            </div>
          )}
      </div>
    </div>
  ) : null;

  const handleMapMove = (bounds: google.maps.LatLngBounds) => {
    // Optionally trigger nearby search when map moves
  };

  return (
    <>
      <Head>
        <title>Gappy Chat | Gappy - Tokyo Experience Discovery</title>
        <meta
          name="description"
          content="Discover amazing experiences in Tokyo with Gappy Chat. Find cafes, cultural experiences, nightlife, and more activities tailored just for you."
        />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <meta name="robots" content="noindex, nofollow" />
        <link rel="canonical" href="https://gappytravel.com/chat" />
      </Head>

      <div className="flex h-[100dvh] flex-col">
        <Header
          onMobileMenuToggle={setIsHeaderMenuOpen}
          onVisibilityChange={setIsHeaderVisible}
        />

        {shouldLoadMapScript && GOOGLE_MAPS_API_KEY ? (
          <Script
            id="google-maps-script"
            src={`https://maps.googleapis.com/maps/api/js?key=${GOOGLE_MAPS_API_KEY}&libraries=${GOOGLE_MAPS_LIBRARIES}&language=${GOOGLE_MAPS_LANGUAGE}`}
            strategy="lazyOnload"
            onLoad={() => {
              setHasLoadedMapScript(true);
              setMapScriptError(null);
            }}
            onError={() => {
              setMapScriptError("Google Maps を読み込めませんでした。");
            }}
          />
        ) : null}

        <main className="pt-0 sm:pt-0 flex-1 flex flex-col min-h-0 relative">
          {/* Mobile: Tab Switcher */}
          <div className="lg:hidden bg-white border-b border-gray-200 px-3 sm:px-4 py-1.5 sm:py-2 flex space-x-2">
            <button
              onClick={() => setViewMode("chat")}
              className={`flex-1 py-1.5 sm:py-2 px-3 sm:px-4 rounded-lg text-sm sm:text-base font-medium transition-colors ${viewMode === "chat"
                ? "bg-green-500 text-white"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
            >
              Chat
            </button>
            <button
              onClick={() => setViewMode("map")}
              className={`flex-1 py-1.5 sm:py-2 px-3 sm:px-4 rounded-lg text-sm sm:text-base font-medium transition-colors ${viewMode === "map"
                ? "bg-green-500 text-white"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
            >
              Map {mapPlaces.length > 0 && `(${mapPlaces.length})`}
            </button>
          </div>

          {/* Desktop: Split View / Mobile: Conditional View */}
          <div className="flex-1 flex min-w-0 min-h-0 h-full">
            {/* Chat Panel */}
            <div
              className={`${viewMode === "map" ? "hidden" : "flex"
                } relative flex-1 flex-col min-w-0 min-h-0 h-full border-r border-gray-200 transition-shadow duration-200 ${isSessionSidebarOpen
                  ? "lg:shadow-[0_25px_60px_rgba(0,0,0,0.35)]"
                  : ""
                }`}
            >
              <button
                type="button"
                onClick={() => setIsSessionSidebarOpen(true)}
                className="absolute top-6 sm:top-7 left-3 z-20 rounded-full border border-gray-300 bg-white/90 p-2 text-gray-700 shadow hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-green-400"
                aria-label="Open session history"
              >
                <PanelsTopLeft className="h-4 w-4" />
              </button>
              <div className="flex-1 min-h-0">
                {isAuthLoading ? (
                  <div className="flex h-full items-center justify-center text-sm text-gray-500">
                    Preparing your account...
                  </div>
                ) : !isSignedIn ? (
                  <div className="flex h-full items-center justify-center px-6 text-center">
                    <div className="max-w-md space-y-4">
                      <h2 className="text-lg font-semibold text-gray-900">
                        Sign in to start chatting
                      </h2>
                      <p className="text-sm text-gray-600">
                        Sign in with your Google account to start planning with
                        the AI concierge.
                      </p>
                      <div className="flex justify-center">
                        <button
                          type="button"
                          onClick={handleSignIn}
                          className="rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800"
                        >
                          Sign in
                        </button>
                      </div>
                    </div>
                  </div>
                ) : !isAuthReady ? (
                  <div className="flex h-full items-center justify-center text-sm text-gray-500">
                    Restoring your session...
                  </div>
                ) : (
                  <div className="flex h-full flex-col">
                    {/* Location prompt is now managed globally by LocationContext */}
                    <div className="flex-1 min-h-0">
                      {selectedSessionId ? (
                        <ChatInterface
                          ref={chatInterfaceRef}
                          sessionId={selectedSessionId}
                          isLoading={sessionsLoading}
                          placeholder="Look for Japanese culture!"
                          onPlacesUpdate={handlePlacesUpdate}
                          onPlaceClick={handlePlaceClick}
                          userLocation={userLocation}
                          userId={accountId}
                          quizResults={resolvedQuizResult}
                          accountToken={accountToken}
                          authAccessToken={supabaseAccessToken}
                          isAuthenticated={authState === "authenticated"}
                          userAvatarUrl={userAvatarUrl}
                          onSessionActivity={handleSessionActivity}
                          onRecoverSession={recoverSession}
                          durationFilter={homeDurationFilter ?? undefined}
                          initialDetailPlace={initialDetailPlace}
                        />
                      ) : (
                        <div className="flex h-full items-center justify-center text-sm text-gray-500">
                          {creatingSession
                            ? "Creating your chat workspace…"
                            : "Loading chat session…"}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Map Panel */}
            <div
              className={`${viewMode === "chat" ? "hidden" : "flex"
                } relative flex-1 flex-col min-w-0 min-h-0`}
            >
              {viewMode !== "chat" && (
                <>
                  {!userLocation && (
                    <div className="absolute left-4 top-4 z-10 max-w-[280px] rounded-2xl border border-emerald-100 bg-white/95 p-3 shadow-sm backdrop-blur">
                      <p className="text-xs font-semibold text-gray-800">
                        Use your location to see nearby places
                      </p>
                      <button
                        type="button"
                        onClick={handleRequestLocation}
                        disabled={isRequestingLocation}
                        className={`mt-2 inline-flex w-full items-center justify-center rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
                          isRequestingLocation
                            ? "border-gray-200 bg-gray-100 text-gray-400"
                            : "border-green-200 bg-white text-gray-900 hover:shadow-sm"
                        }`}
                      >
                        {isRequestingLocation
                          ? "Requesting location…"
                          : "Use current location"}
                      </button>
                      {locationError && (
                        <p className="mt-2 text-[11px] text-rose-600">
                          {locationError}
                        </p>
                      )}
                      {locationPermissionHint && (
                        <p className="mt-1 text-[11px] text-gray-500">
                          {locationPermissionHint}
                        </p>
                      )}
                      {safariPermissionHint && (
                        <p className="mt-1 text-[11px] text-gray-500">
                          {safariPermissionHint}
                        </p>
                      )}
                      <p className="mt-1 text-[11px] text-gray-400">
                        {locationStatusNote}
                      </p>
                    </div>
                  )}
                  {mapScriptError && (
                    <div className="flex h-full w-full items-center justify-center bg-white text-sm text-red-600">
                      {mapScriptError}
                    </div>
                  )}
                  {!mapScriptError && !hasLoadedMapScript && (
                    <div className="flex h-full w-full items-center justify-center bg-white text-sm text-gray-500">
                      Loading Google Maps…
                    </div>
                  )}
                  {!mapScriptError && hasLoadedMapScript && (
                    <EnhancedInteractiveMap
                      places={mapPlaces}
                      selectedPlace={selectedPlace}
                      onPlaceClick={handlePlaceClick}
                      onMapMove={handleMapMove}
                      userLocation={userLocation}
                      className="w-full h-full min-w-0 min-h-0"
                    />
                  )}
                </>
              )}
            </div>
          </div>
        </main>

        <QuizResultModal />

        {isSessionSidebarOpen && (
          <div className="fixed inset-0 z-40">
            <button
              type="button"
              onClick={() => setIsSessionSidebarOpen(false)}
              className={`absolute inset-0 transition-opacity duration-300 backdrop-blur-sm ${
                isHeaderMenuOpen ? "bg-black/60" : "bg-black/40"
              }`}
              aria-label="Close session list"
            />
            <div
              className={`absolute left-0 right-auto bottom-0 w-[min(90vw,360px)] max-w-full bg-white transition-transform duration-300 translate-x-0 ${
                isHeaderVisible ? "top-[64px] sm:top-[72px]" : "top-0 pt-safe-top"
              }`}
              style={{
                boxShadow: isHeaderMenuOpen
                  ? "0 28px 80px rgba(0,0,0,0.55)"
                  : "0 20px 60px rgba(0,0,0,0.45)",
              }}
            >
              {sessionListContent}
            </div>
          </div>
        )}
      </div>
    </>
  );
};

export default ChatPage;

export const getServerSideProps: GetServerSideProps = async (ctx) => {
  // サインインと位置情報はクライアント側で要求する（SSRでは判定しない）
  const locale = ctx.locale ?? "en";
  return {
    props: {
      ...(await serverSideTranslations(locale, ["common"])),
    },
  };
};
