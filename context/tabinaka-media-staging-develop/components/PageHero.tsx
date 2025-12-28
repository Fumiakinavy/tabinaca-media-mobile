import React from "react";
import Image from "next/image";

interface PageHeroProps {
  title: string;
  subtitle?: string;
  backgroundImage: string;
  backgroundAlt?: string;
  height?: "small" | "medium" | "large";
  overlayType?: "glass" | "dark" | "gradient";
  className?: string;
}

const PageHero: React.FC<PageHeroProps> = ({
  title,
  subtitle,
  backgroundImage,
  backgroundAlt,
  height = "medium",
  overlayType = "glass",
  className = "",
}) => {
  const heightClasses = {
    small: "h-48 sm:h-56 md:h-80",
    medium: "h-56 sm:h-64 md:h-96",
    large: "h-64 sm:h-80 md:h-[500px]",
  };

  const overlayClasses = {
    glass: "bg-white/35 backdrop-blur-sm",
    dark: "bg-black/40",
    gradient: "bg-gradient-to-b from-black/40 via-black/50 to-black/60",
  };

  return (
    <section
      className={`relative w-full ${heightClasses[height]} flex items-center justify-center mb-6 sm:mb-8 overflow-hidden motivation-hero ${className}`}
    >
      <Image
        src={backgroundImage}
        alt={backgroundAlt || title}
        fill
        className="object-cover"
        priority
      />
      {/* オーバーレイ */}
      <div className={`absolute inset-0 ${overlayClasses[overlayType]}`} />

      {/* コンテンツ */}
      <div className="relative z-10 text-center pt-20 sm:pt-24 md:pt-28 px-4 sm:px-4">
        <h1
          className="text-3xl sm:text-3xl md:text-5xl font-bold text-white !text-white drop-shadow-lg mb-3 sm:mb-2 motivation-hero-title"
          style={{
            color: "white !important",
            textShadow: "2px 2px 4px rgba(0,0,0,0.8)",
            WebkitTextFillColor: "white !important",
          }}
        >
          {title}
        </h1>
        {subtitle && (
          <p
            className="text-base sm:text-lg md:text-2xl text-white/90 !text-white/90 drop-shadow motivation-hero-subtitle"
            style={{
              color: "rgba(255, 255, 255, 0.9) !important",
              textShadow: "1px 1px 2px rgba(0,0,0,0.8)",
              WebkitTextFillColor: "rgba(255, 255, 255, 0.9) !important",
            }}
          >
            {subtitle}
          </p>
        )}
      </div>
    </section>
  );
};

export default PageHero;
