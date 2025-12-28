import React from "react";
import Image from "next/image";
import Link from "next/link";

interface SectionHeaderProps {
  title: string;
  subtitle?: string;
  backgroundImage: string;
  backgroundAlt?: string;
  badge?: {
    text: string;
    color?: string;
    href?: string;
  };
  className?: string;
}

const SectionHeader: React.FC<SectionHeaderProps> = ({
  title,
  subtitle,
  backgroundImage,
  backgroundAlt,
  badge,
  className = "",
}) => {
  const BadgeComponent = () => {
    if (!badge) return null;

    const badgeClasses = `px-3 py-1 rounded-full text-sm font-semibold ${
      badge.color || "bg-gray-600 text-white"
    }`;

    if (badge.href) {
      return (
        <Link
          href={badge.href}
          className={`${badgeClasses} group inline-flex items-center justify-center transition-all duration-300 transform hover:scale-105 hover:shadow-lg`}
        >
          {badge.text}
        </Link>
      );
    }

    return <div className={badgeClasses}>{badge.text}</div>;
  };

  return (
    <div className={`relative rounded-xl overflow-hidden mb-6 ${className}`}>
      <div className="relative h-24 sm:h-32 md:h-40">
        <Image
          src={backgroundImage}
          alt={backgroundAlt || title}
          fill
          className="object-cover"
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 100vw, 100vw"
        />
        {/* オーバーレイ */}
        <div className="absolute inset-0 bg-black/50" />

        {/* コンテンツ */}
        <div className="absolute inset-0 flex items-center justify-between p-4 sm:p-6">
          <div>
            <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-white drop-shadow-lg">
              {title}
            </h2>
            {subtitle && (
              <p className="text-sm sm:text-base text-white/90 mt-1">
                {subtitle}
              </p>
            )}
          </div>
          <BadgeComponent />
        </div>
      </div>
    </div>
  );
};

export default SectionHeader;
