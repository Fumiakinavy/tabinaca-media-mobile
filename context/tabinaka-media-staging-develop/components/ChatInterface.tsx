import React, {
  useState,
  useRef,
  useEffect,
  useCallback,
  forwardRef,
  useImperativeHandle,
  useMemo,
} from "react";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import ChatMessage from "./ChatMessage";
import ChatInput from "./ChatInput";
import { isValidTravelTypeCode } from "@/lib/travelTypeMapping";
import { getTravelTypeResultContent } from "@/content/travelTypeResults";

const KEYBOARD_OFFSET_THRESHOLD = 40;

export interface Message {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  timestamp: Date;
  isLoading?: boolean;
  isTyping?: boolean;
  typingSpeed?: number;
  places?: Array<{
    place_id: string;
    name: string;
    formatted_address: string;
    rating?: number;
    user_ratings_total?: number;
    price_level?: number;
    types: string[];
    photos?: Array<{
      photo_reference: string;
      height: number;
      width: number;
    }>;
    geometry?: {
      location: {
        lat: number;
        lng: number;
      };
    };
    opening_hours?: {
      open_now?: boolean;
    };
    editorial_summary?: {
      overview?: string;
    };
  }>;
  functionResults?: Array<{
    function: string;
    result: any;
  }>;
  fullHeightPlaceholder?: boolean;
  statusUpdates?: Array<{
    id: string;
    label: string;
    state: "pending" | "success" | "error";
    startedAt?: string;
    finishedAt?: string;
  }>;
}

import { useChatSession } from "@/hooks/useChatSession";

export interface ChatInterfaceRef {
  addMessage: (message: Message) => void;
  sendMessage: (content: string) => Promise<void>;
  fetchPlaceDetails: (place: any) => Promise<void>;
}

type DisplayedCard = {
  place_id: string;
  name: string;
  formatted_address?: string;
  rating?: number;
  user_ratings_total?: number;
  price_level?: number;
  types?: string[];
  distance_m?: number;
  clicked?: boolean;
  displayedAt?: string;
  affiliateUrl?: string;
  price?: string;
  duration?: string;
  isAffiliate?: boolean;
  reviews?: Array<{
    author_name: string;
    rating: number;
    text: string;
    relative_time_description: string;
    time: number;
  }>;
};

const CTA_MESSAGE =
  "If you have any questions or want to share your current mood, feel free to let me know. I'll tune in right away.";

interface TravelTypeSummary {
  travelTypeCode: string;
  travelTypeName?: string;
  travelTypeEmoji?: string;
  travelTypeDescription?: string;
}

const buildWelcomeContent = (summary: TravelTypeSummary): string => {
  const {
    travelTypeCode,
    travelTypeEmoji,
    travelTypeName,
    travelTypeDescription,
  } = summary;
  const fallback = isValidTravelTypeCode(travelTypeCode)
    ? getTravelTypeResultContent(travelTypeCode)
    : null;

  const emoji = travelTypeEmoji ?? fallback?.emoji ?? "🌟";
  const greeting =
    fallback?.greeting ??
    `Welcome back, ${travelTypeName ?? fallback?.title ?? "Traveler"} type traveler!`;
  const description = travelTypeDescription ?? fallback?.description ?? "";

  return `${emoji} ${greeting}\n\n${description}\n\n${CTA_MESSAGE}`;
};

type StatusUpdate = NonNullable<Message["statusUpdates"]>[number];

const FUNCTION_STATUS_TEXT: Record<
  string,
  {
    pending: string;
    success: string;
    error: string;
  }
> = {
  analysis: {
    pending: "Analyzing request...",
    success: "Request understood",
    error: "Failed to analyze request",
  },
  model_request: {
    pending: "Calling AI model...",
    success: "AI model responded",
    error: "AI model failed",
  },
  search_places: {
    pending: "Searching for places...",
    success: "Place search completed",
    error: "Place search failed",
  },
  get_place_details: {
    pending: "Fetching details...",
    success: "Details retrieved",
    error: "Failed to fetch details",
  },
  send_cards: {
    pending: "Preparing cards...",
    success: "Cards ready",
    error: "Failed to prepare cards",
  },
  compose_response: {
    pending: "Composing response...",
    success: "Response ready",
    error: "Failed to compose response",
  },
  generate_image: {
    pending: "Generating image...",
    success: "Image generated",
    error: "Image generation failed",
  },
};

const INITIAL_STATUS_MATCHERS: Record<string, RegExp> = {
  search_places:
    /(search|find|spot|place|recommend|おすすめ|探して|スポット|場所|カフェ|レストラン|アクティビティ)/i,
  get_place_details:
    /(detail|詳しく|営業時間|address|アクセス|レビュー|口コミ|price|金額|予約|所要時間|連絡先)/i,
  generate_image:
    /(image|photo|picture|visual|イメージ|画像|ビジュアル|イラスト|写真|描いて)/i,
};

const STATUS_NAME_TO_ID: Record<string, string> = {
  searching: "search_places",
  details: "get_place_details",
  analyzing: "analysis",
  thinking: "model_request",
  cards: "send_cards",
  composing: "compose_response",
};

const buildInitialStatusUpdates = (
  userContent: string,
): Message["statusUpdates"] => {
  const now = new Date().toISOString();
  const statuses: StatusUpdate[] = [
    {
      id: "analysis",
      label: FUNCTION_STATUS_TEXT.analysis.pending,
      state: "pending",
      startedAt: now,
    },
    {
      id: "model_request",
      label: FUNCTION_STATUS_TEXT.model_request.pending,
      state: "pending",
      startedAt: now,
    },
  ];

  Object.entries(INITIAL_STATUS_MATCHERS).forEach(([id, matcher]) => {
    if (matcher.test(userContent)) {
      const statusDef = FUNCTION_STATUS_TEXT[id];
      statuses.push({
        id,
        label: statusDef.pending,
        state: "pending",
        startedAt: now,
      });
    }
  });

  return statuses;
};

const applyStatusUpdate = (
  current: Message["statusUpdates"] | undefined,
  update: { id: string; state: "pending" | "success" | "error"; label?: string },
): Message["statusUpdates"] => {
  const now = new Date().toISOString();
  const statuses: StatusUpdate[] = [...(current ?? [])];
  const index = statuses.findIndex((status) => status.id === update.id);
  const previous = index >= 0 ? statuses[index] : undefined;
  const fallbackLabel =
    FUNCTION_STATUS_TEXT[update.id]?.[update.state] ?? update.id;
  const nextStatus: StatusUpdate = {
    id: update.id,
    label: update.label ?? previous?.label ?? fallbackLabel,
    state: update.state,
    startedAt: previous?.startedAt ?? (update.state === "pending" ? now : now),
    finishedAt: update.state === "pending" ? undefined : now,
  };

  if (index >= 0) {
    statuses[index] = nextStatus;
  } else {
    statuses.push(nextStatus);
  }

  return statuses;
};

