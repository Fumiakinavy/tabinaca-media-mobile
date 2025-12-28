import React, { ReactNode, useRef } from "react";

interface HorizontalSliderProps {
  children: ReactNode;
  className?: string;
  showArrows?: boolean;
  arrowPosition?: "inside" | "outside";
}

const HorizontalSlider: React.FC<HorizontalSliderProps> = ({
  children,
  className = "",
  showArrows = true,
  arrowPosition = "inside",
}) => {
  const containerRef = useRef<HTMLDivElement>(null);

  const handleScroll = (direction: "left" | "right") => {
    if (containerRef.current) {
      const scrollAmount = 300; // スクロール量
      const currentScroll = containerRef.current.scrollLeft;
      const newScroll =
        direction === "left"
          ? currentScroll - scrollAmount
          : currentScroll + scrollAmount;

      containerRef.current.scrollTo({
        left: newScroll,
        behavior: "smooth",
      });
    }
  };

  return (
    <div className={`relative group ${className}`}>
      {showArrows && (
        <>
          {/* 左矢印 */}
          <button
            className={`absolute ${arrowPosition === "inside" ? "left-2" : "-left-12"} top-1/2 -translate-y-1/2 z-10 w-10 h-10 bg-white/90 backdrop-blur-sm rounded-full shadow-lg flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200 hover:bg-white`}
            onClick={() => handleScroll("left")}
            aria-label="Scroll left"
          >
            <svg
              className="w-5 h-5 text-gray-700"
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

          {/* 右矢印 */}
          <button
            className={`absolute ${arrowPosition === "inside" ? "right-2" : "-right-12"} top-1/2 -translate-y-1/2 z-10 w-10 h-10 bg-white/90 backdrop-blur-sm rounded-full shadow-lg flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200 hover:bg-white`}
            onClick={() => handleScroll("right")}
            aria-label="Scroll right"
          >
            <svg
              className="w-5 h-5 text-gray-700"
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
        </>
      )}

      <div
        ref={containerRef}
        className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide px-2"
        style={{
          scrollbarWidth: "none",
          msOverflowStyle: "none",
          scrollBehavior: "smooth",
        }}
      >
        {children}
      </div>
    </div>
  );
};

export default HorizontalSlider;
