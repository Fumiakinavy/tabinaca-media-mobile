import { useState, useEffect, CSSProperties, useCallback, useRef } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/router";
import { useTranslation } from "next-i18next";
import Image from "next/image";
import { sendSearchQuery, sendSearchExecute } from "@/lib/ga";
import { useAccount } from "@/context/AccountContext";
import { useLocation } from "@/context/LocationContext";
import { searchTracker } from "@/lib/searchTracker";

const HeroSection = () => {
  const { t } = useTranslation("common");
  const router = useRouter();
  const { authState, authInitialized, requireAuth } = useAccount();
  const { userLocation, locationStatus, browserPermission } = useLocation();
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");
  const [particleStyles, setParticleStyles] = useState<CSSProperties[]>([]);
  const [isPersonalizeModalOpen, setIsPersonalizeModalOpen] = useState(false);
  const [pendingReturnTo, setPendingReturnTo] = useState<string | null>(null);
  const [animatedPlaceholder, setAnimatedPlaceholder] = useState("");
  const [placeholderIndex, setPlaceholderIndex] = useState(0);
  const [isTyping, setIsTyping] = useState(true);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const isSignedIn = authInitialized && authState === "authenticated";

  // 入力例の配列（自然な文章）
  const placeholderExamples = [
    "I want to go to a restaurant near Hachiko",
    "Find me a ramen shop",
    "Where can I visit a temple?",
    "I'd like to try a sauna",
    "Show me some art galleries",
    "I want to wear a kimono",
    "Where can I make sushi?",
    "Find a good cafe nearby",
    "I'm looking for a bookstore",
    "Recommend a bar in Shibuya",
    "Where can I buy souvenirs?",
    "I want to experience tea ceremony",
    "Find a place to relax",
    "Where can I see cherry blossoms?",
    "I want to try Japanese sweets",
    "Show me local street food",
  ];

  const openPersonalizeModal = useCallback((returnTo?: string) => {
    setPendingReturnTo(returnTo ?? null);
    setIsPersonalizeModalOpen(true);
  }, []);

  const closePersonalizeModal = useCallback(() => {
    setIsPersonalizeModalOpen(false);
    setPendingReturnTo(null);
  }, []);

  const handleSignIn = useCallback(async () => {
    const targetReturnTo = pendingReturnTo ?? undefined;
    closePersonalizeModal();
    await requireAuth(targetReturnTo);
  }, [closePersonalizeModal, pendingReturnTo, requireAuth]);

  const handleGoQuiz = useCallback(() => {
    closePersonalizeModal();
    router.push("/quiz");
  }, [closePersonalizeModal, router]);

  const handleSearch = async () => {
    const trimmed = searchQuery.trim();

    // ログインしていない場合はSign inモーダルを表示
    if (!isSignedIn) {
      const returnParams = new URLSearchParams({ action: "new" });
      if (trimmed) {
        returnParams.set("q", trimmed);
      }
      openPersonalizeModal(`/chat?${returnParams.toString()}`);
      return;
    }

    // GA4トラッキング
    if (trimmed) {
      sendSearchQuery(trimmed, "hero");
      sendSearchExecute(trimmed, undefined, "hero");
    } else {
      sendSearchExecute(trimmed, undefined, "hero");
    }

    // Supabase検索トラッキング
    if (trimmed) {
      await searchTracker.trackSearch({
        searchQuery: trimmed,
        searchSource: "hero",
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
          locationStatus,
          locationPermission: browserPermission,
        },
      });
    }

    // Gappy chatにリダイレクト（クエリパラメータで検索クエリを渡す）
    // HomeのGappy Chatボタンからは常に新しいセッションを作成
    if (trimmed) {
      const params = new URLSearchParams();
      params.set("q", trimmed);
      params.set("action", "new"); // 新しいセッションを作成
      router.push(`/chat?${params.toString()}`);
    } else {
      // クエリがない場合も新しいセッションを作成してchatページに遷移
      router.push("/chat?action=new");
    }
  };

  const articleImages = [
    "/images/articles/how-to-enjoy-shibuya.png",
    "/images/articles/navigating-japan-trendsetting-heart.png",
    "/images/articles/perfect-shibuya-half-day-tour-2025.png",
    "/images/articles/shibuya-area-guide-map.png",
    "/images/articles/shibuya-beginners-guide.png",
    "/images/articles/shibuya-crossing-view-guide-2025.png",
    "/images/articles/shibuya-station-master-guide-2025.png",
    "/images/articles/shibuya-street-style-guide.png",
    "/images/articles/unveiling-tokyo-magnets.png",
    "/images/articles/What to Do in Shibuya with Spare Time.png",
  ];

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentImageIndex((prev) => (prev + 1) % articleImages.length);
    }, 3000);

    return () => clearInterval(timer);
  }, [articleImages.length]);

  useEffect(() => {
    const styles = Array.from({ length: 50 }).map(() => ({
      left: `${Math.random() * 100}%`,
      animationDelay: `${Math.random() * 20}s`,
      animationDuration: `${20 + Math.random() * 10}s`,
    }));
    setParticleStyles(styles);
  }, []);

  // タイピングアニメーション
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const deletingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // ユーザーが入力中はアニメーションを停止
    if (searchQuery.length > 0) {
      setIsTyping(false);
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      if (deletingTimeoutRef.current) {
        clearTimeout(deletingTimeoutRef.current);
      }
      return;
    }

    setIsTyping(true);
    const currentExample = placeholderExamples[placeholderIndex];
    setAnimatedPlaceholder(""); // リセット

    // タイピング（文字を1つずつ追加）
    let charIndex = 0;
    const typeNextChar = () => {
      if (charIndex < currentExample.length) {
        setAnimatedPlaceholder(currentExample.slice(0, charIndex + 1));
        charIndex++;
        typingTimeoutRef.current = setTimeout(typeNextChar, 100); // タイピング速度
      } else {
        // 完全に表示されたら少し待ってから削除開始
        typingTimeoutRef.current = setTimeout(() => {
          // 削除（文字を1つずつ削除）
          let deleteIndex = currentExample.length;
          const deleteNextChar = () => {
            if (deleteIndex > 0) {
              setAnimatedPlaceholder(currentExample.slice(0, deleteIndex - 1));
              deleteIndex--;
              deletingTimeoutRef.current = setTimeout(deleteNextChar, 50); // 削除速度
            } else {
              // 次の例に移る
              setPlaceholderIndex(
                (prev) => (prev + 1) % placeholderExamples.length,
              );
            }
          };
          deleteNextChar();
        }, 2000); // 表示時間（2秒）
      }
    };

    typeNextChar();

    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      if (deletingTimeoutRef.current) {
        clearTimeout(deletingTimeoutRef.current);
      }
    };
  }, [placeholderIndex, searchQuery]);

  return (
    <>
      <section className="relative min-h-[60vh] sm:min-h-[65vh] md:min-h-[70vh] lg:min-h-[75vh] flex items-center justify-center overflow-hidden pt-safe-top pb-8 sm:pb-12 md:pb-16">
        {/* Background images */}
        <div className="absolute inset-0 z-0">
          <div className="relative w-full h-full">
            {articleImages.map((image, index) => (
              <div
                key={image}
                className={`absolute inset-0 transition-opacity duration-1000 ${index === currentImageIndex ? "opacity-100" : "opacity-0"
                  }`}
              >
                <Image
                  src={image}
                  alt={`Background ${index + 1}`}
                  fill
                  className="object-cover"
                  priority={index === 0}
                  quality={90}
                />
                <div className="absolute inset-0 bg-black/50" />
              </div>
            ))}
          </div>
        </div>

        {/* Particles effect */}
        <div className="absolute inset-0 z-0 overflow-hidden">
          <div className="particles-container">
            {particleStyles.map((style, i) => (
              <div key={i} className="particle" style={style} />
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="relative z-10 text-center text-white px-4 sm:px-6 lg:px-8 max-w-6xl mx-auto w-full">
          <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl xl:text-7xl font-bold mb-4 sm:mb-6 md:mb-8 px-2">
            Explore & start your journey
          </h1>



          {/* Search bar */}
          <div className="max-w-2xl mx-auto px-2">
            <div className="flex items-center bg-white rounded-full shadow-lg ring-1 ring-gray-300 px-2 sm:px-3 py-1.5 sm:py-2">
              <div className="flex-1 px-2 sm:px-4 min-w-0">
                <div className="relative w-full">
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder=""
                    className="w-full bg-transparent text-gray-900 focus:outline-none text-sm sm:text-base md:text-lg py-1 sm:py-2"
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        handleSearch();
                      }
                    }}
                    onFocus={() => setIsTyping(false)}
                    onBlur={() => {
                      if (searchQuery.length === 0) {
                        setIsTyping(true);
                      }
                    }}
                  />
                  {searchQuery.length === 0 && (
                    <div className="absolute inset-0 flex items-center pointer-events-none px-2 sm:px-4">
                      <span className="text-gray-500 text-sm sm:text-base md:text-lg truncate">
                        {isTyping ? (
                          <>
                            {animatedPlaceholder}
                            <span className="animate-pulse ml-0.5">|</span>
                          </>
                        ) : (
                          "What are you looking for?"
                        )}
                      </span>
                    </div>
                  )}
                </div>
              </div>
              <div className="relative group flex-shrink-0">
                <button
                  onClick={handleSearch}
                  className="px-4 sm:px-6 md:px-8 py-2 sm:py-2.5 md:py-3 font-bold text-xs sm:text-sm md:text-lg rounded-full transition-all duration-300 transform bg-[#36D879] hover:bg-[#2B9E5A] text-white hover:scale-105 active:scale-95 whitespace-nowrap"
                >
                  Gappy chat
                </button>
                {!isSignedIn && (
                  <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-4 py-2.5 bg-gray-900 text-white text-base rounded-lg whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none z-10">
                    Sign in to use Gappy chat
                    <div className="absolute top-full left-1/2 transform -translate-x-1/2 -mt-1 border-4 border-transparent border-t-gray-900"></div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {!isSignedIn && (
            <div className="mt-6 sm:mt-8 animate-slide-up">
              <button
                onClick={handleSignIn}
                className="px-8 py-3 rounded-full bg-white/20 hover:bg-white/30 backdrop-blur-md border border-white/40 text-white font-semibold text-lg transition-all duration-300 transform hover:scale-105 hover:shadow-lg active:scale-95 flex items-center gap-2 mx-auto group"
              >
                <span>Sign in</span>
                <span className="group-hover:translate-x-1 transition-transform duration-200">→</span>
              </button>
            </div>
          )}
        </div>

        {/* Scroll indicator removed */}

        <style jsx>{`
          .particles-container {
            position: absolute;
            width: 100%;
            height: 100%;
            overflow: hidden;
          }

          .particle {
            position: absolute;
            width: 2px;
            height: 2px;
            background: rgba(255, 255, 255, 0.5);
            border-radius: 50%;
            animation: float linear infinite;
          }

          @keyframes float {
            0% {
              transform: translateY(100vh) rotate(0deg);
              opacity: 0;
            }
            10% {
              opacity: 1;
            }
            90% {
              opacity: 1;
            }
            100% {
              transform: translateY(-100px) rotate(360deg);
              opacity: 0;
            }
          }
        `}</style>
      </section>

      {/* Personalize Modal - セクション外に配置 */}
      {isPersonalizeModalOpen && mounted && createPortal(
        <>
          {/* Overlay */}
          <div
            className="fixed inset-0 bg-black/60 z-[90] animate-fade-in backdrop-blur-sm"
            onClick={closePersonalizeModal}
          />
          {/* Modal */}
          <div className="fixed inset-0 z-[100] flex items-center justify-center px-4">
            <div className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full p-8 sm:p-10 lg:p-12 animate-scale-in">
              <div className="text-center space-y-4">
                <h2 className="text-3xl font-bold text-gray-900">
                  Personalize Your Experience
                </h2>
                <p className="text-gray-600 leading-relaxed text-lg">
                  Take the quiz to unlock personalized AI chat and experience
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
                    onClick={closePersonalizeModal}
                    className="px-6 py-3 rounded-lg bg-gray-200 text-gray-800 font-semibold hover:bg-gray-300 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </div>
        </>,
        document.body
      )}
    </>
  );
};

export default HeroSection;
