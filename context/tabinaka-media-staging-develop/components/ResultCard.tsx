"use client";

import React from "react";
import { PlaceData } from "../lib/scoring/rank";
import { formatPriceLevel, formatDistance } from "../lib/maps/photos";
import { getCategoryFromTypes } from "../lib/placesHelpers";

// 場所のタイプに基づいて活動タグを生成
function getActivityTags(types: string[], category: string): string[] {
  const activityMap: { [key: string]: string[] } = {
    // レストラン・カフェ系
    restaurant: ["Dine", "Try local cuisine", "Enjoy meals"],
    cafe: ["Coffee", "Work", "Relax", "Meet friends"],
    bakery: ["Fresh bread", "Pastries", "Coffee"],
    bar: ["Drinks", "Socialize", "Nightlife"],
    meal_takeaway: ["Quick food", "Takeaway"],

    // エンターテイメント系
    amusement_park: ["Rides", "Games", "Family fun"],
    bowling_alley: ["Bowling", "Games", "Group activity"],
    movie_theater: ["Watch movies", "Entertainment"],
    casino: ["Gaming", "Entertainment", "Nightlife"],
    night_club: ["Dancing", "Music", "Nightlife"],

    // 文化・学習系
    museum: ["Learn", "Exhibits", "History", "Art"],
    art_gallery: ["View art", "Cultural experience", "Photography"],
    library: ["Read", "Study", "Quiet time"],
    tourist_attraction: ["Sightseeing", "Photos", "Explore"],

    // 自然・公園系
    park: ["Walk", "Nature", "Relax", "Picnic"],
    natural_feature: ["Nature", "Hiking", "Scenic views"],
    zoo: ["See animals", "Family fun", "Education"],
    aquarium: ["Marine life", "Education", "Family"],

    // ショッピング系
    shopping_mall: ["Shopping", "Dining", "Entertainment"],
    store: ["Shopping", "Browse"],
    department_store: ["Shopping", "Fashion", "Gifts"],

    // 健康・ウェルネス系
    spa: ["Relax", "Massage", "Wellness"],
    beauty_salon: ["Beauty", "Self-care", "Relaxation"],
    gym: ["Exercise", "Fitness", "Workout"],

    // 宗教・精神系
    church: ["Prayer", "Reflection", "Architecture"],
    hindu_temple: ["Prayer", "Culture", "Architecture"],
    mosque: ["Prayer", "Culture", "Architecture"],
    synagogue: ["Prayer", "Culture", "Architecture"],
    temple: ["Prayer", "Culture", "Architecture"],
    shrine: ["Prayer", "Culture", "Architecture"],

    // その他
    hospital: ["Medical care", "Emergency"],
    pharmacy: ["Medicine", "Health supplies"],
    gas_station: ["Fuel", "Convenience"],
    atm: ["Banking", "Cash"],
    bank: ["Banking", "Financial services"],
    post_office: ["Mail", "Packages", "Government services"],
  };

  const activities: string[] = [];

  // タイプに基づいて活動を追加
  types.forEach((type) => {
    if (activityMap[type]) {
      activities.push(...activityMap[type]);
    }
  });

  // カテゴリに基づいて追加の活動を追加
  const categoryActivities: { [key: string]: string[] } = {
    "Food & Dining": ["Eat", "Drink", "Socialize"],
    Entertainment: ["Have fun", "Enjoy", "Experience"],
    "Culture & Learning": ["Learn", "Explore", "Discover"],
    "Nature & Relaxation": ["Relax", "Unwind", "Connect with nature"],
    Shopping: ["Shop", "Browse", "Find unique items"],
  };

  if (categoryActivities[category]) {
    activities.push(...categoryActivities[category]);
  }

  // 重複を削除し、最大3個まで返す
  return Array.from(new Set(activities)).slice(0, 3);
}

interface ResultCardProps {
  place: PlaceData;
}

const ResultCard: React.FC<ResultCardProps> = ({ place }) => {
  const placeholderImage = "/images/placeholder-place.png";

  return (
    <div className="bg-white rounded-xl shadow-md overflow-hidden hover:shadow-lg transition-shadow duration-200">
      {/* Image */}
      <div className="relative h-48 bg-gray-200">
        {place.photo_url ? (
          <img
            src={place.photo_url}
            alt={place.name}
            className="w-full h-full object-cover"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-400">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-16 w-16"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
          </div>
        )}

        {/* Open Now Badge */}
        {place.open_now && (
          <div className="absolute top-1.5 right-1.5 bg-green-500 text-white text-[11px] font-semibold px-2 py-0.5 rounded-full">
            営業中
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-4">
        <h3 className="text-lg font-bold text-gray-900 mb-2 line-clamp-2">
          {place.name}
        </h3>

        <p className="text-sm text-gray-600 mb-3 line-clamp-1">
          {place.vicinity}
        </p>

        {/* Metadata */}
        <div className="flex items-center gap-2 mb-2 text-[12px]">
          {/* Rating */}
          {place.rating && (
            <div className="flex items-center gap-1">
              <span className="text-yellow-500 text-xs">★</span>
              <span className="font-semibold text-yellow-600">
                {place.rating.toFixed(1)}
              </span>
              {place.user_ratings_total && (
                <span className="text-[11px] text-gray-500">
                  ({place.user_ratings_total})
                </span>
              )}
            </div>
          )}

          {/* Price Level */}
          <div className="text-gray-700 font-medium">
            {formatPriceLevel(place.price_level)}
          </div>

          {/* Distance */}
          <div className="text-[11px] text-gray-600">
            📍 {formatDistance(place.distance_m)}
          </div>
        </div>

        {/* What you can do here */}
        <div className="mb-2">
          <div className="flex flex-wrap gap-1">
            {getActivityTags(
              place.types,
              getCategoryFromTypes(place.types),
            ).map((activity, index) => (
              <span
                key={index}
                className="px-1.5 py-0.5 bg-blue-100 text-blue-800 text-[10px] rounded-full leading-tight"
              >
                {activity}
              </span>
            ))}
          </div>
        </div>

        {/* Google Maps Button */}
        <a
          href={place.maps_url}
          target="_blank"
          rel="noopener noreferrer"
          className="block w-full py-2 px-3 bg-blue-600 text-white text-center font-semibold rounded-lg hover:bg-blue-700 transition-colors text-sm"
        >
          Google Mapsで開く
        </a>
      </div>
    </div>
  );
};

export default ResultCard;