const finalizeStatusUpdates = (
  current: Message["statusUpdates"] | undefined,
  functionResults: Array<{ function: string; input?: unknown; result: any }>,
): Message["statusUpdates"] => {
  const now = new Date().toISOString();
  const statuses: StatusUpdate[] = [...(current ?? [])];

  const upsertStatus = (
    id: string,
    updater: (prev?: StatusUpdate) => StatusUpdate,
  ) => {
    const index = statuses.findIndex((status) => status.id === id);
    if (index >= 0) {
      statuses[index] = updater(statuses[index]);
    } else {
      statuses.push(updater(undefined));
    }
  };

  upsertStatus("analysis", (prev) => ({
    id: "analysis",
    label: FUNCTION_STATUS_TEXT.analysis.success,
    state: "success",
    startedAt: prev?.startedAt ?? now,
    finishedAt: now,
  }));

  upsertStatus("model_request", (prev) => ({
    id: "model_request",
    label: FUNCTION_STATUS_TEXT.model_request.success,
    state: "success",
    startedAt: prev?.startedAt ?? now,
    finishedAt: now,
  }));

  upsertStatus("compose_response", (prev) => ({
    id: "compose_response",
    label: FUNCTION_STATUS_TEXT.compose_response.success,
    state: "success",
    startedAt: prev?.startedAt ?? now,
    finishedAt: now,
  }));

  const usedFunctionIds = new Set<string>();

  functionResults.forEach(({ function: functionName, result }) => {
    usedFunctionIds.add(functionName);
    const statusText = FUNCTION_STATUS_TEXT[functionName] ?? {
      pending: `Executing ${functionName}...`,
      success: `${functionName} completed`,
      error: `${functionName} failed`,
    };

    upsertStatus(functionName, (prev) => ({
      id: functionName,
      label: result?.success ? statusText.success : statusText.error,
      state: result?.success ? "success" : "error",
      startedAt: prev?.startedAt ?? now,
      finishedAt: now,
    }));
  });

  return statuses.filter((status) => {
    if (status.id === "analysis") {
      return true;
    }
    if (status.state === "pending") {
      return usedFunctionIds.has(status.id);
    }
    return true;
  });
};

const extractCardFromPlace = (place: any) => ({
  place_id: place?.place_id,
  name: place?.name,
  formatted_address: place?.formatted_address,
  rating: place?.rating,
  user_ratings_total: place?.user_ratings_total,
  price_level: place?.price_level,
  types: place?.types,
  distance_m: (place as any)?.distance_m,
  reviews: place?.reviews,
});

const cardsAreShallowEqual = (a: DisplayedCard, b: DisplayedCard) =>
  a.name === b.name &&
  a.formatted_address === b.formatted_address &&
  a.rating === b.rating &&
  a.user_ratings_total === b.user_ratings_total &&
  a.price_level === b.price_level &&
  (a.distance_m ?? null) === (b.distance_m ?? null) &&
  JSON.stringify(a.types ?? null) === JSON.stringify(b.types ?? null) &&
  JSON.stringify(a.reviews ?? null) === JSON.stringify(b.reviews ?? null);

const mergeDisplayedCards = (
  prevCards: DisplayedCard[],
  places: any[],
): DisplayedCard[] => {
  if (!Array.isArray(places) || places.length === 0) {
    return prevCards;
  }

  let changed = false;
  const nextCards = [...prevCards];
  const indexById = new Map(
    prevCards.map((card, index) => [card.place_id, index]),
  );

  places.forEach((place) => {
    if (!place?.place_id) {
      return;
    }

    const sanitized = extractCardFromPlace(place);
    const existingIndex = indexById.get(place.place_id);

    if (existingIndex === undefined) {
      changed = true;
      nextCards.push({
        ...sanitized,
        clicked: false,
        displayedAt: new Date().toISOString(),
      });
      indexById.set(place.place_id, nextCards.length - 1);
      return;
    }

    const currentCard = nextCards[existingIndex];
    const updatedCard: DisplayedCard = {
      ...currentCard,
      ...sanitized,
    };

    if (!cardsAreShallowEqual(currentCard, updatedCard)) {
      changed = true;
      nextCards[existingIndex] = updatedCard;
    }
  });

  return changed ? nextCards : prevCards;
};

export interface ChatInterfaceProps {
  // initialMessages removed
  onSendMessage?: (message: string) => Promise<void>;
  isLoading?: boolean;
  placeholder?: string;
  onPlacesUpdate?: (places: any[]) => void;
  onPlaceClick?: (place: any | null) => void;
  userLocation?: { lat: number; lng: number } | null;
  userId?: string | null;
  durationFilter?: "under15" | "15-30" | "30-60" | "60+";
  quizResults?: {
    recommendation?: any;
    places?: any[];
    timestamp?: number;
    travelType?: {
      travelTypeCode: string;
      travelTypeName?: string;
      travelTypeEmoji?: string;
      travelTypeDescription?: string;
      locationLat?: number;
      locationLng?: number;
      locationPermission?: boolean;
    };
    answers?: {
      walkingTolerance?: string;
      dietaryPreferences?: string[];
      languageComfort?: string[];
      photoSubjects?: string[];
      origin?: string;
    };
  } | null;
  accountToken?: string | null;
  authAccessToken?: string | null;
  isAuthenticated?: boolean;
  userAvatarUrl?: string | null;
  sessionId?: string | null;
  onSessionActivity?: (
    sessionId: string,
    payload: { lastActivityAt: string },
  ) => void;
  /**
   * セッション欠落時の再生成ハンドラ（新セッションIDを返す）
   */
  onRecoverSession?: () => Promise<string | null>;
  initialDetailPlace?: {
    place_id: string;
    name?: string;
    formatted_address?: string;
    rating?: number;
    user_ratings_total?: number;
    price_level?: number;
    types?: string[];
    photos?: Array<{
      photo_reference: string;
      height: number;
      width: number;
    }>;
    opening_hours?: {
      open_now?: boolean;
    };
  } | null;
  // onSessionMessagesRefresh removed
  // onSessionMessagesSnapshot removed
}

// ... Message interface and other types ...

