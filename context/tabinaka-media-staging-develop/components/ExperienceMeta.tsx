import React from "react";
import { useTranslation } from "next-i18next";
import GoogleMapsRating from "./GoogleMapsRating";

interface ExperienceMetaProps {
  price?: number;
  duration?: string;
  discount?: string;
  couponCode?: string;
  googlePlaceId?: string;
  showRatingCount?: boolean;
  variant?: "card" | "detail";
  className?: string;
  // 評価情報をpropsで受け取れるように（API呼び出しを回避）
  rating?: number;
  userRatingsTotal?: number;
}

const formatPrice = (price?: number) => {
  if (typeof price !== "number") {
    return null;
  }
  return `¥${price.toLocaleString("ja-JP")}`;
};

export const ExperienceMeta: React.FC<ExperienceMetaProps> = ({
  price,
  duration,
  discount,
  couponCode,
  googlePlaceId,
  showRatingCount = false,
  variant = "card",
  className = "",
  rating,
  userRatingsTotal,
}) => {
  const { t } = useTranslation("common");
  const priceLabel = formatPrice(price);

  const priceClasses =
    variant === "detail"
      ? "text-xl sm:text-2xl font-bold text-gray-900"
      : "text-base md:text-lg font-extrabold text-gray-900";

  const durationClasses =
    variant === "detail"
      ? "text-lg sm:text-xl font-bold text-[#4ADE80]"
      : "font-medium text-gray-600 text-xs sm:text-sm";

  const layoutClasses =
    variant === "detail"
      ? "flex items-center gap-6 flex-wrap"
      : "mt-2 flex items-center justify-between md:block";

  return (
    <div className={className}>
      <div className={layoutClasses}>
        {priceLabel && (
          <div className="flex items-center gap-2">
            <span className={priceClasses}>{priceLabel}</span>
            {variant === "card" && (
              <span className="ml-1 text-xs font-medium text-gray-500">
                {t("common.from", "from")}
              </span>
            )}
            {discount && (
              <span className="inline-flex items-center bg-red-500 text-white px-2 py-0.5 rounded-full text-xs font-semibold">
                {discount} OFF
              </span>
            )}
          </div>
        )}

        {duration && (
          <div className="flex items-center text-xs sm:text-sm text-gray-600 md:mt-1 gap-2">
            <svg
              className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0"
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
            <span className={durationClasses}>{duration}</span>
          </div>
        )}

        {googlePlaceId && (
          <div className="flex items-center">
            <GoogleMapsRating
              placeId={googlePlaceId}
              size={variant === "detail" ? "md" : "sm"}
              showCount={variant === "detail" || showRatingCount}
              className={variant === "detail" ? "text-sm" : "text-xs"}
              rating={rating}
              userRatingsTotal={userRatingsTotal}
            />
          </div>
        )}
      </div>

      <div className="mt-2 flex items-center gap-2">
        {couponCode && (
          <span className="inline-block bg-[#36D879] text-white px-2 py-0.5 rounded-full text-xs font-semibold">
            {t("pages.experience.getCoupon", "Get Coupon")}
          </span>
        )}
      </div>
    </div>
  );
};

export default ExperienceMeta;
