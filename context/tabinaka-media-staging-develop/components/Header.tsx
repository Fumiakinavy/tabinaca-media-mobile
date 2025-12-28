import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/router";
import { useTranslation } from "next-i18next";
import { sendSearchQuery, sendSearchExecute } from "@/lib/ga";
import { useAccount } from "@/context/AccountContext";
import { useQuizStatus } from "@/context/QuizStatusContext";

interface HeaderProps {
  forceWhite?: boolean;
  onMobileMenuToggle?: (isOpen: boolean) => void;
  onVisibilityChange?: (isVisible: boolean) => void;
}

type AuthState = "authenticated" | "guest" | "unknown" | null;

const useCachedAuthState = (
  authState: AuthState,
  authInitialized: boolean,
): {
  effectiveAuthState: AuthState;
  isSignedIn: boolean;
  effectiveAuthInitialized: boolean;
} => {
  const [cachedAuthState, setCachedAuthState] = useState<AuthState>(null);
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    setIsHydrated(true);
    try {
      const cached = window.localStorage.getItem("account/auth-state-cache");
      const expiryStr = window.localStorage.getItem(
        "account/auth-state-cache-expiry",
      );
      if (cached && expiryStr) {
        const expiry = parseInt(expiryStr, 10);
        const now = Date.now();
        if (
          !isNaN(expiry) &&
          now <= expiry &&
          (cached === "authenticated" || cached === "guest")
        ) {
          setCachedAuthState(cached as AuthState);
        }
      }
    } catch {
      // ignore cache errors
    }
  }, []);

  const effectiveAuthState = authInitialized
    ? authState
    : isHydrated && cachedAuthState
      ? cachedAuthState
      : authState;

  const effectiveAuthInitialized =
    authInitialized || (isHydrated && cachedAuthState !== null);

  return {
    effectiveAuthState,
    isSignedIn: effectiveAuthState === "authenticated",
    effectiveAuthInitialized,
  };
};

const useHeaderSearchControls = (router: ReturnType<typeof useRouter>) => {
  const [headerQuery, setHeaderQuery] = useState("");

  // URL の q を初期値に同期
  useEffect(() => {
    if (typeof router.query.q === "string") {
      setHeaderQuery(router.query.q);
    } else {
      setHeaderQuery("");
    }
  }, [router.query.q]);

  return { headerQuery, setHeaderQuery };
};