export const ChatInterface = forwardRef<ChatInterfaceRef, ChatInterfaceProps>(
  (
    {
      onSendMessage,
      isLoading: externalLoading = false,
      placeholder = "What kind of experience are you looking for?",
      onPlacesUpdate,
      onPlaceClick,
      userLocation,
      userId,
      durationFilter,
      quizResults,
      accountToken,
      authAccessToken,
      isAuthenticated = false,
      userAvatarUrl,
      sessionId = null,
      onSessionActivity,
      onRecoverSession,
      initialDetailPlace = null,
    },
    ref,
  ) => {
    const authHeaders = React.useMemo(() => {
      if (userId && accountToken && authAccessToken) {
        return {
          accountId: userId,
          accountToken,
          accessToken: authAccessToken,
        };
      }
      return null;
    }, [userId, accountToken, authAccessToken]);

    const {
      messages,
      setMessages,
      isLoading: isSessionLoading,
    } = useChatSession(sessionId, authHeaders);

    const [isSending, setIsSending] = useState(false);
    const [isUserNearBottom, setIsUserNearBottom] = useState(true);
    const [pendingScrollMessageId, setPendingScrollMessageId] = useState<
      string | null
    >(null);
    const [pendingAssistantMessageId, setPendingAssistantMessageId] = useState<
      string | null
    >(null);
    const [displayedCards, setDisplayedCards] = useState<DisplayedCard[]>([]);
    const [keyboardOffset, setKeyboardOffset] = useState(0);
    const [isInputFocused, setIsInputFocused] = useState(false);
    const initialInnerHeightRef = useRef<number | null>(null);
    const baseLayoutHeightRef = useRef(0);
    const loggedViewportFallbackRef = useRef(false);
    const rootRef = useRef<HTMLDivElement>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const messagesContainerRef = useRef<HTMLDivElement>(null);
    const keyboardRafRef = useRef<number | null>(null);
    const sessionIdRef = useRef<string | null>(sessionId ?? null);
    const sessionRecoveryAttemptedRef = useRef(false);
    const handleInputFocusChange = useCallback((focused: boolean) => {
      setIsInputFocused(focused);
      if (!focused) {
        setKeyboardOffset(0);
      }
    }, []);

    useEffect(() => {
      sessionIdRef.current = sessionId ?? null;
    }, [sessionId]);

    // Expose addMessage and sendMessage methods to parent component
    useImperativeHandle(ref, () => ({
      addMessage: (message: Message) => {
        setMessages((prev) => [...prev, message]);
      },
      sendMessage: async (content: string) => {
        await handleSendMessage(content);
      },
      fetchPlaceDetails: async (place: any) => {
        await handleDetailsClick(place);
      },
    }));

    const recordBaseLayoutHeight = useCallback((height: number) => {
      baseLayoutHeightRef.current = Math.max(
        baseLayoutHeightRef.current,
        height,
      );
    }, []);

    const getLayoutShrink = useCallback(() => {
      const root = rootRef.current;
      if (!root) {
        return 0;
      }
      const currentHeight = root.getBoundingClientRect().height;
      const baseHeight = baseLayoutHeightRef.current || currentHeight;
      return Math.max(0, baseHeight - currentHeight);
    }, []);

    useEffect(() => {
      if (typeof window === "undefined") {
        return;
      }
      if (rootRef.current) {
        recordBaseLayoutHeight(rootRef.current.getBoundingClientRect().height);
      }
    }, [recordBaseLayoutHeight]);

    // 自動スクロール
    const scrollToBottom = (behavior: ScrollBehavior = "smooth") => {
      if (messagesEndRef.current) {
        messagesEndRef.current.scrollIntoView({ behavior });
        setIsUserNearBottom(true);
      }
    };

    useEffect(() => {
      const container = messagesContainerRef.current;
      if (!container) {
        return;
      }

      const handleScroll = () => {
        const distanceFromBottom =
          container.scrollHeight -
          (container.scrollTop + container.clientHeight);
        setIsUserNearBottom(distanceFromBottom < 120);
      };

      container.addEventListener("scroll", handleScroll);

      return () => {
        container.removeEventListener("scroll", handleScroll);
      };
    }, []);

    useEffect(() => {
      const container = messagesContainerRef.current;
      if (!container) {
        return;
      }
      const distanceFromBottom =
        container.scrollHeight - (container.scrollTop + container.clientHeight);
      setIsUserNearBottom(distanceFromBottom < 120);
    }, [messages]);

    useEffect(() => {
      if (typeof window === "undefined" || !window.visualViewport) {
        return;
      }

      const viewport = window.visualViewport;

      const calculateVisualViewportOverlap = () => {
        if (!viewport) {
          return 0;
        }
        const viewportOffsetTop =
          typeof viewport.offsetTop === "number" ? viewport.offsetTop : 0;
        const overlap = Math.max(
          0,
          window.innerHeight - (viewport.height + viewportOffsetTop),
        );
        return overlap;
      };

      const updateKeyboardOffset = () => {
        if (!viewport) {
          return;
        }

        if (keyboardRafRef.current !== null) {
          window.cancelAnimationFrame(keyboardRafRef.current);
        }

        keyboardRafRef.current = window.requestAnimationFrame(() => {
          const overlap = calculateVisualViewportOverlap();
          const nextOffset =
            overlap > KEYBOARD_OFFSET_THRESHOLD
              ? Math.ceil(overlap + 8)
              : 0;

          if (nextOffset === 0) {
            if (rootRef.current) {
              recordBaseLayoutHeight(
                rootRef.current.getBoundingClientRect().height,
              );
            }
          }

          setKeyboardOffset((prev) =>
            Math.abs(prev - nextOffset) > 1 ? nextOffset : prev,
          );
        });
      };

      viewport.addEventListener("resize", updateKeyboardOffset);
      viewport.addEventListener("scroll", updateKeyboardOffset);
      updateKeyboardOffset();

      return () => {
        if (keyboardRafRef.current !== null) {
          window.cancelAnimationFrame(keyboardRafRef.current);
        }
        viewport.removeEventListener("resize", updateKeyboardOffset);
        viewport.removeEventListener("scroll", updateKeyboardOffset);
      };
    }, [recordBaseLayoutHeight]);

    // Fallback for browsers/WebViews without visualViewport (older Android WebView, embedded in-app browsers, etc.)
    useEffect(() => {
      if (typeof window === "undefined") {
        return;
      }

      if (window.visualViewport) {
        // primary handler covers this case
        return;
      }

      if (!loggedViewportFallbackRef.current) {
        console.info(
          "[ChatInterface] visualViewport not available; using innerHeight fallback",
        );
        loggedViewportFallbackRef.current = true;
      }

      if (initialInnerHeightRef.current === null) {
        initialInnerHeightRef.current = window.innerHeight;
      }

      const handleResize = () => {
        if (initialInnerHeightRef.current === null) {
          initialInnerHeightRef.current = window.innerHeight;
        }
        const diff = Math.max(
          0,
          initialInnerHeightRef.current - window.innerHeight,
        );
        const nextOffset =
          diff > KEYBOARD_OFFSET_THRESHOLD ? Math.ceil(diff + 8) : 0;
        if (nextOffset === 0) {
          if (rootRef.current) {
            recordBaseLayoutHeight(
              rootRef.current.getBoundingClientRect().height,
            );
          }
        }
        setKeyboardOffset((prev) =>
          Math.abs(prev - nextOffset) > 1 ? nextOffset : prev,
        );
      };

      window.addEventListener("resize", handleResize);
      handleResize();

      return () => {
        window.removeEventListener("resize", handleResize);
      };
    }, [recordBaseLayoutHeight]);

    useEffect(() => {
      if (!pendingScrollMessageId) {
        return;
      }

      const container = messagesContainerRef.current;
      if (!container) {
        return;
      }

      const target = container.querySelector<HTMLElement>(
        `[data-message-id="${pendingScrollMessageId}"]`,
      );
      if (target) {
        const targetTop = Math.max(target.offsetTop - 16, 0);
        const startTop = container.scrollTop;
        const distance = targetTop - startTop;
        const duration = 400;
        const startTime = performance.now();

        const easeInOut = (t: number) => {
          return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
        };

        const tick = (now: number) => {
          const elapsed = now - startTime;
          const progress = Math.min(elapsed / duration, 1);
          const eased = easeInOut(progress);
          container.scrollTop = startTop + distance * eased;

          if (progress < 1) {
            requestAnimationFrame(tick);
          }
        };

        requestAnimationFrame(tick);
      }

      setPendingScrollMessageId(null);
    }, [messages, pendingScrollMessageId]);

    const lastWelcomeSignatureRef = useRef<string | null>(null);
    const welcomeMessageIdRef = useRef<string | null>(null);

    const syncDisplayedCards = useCallback(
      (places: any[]) => {
        if (!Array.isArray(places) || places.length === 0) {
          return;
        }
        setDisplayedCards((prevCards) =>
          mergeDisplayedCards(prevCards, places),
        );
      },
      [setDisplayedCards],
    );

    // Map表示用: 現在チャットに出ているカードに対応するスポットを集約（座標付きのみ）
    const aggregatedPlaces = useMemo(() => {
      const uniquePlaces = new Map<string, any>();

      messages.forEach((msg) => {
        msg.places?.forEach((place) => {
          if (!place?.place_id) return;
          if (!place.geometry?.location) return; // 座標が無いものはスキップ
          if (!uniquePlaces.has(place.place_id)) {
            uniquePlaces.set(place.place_id, place);
          }
        });
      });

      return Array.from(uniquePlaces.values());
    }, [messages]);

    // 重複通知を避けて安定化
    const lastPlacesSignatureRef = useRef<string>("");

    useEffect(() => {
      if (!onPlacesUpdate) return;

      const signature = aggregatedPlaces
        .map(
          (p) =>
            `${p.place_id}:${p.geometry?.location?.lat ?? ""}:${p.geometry?.location?.lng ?? ""}`,
        )
        .sort()
        .join("|");

      if (signature === lastPlacesSignatureRef.current) {
        return; // 変化なし
      }

      lastPlacesSignatureRef.current = signature;
      onPlacesUpdate(aggregatedPlaces);
    }, [aggregatedPlaces, onPlacesUpdate]);

    const handleCardSelect = useCallback(
      (place: any) => {
        if (place?.place_id) {
          setDisplayedCards((prevCards) => {
            let updated = false;
            const nextCards = prevCards.map((card) => {
              if (card.place_id === place.place_id) {
                updated = true;
                return {
                  ...card,
                  clicked: true,
                  displayedAt: card.displayedAt ?? new Date().toISOString(),
                };
              }
              return card;
            });

            if (updated) {
              return nextCards;
            }

            const fallbackCard: DisplayedCard = {
              place_id: place.place_id,
              name: place.name,
              formatted_address: place.formatted_address,
              rating: place.rating,
              user_ratings_total: place.user_ratings_total,
              price_level: place.price_level,
              types: place.types,
              distance_m: place.distance_m,
              clicked: true,
              displayedAt: new Date().toISOString(),
              affiliateUrl: place.affiliateUrl,
              price: place.price,
              duration: place.duration,
              isAffiliate: place.isAffiliate,
            };

            return [...nextCards, fallbackCard];
          });
        }

        onPlaceClick?.(place);
      },
      [onPlaceClick],
    );

    const travelType = quizResults?.travelType;
    const travelTypeCode = travelType?.travelTypeCode;
    const travelTypeName = travelType?.travelTypeName;
    const travelTypeEmoji = travelType?.travelTypeEmoji;
    const travelTypeDescription = travelType?.travelTypeDescription;
    const quizTimestamp = quizResults?.timestamp;
    const quizPlaces = quizResults?.places;

    // Handle quiz results welcome message (one per travel type/timestamp)
    // This runs only on client-side after hydration to avoid hydration mismatch
    useEffect(() => {
      // Ensure this only runs on client-side
      if (typeof window === "undefined") {
        return;
      }

      if (!travelTypeCode) {
        lastWelcomeSignatureRef.current = null;
        welcomeMessageIdRef.current = null;
        return;
      }

      const signature = `${travelTypeCode}:${quizTimestamp ?? "na"}`;
      const messageId = `quiz-results-${travelTypeCode}`;
      welcomeMessageIdRef.current = messageId;

      if (lastWelcomeSignatureRef.current === signature) {
        return;
      }

      const welcomeContent = buildWelcomeContent({
        travelTypeCode,
        travelTypeName,
        travelTypeEmoji,
        travelTypeDescription,
      });

      // Use quizTimestamp if available, otherwise use current time
      // This runs in useEffect (client-side only), so hydration mismatch should not occur
      const messageTimestamp = quizTimestamp
        ? new Date(quizTimestamp)
        : new Date();
      let addedMessage = false;

      setMessages((prev) => {
        // セッションに既にユーザーメッセージがある場合は、welcomeメッセージをスキップ
        // （Homeページからの検索クエリなど）
        const hasUserMessages = prev.some((msg) => msg.role === "user");
        if (hasUserMessages) {
          lastWelcomeSignatureRef.current = signature;
          return prev;
        }

        const existingIndex = prev.findIndex(
          (message) => message.id === messageId,
        );

        if (existingIndex !== -1) {
          const existingMessage = prev[existingIndex];
          // Compare timestamps more flexibly (within 1 second tolerance for hydration)
          const timeDiff = Math.abs(
            existingMessage.timestamp.getTime() - messageTimestamp.getTime(),
          );
          if (
            existingMessage.content === welcomeContent &&
            timeDiff < 1000 &&
            existingMessage.isTyping === true &&
            existingMessage.typingSpeed === 1
          ) {
            return prev;
          }

          const nextMessages = [...prev];
          nextMessages[existingIndex] = {
            ...existingMessage,
            content: welcomeContent,
            timestamp: messageTimestamp,
            isTyping: true,
            typingSpeed: 1,
          };
          return nextMessages;
        }

        addedMessage = true;
        return [
          ...prev,
          {
            id: messageId,
            role: "assistant",
            content: welcomeContent,
            timestamp: messageTimestamp,
            isTyping: true,
            typingSpeed: 1,
          },
        ];
      });

      if (addedMessage) {
        setPendingScrollMessageId(messageId);
      }

      lastWelcomeSignatureRef.current = signature;
    }, [
      travelTypeCode,
      travelTypeName,
      travelTypeEmoji,
      travelTypeDescription,
      quizTimestamp,
    ]);

    useEffect(() => {
      const messageId = welcomeMessageIdRef.current;
      if (!messageId) {
        return;
      }

      const nextPlaces =
        Array.isArray(quizPlaces) && quizPlaces.length > 0
          ? quizPlaces
          : undefined;

      setMessages((prev) => {
        const targetIndex = prev.findIndex(
          (message) => message.id === messageId,
        );
        if (targetIndex === -1) {
          return prev;
        }

        const updatedMessages = [...prev];
        updatedMessages[targetIndex] = {
          ...prev[targetIndex],
          places: nextPlaces,
        };
        return updatedMessages;
      });

      if (nextPlaces) {
        syncDisplayedCards(nextPlaces);
      }
    }, [quizPlaces, syncDisplayedCards]);

    // Automatically clear isTyping for welcome message after delay
    useEffect(() => {
      const messageId = welcomeMessageIdRef.current;
      if (!messageId) return;

      const timer = setTimeout(() => {
        setMessages((prev) =>
          prev.map((msg) => {
            if (msg.id === messageId && msg.isTyping) {
              return { ...msg, isTyping: false };
            }
            return msg;
          }),
        );
      }, 3000);

      return () => clearTimeout(timer);
    }, [travelTypeCode, quizTimestamp, setMessages]);

    const handleSendMessage = useCallback(
      async (content: string) => {
        const timestamp = Date.now();

        const historyMessages = messages.filter((msg) => !msg.isLoading);
        if (!sessionIdRef.current) {
          throw new Error(
            "Chat session is not ready. Please create a new page and try again.",
          );
        }

        // 認証なしでもチャット可能：3ラウンド制限を削除

        // Add user message immediately so the bubble appears before async work
        const userMessage: Message = {
          id: `user-${timestamp}`,
          role: "user",
          content,
          timestamp: new Date(),
        };

        const updatedMessages = [...historyMessages, userMessage];
        setMessages((prev) => {
          const next = [...prev, userMessage];
          return next;
        });
        setPendingScrollMessageId(userMessage.id);
        setIsSending(true);

        const usingDefaultFlow = !onSendMessage;
        const assistantPlaceholderId = `assistant-${timestamp}-pending`;
        const initialStatusUpdates = buildInitialStatusUpdates(content);
        sessionRecoveryAttemptedRef.current = false;

        if (usingDefaultFlow) {
          const placeholderMessage: Message = {
            id: assistantPlaceholderId,
            role: "assistant",
            content: "",
            timestamp: new Date(),
            isLoading: true,
            fullHeightPlaceholder: true,
            statusUpdates: initialStatusUpdates,
          };

          setMessages((prev) => [...prev, placeholderMessage]);
          setPendingAssistantMessageId(assistantPlaceholderId);
        }

        try {
          // Collect displayed cards from all messages and merge with existing state
          const currentDisplayedCards = [...displayedCards];

          // Extract places from all messages that have places
          historyMessages.forEach((msg) => {
            if (msg.places && msg.places.length > 0) {
              msg.places.forEach((place) => {
                // Avoid duplicates by checking place_id
                if (
                  !currentDisplayedCards.find(
                    (card) => card.place_id === place.place_id,
                  )
                ) {
                  currentDisplayedCards.push({
                    place_id: place.place_id,
                    name: place.name,
                    formatted_address: place.formatted_address,
                    rating: place.rating,
                    user_ratings_total: place.user_ratings_total,
                    price_level: place.price_level,
                    types: place.types,
                    distance_m: (place as any).distance_m,
                    clicked: false, // TODO: Track clicks separately if needed
                    displayedAt: msg.timestamp.toISOString(),
                  });
                }
              });
            }
          });

          // Use the merged cards for the request
          const displayedCardsForRequest = currentDisplayedCards;

          if (onSendMessage) {
            await onSendMessage(content);
          } else {
            // Allow API calls up to 3 rounds even if not logged in
            // However, if authentication is required on the API side, an error will be returned
            if (!userId || !accountToken) {
              // For guest users, accountId and accountToken need to be obtained
              // Here we simply display an error
              throw new Error(
                "Account session required. Please reload the page.",
              );
            }

            const sendWithSession = async (
              targetSessionId: string,
            ): Promise<void> => {
              // 以降の処理で最新セッションIDを参照できるようにセット
              sessionIdRef.current = targetSessionId;

            // 認証ヘッダーはオプショナル
            const headers: HeadersInit = {
              "Content-Type": "application/json",
              Accept: "text/event-stream",
              "X-Gappy-Account-Id": userId,
              "X-Gappy-Account-Token": accountToken,
            };
            if (authAccessToken) {
              headers.Authorization = `Bearer ${authAccessToken}`;
            }

            // Try streaming first, fallback to non-streaming if not supported
            const response = await fetch("/api/chat/send-message?stream=true", {
              method: "POST",
              headers,
              body: JSON.stringify({
                message: content,
                conversationHistory: updatedMessages.map((msg) => ({
                  role: msg.role,
                  content: msg.content,
                })),
                userId: userId,
                sessionId: targetSessionId,
                currentLocation: userLocation
                  ? {
                      lat: userLocation.lat,
                      lng: userLocation.lng,
                      permission: true,
                    }
                  : typeof quizResults?.travelType?.locationLat === "number" &&
                      typeof quizResults?.travelType?.locationLng === "number"
                    ? {
                        lat: quizResults.travelType.locationLat,
                        lng: quizResults.travelType.locationLng,
                        permission:
                          quizResults.travelType.locationPermission || false,
                      }
                    : undefined,
                displayedCards:
                  displayedCardsForRequest.length > 0
                    ? displayedCardsForRequest
                    : undefined,
                quizResults: quizResults,
                homeDurationPreference: durationFilter,
              }),
            });

            if (!response.ok) {
              let errorMessage = "Failed to send message";
              let errorCode: string | undefined;
              let suggestion: string | undefined;

              try {
                const errorData = await response.json();
                // Prefer userMessage over error field for better UX
                errorMessage =
                  errorData.userMessage || errorData.error || errorMessage;
                errorCode = errorData.errorCode;
                suggestion = errorData.suggestion;

                // If we have both userMessage and suggestion, format them nicely
                if (suggestion && errorMessage !== suggestion) {
                  // Only append suggestion if it's different from the main message
                  // and not already included in the errorMessage
                  if (!errorMessage.includes(suggestion)) {
                    errorMessage = `${errorMessage}\n\n${suggestion}`;
                  }
                }

                // Add error code for debugging if available
                if (errorCode && errorCode !== "UNKNOWN_ERROR") {
                  console.error("Chat API Error:", {
                    code: errorCode,
                    message: errorMessage,
                    status: response.status,
                  });
                }
              } catch (parseError) {
                // If JSON parsing fails, try to get text response
                try {
                  const textResponse = await response.text();
                  errorMessage = textResponse || errorMessage;
                } catch (textError) {
                  // If both fail, use status-based message
                  errorMessage = `Request failed with status ${response.status}`;
                }
              }

              // セッション欠落時は再生成を試みる（再送はユーザーに任せる）
              if (
                !sessionRecoveryAttemptedRef.current &&
                onRecoverSession &&
                (errorCode === "SESSION_NOT_FOUND" ||
                  errorCode === "SESSION_ID_REQUIRED")
              ) {
                sessionRecoveryAttemptedRef.current = true;
                const newSessionId = await onRecoverSession();
                if (newSessionId) {
                  sessionIdRef.current = newSessionId;
                  // 自動で一度だけリトライしてユーザーの手戻りを防ぐ
                  await sendWithSession(newSessionId);
                  return;
                }
              }

              // Create error with additional context
              const error = new Error(errorMessage);
              if (errorCode) {
                (error as any).errorCode = errorCode;
              }
              throw error;
            }

            // Check if response is streaming (SSE)
            const contentType = response.headers.get("content-type");
            const isStreaming = contentType?.includes("text/event-stream");

            let data: any;
            let streamedContent = "";

            if (isStreaming && response.body) {
              // Handle streaming response
              const reader = response.body.getReader();
              const decoder = new TextDecoder();
              let buffer = "";

              while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                buffer += decoder.decode(value, { stream: true });
                const lines = buffer.split("\n");
                buffer = lines.pop() || ""; // Keep incomplete line in buffer

                for (const line of lines) {
                  if (line.startsWith("data: ")) {
                    try {
                      const jsonStr = line.slice(6); // Remove 'data: ' prefix
                      const event = JSON.parse(jsonStr);

                      if (event.type === "status") {
                        const eventId =
                          typeof event.id === "string"
                            ? event.id
                            : typeof event.status === "string"
                              ? STATUS_NAME_TO_ID[event.status] ?? event.status
                              : undefined;
                        const eventState: "pending" | "success" | "error" =
                          event.state === "success" ||
                          event.state === "error" ||
                          event.state === "pending"
                            ? event.state
                            : "pending";
                        const statusText = eventId
                          ? FUNCTION_STATUS_TEXT[eventId]
                          : undefined;
                        const fallbackLabel =
                          statusText
                            ? statusText[eventState]
                            : eventId ?? "Working...";
                        const eventLabel =
                          typeof event.label === "string"
                            ? event.label
                            : typeof event.message === "string"
                              ? event.message
                              : fallbackLabel;

                        if (eventId) {
                          setMessages((prev) =>
                            prev.map((message) =>
                              message.id === assistantPlaceholderId
                                ? {
                                    ...message,
                                    statusUpdates: applyStatusUpdate(
                                      message.statusUpdates,
                                      {
                                        id: eventId,
                                        state: eventState,
                                        label: eventLabel,
                                      },
                                    ),
                                  }
                                : message,
                            ),
                          );
                        }
                      } else if (event.type === "content") {
                        streamedContent += event.content;
                        // Update message content in real-time
                        setMessages((prev) =>
                          prev.map((message) =>
                            message.id === assistantPlaceholderId
                              ? {
                                  ...message,
                                  content: streamedContent,
                                  isLoading: false,
                                  isTyping: false,
                                }
                              : message,
                          ),
                        );
                      } else if (event.type === "cards") {
                        // 🚀 Cards arrive early (before AI response text)
                        // Show cards immediately with affiliates integrated
                        console.log("[ChatInterface] 🚀 Cards received:", {
                          placesCount: event.places?.length,
                          timestamp: new Date().toISOString(),
                        });
                        const cardsData = {
                          places: event.places || [],
                          updatedCards: event.updatedCards,
                        };

                        // Update data object for final processing
                        if (!data) {
                          data = {
                            response: streamedContent,
                            places: cardsData.places,
                            functionResults: [],
                            updatedCards: cardsData.updatedCards,
                          };
                        } else {
                          data.places = cardsData.places;
                          data.updatedCards = cardsData.updatedCards;
                        }

                        // Show cards immediately in the message
                        setMessages((prev) =>
                          prev.map((message) =>
                            message.id === assistantPlaceholderId
                              ? {
                                  ...message,
                                  places: cardsData.places,
                                  isLoading: false,
                                }
                              : message,
                          ),
                        );

                        // Update displayed cards state
                        if (
                          cardsData.updatedCards &&
                          Array.isArray(cardsData.updatedCards) &&
                          cardsData.updatedCards.length > 0
                        ) {
                          setDisplayedCards((prevCards) => {
                            const updatedCardsMap = new Map(
                              (
                                cardsData.updatedCards as Array<{
                                  place_id: string;
                                  name: string;
                                  formatted_address?: string;
                                  rating?: number;
                                  user_ratings_total?: number;
                                  price_level?: number;
                                  types?: string[];
                                  distance_m?: number;
                                  affiliateUrl?: string;
                                  price?: string;
                                  duration?: string;
                                  isAffiliate?: boolean;
                                  imageUrl?: string;
                                }>
                              ).map((card) => [card.place_id, card]),
                            );

                            const mergedCards = prevCards.map((card) => {
                              const updated = updatedCardsMap.get(
                                card.place_id,
                              );
                              if (updated) {
                                updatedCardsMap.delete(card.place_id);
                                return { ...card, ...updated };
                              }
                              return card;
                            });

                            updatedCardsMap.forEach((card) => {
                              mergedCards.push(card);
                            });

                            return mergedCards;
                          });
                        }

                        // Notify parent about places update
                        if (cardsData.places && onPlacesUpdate) {
                          onPlacesUpdate(cardsData.places);
                        }
                      } else if (event.type === "metadata") {
                        // Store metadata for later use
                        data = {
                          response: streamedContent,
                          places: event.places || [],
                          functionResults: event.functionResults || [],
                          updatedCards: event.updatedCards,
                        };

                        // Show cards as soon as search results arrive (before stream done)
                        setMessages((prev) =>
                          prev.map((message) =>
                            message.id === assistantPlaceholderId
                              ? {
                                  ...message,
                                  // keep already-streamed text
                                  content: streamedContent || message.content,
                                  places: data.places,
                                  functionResults: data.functionResults,
                                  isLoading: false,
                                  isTyping: true,
                                  typingSpeed: 1,
                                }
                              : message,
                          ),
                        );

                        // Update displayed cards immediately with any review info
                        if (
                          data.updatedCards &&
                          Array.isArray(data.updatedCards) &&
                          data.updatedCards.length > 0
                        ) {
                          setDisplayedCards((prevCards) => {
                            const updatedCardsMap = new Map(
                              (
                                data.updatedCards as Array<{
                                  place_id: string;
                                  name: string;
                                  formatted_address?: string;
                                  rating?: number;
                                  user_ratings_total?: number;
                                  price_level?: number;
                                  types?: string[];
                                  distance_m?: number;
                                  clicked?: boolean;
                                  displayedAt?: string;
                                  affiliateUrl?: string;
                                  price?: string;
                                  duration?: string;
                                  isAffiliate?: boolean;
                                  reviews?: Array<{
                                    author_name: string;
                                    rating: number;
                                    text: string;
                                    relative_time_description: string;
                                    time: number;
                                  }>;
                                }>
                              ).map((card) => [card.place_id, card]),
                            );

                            const mergedCards = prevCards.map((card) => {
                              const updated = updatedCardsMap.get(
                                card.place_id,
                              );
                              if (updated) {
                                updatedCardsMap.delete(card.place_id);
                                return { ...card, ...updated };
                              }
                              return card;
                            });

                            updatedCardsMap.forEach((card) => {
                              mergedCards.push(card);
                            });

                            return mergedCards;
                          });
                        }

                        if (data.places && onPlacesUpdate) {
                          onPlacesUpdate(data.places);
                        }
                      } else if (event.type === "hooks") {
                        // Update places with hooks that were generated asynchronously
                        if (event.places && Array.isArray(event.places)) {
                          // Update data object so final update uses places with hooks
                          if (data) {
                            data.places = event.places;
                          } else {
                            data = {
                              response: streamedContent,
                              places: event.places,
                              functionResults: [],
                              updatedCards: undefined,
                            };
                          }
                          setMessages((prev) =>
                            prev.map((message) =>
                              message.id === assistantPlaceholderId
                                ? {
                                    ...message,
                                    places: event.places,
                                  }
                                : message,
                            ),
                          );
                          // Update displayed cards with hooks
                          if (onPlacesUpdate) {
                            onPlacesUpdate(event.places);
                          }
                        }
                      } else if (event.type === "done") {
                        // Streaming complete
                        break;
                      }
                    } catch (e) {
                      console.error("Error parsing SSE event:", e, line);
                    }
                  }
                }
              }

              // Ensure we have data object
              if (!data) {
                data = {
                  response: streamedContent,
                  places: [],
                  functionResults: [],
                  updatedCards: undefined,
                };
              }
            } else {
              // Fallback to non-streaming
              data = await response.json();
            }

            // Ensure all properties exist with safe defaults before accessing
            if (!data) {
              data = {
                response: streamedContent,
                places: [],
                functionResults: [],
                updatedCards: undefined,
              };
            }
            if (!data.response) {
              data.response = streamedContent;
            }
            if (!Array.isArray(data.places)) {
              data.places = [];
            }
            if (!Array.isArray(data.functionResults)) {
              data.functionResults = [];
            }

            // Final message update (for both streaming and non-streaming)
            setMessages((prev) => {
              const next = prev.map((message) =>
                message.id === assistantPlaceholderId
                  ? {
                      ...message,
                      content: data.response || streamedContent,
                      timestamp: new Date(),
                      isLoading: false,
                      isTyping: false,
                      typingSpeed: undefined,
                      places: data.places || [],
                      functionResults: data.functionResults || [],
                      statusUpdates: finalizeStatusUpdates(
                        message.statusUpdates,
                        Array.isArray(data.functionResults)
                          ? data.functionResults
                          : [],
                      ),
                    }
                  : message,
              );
              return next;
            });

            // Update displayedCards with review information if provided
            if (
              data.updatedCards &&
              Array.isArray(data.updatedCards) &&
              data.updatedCards.length > 0
            ) {
              setDisplayedCards((prevCards) => {
                const updatedCardsMap = new Map(
                  (
                    data.updatedCards as Array<{
                      place_id: string;
                      name: string;
                      formatted_address?: string;
                      rating?: number;
                      user_ratings_total?: number;
                      price_level?: number;
                      types?: string[];
                      distance_m?: number;
                      clicked?: boolean;
                      displayedAt?: string;
                      affiliateUrl?: string;
                      price?: string;
                      duration?: string;
                      isAffiliate?: boolean;
                      reviews?: Array<{
                        author_name: string;
                        rating: number;
                        text: string;
                        relative_time_description: string;
                        time: number;
                      }>;
                    }>
                  ).map((card) => [card.place_id, card]),
                );

                // Merge existing cards with updated cards
                const mergedCards = prevCards.map((card) => {
                  const updated = updatedCardsMap.get(card.place_id);
                  if (updated) {
                    updatedCardsMap.delete(card.place_id); // Remove from map to track new cards
                    return { ...card, ...updated }; // Merge with updated information
                  }
                  return card;
                });

                // Add any new cards that weren't in the previous list
                updatedCardsMap.forEach((card) => {
                  mergedCards.push(card);
                });

                return mergedCards;
              });
            }

            if (data.places && onPlacesUpdate) {
              onPlacesUpdate(data.places);
            }

            const activitySessionId = sessionIdRef.current || sessionId;
            if (activitySessionId) {
              onSessionActivity?.(activitySessionId, {
                lastActivityAt: new Date().toISOString(),
              });
            }
            }; // end sendWithSession

            if (!sessionIdRef.current) {
              throw new Error(
                "Chat session is not ready. Please create a new page and try again.",
              );
            }
            await sendWithSession(sessionIdRef.current);
          }
        } catch (error) {
          // Log error with additional context
          const errorCode = (error as any)?.errorCode;
          const errorDetails = {
            error,
            errorCode,
            message: error instanceof Error ? error.message : String(error),
            userId,
            sessionId,
          };
          console.error("Message send error:", errorDetails);

          // Extract error message, handling both Error objects and strings
          let errorContent =
            error instanceof Error
              ? error.message
              : "An error occurred. Please try again.";

          // Clean up error message: remove duplicate suggestions and format nicely
          // If message contains newlines, keep them for better formatting
          if (errorContent.includes("\n\n")) {
            // Message already has formatted suggestion, use as-is
          } else if (errorContent.length > 200) {
            // If message is too long, truncate and add ellipsis
            errorContent = errorContent.substring(0, 200) + "...";
          }

          if (usingDefaultFlow) {
            setMessages((prev) => {
              const next = prev.map((message) =>
                message.id === assistantPlaceholderId
                  ? {
                      ...message,
                      role: "system" as const,
                      content: errorContent,
                      timestamp: new Date(),
                      isLoading: false,
                      isTyping: false,
                      statusUpdates: message.statusUpdates
                        ? message.statusUpdates.map((status) => ({
                            ...status,
                            label:
                              FUNCTION_STATUS_TEXT[status.id]?.error ??
                              `An error occurred with ${status.label}`,
                            state: "error" as const,
                            finishedAt: new Date().toISOString(),
                          }))
                        : undefined,
                    }
                  : message,
              );
              return next;
            });
          } else {
            const errorMessage: Message = {
              id: `error-${Date.now()}`,
              role: "system",
              content: errorContent,
              timestamp: new Date(),
              isTyping: true,
              typingSpeed: 15,
            };

            setMessages((prev) => [...prev, errorMessage]);
            setPendingScrollMessageId(errorMessage.id);
          }
        } finally {
          setIsSending(false);
          setPendingAssistantMessageId(null);
        }
      },
      [
        messages,
        displayedCards,
        userId,
        accountToken,
        authAccessToken,
        isAuthenticated,
        onSendMessage,
        quizResults,
        userLocation,
        sessionId,
        onRecoverSession,
        onSessionActivity,
      ],
    );

    const handleDetailsClick = useCallback(
      async (place: any) => {
        if (!place?.place_id) return;

        const timestamp = Date.now();

        // Step 4: Generate and display user message
        const messageContent = `Tell me more about ${place.name}`;
        const userMessage: Message = {
          id: `user-${timestamp}`,
          role: "user",
          content: messageContent,
          timestamp: new Date(),
        };

        const historyMessages = messages.filter((msg) => !msg.isLoading);
        const updatedMessages = [...historyMessages, userMessage];
        setMessages((prev) => [...prev, userMessage]);
        setPendingScrollMessageId(userMessage.id);

        // Create placeholder message with loading state and status updates (same as handleSendMessage)
        const assistantPlaceholderId = `assistant-${timestamp}-pending`;
        const initialStatusUpdates = buildInitialStatusUpdates(messageContent);

        const placeholderMessage: Message = {
          id: assistantPlaceholderId,
          role: "assistant",
          content: "",
          timestamp: new Date(),
          isLoading: true,
          fullHeightPlaceholder: true,
          statusUpdates: initialStatusUpdates,
        };

        setMessages((prev) => [...prev, placeholderMessage]);
        setPendingAssistantMessageId(assistantPlaceholderId);
        setIsSending(true);

        // Step 10: Directly call getPlaceDetails API
        try {
          const detailsResponse = await fetch("/api/places/details", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              place_id: place.place_id,
            }),
          });

          let detailsData: any;

          if (!detailsResponse.ok) {
            // Try to get error details from response
            let errorMessage = "Failed to fetch place details";
            try {
              detailsData = await detailsResponse.json();
              errorMessage = detailsData.error || errorMessage;
              console.error("Place details API error:", {
                status: detailsResponse.status,
                statusText: detailsResponse.statusText,
                error: detailsData.error,
                place_id: place.place_id,
              });
            } catch (parseError) {
              console.error(
                "Place details API error (could not parse response):",
                {
                  status: detailsResponse.status,
                  statusText: detailsResponse.statusText,
                  place_id: place.place_id,
                  parseError,
                },
              );
            }
            throw new Error(errorMessage);
          }

          detailsData = await detailsResponse.json();

          if (!detailsData.success || !detailsData.place) {
            console.error(
              "Place details API returned invalid data:",
              detailsData,
            );
            throw new Error("Invalid response from place details API");
          }

          const placeDetails = detailsData.place;

          // Format the details into a readable message
          let detailsContent = `Here are the details for **${placeDetails.name || place.name}**:\n\n`;

          if (placeDetails.formatted_address) {
            detailsContent += `📍 **Address**: ${placeDetails.formatted_address}\n\n`;
          }

          if (placeDetails.rating !== undefined) {
            const rating = placeDetails.rating.toFixed(1);
            const reviewCount = placeDetails.user_ratings_total || 0;
            detailsContent += `⭐ **Rating**: ${rating} (${reviewCount} reviews)\n\n`;
          }

          if (placeDetails.price_level !== undefined) {
            const priceSymbols = ["$", "$$", "$$$", "$$$$"];
            const priceLevel =
              placeDetails.price_level >= 0 &&
              placeDetails.price_level < priceSymbols.length
                ? priceSymbols[placeDetails.price_level]
                : "";
            if (priceLevel) {
              detailsContent += `💰 **Price Level**: ${priceLevel}\n\n`;
            }
          }

          if (placeDetails.opening_hours?.open_now !== undefined) {
            detailsContent += `🕐 **Status**: ${placeDetails.opening_hours.open_now ? "Open Now" : "Closed"}\n\n`;
          }

          if (placeDetails.formatted_phone_number) {
            detailsContent += `📞 **Phone**: ${placeDetails.formatted_phone_number}\n\n`;
          }

          if (placeDetails.website) {
            detailsContent += `🌐 **Website**: ${placeDetails.website}\n\n`;
          }

          if (placeDetails.reviews && placeDetails.reviews.length > 0) {
            detailsContent += `📝 **Recent Reviews**:\n\n`;
            placeDetails.reviews
              .slice(0, 3)
              .forEach((review: any, index: number) => {
                detailsContent += `${index + 1}. ⭐${review.rating}/5 - ${review.text?.substring(0, 150)}${review.text?.length > 150 ? "..." : ""}\n\n`;
              });
          }

          // Create function result for status updates
          const functionResults = [
            {
              function: "get_place_details",
              result: {
                success: true,
                data: placeDetails,
              },
            },
          ];

          // Update placeholder message with final content and status updates
          setMessages((prev) =>
            prev.map((message) =>
              message.id === assistantPlaceholderId
                ? {
                    ...message,
                    content: detailsContent,
                    timestamp: new Date(),
                    isLoading: false,
                    isTyping: false,
                    places: placeDetails
                      ? [
                          {
                            place_id: placeDetails.place_id || place.place_id,
                            name: placeDetails.name || place.name,
                            formatted_address:
                              placeDetails.formatted_address ||
                              place.formatted_address,
                            rating: placeDetails.rating,
                            user_ratings_total: placeDetails.user_ratings_total,
                            price_level: placeDetails.price_level,
                            types: placeDetails.types || place.types,
                            photos: placeDetails.photos?.map((photo: any) => ({
                              photo_reference: photo.photo_reference,
                              height: photo.height,
                              width: photo.width,
                            })),
                            opening_hours: placeDetails.opening_hours,
                          },
                        ]
                      : undefined,
                    functionResults: functionResults,
                    statusUpdates: finalizeStatusUpdates(
                      message.statusUpdates,
                      functionResults,
                    ),
                  }
                : message,
            ),
          );

          setPendingScrollMessageId(assistantPlaceholderId);
          scrollToBottom();

          // Update displayed cards with details
          if (placeDetails) {
            setDisplayedCards((prevCards) => {
              const existingIndex = prevCards.findIndex(
                (card) => card.place_id === place.place_id,
              );

              if (existingIndex >= 0) {
                const updatedCards = [...prevCards];
                updatedCards[existingIndex] = {
                  ...updatedCards[existingIndex],
                  rating:
                    placeDetails.rating ?? updatedCards[existingIndex].rating,
                  user_ratings_total:
                    placeDetails.user_ratings_total ??
                    updatedCards[existingIndex].user_ratings_total,
                  reviews: placeDetails.reviews?.map((review: any) => ({
                    author_name: review.author_name,
                    rating: review.rating,
                    text: review.text,
                    relative_time_description: review.relative_time_description,
                    time: review.time,
                  })),
                };
                return updatedCards;
              }

              return prevCards;
            });
          }
        } catch (error) {
          console.error("Error fetching place details:", error);

          const errorContent =
            error instanceof Error
              ? error.message
              : "An error occurred. Please try again.";

          // Update placeholder message with error
          setMessages((prev) =>
            prev.map((message) =>
              message.id === assistantPlaceholderId
                ? {
                    ...message,
                    role: "assistant",
                    content: `Sorry, I couldn't fetch the details for ${place.name}. ${errorContent}`,
                    timestamp: new Date(),
                    isLoading: false,
                    isTyping: false,
                    statusUpdates: message.statusUpdates
                      ? message.statusUpdates.map((status) => ({
                          ...status,
                          label:
                            FUNCTION_STATUS_TEXT[status.id]?.error ??
                            `An error occurred with ${status.label}`,
                          state: "error" as const,
                          finishedAt: new Date().toISOString(),
                        }))
                      : undefined,
                  }
                : message,
            ),
          );

          setPendingScrollMessageId(assistantPlaceholderId);
          scrollToBottom();
        } finally {
          setIsSending(false);
          setPendingAssistantMessageId(null);
        }
      },
      [messages],
    );

    const [hasConsumedInitialDetail, setHasConsumedInitialDetail] =
      useState(false);

    useEffect(() => {
      if (!initialDetailPlace || hasConsumedInitialDetail) return;
      if (!initialDetailPlace.place_id) return;

      setHasConsumedInitialDetail(true);
      void handleDetailsClick(initialDetailPlace);
    }, [initialDetailPlace, hasConsumedInitialDetail, handleDetailsClick]);

    // Show the intro image whenever there are no messages yet, even while the session is loading
    const shouldShowIntroImage = messages.length === 0;
    const shouldApplyKeyboardOffset =
      keyboardOffset > 0 && isInputFocused;
    const layoutShrink =
      typeof window !== "undefined" ? getLayoutShrink() : 0;
    const keyboardInset = shouldApplyKeyboardOffset ? keyboardOffset : 0;
    const adjustedKeyboardInset = Math.max(0, keyboardInset - layoutShrink);
    const messagePaddingBottom = `calc(1.5rem + ${adjustedKeyboardInset}px)`;

    return (
      <div
        ref={rootRef}
        className="flex min-w-0 w-full flex-1 min-h-0 h-full bg-gray-50 overflow-hidden flex-col"
      >
        {/* Messages Area */}
        <div
          ref={messagesContainerRef}
          className="flex-1 min-w-0 overflow-y-auto overflow-x-hidden py-6"
          style={{
            scrollBehavior: "smooth",
            overscrollBehaviorY: "contain",
            overscrollBehaviorX: "none",
            paddingBottom: messagePaddingBottom,
            scrollPaddingBottom: `${adjustedKeyboardInset}px`,
          }}
          onClick={(e) => {
            // Check if click target is not a card or inside a card
            const target = e.target as HTMLElement;
            const isCardClick =
              target.closest("[data-place-card]") ||
              target.closest(".bg-white.rounded-lg.shadow-md") ||
              target.closest(".cursor-pointer");

            // If clicking outside cards, reset selection
            if (!isCardClick && onPlaceClick) {
              onPlaceClick(null);
            }
          }}
        >
          <div className="w-full max-w-full lg:max-w-4xl mx-auto px-3 sm:px-4 md:px-6 lg:px-8 pb-4 sm:pb-6">
            {shouldShowIntroImage && (
              <div className="flex min-h-[50vh] flex-col items-center justify-center gap-3 text-center">
                <Image
                  src="/images/Gappychatinitial.png"
                  alt="Gappyチャットの初期画面イメージ"
                  width={640}
                  height={640}
                  className="w-full max-w-md h-auto"
                  priority
                />
                <p className="text-2xl sm:text-3xl text-gray-700 font-semibold">
                  Explore world between plans
                </p>
              </div>
            )}

            <AnimatePresence mode="popLayout">
              {messages.map((message) => (
                <ChatMessage
                  key={message.id}
                  messageId={message.id}
                  role={message.role}
                  content={message.content}
                  timestamp={message.timestamp}
                  isTyping={message.isTyping}
                  typingSpeed={message.typingSpeed}
                  places={message.places}
                  onPlaceClick={handleCardSelect}
                  onDetailsClick={handleDetailsClick}
                  isLoading={message.isLoading}
                  fullHeightPlaceholder={message.fullHeightPlaceholder}
                  functionResults={message.functionResults}
                  statusUpdates={message.statusUpdates}
                  userAvatarUrl={userAvatarUrl}
                />
              ))}
            </AnimatePresence>

            {/* Loading Indicator */}
            {((isSending && !pendingAssistantMessageId) ||
              externalLoading ||
              isSessionLoading) && (
              <ChatMessage
                messageId="loading-indicator"
                role="assistant"
                content=""
                isLoading
              />
            )}

            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* Input Area (keyboard anchored) */}
        <div
          className="sticky bottom-0 left-0 right-0 border-t border-transparent pb-2"
          style={{
            bottom: shouldApplyKeyboardOffset
              ? adjustedKeyboardInset
              : undefined,
          }}
        >
          <ChatInput
            onSend={handleSendMessage}
            disabled={isSending || externalLoading || isSessionLoading}
            placeholder={placeholder}
            onFocusStateChange={handleInputFocusChange}
          />
        </div>

        {/* Scroll to Bottom Button */}
        {messages.length > 5 && !isUserNearBottom && (
          <motion.button
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            onClick={() => scrollToBottom()}
            className="fixed bottom-20 sm:bottom-24 right-4 sm:right-8 bg-white text-gray-600 p-2 sm:p-3 rounded-full shadow-lg hover:shadow-xl transition-shadow border border-gray-200 z-30"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={2}
              stroke="currentColor"
              className="w-5 h-5"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M19.5 13.5L12 21m0 0l-7.5-7.5M12 21V3"
              />
            </svg>
          </motion.button>
        )}
      </div>
    );
  },
);

ChatInterface.displayName = "ChatInterface";

export default ChatInterface;
