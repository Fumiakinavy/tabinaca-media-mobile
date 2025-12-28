import React, { useMemo, useState, useCallback } from "react";
import Head from "next/head";
import Link from "next/link";
import { useRouter } from "next/router";
import { serverSideTranslations } from "next-i18next/serverSideTranslations";
import { useTranslation } from "next-i18next";
import Header from "@/components/Header";
import HeroSection from "@/components/HeroSection";
import Footer from "@/components/Footer";
import SeoStructuredData from "@/components/SeoStructuredData";
import { useAccount } from "@/context/AccountContext";

import {
  usePageTransition,
  useStaggeredCardAnimation,
  useScrollAnimation,
} from "@/lib/useScrollAnimation";
import { buildHomeStructuredData } from "@/lib/structuredData";

interface HomeProps {
  // articles and experiences are no longer needed for home page
}

export default function Home({}: HomeProps) {
  const { t } = useTranslation("common");
  const router = useRouter();
  const { authState, authInitialized, requireAuth } = useAccount();
  const { isLoaded } = usePageTransition();
  const [isPersonalizeModalOpen, setIsPersonalizeModalOpen] = useState(false);
  const howToUseCardAnimation = useStaggeredCardAnimation({
    delay: 200,
    threshold: 0.2,
    staggerDelay: 200,
    hideDelay: 1200,
  });
  // モバイル対応: thresholdを下げて、rootMarginを調整
  const quizButtonAnimation = useScrollAnimation({
    delay: 200,
    threshold: 0.05, // モバイルでも確実にトリガーされるようにthresholdを下げる
    rootMargin: "0px 0px -20% 0px", // モバイル用に調整
  });
  const aiChatButtonAnimation = useScrollAnimation({
    delay: 200,
    threshold: 0.05, // モバイルでも確実にトリガーされるようにthresholdを下げる
    rootMargin: "0px 0px -20% 0px", // モバイル用に調整
  });

  const isSignedIn = authInitialized && authState === "authenticated";

  const handlePersonalizeClick = useCallback(() => {
    setIsPersonalizeModalOpen(true);
  }, []);

  const handleSignIn = useCallback(async () => {
    setIsPersonalizeModalOpen(false);
    await requireAuth();
  }, [requireAuth]);

  const handleGoQuiz = useCallback(() => {
    setIsPersonalizeModalOpen(false);
    router.push("/quiz");
  }, [router]);

  const handleAiChatClick = useCallback(
    (e: React.MouseEvent) => {
      if (!isSignedIn) {
        e.preventDefault();
        handlePersonalizeClick();
      }
    },
    [isSignedIn, handlePersonalizeClick],
  );

  const structuredData = useMemo(() => buildHomeStructuredData(), []);

  return (
    <>
      <Head>
        <title>Visit Japan & Tokyo: Travel Plans & Things to Do | Gappy</title>
        <meta
          name="description"
          content="Gappy - Discover authentic Japanese experiences in Shibuya. Book kimono dressing, goldfish scooping, sushi making, Shibuya tours, culinary experiences, and more with exclusive coupons. Transform your free time in Shibuya into unforgettable memories."
        />
        <meta
          name="keywords"
          content="Gappy, 渋谷, 日本体験, 着物体験, 金魚すくい, 寿司作り, 渋谷観光, 東京ツアー, 日本文化体験, 渋谷グルメ, 本格日本体験, 渋谷観光ツアー, 日本旅行, 東京観光, 渋谷体験, 日本文化, 渋谷フードツアー, 日本伝統体験, 渋谷観光スポット, 日本体験予約, 渋谷空き時間活用, 日本文化体験予約"
        />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/gappy_icon.png" type="image/png" />

        {/* Open Graph */}
        <meta
          property="og:title"
          content="Visit Japan & Tokyo: Travel Plans & Things to Do | Gappy"
        />
        <meta
          property="og:description"
          content="Gappy - Discover authentic Japanese experiences in Shibuya. Book kimono dressing, goldfish scooping, sushi making, Shibuya tours, culinary experiences, and more with exclusive coupons."
        />
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://gappytravel.com" />
        <meta property="og:image" content="https://gappytravel.com/images/hero.jpg" />
        <meta property="og:site_name" content="Gappy" />
        <meta property="og:locale" content="ja_JP" />

        {/* Twitter Card */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta
          name="twitter:title"
          content="Visit Japan & Tokyo: Travel Plans & Things to Do | Gappy"
        />
        <meta
          name="twitter:description"
          content="Discover authentic Japanese experiences in Shibuya. Book kimono dressing, goldfish scooping, sushi making, Shibuya tours, culinary experiences, and more with exclusive coupons."
        />
        <meta name="twitter:image" content="https://gappytravel.com/images/hero.jpg" />

        {/* Canonical URL */}
        <link rel="canonical" href="https://gappytravel.com" />

        {/* Language Alternates */}
        <link rel="alternate" href="https://gappytravel.com" hrefLang="ja" />
        <link rel="alternate" href="https://gappytravel.com/en" hrefLang="en" />
        <link rel="alternate" href="https://gappytravel.com/zh" hrefLang="zh" />
        <link rel="alternate" href="https://gappytravel.com/ko" hrefLang="ko" />
        <link rel="alternate" href="https://gappytravel.com/es" hrefLang="es" />
        <link rel="alternate" href="https://gappytravel.com/fr" hrefLang="fr" />

        <SeoStructuredData data={structuredData} />
      </Head>

      <Header />

      <main
        id="main-content"
        className={`page-transition ${isLoaded ? "show" : ""} overflow-x-hidden`}
      >
        <HeroSection />

        {/* Quiz Section */}
        <section id="quiz-section" className="py-12 sm:py-16 md:py-20 bg-white">
          <div className="container mx-auto px-4 sm:px-6">
            <div
              ref={quizButtonAnimation.elementRef}
              className={`max-w-4xl mx-auto text-center transition-all duration-700 ease-out ${
                quizButtonAnimation.isVisible
                  ? "translate-x-0 opacity-100"
                  : "-translate-x-full opacity-0"
              }`}
              style={{
                willChange: quizButtonAnimation.isVisible
                  ? "auto"
                  : "transform, opacity",
                backfaceVisibility: "hidden",
                WebkitBackfaceVisibility: "hidden",
              }}
            >
              <h2 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-gray-800 mb-4 sm:mb-6">
                Discover Your Travel Type
              </h2>
              <p className="text-lg sm:text-xl md:text-2xl text-gray-600 mb-8 sm:mb-10 leading-relaxed">
                Take our quick quiz to unlock personalized recommendations
                tailored to your travel style and preferences.
              </p>
              <Link
                href="/quiz"
                className="inline-flex items-center justify-center bg-[#36D879] text-white px-8 sm:px-12 md:px-16 py-4 sm:py-5 md:py-6 rounded-xl sm:rounded-2xl text-lg sm:text-xl md:text-2xl font-bold transition-all duration-300 transform hover:scale-105 hover:shadow-2xl shadow-lg hover:bg-[#2B9E5A]"
              >
                <span className="mr-3">Take the Quiz</span>
                <svg
                  className="w-6 h-6 sm:w-7 sm:h-7 md:w-8 md:h-8"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 5l7 7-7 7"
                  />
                </svg>
              </Link>
            </div>
          </div>
        </section>

        {/* AI Chat CTA Section */}
        <section
          id="ai-chat-cta"
          className="py-12 sm:py-16 md:py-20 bg-gradient-to-br from-[#36D879] via-[#2B9E5A] to-[#36D879]"
        >
          <div className="container mx-auto px-4 sm:px-6">
            <div
              ref={aiChatButtonAnimation.elementRef}
              className={`max-w-4xl mx-auto text-center transition-all duration-700 ease-out ${
                aiChatButtonAnimation.isVisible
                  ? "translate-x-0 opacity-100"
                  : "translate-x-full opacity-0"
              }`}
              style={{
                willChange: aiChatButtonAnimation.isVisible
                  ? "auto"
                  : "transform, opacity",
                backfaceVisibility: "hidden",
                WebkitBackfaceVisibility: "hidden",
              }}
            >
              <h2 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-4 sm:mb-6">
                Find Your Perfect Experience
              </h2>
              <p className="text-lg sm:text-xl md:text-2xl text-white/90 mb-8 sm:mb-10 leading-relaxed">
                Chat with our AI to discover personalized activities in Shibuya
                based on your interests, time, and preferences.
              </p>
              <Link
                href="/chat?action=new"
                onClick={handleAiChatClick}
                className="inline-flex items-center justify-center bg-white text-[#36D879] px-8 sm:px-12 md:px-16 py-4 sm:py-5 md:py-6 rounded-xl sm:rounded-2xl text-lg sm:text-xl md:text-2xl font-bold transition-all duration-300 transform hover:scale-105 hover:shadow-2xl shadow-lg"
              >
                <span className="mr-3">Start Gappy Chat</span>
                <svg
                  className="w-6 h-6 sm:w-7 sm:h-7 md:w-8 md:h-8"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M13 10V3L4 14h7v7l9-11h-7z"
                  />
                </svg>
              </Link>
            </div>
          </div>
        </section>

        {/* How To Use Gappy Section - Temporarily hidden */}
        {false && (
          <section id="how-to-use" className="py-6 sm:py-20 bg-white">
            <div className="container mx-auto px-4 sm:px-6">
              <div className="relative" ref={howToUseCardAnimation.ref}>
                <h2 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-center text-gray-800 mb-8 sm:mb-12 lg:mb-20">
                  How Gappy works
                </h2>
                <p className="text-base sm:text-lg md:text-xl text-gray-600 text-center mb-6 sm:mb-12 md:mb-14">
                  3 quick steps. Instant confirmation. Free cancel (24h).
                </p>

                {/* デスクトップ版: 横並びグリッド */}
                <div className="hidden sm:grid grid-cols-3 gap-4 md:gap-6 lg:gap-8 max-w-6xl mx-auto">
                  {/* Step 1: Pick your time */}
                  <div className="text-center">
                    <div className="bg-white/90 backdrop-blur-sm rounded-xl sm:rounded-2xl shadow-lg p-2.5 sm:p-3 md:p-4 lg:p-6 border border-gray-100">
                      <div className="bg-[#36D879] text-white rounded-full w-10 h-10 sm:w-12 sm:h-12 md:w-14 md:h-14 lg:w-16 lg:h-16 flex items-center justify-center mx-auto mb-1.5 sm:mb-2 md:mb-3 lg:mb-4 text-base sm:text-lg md:text-xl lg:text-2xl font-bold">
                        1
                      </div>
                      <div className="w-12 h-12 sm:w-14 sm:h-14 md:w-16 md:h-16 lg:w-20 lg:h-20 mx-auto mb-1.5 sm:mb-2 md:mb-3 lg:mb-4 text-[#36D879]">
                        <svg
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                        >
                          <circle cx="12" cy="12" r="10" />
                          <polyline points="12,6 12,12 16,14" />
                        </svg>
                      </div>
                      <h3 className="text-sm sm:text-base md:text-lg lg:text-xl font-semibold text-gray-900 mb-1 sm:mb-1.5 md:mb-2">
                        Pick your time
                      </h3>
                      <p className="text-gray-600 text-xs sm:text-sm md:text-base">
                        15-90 min
                      </p>
                    </div>
                  </div>

                  {/* Step 2: See nearby options */}
                  <div className="text-center">
                    <div className="bg-white/90 backdrop-blur-sm rounded-xl sm:rounded-2xl shadow-lg p-2.5 sm:p-3 md:p-4 lg:p-6 border border-gray-100">
                      <div className="bg-[#36D879] text-white rounded-full w-10 h-10 sm:w-12 sm:h-12 md:w-14 md:h-14 lg:w-16 lg:h-16 flex items-center justify-center mx-auto mb-1.5 sm:mb-2 md:mb-3 lg:mb-4 text-base sm:text-lg md:text-xl lg:text-2xl font-bold">
                        2
                      </div>
                      <div className="w-12 h-12 sm:w-14 sm:h-14 md:w-16 md:h-16 lg:w-20 lg:h-20 mx-auto mb-1.5 sm:mb-2 md:mb-3 lg:mb-4 text-[#36D879]">
                        <svg
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                        >
                          <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                          <circle cx="12" cy="10" r="3" />
                          <circle cx="12" cy="10" r="1" fill="currentColor" />
                        </svg>
                      </div>
                      <h3 className="text-sm sm:text-base md:text-lg lg:text-xl font-semibold text-gray-900 mb-1 sm:mb-1.5 md:mb-2">
                        See nearby options
                      </h3>
                      <p className="text-gray-600 text-xs sm:text-sm md:text-base">
                        starting soon
                      </p>
                    </div>
                  </div>

                  {/* Step 3: Book in 1 tap */}
                  <div className="text-center">
                    <div className="bg-white/90 backdrop-blur-sm rounded-xl sm:rounded-2xl shadow-lg p-2.5 sm:p-3 md:p-4 lg:p-6 border border-gray-100">
                      <div className="bg-[#36D879] text-white rounded-full w-10 h-10 sm:w-12 sm:h-12 md:w-14 md:h-14 lg:w-16 lg:h-16 flex items-center justify-center mx-auto mb-1.5 sm:mb-2 md:mb-3 lg:mb-4 text-base sm:text-lg md:text-xl lg:text-2xl font-bold">
                        3
                      </div>
                      <div className="w-12 h-12 sm:w-14 sm:h-14 md:w-16 md:h-16 lg:w-20 lg:h-20 mx-auto mb-1.5 sm:mb-2 md:mb-3 lg:mb-4 text-[#36D879]">
                        <svg
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                        >
                          <rect
                            x="5"
                            y="2"
                            width="14"
                            height="20"
                            rx="2"
                            ry="2"
                          />
                          <line x1="12" y1="18" x2="12.01" y2="18" />
                        </svg>
                      </div>
                      <h3 className="text-sm sm:text-base md:text-lg lg:text-xl font-semibold text-gray-900 mb-1 sm:mb-1.5 md:mb-2">
                        Book in 1 tap
                      </h3>
                    </div>
                  </div>
                </div>

                {/* モバイル版: 順次表示 + アニメ後に同領域で横並び表示 */}
                <div className="sm:hidden relative max-w-sm mx-auto h-40">
                  {/* アニメーション表示（順次） */}
                  <div
                    className={`absolute inset-0 transition-all duration-700 ${
                      howToUseCardAnimation.showSlider
                        ? "opacity-0 pointer-events-none"
                        : "opacity-100"
                    }`}
                  >
                    {/* Step 1: Pick your time */}
                    <div
                      className={`absolute inset-0 transition-all duration-400 ease-out ${
                        howToUseCardAnimation.currentCard === 0
                          ? "opacity-100 translate-y-0"
                          : "opacity-0 translate-y-4"
                      }`}
                      style={{ zIndex: 30 }}
                    >
                      <div className="bg-white/90 backdrop-blur-sm rounded-xl shadow-lg p-2.5 border border-gray-100 text-center">
                        <div className="bg-[#36D879] text-white rounded-full w-8 h-8 flex items-center justify-center mx-auto mb-1.5 text-sm font-bold">
                          1
                        </div>
                        <div className="w-8 h-8 mx-auto mb-1.5 text-[#36D879]">
                          <svg
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                          >
                            <circle cx="12" cy="12" r="10" />
                            <polyline points="12,6 12,12 16,14" />
                          </svg>
                        </div>
                        <h3 className="text-xs font-semibold text-gray-900">
                          Pick your time
                        </h3>
                      </div>
                    </div>

                    {/* Step 2: See nearby options */}
                    <div
                      className={`absolute inset-0 transition-all duration-400 ease-out ${
                        howToUseCardAnimation.currentCard === 1
                          ? "opacity-100 translate-y-0"
                          : "opacity-0 translate-y-4"
                      }`}
                      style={{ zIndex: 30 }}
                    >
                      <div className="bg-white/90 backdrop-blur-sm rounded-xl shadow-lg p-2.5 border border-gray-100 text-center">
                        <div className="bg-[#36D879] text-white rounded-full w-8 h-8 flex items-center justify-center mx-auto mb-1.5 text-sm font-bold">
                          2
                        </div>
                        <div className="w-8 h-8 mx-auto mb-1.5 text-[#36D879]">
                          <svg
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                          >
                            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                            <circle cx="12" cy="10" r="3" />
                            <circle cx="12" cy="10" r="1" fill="currentColor" />
                          </svg>
                        </div>
                        <h3 className="text-xs font-semibold text-gray-900">
                          See nearby options
                        </h3>
                      </div>
                    </div>

                    {/* Step 3: Book in 1 tap */}
                    <div
                      className={`absolute inset-0 transition-all duration-400 ease-out ${
                        howToUseCardAnimation.currentCard === 2
                          ? "opacity-100 translate-y-0"
                          : "opacity-0 translate-y-4"
                      }`}
                      style={{ zIndex: 30 }}
                    >
                      <div className="bg-white/90 backdrop-blur-sm rounded-xl shadow-lg p-2.5 border border-gray-100 text-center">
                        <div className="bg-[#36D879] text-white rounded-full w-8 h-8 flex items-center justify-center mx-auto mb-1.5 text-sm font-bold">
                          3
                        </div>
                        <div className="w-8 h-8 mx-auto mb-1.5 text-[#36D879]">
                          <svg
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                          >
                            <rect
                              x="5"
                              y="2"
                              width="14"
                              height="20"
                              rx="2"
                              ry="2"
                            />
                            <line x1="12" y1="18" x2="12.01" y2="18" />
                          </svg>
                        </div>
                        <h3 className="text-xs font-semibold text-gray-900">
                          Book in 1 tap
                        </h3>
                      </div>
                    </div>
                  </div>

                  {/* アニメ後の横並び（同領域に表示） */}
                  <div
                    className={`absolute inset-0 transition-all duration-700 ${
                      howToUseCardAnimation.showSlider
                        ? "opacity-100"
                        : "opacity-0 pointer-events-none"
                    }`}
                  >
                    <div className="flex w-full h-full items-center justify-center gap-3 px-2">
                      {/* Step 1 */}
                      <div className="flex-shrink-0 w-24">
                        <div className="bg-white/90 backdrop-blur-sm rounded-xl shadow-lg p-2.5 border border-gray-100 text-center">
                          <div className="bg-[#36D879] text-white rounded-full w-8 h-8 flex items-center justify-center mx-auto mb-1.5 text-sm font-bold">
                            1
                          </div>
                          <div className="w-8 h-8 mx-auto mb-1.5 text-[#36D879]">
                            <svg
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2"
                            >
                              <circle cx="12" cy="12" r="10" />
                              <polyline points="12,6 12,12 16,14" />
                            </svg>
                          </div>
                          <h3 className="text-[11px] font-semibold text-gray-900 leading-tight">
                            Pick time
                          </h3>
                        </div>
                      </div>

                      {/* Step 2 */}
                      <div className="flex-shrink-0 w-24">
                        <div className="bg-white/90 backdrop-blur-sm rounded-xl shadow-lg p-2.5 border border-gray-100 text-center">
                          <div className="bg-[#36D879] text-white rounded-full w-8 h-8 flex items-center justify-center mx-auto mb-1.5 text-sm font-bold">
                            2
                          </div>
                          <div className="w-8 h-8 mx-auto mb-1.5 text-[#36D879]">
                            <svg
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2"
                            >
                              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                              <circle cx="12" cy="10" r="3" />
                              <circle
                                cx="12"
                                cy="10"
                                r="1"
                                fill="currentColor"
                              />
                            </svg>
                          </div>
                          <h3 className="text-[11px] font-semibold text-gray-900 leading-tight">
                            See nearby
                          </h3>
                        </div>
                      </div>

                      {/* Step 3 */}
                      <div className="flex-shrink-0 w-24">
                        <div className="bg-white/90 backdrop-blur-sm rounded-xl shadow-lg p-2.5 border border-gray-100 text-center">
                          <div className="bg-[#36D879] text-white rounded-full w-8 h-8 flex items-center justify-center mx-auto mb-1.5 text-sm font-bold">
                            3
                          </div>
                          <div className="w-8 h-8 mx-auto mb-1.5 text-[#36D879]">
                            <svg
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2"
                            >
                              <rect
                                x="5"
                                y="2"
                                width="14"
                                height="20"
                                rx="2"
                                ry="2"
                              />
                              <line x1="12" y1="18" x2="12.01" y2="18" />
                            </svg>
                          </div>
                          <h3 className="text-[11px] font-semibold text-gray-900 leading-tight">
                            Book
                          </h3>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>
        )}
      </main>

      <Footer />

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
}

export async function getStaticProps({ locale }: { locale?: string }) {
  return {
    props: {
      ...(await serverSideTranslations(locale || "en", ["common"])),
    },
  };
}
