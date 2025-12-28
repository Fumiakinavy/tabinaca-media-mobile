import React, { useMemo } from "react";
import Link from "next/link";
import Image from "next/image";
import LikeButton from "./LikeButton";
import LazyGoogleMapsRating from "./LazyGoogleMapsRating";
import { useBatchRatings } from "@/hooks/useBatchRatings";

type Item = {
  id: string | number;
  title: string;
  price: string;
  duration: string;
  imageUrl: string;
  href?: string;
  googlePlaceId?: string;
  affiliateUrl?: string; // アフィリエイトリンク
};

export default function ExperienceGrid({ items }: { items: Item[] }) {
  // バッチ処理で評価情報を一括取得（API呼び出し最適化）
  const placeIds = useMemo(
    () => items.map((it) => it.googlePlaceId).filter(Boolean) as string[],
    [items],
  );
  const { ratings, getRating } = useBatchRatings({
    placeIds,
    enabled: placeIds.length > 0,
  });

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {items.map((it) => {
        const CardContent = (
          <div className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-xl transition-shadow h-full flex flex-col">
            {/* Image Area - Fixed height matching PlaceCard */}
            <div className="relative h-72 bg-gray-200">
              <Image
                src={it.imageUrl}
                alt={it.title}
                fill
                sizes="(max-width: 1024px) 100vw, 25vw"
                className="object-cover"
                loading="lazy"
              />

              {/* Like Button at Top Right */}
              <div className="absolute top-2 right-2 z-10">
                <LikeButton
                  activitySlug={it.id as string}
                  source="card"
                  className="shadow-lg hover:shadow-xl transition-shadow duration-200"
                />
              </div>

              {/* Overlay Badges */}
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 via-transparent to-transparent px-3 py-2 flex items-center justify-between">
                <div className="flex items-center gap-1">
                  {it.affiliateUrl && (
                    <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold text-white bg-purple-500">
                      体験
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-1">
                  <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold text-white bg-blue-500">
                    {it.duration}
                  </span>
                </div>
              </div>
            </div>

            {/* Content Area */}
            <div className="p-4 flex flex-col flex-1">
              <h3 className="text-xs font-semibold text-gray-900 mb-1 line-clamp-2">
                {it.title}
              </h3>

              {/* Price / Rating Row */}
              <div className="flex items-center justify-between mb-1.5">
                {/* Rating */}
                <div className="flex items-center gap-1.5 text-[11px]">
                  {it.googlePlaceId && (
                    <LazyGoogleMapsRating
                      placeId={it.googlePlaceId}
                      size="sm"
                      showCount={false}
                      className="text-xs"
                      rating={getRating(it.googlePlaceId)?.rating}
                      userRatingsTotal={
                        getRating(it.googlePlaceId)?.user_ratings_total
                      }
                    />
                  )}
                </div>
                {/* Price */}
                <div className="text-sm font-bold text-green-600">
                  {it.price}
                </div>
              </div>

              {/* Spacer */}
              <div className="flex-1" />

              {/* Footer Button */}
              <div className="mt-2">
                <div className="w-full rounded-lg bg-blue-600 px-3 py-1.5 text-[11px] font-semibold text-white shadow text-center hover:bg-blue-700 transition-colors">
                  {it.affiliateUrl ? "Book Now" : "View Details"}
                </div>
              </div>
            </div>
          </div>
        );

        return (
          <article key={it.id}>
            {it.affiliateUrl ? (
              <a
                href={it.affiliateUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="block h-full"
                onClick={(e) => {
                  e.stopPropagation();
                  if (typeof window !== "undefined" && (window as any).gtag) {
                    (window as any).gtag("event", "affiliate_click", {
                      experience_slug: it.id,
                      experience_title: it.title,
                      page_location: window.location.pathname,
                    });
                  }
                }}
              >
                {CardContent}
              </a>
            ) : (
              <Link href={it.href ?? "#"} className="block h-full">
                {CardContent}
              </Link>
            )}
          </article>
        );
      })}
    </div>
  );
}
