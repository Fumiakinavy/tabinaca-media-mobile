import React, { useState, useRef, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { useTranslation } from "next-i18next";

interface Article {
  title: string;
  slug: string;
  coverImage: string;
  summary?: string;
  date?: string;
  readTime?: string;
}

interface ArticlesCarouselProps {
  articles: Article[];
  className?: string;
}

export default function ArticlesCarousel({
  articles,
  className = "",
}: ArticlesCarouselProps) {
  const { t } = useTranslation("common");
  const [currentSlide, setCurrentSlide] = useState(0);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // スクロール位置を監視して現在のスライドを更新
  useEffect(() => {
    const handleScroll = () => {
      if (scrollContainerRef.current) {
        const scrollLeft = scrollContainerRef.current.scrollLeft;
        const slideWidth =
          scrollContainerRef.current.scrollWidth / articles.length;
        const newCurrentSlide = Math.round(scrollLeft / slideWidth);
        setCurrentSlide(newCurrentSlide);
      }
    };

    const scrollContainer = scrollContainerRef.current;
    if (scrollContainer) {
      scrollContainer.addEventListener("scroll", handleScroll);
      return () => scrollContainer.removeEventListener("scroll", handleScroll);
    }
  }, [articles.length]);

  // 特定のスライドにスクロール
  const goToSlide = (slideIndex: number) => {
    if (scrollContainerRef.current) {
      const slideWidth =
        scrollContainerRef.current.scrollWidth / articles.length;
      scrollContainerRef.current.scrollTo({
        left: slideIndex * slideWidth,
        behavior: "smooth",
      });
    }
  };

  return (
    <div className={`relative ${className}`}>
      <div
        ref={scrollContainerRef}
        className="flex gap-3 sm:gap-4 md:gap-5 lg:gap-6 overflow-x-auto pb-4 scrollbar-hide snap-x snap-mandatory"
      >
        <style>{`
          div::-webkit-scrollbar { display: none; }
        `}</style>

        {articles.map((article, i) => (
          <article
            key={article.slug}
            className="
              w-[200px] sm:w-[220px] md:w-[240px] lg:w-[280px] xl:w-[300px]
              snap-start shrink-0 rounded-2xl overflow-hidden
              shadow-md hover:shadow-lg transition-all duration-300
              transform hover:scale-105 hover:-translate-y-2 active:scale-95
              touch-manipulation bg-white
            "
            aria-roledescription="slide"
            aria-label={`${i + 1} / ${articles.length}`}
            style={{ animationDelay: `${i * 100}ms` }}
          >
            <Link
              href={`/articles/${article.slug}`}
              className="group block w-full"
            >
              {/* 画像セクション（上部） */}
              <div className="relative aspect-[16/10] w-full bg-neutral-100">
                <Image
                  src={
                    article.coverImage || "/images/placeholder-experience.jpg"
                  }
                  alt={article.title}
                  fill
                  className="object-cover object-center group-hover:scale-110 transition-transform duration-500"
                  sizes="(max-width: 640px) 200px, (max-width: 768px) 220px, (max-width: 1024px) 240px, (max-width: 1280px) 280px, 300px"
                  loading="eager"
                />
              </div>

              {/* テキストコンテンツセクション（下部・白背景） */}
              <div className="bg-white p-2.5 sm:p-3 md:p-4">
                <h3 className="font-semibold text-gray-900 text-sm sm:text-base line-clamp-2 group-hover:text-[#36D879] transition-colors">
                  {article.title}
                </h3>
                {article.readTime && (
                  <div className="mt-1.5 flex items-center gap-3 text-xs sm:text-sm text-neutral-700">
                    <span className="inline-flex items-center">
                      <svg
                        className="w-3.5 h-3.5 mr-1 text-[#4ADE80]"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <circle cx="12" cy="12" r="10" />
                        <polyline points="12,6 12,12 16,14" />
                      </svg>
                      <span className="font-bold text-[#4ADE80]">
                        {typeof article.readTime === "string"
                          ? /^\d+$/.test(article.readTime.trim())
                            ? `${article.readTime} min`
                            : article.readTime.replace(/['"]$/, "")
                          : article.readTime !== undefined &&
                              article.readTime !== null
                            ? `${article.readTime} min`
                            : ""}
                      </span>
                    </span>
                  </div>
                )}
              </div>
            </Link>
          </article>
        ))}
      </div>

      {/* ナビゲーションポッチ */}
      {articles.length > 1 && (
        <div className="flex justify-center mt-4 space-x-1.5 sm:space-x-2">
          {articles.map((_, index) => (
            <button
              key={index}
              onClick={() => goToSlide(index)}
              className={`w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full transition-all duration-300 ${
                index === currentSlide
                  ? "bg-[#36D879] scale-110 sm:scale-125"
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
