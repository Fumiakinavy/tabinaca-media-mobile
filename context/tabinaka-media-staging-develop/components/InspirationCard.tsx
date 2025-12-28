import Image from "next/image";
import Link from "next/link";
import LikeButton from "./LikeButton";

type InspirationCardProps = {
  experience: {
    slug: string;
    title: string;
    summary: string;
    coverImage?: string;
    price?: number | null;
    duration?: string | null;
  };
};

// MDXで定義した体験をAPIカードと同じレイアウトで表示するカード
export default function InspirationCard({ experience }: InspirationCardProps) {
  const priceText =
    typeof experience.price === "number"
      ? `¥${experience.price.toLocaleString()}`
      : null;

  return (
    <article className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-xl transition-shadow h-full flex flex-col">
      <div className="relative h-72 bg-gray-100">
        <Image
          src={experience.coverImage || "/images/placeholder-experience.jpg"}
          alt={experience.title}
          fill
          sizes="(max-width: 1024px) 100vw, 25vw"
          className="object-cover"
          priority={false}
        />
        <div className="absolute top-2 right-2 z-10">
          <LikeButton
            activitySlug={experience.slug}
            source="card"
            className="shadow-lg hover:shadow-xl transition-shadow duration-200"
          />
        </div>
      </div>

      <div className="p-4 flex flex-col flex-1 gap-3">
        <div className="flex flex-col gap-1">
          <p className="text-[11px] uppercase tracking-[0.2em] text-gray-400">
            Inspiration
          </p>
          <h3 className="text-xs font-semibold text-gray-900 line-clamp-2">
            {experience.title}
          </h3>
          <p className="text-[11px] text-gray-600 line-clamp-3">
            {experience.summary}
          </p>
        </div>

        <div className="flex items-center justify-between text-[11px] text-gray-700">
          {priceText ? (
            <span className="font-bold text-green-600">{priceText}</span>
          ) : (
            <span className="text-gray-400">Free / Not listed</span>
          )}
          {experience.duration && (
            <span className="flex items-center gap-1 font-semibold text-emerald-600">
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                className="shrink-0"
              >
                <circle cx="12" cy="12" r="10" />
                <polyline points="12,6 12,12 16,14" />
              </svg>
              {experience.duration}
            </span>
          )}
        </div>

        <div className="mt-auto flex gap-2">
          <Link
            href={`/experiences/${experience.slug}`}
            className="flex-1 rounded-lg bg-gradient-to-r from-green-500 to-green-600 px-3 py-1.5 text-[11px] font-semibold text-white text-center shadow hover:shadow-lg transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-green-500"
          >
            Details
          </Link>
          <Link
            href={`/chat?action=new&q=${encodeURIComponent(`Tell me more about ${experience.title}`)}`}
            className="flex-1 rounded-lg bg-blue-600 px-3 py-1.5 text-[11px] font-semibold text-white text-center shadow hover:bg-blue-700 transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500"
          >
            Chat
          </Link>
        </div>
      </div>
    </article>
  );
}
