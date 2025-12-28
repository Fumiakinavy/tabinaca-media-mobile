import React from "react";
import { motion } from "framer-motion";
import Image from "next/image";
import Link from "next/link";

interface AffiliateCardProps {
  title: string;
  description?: string;
  imageUrl?: string;
  affiliateUrl: string;
  price?: string;
  discount?: string;
  badge?: string;
  className?: string;
}

export const AffiliateCard: React.FC<AffiliateCardProps> = ({
  title,
  description,
  imageUrl,
  affiliateUrl,
  price,
  discount,
  badge,
  className = "",
}) => {
  const handleClick = () => {
    // トラッキング用のイベント送信（オプション）
    if (typeof window !== "undefined" && (window as any).gtag) {
      (window as any).gtag("event", "affiliate_click", {
        affiliate_url: affiliateUrl,
        title,
      });
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={`bg-white rounded-lg shadow-md overflow-hidden hover:shadow-xl transition-shadow ${className}`}
    >
      <Link
        href={affiliateUrl}
        target="_blank"
        rel="noopener noreferrer"
        onClick={handleClick}
        className="block"
      >
        {/* Image */}
        <div className="relative h-72 bg-gray-200">
          {imageUrl ? (
            <Image
              src={imageUrl}
              alt={title}
              fill
              className="object-cover"
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-purple-100 to-purple-200" />
          )}

          {/* Badges */}
          <div className="absolute top-3 left-3 right-3 flex justify-between items-start">
            {discount && (
              <div className="bg-red-500 text-white px-3 py-1.5 rounded-full text-xs font-semibold shadow-lg">
                {discount} OFF
              </div>
            )}
            {badge && (
              <div className="bg-purple-500 text-white px-3 py-1.5 rounded-full text-xs font-semibold shadow-lg ml-auto">
                {badge}
              </div>
            )}
          </div>
        </div>

        {/* Content */}
        <div className="p-4">
          <h3 className="text-sm font-semibold text-gray-900 mb-2 line-clamp-2">
            {title}
          </h3>

          {description && (
            <p className="text-xs text-gray-600 mb-3 line-clamp-2">
              {description}
            </p>
          )}

          <div className="flex items-center justify-between">
            {price && (
              <div className="text-sm font-bold text-gray-900">{price}</div>
            )}
            <div className="flex items-center gap-1 text-xs text-purple-600 font-semibold">
              <span>予約する</span>
              <svg
                className="w-4 h-4"
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
            </div>
          </div>
        </div>
      </Link>
    </motion.div>
  );
};

export default AffiliateCard;
