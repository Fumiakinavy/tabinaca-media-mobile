import React from "react";
import Link from "next/link";
import Image from "next/image";

interface Article {
  title: string;
  slug: string;
  coverImage: string;
  summary?: string;
  date?: string;
  readTime?: string;
}

interface ArticleCardProps {
  article: Article;
  className?: string;
}

const ArticleCard: React.FC<ArticleCardProps> = ({
  article,
  className = "",
}) => {
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  return (
    <Link
      href={`/articles/${article.slug}`}
      className={`group relative overflow-hidden rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 bg-white ${className}`}
    >
      <div className="relative h-48 sm:h-52 md:h-56 overflow-hidden">
        <Image
          src={article.coverImage || "/images/placeholder-experience.jpg"}
          alt={article.title}
          fill
          className="object-cover group-hover:scale-110 transition-transform duration-500"
          sizes="(max-width: 640px) 288px, 320px"
          priority={false} // 多くのカードが並ぶ場合、LCP要素以外はfalseにするのが一般的
        />

        {/* オーバーレイ */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent group-hover:from-black/90 transition-colors duration-300" />

        {/* コンテンツオーバーレイ - 即座に表示 */}
        <div className="absolute bottom-0 left-0 right-0 p-4 opacity-100">
          {/* タイトル */}
          <div className="mb-2">
            <h3 className="text-sm sm:text-base font-semibold text-white line-clamp-2 leading-tight group-hover:text-[#36D879] transition-colors mb-1 drop-shadow-lg">
              {article.title}
            </h3>
          </div>

          {/* メタ情報 */}
          <div className="space-y-1">
            {article.date && (
              <div className="flex items-center text-xs sm:text-sm text-white/90 drop-shadow-md">
                <svg
                  className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2 flex-shrink-0"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                  />
                </svg>
                <span className="font-medium">{formatDate(article.date)}</span>
              </div>
            )}

            {article.readTime && (
              <div className="flex items-center text-xs sm:text-sm text-white/90 drop-shadow-md">
                <svg
                  className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2 flex-shrink-0"
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
                <span className="font-medium">{article.readTime}</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </Link>
  );
};

export default ArticleCard;
