import React from "react";
import Link from "next/link";
import Image from "next/image";
import ExperienceMeta from "./ExperienceMeta";

interface Experience {
  title: string;
  slug: string;
  coverImage: string;
  price?: number;
  duration?: string;
  couponCode?: string;
  discount?: string;
  googlePlaceId?: string;
}

interface ExperienceCardProps {
  experience: Experience;
  className?: string;
}

const ExperienceCard: React.FC<ExperienceCardProps> = ({
  experience,
  className = "",
}) => {
  // 画像のプリロード（パフォーマンス最適化）
  React.useEffect(() => {
    if (experience.coverImage && typeof window !== "undefined") {
      const img = new window.Image();
      img.src = experience.coverImage;
    }
  }, [experience.coverImage]);

  return (
    <Link
      href={`/experiences/${experience.slug}`}
      className={`group rounded-xl border border-gray-200 hover:border-gray-300 shadow-sm hover:shadow-lg transition-all duration-300 bg-white overflow-hidden relative z-10 ${className}`}
    >
      {/* モバイル: 横並び / デスクトップ: 縦並び */}
      <div className="flex flex-row md:flex-col items-stretch">
        {/* 画像 */}
        <div className="p-3 md:p-0">
          <div className="relative w-24 h-24 rounded-2xl overflow-hidden ring-1 ring-gray-200 bg-gray-100 md:w-full md:h-56 lg:h-64 md:rounded-none md:ring-0">
            <Image
              src={
                experience.coverImage || "/images/placeholder-experience.jpg"
              }
              alt={experience.title}
              fill
              sizes="(max-width: 768px) 96px, (max-width: 1024px) 100vw, 33vw"
              className="object-cover"
              quality={90}
              priority={false}
            />
          </div>
        </div>

        {/* テキスト */}
        <div className="flex-1 p-3 sm:p-4 md:p-5">
          {/* 上部: タイトル */}
          <h3 className="text-base sm:text-lg md:text-xl font-bold text-gray-900 line-clamp-2 leading-snug md:leading-tight group-hover:text-[#36D879] transition-colors">
            {experience.title}
          </h3>

          <ExperienceMeta
            price={experience.price}
            duration={experience.duration}
            discount={experience.discount}
            couponCode={experience.couponCode}
            googlePlaceId={experience.googlePlaceId}
            variant="card"
          />
        </div>
      </div>
    </Link>
  );
};

export default ExperienceCard;
