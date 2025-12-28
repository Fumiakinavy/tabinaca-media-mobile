import { useState, useEffect, useCallback } from "react";
import Head from "next/head";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/router";
import { Experience, CategoryConfig } from "../types";
import ExperienceCard from "./ExperienceCard";
import Header from "./Header";
import Footer from "./Footer";
import { useTranslation } from "next-i18next";
import { TRAVEL_MOTIVATION_CATEGORIES } from "../config/categories";

interface MotivationViewProps {
  experiences: Experience[];
  category: string;
  categoryConfig: CategoryConfig;
  initialTotalCount: number;
}

export default function MotivationView({
  experiences: initialExperiences,
  category,
  categoryConfig,
  initialTotalCount,
}: MotivationViewProps) {
  const { t, ready } = useTranslation("common");
  const router = useRouter();
  const [experiences, setExperiences] = useState(initialExperiences);
  const [filteredExperiences, setFilteredExperiences] =
    useState(initialExperiences);

  // フィルター状態
  const [selectedDuration, setSelectedDuration] = useState<string | null>(null);
  const [showCouponOnly, setShowCouponOnly] = useState(false);

  // フィルタリング関数をuseCallbackでメモ化
  const filterExperiences = useCallback(() => {
    let filtered = [...experiences];

    // 時間フィルター
    if (selectedDuration) {
      filtered = filtered.filter((exp) => {
        if (!exp.duration) return false;
        const match = exp.duration.match(
          /(\d+)(?:\s*-\s*(\d+))?\s*(min|hour|h)?/i,
        );
        if (!match) return false;
        const minValue = parseInt(match[1], 10);
        const maxValue = match[2] ? parseInt(match[2], 10) : minValue;
        const unit = match[3]?.toLowerCase() || "min";
        const minMinutes = unit.startsWith("h") ? minValue * 60 : minValue;
        const maxMinutes = unit.startsWith("h") ? maxValue * 60 : maxValue;

        if (selectedDuration === "30m") return maxMinutes <= 30;
        if (selectedDuration === "1h")
          return minMinutes > 30 && maxMinutes <= 60;
        if (selectedDuration === "2h")
          return minMinutes > 60 && maxMinutes <= 120;
        if (selectedDuration === "3h") return minMinutes > 120;
        return true;
      });
    }

    // クーポンフィルター
    if (showCouponOnly) {
      filtered = filtered.filter((exp) => exp.couponCode);
    }

    setFilteredExperiences(filtered);
  }, [experiences, selectedDuration, showCouponOnly]);

  // フィルターが変更されたら再フィルタリング
  useEffect(() => {
    filterExperiences();
  }, [filterExperiences]);

  // categoryやexperiencesが変わったらstateを更新
  useEffect(() => {
    setExperiences(initialExperiences);
    // フィルター状態もリセット
    setSelectedDuration(null);
    setShowCouponOnly(false);
  }, [category, initialExperiences]);

  // ページ遷移時のクリーンアップ
  useEffect(() => {
    return () => {
      // コンポーネントがアンマウントされる際のクリーンアップ
      setExperiences([]);
      setFilteredExperiences([]);
      setSelectedDuration(null);
      setShowCouponOnly(false);
    };
  }, []);

  const handleCouponClick = (experience: Experience) => {
    if (typeof window !== "undefined" && (window as any).gtag) {
      (window as any).gtag("event", "experience_detail_click", {
        event_category: "engagement",
        event_label: experience.slug,
        category_page: category,
        value: 1,
      });
    }
    // window.location.hrefの代わりにNext.jsのルーターを使用
    router.push(`/experiences/${experience.slug}`);
  };

  const categoryDisplayName = t(
    `categories.${categoryConfig.id}.displayName`,
    categoryConfig.displayName,
  );
  const categoryCatchCopy = t(
    `categories.${categoryConfig.id}.catchCopy`,
    categoryConfig.catchCopy,
  );

  return (
    <div className="min-h-screen">
      <Head>
        <title>{`${categoryDisplayName} - Gappy Tabinaka Media`}</title>
        <meta
          name="description"
          content={`${categoryCatchCopy} | ${t("meta.shibuyaActivities")}`}
        />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link
          rel="canonical"
          href={`https://gappytravel.com/motivation/${category}`}
        />
      </Head>

      <Header />

      <main className="mt-20">
        {/* 直接ヒーローセクションを実装 */}
        <section className="relative w-full h-48 sm:h-56 md:h-80 flex items-center justify-center mb-6 sm:mb-8 overflow-hidden">
          <Image
            src={categoryConfig.bannerImage}
            alt={categoryDisplayName}
            fill
            className="object-cover"
            priority
          />
          {/* オーバーレイ */}
          <div className="absolute inset-0 bg-black/50" />

          {/* コンテンツ */}
          <div className="relative z-10 text-center pt-8 sm:pt-10 md:pt-16 px-4 sm:px-4">
            <h1
              className="text-3xl sm:text-3xl md:text-5xl font-bold mb-3 sm:mb-2"
              style={{
                color: "white",
                textShadow: "2px 2px 4px rgba(0,0,0,0.8)",
                WebkitTextFillColor: "white",
              }}
            >
              {categoryDisplayName}
            </h1>
            <p
              className="text-base sm:text-lg md:text-2xl"
              style={{
                color: "rgba(255, 255, 255, 0.9)",
                textShadow: "1px 1px 2px rgba(0,0,0,0.8)",
                WebkitTextFillColor: "rgba(255, 255, 255, 0.9)",
              }}
            >
              {categoryCatchCopy}
            </p>
          </div>
        </section>

        <div className="container mx-auto px-4 py-8 mb-12">
          <div className="mb-6">
            {/* フィルターボタン */}
            <div className="flex flex-wrap gap-1.5 mb-6">
              {/* 時間フィルター */}
              {[
                { label: "Up to 30 min", value: "30m" },
                { label: "30-60 min", value: "1h" },
                { label: "1-2 hours", value: "2h" },
                { label: "2+ hours", value: "3h" },
              ].map((option) => (
                <button
                  key={option.value}
                  className={`px-2 py-1.5 rounded-full border text-xs font-medium transition-all duration-200 ${
                    selectedDuration === option.value
                      ? "bg-primary-500 text-white border-primary-500"
                      : "bg-white text-gray-700 border-gray-300 hover:bg-primary-100"
                  }`}
                  onClick={() =>
                    setSelectedDuration(
                      selectedDuration === option.value ? null : option.value,
                    )
                  }
                >
                  {option.label}
                </button>
              ))}

              {/* クーポンフィルター */}
              <button
                className={`px-2 py-1.5 rounded-full border text-xs font-medium transition-all duration-200 ${
                  showCouponOnly
                    ? "bg-primary-500 text-white border-primary-500"
                    : "bg-white text-gray-700 border-gray-300 hover:bg-primary-100"
                }`}
                onClick={() => setShowCouponOnly(!showCouponOnly)}
              >
                {showCouponOnly ? "✓ " : ""}Coupon
              </button>

              {/* フィルターリセット */}
              {(selectedDuration || showCouponOnly) && (
                <button
                  className="text-sm text-gray-500 underline hover:text-gray-700"
                  onClick={() => {
                    setSelectedDuration(null);
                    setShowCouponOnly(false);
                  }}
                >
                  Clear
                </button>
              )}
            </div>
          </div>

          {filteredExperiences.length > 0 ? (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 sm:gap-4 lg:gap-6 mb-8">
                {filteredExperiences.map((experience) => (
                  <ExperienceCard
                    key={experience.slug}
                    experience={experience}
                  />
                ))}
              </div>
            </>
          ) : (
            <div className="text-center py-16 no-hero-styles filter-message-container">
              <h3
                className="filter-message-title text-xl font-semibold text-black mb-2"
                style={{ color: "black" }}
              >
                {filteredExperiences.length === 0 && experiences.length > 0
                  ? "No experiences match your filters"
                  : "No experiences available"}
              </h3>
              <p
                className="filter-message-text text-gray-700 mb-4"
                style={{ color: "#374151" }}
              >
                {filteredExperiences.length === 0 && experiences.length > 0
                  ? "Try adjusting your filters to see more options"
                  : "We're curating amazing experiences for you. Check back soon!"}
              </p>
              <h3
                className="filter-message-title text-xl font-semibold text-black mb-2"
                style={{ color: "black" }}
              >
                {ready
                  ? t("motivation.comingSoon.title", "Coming Soon")
                  : "Coming Soon"}
              </h3>
              <p
                className="filter-message-text text-gray-700"
                style={{ color: "#374151" }}
              >
                {ready
                  ? t(
                      "motivation.comingSoon.description",
                      "More experiences coming soon for this category",
                      {
                        category: categoryDisplayName,
                      },
                    )
                  : `More experiences coming soon for ${categoryDisplayName}`}
              </p>
            </div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}