const Header = ({
  forceWhite: _forceWhite = false,
  onMobileMenuToggle,
  onVisibilityChange,
}: HeaderProps) => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isPersonalizeModalOpen, setIsPersonalizeModalOpen] = useState(false);
  const [isChatHeaderVisible, setIsChatHeaderVisible] = useState(false);
  const {
    accountId,
    supabaseAccessToken,
    refreshSession,
    authState,
    supabaseUser,
    requireAuth,
    resetToGuest,
    authInitialized,
  } = useAccount();
  const router = useRouter();
  const { t, ready, i18n } = useTranslation("common");
  const { requestOpenModal, quizResult } = useQuizStatus();

  const { effectiveAuthState, isSignedIn, effectiveAuthInitialized } =
    useCachedAuthState(authState, authInitialized);
  const user = supabaseUser;

  // ユーザーアバターURLを取得（Google OAuth は picture、他は avatar_url を使用）
  const userAvatarUrl = useMemo(() => {
    const metadata = user?.user_metadata as Record<string, unknown> | undefined;
    if (!metadata) {
      return null;
    }
    const candidates = [
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
  }, [user]);

  // アバター画像の読み込みエラー状態
  const [avatarError, setAvatarError] = useState(false);

  // ユーザーが変わったらエラー状態をリセット
  useEffect(() => {
    setAvatarError(false);
  }, [user?.id]);

  const headerAnimationClass = !effectiveAuthInitialized
    ? ""
    : isSignedIn
      ? "animate-header-signed-in"
      : "animate-header-signed-out";

  const { headerQuery, setHeaderQuery } = useHeaderSearchControls(router);

  // 翻訳の状態を管理
  const [translationState, setTranslationState] = useState({
    isReady: false,
    fallbackValues: {
      home: "Home",
      articles: "Articles",
      experiences: "Experiences",
      chat: "Gappy Chat",
      likes: "Likes",
    },
  });

  // スクロールイベントの最適化（throttle）
  useEffect(() => {
    let ticking = false;

    const handleScroll = () => {
      if (!ticking) {
        requestAnimationFrame(() => {
          setIsScrolled(window.scrollY > 0);
          ticking = false;
        });
        ticking = true;
      }
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // モバイルメニューが開いているときはスクロールを無効化
  useEffect(() => {
    if (isMobileMenuOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }

    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isMobileMenuOpen]);

  useEffect(() => {
    onMobileMenuToggle?.(isMobileMenuOpen);
  }, [isMobileMenuOpen, onMobileMenuToggle]);

  const isChatPage = router.pathname === "/chat";
  const shouldHideHeader = isChatPage && !isChatHeaderVisible;

  useEffect(() => {
    onVisibilityChange?.(!shouldHideHeader);
  }, [onVisibilityChange, shouldHideHeader]);

  useEffect(() => {
    if (isChatPage) {
      setIsChatHeaderVisible(false);
      setIsMobileMenuOpen(false);
      return;
    }
    setIsChatHeaderVisible(true);
  }, [isChatPage]);

  useEffect(() => {
    if (!isChatPage || !isChatHeaderVisible) {
      return;
    }
    if (isMobileMenuOpen) {
      return;
    }
    const timer = window.setTimeout(() => {
      setIsChatHeaderVisible(false);
    }, 5000);
    return () => window.clearTimeout(timer);
  }, [isChatHeaderVisible, isChatPage, isMobileMenuOpen]);

  const handleShowChatHeader = useCallback(() => {
    if (!isChatPage) {
      return;
    }
    setIsChatHeaderVisible(true);
  }, [isChatPage]);

  // 翻訳の準備状態を監視
  useEffect(() => {
    if (ready && typeof t === "function" && i18n.isInitialized) {
      // 現在の言語に基づいてデフォルト値を設定
      const currentLanguage = i18n.language || "en";
      const defaultValues = {
        en: {
          home: "Home",
          articles: "Articles",
          experiences: "Experiences",
          chat: "Gappy Chat",
          likes: "Likes",
        },
        ja: {
          home: "ホーム",
          articles: "記事",
          experiences: "体験",
          chat: "Gappyチャット",
          likes: "お気に入り",
        },
        ko: {
          home: "홈",
          articles: "기사",
          experiences: "체험",
          chat: "Gappy 채팅",
          likes: "좋아요",
        },
        zh: {
          home: "首页",
          articles: "文章",
          experiences: "体验",
          chat: "Gappy聊天",
          likes: "喜欢",
        },
        fr: {
          home: "Accueil",
          articles: "Articles",
          experiences: "Expériences",
          chat: "Gappy Chat",
          likes: "Favoris",
        },
        es: {
          home: "Inicio",
          articles: "Artículos",
          experiences: "Experiencias",
          chat: "Gappy Chat",
          likes: "Favoritos",
        },
      };

      const languageDefaults =
        defaultValues[currentLanguage as keyof typeof defaultValues] ||
        defaultValues.en;

      setTranslationState({
        isReady: true,
        fallbackValues: {
          home: t("header.home", languageDefaults.home),
          articles: t("header.articles", languageDefaults.articles),
          experiences: t("header.experiences", languageDefaults.experiences),
          chat: t("header.chat", languageDefaults.chat || "Chat"),
          likes: t("header.likes", languageDefaults.likes || "Likes"),
        },
      });
    }
  }, [ready, t, i18n.language, i18n.isInitialized]);

  // 翻訳が準備できているかチェック
  const isTranslationReady =
    ready && typeof t === "function" && i18n.isInitialized;

  // 現在の言語に基づいてデフォルト値を取得
  const getDefaultValue = (key: string) => {
    const currentLanguage = i18n.language || "en";
    const defaultValues = {
      en: {
        home: "Home",
        articles: "Articles",
        experiences: "Experiences",
        chat: "Gappy Chat",
        likes: "Likes",
      },
      ja: {
        home: "ホーム",
        articles: "記事",
        experiences: "体験",
        chat: "Gappyチャット",
        likes: "お気に入り",
      },
      ko: {
        home: "홈",
        articles: "기사",
        experiences: "체험",
        chat: "Gappy 채팅",
        likes: "좋아요",
      },
      zh: {
        home: "首页",
        articles: "文章",
        experiences: "体验",
        chat: "Gappy聊天",
        likes: "喜欢",
      },
      fr: {
        home: "Accueil",
        articles: "Articles",
        experiences: "Expériences",
        chat: "Gappy Chat",
        likes: "Favoris",
      },
      es: {
        home: "Inicio",
        articles: "Artículos",
        experiences: "Experiencias",
        chat: "Gappy Chat",
        likes: "Favoritos",
      },
    };

    const languageDefaults =
      defaultValues[currentLanguage as keyof typeof defaultValues] ||
      defaultValues.en;
    return (
      languageDefaults[key as keyof typeof languageDefaults] ||
      defaultValues.en[key as keyof typeof defaultValues.en]
    );
  };

  // 翻訳が準備できていない場合はデフォルト値を使用
  const getNavigationText = (key: string) => {
    if (isTranslationReady && translationState.isReady) {
      return (
        translationState.fallbackValues[
          key as keyof typeof translationState.fallbackValues
        ] || getDefaultValue(key)
      );
    }
    return getDefaultValue(key);
  };

  const chatHref = "/chat";

  const handlePersonalizeClick = useCallback(() => {
    setIsPersonalizeModalOpen(true);
  }, []);

  const handleGoQuiz = useCallback(() => {
    setIsPersonalizeModalOpen(false);
    router.push("/quiz");
  }, [router]);

  const ensureAccountSession = useCallback(async (): Promise<string | null> => {
    if (accountId) {
      return accountId;
    }

    await refreshSession();
    try {
      const response = await fetch("/api/account/session", {
        method: "GET",
        credentials: "include",
      });
      if (response.ok) {
        const data = await response.json();
        if (typeof data?.accountId === "string" && data.accountId.length > 0) {
          return data.accountId;
        }
      }
    } catch (error) {
      console.error("[Header] Failed to fetch account session", error);
    }

    return accountId ?? null;
  }, [accountId, refreshSession]);

  const handleSignIn = useCallback(async () => {
    setIsPersonalizeModalOpen(false);
    await requireAuth();
  }, [requireAuth]);

  const handleAvatarClick = useCallback(async () => {
    // Open quiz modal (includes loading quiz result + modal display)
    await requestOpenModal();
  }, [requestOpenModal]);

  const navigation = [
    {
      name: getNavigationText("home"),
      href: "/",
    },
    {
      name: getNavigationText("chat"),
      href: chatHref,
      isActive: router.pathname === "/chat",
    },
    {
      name: getNavigationText("experiences"),
      href: "/experiences",
    },
    {
      name: getNavigationText("likes"),
      href: "/liked-activities",
      isActive: router.pathname === "/liked-activities",
    },
  ];

  // experiencesページとliked-activitiesページで検索/保存操作を表示
  const shouldShowSearchControls =
    router.pathname === "/experiences" || router.pathname === "/liked-activities";

  return (
    <>
      {isChatPage && shouldHideHeader && (
        <button
          type="button"
          aria-label="Show header"
          onClick={handleShowChatHeader}
          onMouseEnter={handleShowChatHeader}
          className="fixed top-0 left-0 right-0 z-[60] h-4 pt-safe-top bg-transparent"
        />
      )}
      <header
        className={`fixed top-0 left-0 right-0 z-50 bg-white shadow-none border-b border-gray-200 transition-all duration-300 pt-safe-top ${headerAnimationClass} ${
          shouldHideHeader ? "hidden" : ""
        }`}
      >
        <div className="container mx-auto px-2 sm:px-6">
          <div className="flex items-center gap-2 sm:gap-4 h-16 sm:h-20">
            {/* Logo - より左に配置 */}
            <Link
              href="/"
              className="flex items-center space-x-2 sm:space-x-3 group touch-target flex-shrink-0"
            >
              <div className="w-10 h-10 sm:w-12 sm:h-12 lg:w-14 lg:h-14 relative transform transition-all duration-300 group-hover:scale-110 group-hover:rotate-12">
                <Image
                  src="/gappy_icon.png"
                  alt="Gappy Logo"
                  fill
                  className="object-contain drop-shadow-lg"
                  priority={true}
                />
              </div>
              <span className="font-bold text-xl sm:text-2xl lg:text-3xl transition-all duration-300 text-[#36D879] drop-shadow-sm group-hover:text-[#2B9E5A]">
                Gappy
              </span>
            </Link>

            {/* Desktop Navigation - 右端に配置 */}
            <nav className="hidden lg:flex items-center space-x-4 xl:space-x-6 ml-auto flex-shrink-0">
              {navigation.map((item, index) => {
                const isActive = item.isActive ?? router.pathname === item.href;
                const isChatItem = item.href === chatHref;
                const isChatDisabled = isChatItem && !isSignedIn;

                const linkContent = (
                  <span
                    className={`font-semibold text-base xl:text-lg transition-all duration-300 transform hover:scale-105 relative overflow-hidden px-4 py-2 rounded-lg touch-target ${
                      isChatDisabled
                        ? "text-gray-400 cursor-not-allowed"
                        : isActive
                          ? "text-[#36D879]"
                          : "text-gray-800 hover:text-[#2B9E5A] hover:bg-gray-100"
                    }`}
                    style={{ animationDelay: `${index * 100}ms` }}
                  >
                    <span className="relative z-10">{item.name}</span>
                    {!isChatDisabled && (
                      <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-[#36D879] text-[#36D879] transition-all duration-300 group-hover:w-full"></span>
                    )}
                  </span>
                );

                if (isChatDisabled) {
                  return (
                    <button
                      key={item.name}
                      onClick={handlePersonalizeClick}
                      className="relative group"
                      style={{ animationDelay: `${index * 100}ms` }}
                    >
                      {linkContent}
                      <div className="absolute top-full left-1/2 transform -translate-x-1/2 mt-2 px-3 py-2 bg-gray-900 text-white text-sm rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-50">
                        Sign in to use Gappy chat
                        <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 -mb-1 border-4 border-transparent border-b-gray-900"></div>
                      </div>
                    </button>
                  );
                }

                return (
                  <Link key={item.name} href={item.href} className="block">
                    {linkContent}
                  </Link>
                );
              })}

              {/* ログイン時のユーザー表示 */}
              {isSignedIn && user ? (
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2">
                    <div className="relative group">
                      <button
                        type="button"
                        onClick={handleAvatarClick}
                        className="relative rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#36D879] cursor-pointer"
                        aria-label={
                          quizResult
                            ? "View travel type result"
                            : "Open quiz modal"
                        }
                      >
                        {userAvatarUrl && !avatarError ? (
                          <Image
                            src={userAvatarUrl}
                            alt={
                              user.user_metadata?.name || user.email || "User"
                            }
                            width={32}
                            height={32}
                            className={`w-8 h-8 rounded-full ring-2 ${
                              quizResult ? "ring-[#36D879]" : "ring-gray-300"
                            }`}
                            onError={() => setAvatarError(true)}
                          />
                        ) : (
                          <div
                            className={`w-8 h-8 rounded-full ring-2 flex items-center justify-center bg-gray-200 text-gray-600 font-semibold text-sm ${
                              quizResult ? "ring-[#36D879]" : "ring-gray-300"
                            }`}
                          >
                            {(user.user_metadata?.name as string)
                              ?.charAt(0)
                              ?.toUpperCase() ||
                              user.email?.charAt(0)?.toUpperCase() ||
                              "U"}
                          </div>
                        )}
                      </button>
                      {/* Hover popup */}
                      <div className="absolute top-full left-1/2 transform -translate-x-1/2 mt-2 px-3 py-2 bg-gray-900 text-white text-xs rounded-lg whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50">
                        {quizResult ? (
                          <span>View quiz result</span>
                        ) : (
                          <span>No quiz result</span>
                        )}
                        <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 -mb-1">
                          <div className="w-2 h-2 bg-gray-900 rotate-45"></div>
                        </div>
                      </div>
                    </div>
                    <span className="text-sm text-gray-700 max-w-[100px] truncate">
                      {user.user_metadata?.name || user.email}
                    </span>
                  </div>
                </div>
              ) : (
                <button
                  onClick={handlePersonalizeClick}
                  className="px-6 py-2 rounded-lg bg-[#36D879] text-white font-semibold hover:bg-[#2B9E5A] transition-colors shadow-md"
                >
                  Sign in
                </button>
              )}
            </nav>

            {/* Mobile Menu Button */}
            <button
              className="lg:hidden touch-target-lg rounded-xl transition-all duration-300 hover:bg-white/10 active:scale-95 p-1 ml-auto flex-shrink-0"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  setIsMobileMenuOpen(!isMobileMenuOpen);
                }
              }}
              aria-label="Toggle mobile menu"
              aria-expanded={isMobileMenuOpen}
            >
              <div className="relative w-7 h-7">
                <span
                  className={`absolute top-1.5 left-0 w-7 h-0.5 transition-all duration-300 bg-gray-900 ${isMobileMenuOpen ? "rotate-45 top-3" : ""}`}
                />
                <span
                  className={`absolute top-3 left-0 w-7 h-0.5 transition-all duration-300 bg-gray-900 ${isMobileMenuOpen ? "opacity-0" : ""}`}
                />
                <span
                  className={`absolute top-4.5 left-0 w-7 h-0.5 transition-all duration-300 bg-gray-900 ${isMobileMenuOpen ? "-rotate-45 top-3" : ""}`}
                />
              </div>
            </button>
          </div>

          {/* experiences / liked-activities 向けの検索エリア */}
          {shouldShowSearchControls && (
            <div className="pb-3">
              <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-6 max-w-6xl mx-auto">
                {/* 検索ボックスとSavedボタン（デスクトップのみ表示） */}
                <div className="hidden lg:flex items-center gap-3">
                  <div className="flex items-center bg-white rounded-full shadow-lg ring-1 ring-gray-300 px-2 py-1 min-w-[320px]">
                    <div className="flex-1 px-3">
                      <input
                        type="text"
                        value={headerQuery}
                        onChange={(e) => setHeaderQuery(e.target.value)}
                        placeholder="Search experiences..."
                        className="w-full bg-transparent text-gray-900 placeholder-gray-500 focus:outline-none text-sm"
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            const trimmed = headerQuery.trim();
                            if (trimmed) {
                              const params = new URLSearchParams(
                                router.query as any,
                              );
                              params.set("q", trimmed);
                              router.replace(
                                {
                                  pathname: router.pathname,
                                  query: Object.fromEntries(params),
                                },
                                undefined,
                                { shallow: true },
                              );
                            }
                          }
                        }}
                      />
                    </div>
                    <button
                      onClick={() => {
                        const trimmed = headerQuery.trim();
                        if (trimmed) {
                          const params = new URLSearchParams(
                            router.query as any,
                          );
                          params.set("q", trimmed);
                          router.replace(
                            {
                              pathname: router.pathname,
                              query: Object.fromEntries(params),
                            },
                            undefined,
                            { shallow: true },
                          );
                        }
                      }}
                      className="px-4 py-1.5 bg-[#36D879] hover:bg-[#2B9E5A] text-white font-semibold text-sm rounded-full transition-all duration-200"
                    >
                      Search
                    </button>
                  </div>

                  {/* Saved ボタン（ログイン時のみ表示） */}
                  {user && (
                    <Link
                      href="/liked-activities"
                      className={`flex items-center gap-2 px-3 py-2 rounded-full shadow-lg ring-1 transition-colors ${
                        router.pathname === "/liked-activities"
                          ? "bg-pink-50 ring-pink-300 hover:bg-pink-100"
                          : "bg-white ring-gray-300 hover:bg-gray-50"
                      }`}
                    >
                      <svg
                        width="18"
                        height="18"
                        viewBox="0 0 24 24"
                        fill={
                          router.pathname === "/liked-activities"
                            ? "#ec4899"
                            : "none"
                        }
                        stroke={
                          router.pathname === "/liked-activities"
                            ? "#ec4899"
                            : "currentColor"
                        }
                        strokeWidth="2"
                        className={
                          router.pathname === "/liked-activities"
                            ? "text-pink-500"
                            : "text-red-500"
                        }
                      >
                        <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                      </svg>
                      <span
                        className={`text-sm font-medium ${
                          router.pathname === "/liked-activities"
                            ? "text-pink-600"
                            : "text-gray-700"
                        }`}
                      >
                        Saved
                      </span>
                    </Link>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </header>

      {/* ヘッダーの高さ分スペーサー（検索エリア含む） */}
      <div
        className={`${
          isChatPage
            ? "h-0"
            : shouldShowSearchControls
              ? "h-24 sm:h-24 md:h-32 lg:h-40"
              : "h-16 sm:h-20"
        }`}
      />

      {/* モバイルメニューオーバーレイ */}
      {isMobileMenuOpen && (
        <button
          type="button"
          aria-label="Close mobile menu overlay"
          onClick={() => setIsMobileMenuOpen(false)}
          className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm lg:hidden"
        />
      )}

      {/* モバイルメニュー本体 */}
      <div
        className={`fixed top-0 right-0 h-full w-80 max-w-[85vw] bg-gray-900/98 backdrop-blur-xl  z-50 lg:hidden transform transition-transform duration-300 ease-out ${
          isMobileMenuOpen ? "translate-x-0" : "translate-x-full"
        } pt-safe-top pb-safe-bottom overflow-y-auto`}
        aria-hidden={!isMobileMenuOpen}
      >
        <div className="p-6 min-h-full flex flex-col">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 relative">
                <Image
                  src="/gappy_icon.png"
                  alt="Gappy Logo"
                  fill
                  className="object-contain drop-shadow-lg"
                  sizes="40px"
                />
              </div>
              <span className="text-white text-xl font-bold">Gappy</span>
            </div>
            <button
              type="button"
              onClick={() => setIsMobileMenuOpen(false)}
              className="p-2 rounded-full hover:bg-white/10 transition-colors"
              aria-label="Close mobile menu"
            >
              <svg
                className="w-6 h-6 text-white"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>

          {/* Navigation Links */}
          <nav className="space-y-3 mb-6 flex-shrink-0">
            {navigation.map((item, index) => {
              const isActive = item.isActive ?? router.pathname === item.href;
              const isChatItem = item.href === chatHref;
              const isChatDisabled = isChatItem && !isSignedIn;

              if (isChatDisabled) {
                return (
                  <button
                    key={item.name}
                    onClick={() => {
                      handlePersonalizeClick();
                      setIsMobileMenuOpen(false);
                    }}
                    className={`flex w-full items-center gap-4 p-4 rounded-xl transition-all duration-200 touch-target-lg group text-left ${
                      isActive
                        ? "text-[#36D879] font-bold"
                        : "text-white hover:bg-gray-700 active:bg-gray-600 font-semibold"
                    }`}
                    style={{ animationDelay: `${index * 100}ms` }}
                  >
                    <span className="text-lg header-mobile-text-outline">
                      {item.name}
                    </span>
                  </button>
                );
              }

              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`flex w-full items-center gap-4 p-4 rounded-xl transition-all duration-200 touch-target-lg group text-left ${
                    isActive
                      ? "text-[#36D879] font-bold"
                      : "text-white hover:bg-gray-700 active:bg-gray-600 font-semibold"
                  }`}
                  onClick={() => setIsMobileMenuOpen(false)}
                  style={{ animationDelay: `${index * 100}ms` }}
                >
                  <span className="text-lg header-mobile-text-outline">
                    {item.name}
                  </span>
                </Link>
              );
            })}
          </nav>

          {/* ログイン/ユーザー情報 */}
          <div className="mt-auto pt-6 border-t border-gray-700">
            {isSignedIn && user ? (
              <div className="space-y-4">
                <div className="flex items-center gap-3 p-4 bg-gray-800 rounded-xl">
                  <div className="relative group">
                    <button
                      type="button"
                      onClick={() => {
                        handleAvatarClick();
                        setIsMobileMenuOpen(false);
                      }}
                      className="rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#36D879] cursor-pointer"
                      aria-label={
                        quizResult
                          ? "View travel type result"
                          : "Open quiz modal"
                      }
                    >
                      {userAvatarUrl && !avatarError ? (
                        <img
                          src={userAvatarUrl}
                          alt={user.user_metadata?.name || user.email}
                          className={`w-10 h-10 rounded-full ring-2 ${
                            quizResult ? "ring-[#36D879]" : "ring-gray-600"
                          }`}
                          onError={() => setAvatarError(true)}
                        />
                      ) : (
                        <div
                          className={`w-10 h-10 rounded-full ring-2 flex items-center justify-center bg-gray-600 text-white font-semibold text-base ${
                            quizResult ? "ring-[#36D879]" : "ring-gray-500"
                          }`}
                        >
                          {(user.user_metadata?.name as string)
                            ?.charAt(0)
                            ?.toUpperCase() ||
                            user.email?.charAt(0)?.toUpperCase() ||
                            "U"}
                        </div>
                      )}
                    </button>
                    {/* Hover popup (mobile) */}
                    <div className="absolute top-full left-1/2 transform -translate-x-1/2 mt-2 px-3 py-2 bg-gray-900 text-white text-xs rounded-lg whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50">
                      {quizResult ? (
                        <span>View quiz result</span>
                      ) : (
                        <span>No quiz result</span>
                      )}
                      <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 -mb-1">
                        <div className="w-2 h-2 bg-gray-900 rotate-45"></div>
                      </div>
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-white font-semibold truncate">
                      {user.user_metadata?.name || "User"}
                    </p>
                    <p className="text-gray-400 text-sm truncate">
                      {user.email}
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <button
                onClick={() => {
                  handlePersonalizeClick();
                  setIsMobileMenuOpen(false);
                }}
                className="w-full px-6 py-3 rounded-lg bg-[#36D879] text-white font-semibold hover:bg-[#2B9E5A] transition-colors shadow-md"
              >
                Sign in
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Personalize Modal */}
      {isPersonalizeModalOpen && (
        <>
          {/* Overlay */}
          <div
            className="fixed inset-0 bg-black/60 z-[90] animate-fade-in backdrop-blur-sm"
            onClick={() => setIsPersonalizeModalOpen(false)}
          />
          {/* Modal */}
          <div className="fixed inset-0 z-[100] flex items-center justify-center px-4">
            <div className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full p-8 sm:p-10 lg:p-12 animate-scale-in">
              <div className="text-center space-y-4">
                <h2 className="text-3xl font-bold text-gray-900">
                  Personalize Your Experience
                </h2>
                <p className="text-gray-600 leading-relaxed text-lg">
                  Take the quiz to unlock personalized Gappy chat and experience
                  exploration.
                </p>
                <div className="flex flex-col sm:flex-row sm:flex-wrap gap-4 justify-center">
                  <button
                    onClick={handleSignIn}
                    className="px-6 py-3 rounded-lg bg-white border-2 border-gray-300 text-gray-800 font-semibold hover:bg-gray-50 transition-colors shadow-md"
                  >
                    Sign in
                  </button>
                  <button
                    onClick={handleGoQuiz}
                    className="px-6 py-3 rounded-lg bg-[#36D879] text-white font-semibold hover:bg-[#2B9E5A] transition-colors shadow-md"
                  >
                    Go Quiz
                  </button>
                  <button
                    onClick={() => setIsPersonalizeModalOpen(false)}
                    className="px-6 py-3 rounded-lg bg-gray-200 text-gray-800 font-semibold hover:bg-gray-300 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </>
  );
};

export default Header;
