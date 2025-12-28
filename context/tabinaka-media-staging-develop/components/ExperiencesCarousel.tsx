import React, { useState, useRef, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import LikeButton from "./LikeButton";
import ExperienceMeta from "./ExperienceMeta";
import { useBatchRatings } from "@/hooks/useBatchRatings";

type ExperienceItem = {
  title: string;
  slug: string;
  coverImage: string;
  price?: number;
  duration?: string;
  googlePlaceId?: string;
};

type ExperiencesCarouselProps = {
  items: ExperienceItem[];
  cardWidthClasses?: string;
};

export default function ExperiencesCarousel({
  items,
  cardWidthClasses = "w-[240px] sm:w-[300px] md:w-[340px] lg:w-[360px]",
}: ExperiencesCarouselProps) {
  const [currentSlide, setCurrentSlide] = useState(0);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // 全てのgooglePlaceIdを収集
  const placeIds = items
    .map((item) => item.googlePlaceId)
    .filter((id): id is string => typeof id === "string" && id.length > 0);

  // バッチで評価情報を取得
  const { getRating } = useBatchRatings({
    placeIds,
    enabled: placeIds.length > 0,
  });

  // スクロール位置を監視して現在のスライドを更新
  useEffect(() => {
    const handleScroll = () => {
      if (scrollContainerRef.current) {
        const scrollLeft = scrollContainerRef.current.scrollLeft;
        const slideWidth =
          scrollContainerRef.current.scrollWidth / items.length;
        const newCurrentSlide = Math.round(scrollLeft / slideWidth);
        setCurrentSlide(newCurrentSlide);
      }
    };

    const scrollContainer = scrollContainerRef.current;
    if (scrollContainer) {
      scrollContainer.addEventListener("scroll", handleScroll);
      return () => scrollContainer.removeEventListener("scroll", handleScroll);
    }
  }, [items.length]);

  // 特定のスライドにスクロール
  const goToSlide = (slideIndex: number) => {
    if (scrollContainerRef.current) {
      const slideWidth = scrollContainerRef.current.scrollWidth / items.length;
      scrollContainerRef.current.scrollTo({
        left: slideIndex * slideWidth,
        behavior: "smooth",
      });
    }
  };

  return (
    <div className="relative">
      <div
        ref={scrollContainerRef}
        className="flex gap-3 overflow-x-auto pb-3 scrollbar-hide snap-x snap-mandatory"
      >
        <style>{`
          div::-webkit-scrollbar { display: none; }
        `}</style>

        {items.map((item, i) => (
          <article
            key={item.slug}
            className={
              `${cardWidthClasses} ` +
              "snap-start shrink-0 rounded-2xl overflow-hidden " +
              "shadow-md hover:shadow-lg transition-all duration-300 " +
              "transform hover:scale-105 hover:-translate-y-2 active:scale-95 " +
              "touch-manipulation bg-white"
            }
            aria-roledescription="slide"
            aria-label={`${i + 1} / ${items.length}`}
            style={{ animationDelay: `${i * 100}ms` }}
          >
            <Link
              href={`/experiences/${item.slug}`}
              className="group block w-full"
            >
              {/* 画像セクション（上部） */}
              <div className="relative aspect-[16/10] w-full bg-neutral-100">
                <Image
                  src={item.coverImage || "/images/placeholder-experience.jpg"}
                  alt={item.title}
                  fill
                  className="object-cover object-center group-hover:scale-110 transition-transform duration-500"
                  sizes="(max-width: 640px) 240px, (max-width: 768px) 300px, (max-width: 1024px) 340px, 360px"
                  loading="eager"
                />
                {/* いいねボタンを画像の右上角に配置 */}
                <div className="absolute top-2 right-2 z-10">
                  <LikeButton
                    activitySlug={item.slug}
                    source="card"
                    className="shadow-lg hover:shadow-xl transition-shadow duration-200"
                  />
                </div>
              </div>

              {/* テキストコンテンツセクション（下部・白背景） */}
              <div className="bg-white p-3">
                <h3 className="font-semibold text-gray-900 text-sm sm:text-base line-clamp-2 group-hover:text-[#36D879] transition-colors">
                  {item.title}
                </h3>
                <ExperienceMeta
                  price={item.price}
                  duration={item.duration}
                  googlePlaceId={item.googlePlaceId}
                  variant="card"
                  rating={
                    item.googlePlaceId
                      ? getRating(item.googlePlaceId)?.rating
                      : undefined
                  }
                  userRatingsTotal={
                    item.googlePlaceId
                      ? getRating(item.googlePlaceId)?.user_ratings_total
                      : undefined
                  }
                />
              </div>
            </Link>
          </article>
        ))}
      </div>

      {/* ナビゲーションポッチ */}
      {items.length > 1 && (
        <div className="flex justify-center mt-4 space-x-2">
          {items.map((_, index) => (
            <button
              key={index}
              onClick={() => goToSlide(index)}
              className={`w-2 h-2 rounded-full transition-all duration-300 ${
                index === currentSlide
                  ? "bg-[#36D879] scale-125"
                  : "bg-gray-300 hover:bg-gray-400"
              }`}
              aria-label={`Go to slide ${index + 1}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
