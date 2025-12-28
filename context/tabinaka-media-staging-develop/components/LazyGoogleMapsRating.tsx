import React, { useState, useRef, useEffect } from "react";
import GoogleMapsRating from "./GoogleMapsRating";

interface LazyGoogleMapsRatingProps {
  placeId: string;
  size?: "sm" | "md" | "lg";
  showCount?: boolean;
  className?: string;
  rating?: number;
  userRatingsTotal?: number;
}

/**
 * LazyGoogleMapsRating - Intersection Observerを使用して
 * ビューポート内に入った時のみGoogleMapsRatingを読み込むコンポーネント
 *
 * API呼び出しを最適化するため、画面外の要素はAPIを呼び出さない
 */
export default function LazyGoogleMapsRating({
  placeId,
  ...props
}: LazyGoogleMapsRatingProps) {
  const [isVisible, setIsVisible] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setIsVisible(true);
            // 一度表示されたら監視を停止
            observer.disconnect();
          }
        });
      },
      {
        // 50px手前で読み込み開始（ユーザー体験向上）
        rootMargin: "50px",
        // 10%以上見えたら読み込み
        threshold: 0.1,
      },
    );

    observer.observe(containerRef.current);

    return () => {
      observer.disconnect();
    };
  }, []);

  return (
    <div ref={containerRef} className={props.className}>
      {isVisible ? (
        <GoogleMapsRating placeId={placeId} {...props} />
      ) : (
        // プレースホルダー（ローディング状態）
        <div className="flex items-center space-x-2">
          <div className="h-4 w-20 bg-gray-200 animate-pulse rounded" />
        </div>
      )}
    </div>
  );
}
