import { useState, useEffect, useRef } from "react";
import Image from "next/image";

interface ImageSliderProps {
  images: (string | { url: string; alt?: string; position?: string })[];
  alt: string;
  className?: string;
  imagePositions?: string[];
}

const ImageSlider = ({
  images,
  alt,
  className = "h-96",
  imagePositions,
}: ImageSliderProps) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isHovered, setIsHovered] = useState(false);
  const autoSlideRef = useRef<NodeJS.Timeout | null>(null);

  // タッチスワイプ用の状態
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const nextImage = () => {
    setCurrentIndex((prevIndex) =>
      prevIndex === images.length - 1 ? 0 : prevIndex + 1,
    );
  };

  const prevImage = () => {
    setCurrentIndex((prevIndex) =>
      prevIndex === 0 ? images.length - 1 : prevIndex - 1,
    );
  };

  const goToImage = (index: number) => {
    setCurrentIndex(index);
  };

  // タッチスワイプの最小距離
  const minSwipeDistance = 50;

  // タッチ開始
  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
    setIsDragging(true);
  };

  // タッチ移動
  const handleTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  // タッチ終了
  const handleTouchEnd = () => {
    if (!touchStart || !touchEnd) {
      setIsDragging(false);
      return;
    }

    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > minSwipeDistance;
    const isRightSwipe = distance < -minSwipeDistance;

    if (isLeftSwipe) {
      nextImage();
    } else if (isRightSwipe) {
      prevImage();
    }

    setIsDragging(false);
  };

  // 自動スライド機能
  useEffect(() => {
    if (images.length <= 1) return;

    if (isHovered) {
      // ホバー時に自動スライド開始
      autoSlideRef.current = setInterval(() => {
        setCurrentIndex((prevIndex) =>
          prevIndex === images.length - 1 ? 0 : prevIndex + 1,
        );
      }, 3000); // 3秒間隔
    } else {
      // ホバー解除時に自動スライド停止
      if (autoSlideRef.current) {
        clearInterval(autoSlideRef.current);
        autoSlideRef.current = null;
      }
    }

    return () => {
      if (autoSlideRef.current) {
        clearInterval(autoSlideRef.current);
      }
    };
  }, [isHovered, images.length]);

  if (images.length === 0) {
    return null;
  }

  if (images.length === 1) {
    const image = images[0];
    const imageUrl = typeof image === "string" ? image : image.url;
    const imageAlt = typeof image === "string" ? alt : image.alt || alt;
    const position =
      typeof image === "string"
        ? imagePositions?.[0] || "object-top"
        : image.position || imagePositions?.[0] || "object-top";

    return (
      <div className={`relative ${className} rounded-lg overflow-hidden`}>
        <Image
          src={imageUrl}
          alt={imageAlt}
          fill
          className={`object-cover ${position}`}
          priority={true}
        />
      </div>
    );
  }

  return (
    <div
      className={`relative ${className} rounded-lg overflow-hidden group ${isDragging ? "cursor-grabbing" : "cursor-grab"}`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* メイン画像 */}
      <Image
        src={
          typeof images[currentIndex] === "string"
            ? images[currentIndex]
            : images[currentIndex].url
        }
        alt={
          typeof images[currentIndex] === "string"
            ? `${alt} - ${currentIndex + 1}`
            : images[currentIndex].alt || `${alt} - ${currentIndex + 1}`
        }
        fill
        className={`object-cover transition-opacity duration-300 ${
          typeof images[currentIndex] === "string"
            ? imagePositions?.[currentIndex] || "object-top"
            : images[currentIndex].position ||
              imagePositions?.[currentIndex] ||
              "object-top"
        }`}
        priority={currentIndex === 0 ? true : false}
      />

      {/* 前の画像ボタン - スマホでは常に表示、デスクトップではホバー時のみ */}
      <button
        onClick={prevImage}
        className="absolute left-4 top-1/2 transform -translate-y-1/2 bg-black bg-opacity-50 hover:bg-opacity-70 text-white p-2 rounded-full opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity duration-200 z-10"
        aria-label="Previous image"
      >
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
            d="M15 19l-7-7 7-7"
          />
        </svg>
      </button>

      {/* 次の画像ボタン - スマホでは常に表示、デスクトップではホバー時のみ */}
      <button
        onClick={nextImage}
        className="absolute right-4 top-1/2 transform -translate-y-1/2 bg-black bg-opacity-50 hover:bg-opacity-70 text-white p-2 rounded-full opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity duration-200 z-10"
        aria-label="Next image"
      >
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
            d="M9 5l7 7-7 7"
          />
        </svg>
      </button>

      {/* インジケーター */}
      <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex space-x-2 z-10">
        {images.map((_, index) => (
          <button
            key={index}
            onClick={() => goToImage(index)}
            className={`w-2 h-2 rounded-full transition-colors duration-200 ${
              index === currentIndex
                ? "bg-white"
                : "bg-white bg-opacity-50 hover:bg-opacity-75"
            }`}
            aria-label={`Go to image ${index + 1}`}
          />
        ))}
      </div>

      {/* 画像カウンター */}
      <div className="absolute top-4 right-4 bg-black bg-opacity-50 text-white px-3 py-1 rounded-full text-sm z-10">
        {currentIndex + 1} / {images.length}
      </div>
    </div>
  );
};

export default ImageSlider;
