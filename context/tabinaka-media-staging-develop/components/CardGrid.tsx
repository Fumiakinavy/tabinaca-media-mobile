import React, { useState, useEffect, useRef } from "react";
import Image from "next/image";
import Link from "next/link";

interface Location {
  lat: number;
  lng: number;
}

interface CardItem {
  title: string;
  slug: string;
  date: string;
  coverImage: string;
  summary: string;
  tags?: string[];
  location?: Location;
  price?: number;
  level?: string;
  duration?: string;
  couponCode?: string;
  discount?: string;
  eventTime?: string;
  venue?: string;
  distance?: number;
}

interface CardGridProps {
  items: CardItem[];
  type: "articles" | "experiences" | "events";
  userLocation?: Location;
}

// 行数検出用のカスタムフック
const useLineCount = (text: string) => {
  const [lineCount, setLineCount] = useState(1);
  const textRef = useRef<HTMLParagraphElement>(null);

  useEffect(() => {
    if (textRef.current) {
      const element = textRef.current;
      const lineHeight = parseInt(window.getComputedStyle(element).lineHeight);
      const height = element.scrollHeight;
      const lines = Math.round(height / lineHeight);
      setLineCount(lines);
    }
  }, [text]);

  return { lineCount, textRef };
};

// 個別のカードコンポーネント
const CardItem = ({
  item,
  type,
  userLocation,
  index,
}: {
  item: CardItem;
  type: "articles" | "experiences" | "events";
  userLocation?: Location;
  index: number;
}) => {
  const { lineCount, textRef } = useLineCount(item.summary);

  const getCardUrl = (slug: string) => `/${type}/${slug}`;

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("ja-JP", {
      style: "currency",
      currency: "JPY",
      minimumFractionDigits: 0,
    }).format(price);
  };

  const formatDistance = (distance: number) => {
    if (distance < 1000) {
      return `${Math.round(distance)}m`;
    }
    return `${(distance / 1000).toFixed(1)}km`;
  };

  const calculateWalkingTime = (distance: number) => {
    const walkingSpeed = 80; // m/min
    const minutes = Math.round(distance / walkingSpeed);
    return `${minutes}分`;
  };

  // 説明文が3行以上の場合は画像を大きく、2行以下の場合は小さく
  const imageHeightClass =
    lineCount >= 3
      ? "h-[96rem] sm:h-[104rem] lg:h-[96rem] xl:h-[104rem]"
      : "h-[72rem] sm:h-[80rem] lg:h-[72rem] xl:h-[80rem]";

  return (
    <Link key={`${item.slug}-${index}`} href={getCardUrl(item.slug)}>
      <div className="card-mobile group cursor-pointer h-full flex flex-col transition-all duration-300 active:scale-[0.98]">
        {/* Image */}
        <div
          className={`relative ${imageHeightClass} overflow-hidden rounded-t-xl`}
        >
          <Image
            src={item.coverImage || "/images/placeholder-experience.jpg"}
            alt={item.title}
            fill
            className="object-cover object-center group-hover:scale-105 transition-transform duration-300"
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
            priority={false}
            quality={90}
          />

          {/* Overlay badges */}
          <div className="absolute top-3 left-3 right-3 flex justify-between items-start">
            {item.discount && (
              <div className="bg-red-500 text-white px-3 py-1.5 rounded-full text-xs sm:text-sm font-semibold shadow-lg">
                {item.discount} OFF
              </div>
            )}

            {item.distance && userLocation && (
              <div className="bg-black/70 backdrop-blur-sm text-white px-3 py-1.5 rounded-full text-xs font-medium shadow-lg ml-auto">
                <div className="flex items-center gap-1">
                  <span>{formatDistance(item.distance)}</span>
                  <span>•</span>
                  <span>{calculateWalkingTime(item.distance)}</span>
                </div>
              </div>
            )}
          </div>

          {/* Type badge */}
          <div className="absolute top-3 right-3">
            {!item.distance && (
              <div className="bg-primary-500 text-white px-3 py-1.5 rounded-full text-xs font-semibold shadow-lg">
                {type === "articles" && "Article"}
                {type === "experiences" && "Experience"}
                {type === "events" && "Event"}
              </div>
            )}
          </div>
        </div>

        {/* Content */}
        <div className="p-4 sm:p-6 flex-1 flex flex-col">
          {/* Header */}
          <div className="flex justify-between items-start mb-3 gap-3">
            <h3 className="text-base sm:text-lg font-semibold text-gray-900 line-clamp-2 leading-tight flex-1">
              {item.title}
            </h3>
            {item.price && (
              <div className="flex-shrink-0">
                <span className="text-primary-600 font-bold text-lg sm:text-xl">
                  {formatPrice(item.price)}
                </span>
              </div>
            )}
          </div>

          {/* Summary - 行数検出用の非表示要素 */}
          <p
            ref={textRef}
            className="text-gray-600 text-sm sm:text-base mb-4 line-clamp-3 leading-relaxed flex-1 absolute opacity-0 pointer-events-none"
            style={{ position: "absolute", visibility: "hidden" }}
          >
            {item.summary}
          </p>

          {/* Summary - 実際の表示要素 */}
          <p className="text-gray-600 text-sm sm:text-base mb-4 line-clamp-3 leading-relaxed flex-1">
            {item.summary}
          </p>

          <div className="flex-1" />

          {/* Meta information - 必ずカード下部に表示 */}
          <div className="space-y-2 mb-4 mt-auto">
            {item.duration && (
              <div className="flex items-center text-xs sm:text-sm text-gray-500 touch-target">
                <svg
                  className="w-4 h-4 mr-2 flex-shrink-0"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                <span>{item.duration}</span>
              </div>
            )}

            {item.level && (
              <div className="flex items-center text-xs sm:text-sm text-gray-500 touch-target">
                <svg
                  className="w-4 h-4 mr-2 flex-shrink-0"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                <span>{item.level}</span>
              </div>
            )}

            {item.eventTime && (
              <div className="flex items-center text-xs sm:text-sm text-gray-500 touch-target">
                <svg
                  className="w-4 h-4 mr-2 flex-shrink-0"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                  />
                </svg>
                <span>{item.eventTime}</span>
              </div>
            )}

            {item.venue && (
              <div className="flex items-center text-xs sm:text-sm text-gray-500 touch-target">
                <svg
                  className="w-4 h-4 mr-2 flex-shrink-0"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                  />
                </svg>
                <span className="line-clamp-1">{item.venue}</span>
              </div>
            )}
          </div>

          {/* Tags */}
          {item.tags && item.tags.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-4">
              {item.tags.slice(0, 3).map((tag, tagIndex) => (
                <span
                  key={tagIndex}
                  className="bg-gray-100 text-gray-600 px-2 py-1 rounded-full text-xs font-medium"
                >
                  {tag}
                </span>
              ))}
              {item.tags.length > 3 && (
                <span className="bg-gray-100 text-gray-600 px-2 py-1 rounded-full text-xs font-medium">
                  +{item.tags.length - 3}
                </span>
              )}
            </div>
          )}

          {/* Coupon Code */}
          {item.couponCode && (
            <div className="bg-gradient-to-r from-primary-500 to-primary-600 text-white p-3 rounded-lg mb-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">クーポンコード</p>
                  <p className="text-lg font-bold">{item.couponCode}</p>
                </div>
                <svg
                  className="w-6 h-6"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z"
                  />
                </svg>
              </div>
            </div>
          )}
        </div>
      </div>
    </Link>
  );
};

const CardGrid = ({ items, type, userLocation }: CardGridProps) => {
  return (
    <div className="grid grid-cols-2 gap-4 sm:gap-6">
      {items.map((item, index) => (
        <CardItem
          key={`${item.slug}-${index}`}
          item={item}
          type={type}
          userLocation={userLocation}
          index={index}
        />
      ))}
    </div>
  );
};

export default CardGrid;
