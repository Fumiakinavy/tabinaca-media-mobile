import React from "react";
import { Star } from "lucide-react";

export type ReviewCardProps = {
  overall: number; // 0〜5（小数可）
  review: string; // 200〜500文字想定、制限はUI側で折返し
  categories: {
    satisfaction: number; // 0〜5
    host: number; // 0〜5
    cost: number; // 0〜5
  };
  reviewer: {
    nationality: string; // 例: "🇺🇸" または "United States"
    travelStyle: string; // 例: "Solo" | "Couple" | "Family" | "Friends"
    ageGroup: string; // 例: "20s" | "30s"
  };
};

// 星評価の描画ヘルパー関数
const renderStars = (rating: number, size: "sm" | "md" | "lg" = "md") => {
  const clampedRating = Math.max(0, Math.min(5, rating));
  const fullStars = Math.floor(clampedRating);
  const hasHalfStar = clampedRating % 1 >= 0.5;

  const sizeClasses = {
    sm: "w-3 h-3",
    md: "w-4 h-4",
    lg: "w-5 h-5",
  };

  return (
    <div
      className="flex items-center gap-0.5"
      aria-label={`Rating: ${clampedRating} out of 5`}
    >
      {[...Array(5)].map((_, index) => {
        if (index < fullStars) {
          return (
            <Star
              key={index}
              className={`${sizeClasses[size]} fill-yellow-400 text-yellow-400`}
              aria-hidden="true"
            />
          );
        } else if (index === fullStars && hasHalfStar) {
          return (
            <div key={index} className="relative">
              <Star
                className={`${sizeClasses[size]} text-gray-300`}
                aria-hidden="true"
              />
              <Star
                className={`${sizeClasses[size]} fill-yellow-400 text-yellow-400 absolute top-0 left-0 overflow-hidden`}
                style={{ clipPath: "inset(0 50% 0 0)" }}
                aria-hidden="true"
              />
            </div>
          );
        } else {
          return (
            <Star
              key={index}
              className={`${sizeClasses[size]} text-gray-300`}
              aria-hidden="true"
            />
          );
        }
      })}
    </div>
  );
};

// 簡易辞書（将来的なi18n対応）
const labels = {
  satisfaction: "Experience Satisfaction",
  host: "Host Service",
  cost: "Cost Performance",
  overall: "Overall Rating",
};

const ReviewCard: React.FC<ReviewCardProps> = ({
  overall,
  review,
  categories,
  reviewer,
}) => {
  const clampedOverall = Math.max(0, Math.min(5, overall));
  const clampedCategories = {
    satisfaction: Math.max(0, Math.min(5, categories.satisfaction)),
    host: Math.max(0, Math.min(5, categories.host)),
    cost: Math.max(0, Math.min(5, categories.cost)),
  };

  return (
    <div className="bg-white rounded-2xl shadow-md p-4 sm:p-6 space-y-4">
      {/* 1. 総合評価 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            {renderStars(clampedOverall, "lg")}
            <span className="text-2xl font-bold text-gray-900">
              {clampedOverall.toFixed(1)}/5
            </span>
          </div>
        </div>
        <div className="text-sm text-gray-500">{labels.overall}</div>
      </div>

      {/* 2. 自由記述レビュー */}
      <div className="space-y-2">
        <p
          className="text-gray-700 leading-relaxed line-clamp-6"
          title={review}
        >
          {review}
        </p>
      </div>

      {/* 3. 項目別評価 */}
      <div className="space-y-3 pt-2 border-t border-gray-100">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-gray-600">
            {labels.satisfaction}
          </span>
          {renderStars(clampedCategories.satisfaction, "sm")}
        </div>

        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-gray-600">
            {labels.host}
          </span>
          {renderStars(clampedCategories.host, "sm")}
        </div>

        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-gray-600">
            {labels.cost}
          </span>
          {renderStars(clampedCategories.cost, "sm")}
        </div>
      </div>

      {/* 4. レビュワー属性 */}
      <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-gray-100">
        <span
          className="inline-flex items-center gap-1 rounded-full border border-gray-200 bg-gray-50 px-2 py-0.5 text-xs font-medium text-gray-700"
          title={reviewer.nationality}
        >
          {reviewer.nationality}
        </span>

        <span className="inline-flex items-center gap-1 rounded-full border border-blue-200 bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700">
          {reviewer.travelStyle}
        </span>

        <span className="inline-flex items-center gap-1 rounded-full border border-green-200 bg-green-50 px-2 py-0.5 text-xs font-medium text-green-700">
          {reviewer.ageGroup}
        </span>
      </div>
    </div>
  );
};

export default ReviewCard;
