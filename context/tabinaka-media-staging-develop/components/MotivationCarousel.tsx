import React from "react";
import Link from "next/link";
import Image from "next/image";

interface Motivation {
  id: string;
  name: string;
  image: string;
  slug: string;
  description?: string;
}

interface MotivationCarouselProps {
  motivations: Motivation[];
  className?: string;
}

export default function MotivationCarousel({
  motivations,
  className = "",
}: MotivationCarouselProps) {
  return (
    <div className={`relative ${className}`}>
      <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide snap-x snap-mandatory">
        <style>{`
          div::-webkit-scrollbar { display: none; }
        `}</style>

        {motivations.map((motivation, i) => (
          <div key={motivation.id} className="flex flex-col">
            <article
              className="
                min-w-[280px] sm:min-w-[320px] md:min-w-[280px] lg:min-w-[320px]
                snap-start shrink-0 rounded-xl overflow-hidden
                shadow-lg hover:shadow-xl transition-all duration-300
                transform hover:scale-105 active:scale-95
                aspect-[3/2] touch-manipulation
              "
              aria-roledescription="slide"
              aria-label={`${i + 1} / ${motivations.length}`}
            >
              <Link
                href={motivation.slug}
                className="group block relative h-full"
              >
                <Image
                  src={motivation.image}
                  alt={motivation.name}
                  fill
                  className="object-cover group-hover:scale-110 transition-transform duration-500"
                  sizes="(max-width: 640px) 280px, (max-width: 768px) 320px, (max-width: 1024px) 280px, 320px"
                  priority={i < 3}
                  quality={90}
                  loading="eager"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent group-hover:from-black/70 transition-colors duration-300" />
                <div className="absolute inset-0 flex items-center justify-center opacity-100">
                  <div className="text-center text-white px-4">
                    <h4 className="text-sm sm:text-base md:text-lg font-bold leading-tight drop-shadow-lg">
                      {motivation.name}
                    </h4>
                  </div>
                </div>
              </Link>
            </article>
            {/* カードの下の説明文 */}
            {motivation.description && (
              <div className="mt-3 px-2">
                <p className="text-sm text-gray-600 leading-relaxed text-center">
                  {motivation.description}
                </p>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
