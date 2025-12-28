import Image from "next/image";
import Head from "next/head";
import { formatDistance, calculateWalkingTime } from "@/lib/haversine";
import { useTranslation } from "react-i18next";
import Link from "next/link";
import { useEffect, useState } from "react";
import type { Experience } from "@/types/experiences";

interface Location {
  lat: number;
  lng: number;
}

interface ArticleProps {
  title: string;
  date: string;
  coverImage: string;
  content: React.ReactNode;
  tags?: string[];
  author?: string;
  readTime?: string;
  location?: Location;
  userLocation?: Location;
  allExperiences?: any[]; // 体験データを追加
}

const ArticleTemplate = ({
  title,
  date,
  coverImage,
  content,
  tags,
  author,
  readTime,
  location,
  userLocation,
  allExperiences = [], // 追加: 体験データをpropsで受け取る
}: ArticleProps) => {
  const { t } = useTranslation();

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const calculateDistance = () => {
    if (!location || !userLocation) return null;

    const distance =
      Math.sqrt(
        Math.pow(location.lat - userLocation.lat, 2) +
          Math.pow(location.lng - userLocation.lng, 2),
      ) * 111000; // Convert to approximate meters

    return distance;
  };

  const distance = calculateDistance();

  const components = {
    img: (props: any) => (
      <div className="my-8">
        <Image
          {...props}
          width={800}
          height={600}
          className="rounded-lg shadow-md w-full h-auto"
          alt={props.alt || ""}
        />
      </div>
    ),
    h1: (props: any) => (
      <h1 className="text-3xl font-bold text-gray-900 mb-6 mt-8" {...props} />
    ),
    h2: (props: any) => (
      <h2
        className="text-2xl font-semibold text-gray-800 mb-4 mt-8"
        {...props}
      />
    ),
    h3: (props: any) => (
      <h3 className="text-xl font-medium text-gray-700 mb-3 mt-6" {...props} />
    ),
    p: (props: any) => (
      <p className="text-gray-600 mb-4 leading-relaxed" {...props} />
    ),
    ul: (props: any) => <ul className="mb-4 pl-6 list-disc" {...props} />,
    ol: (props: any) => <ol className="mb-4 pl-6 list-decimal" {...props} />,
    li: (props: any) => <li className="mb-2 text-gray-600" {...props} />,
    blockquote: (props: any) => (
      <blockquote
        className="border-l-4 border-primary-500 pl-4 italic text-gray-700 bg-gray-50 py-2 my-6"
        {...props}
      />
    ),
    pre: (props: any) => (
      <pre
        className="bg-gray-800 text-white p-4 rounded-lg overflow-x-auto my-6"
        {...props}
      />
    ),
    code: (props: any) => (
      <code
        className="bg-gray-100 text-primary-500 px-1 py-0.5 rounded text-sm"
        {...props}
      />
    ),
    a: (props: any) => (
      <a className="text-primary-500 hover:underline" {...props} />
    ),
  };

  return (
    <>
      <Head>
        <title>{`${title} | Gappy`}</title>
        <meta name="description" content={title} />
        <meta property="og:title" content={title} />
        <meta property="og:description" content={title} />
        <meta property="og:image" content={coverImage} />
        <meta property="og:type" content="article" />
        <meta name="twitter:card" content="summary_large_image" />
      </Head>

      <article className="max-w-4xl mx-auto px-4 py-8 mt-20">
        {/* Header */}
        <header className="mb-8">
          {/* <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
            {title}
          </h1> */}

          <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600 mb-6">
            <time dateTime={date}>{formatDate(date)}</time>
            {readTime && (
              <>
                <span>•</span>
                <span>
                  {/* すでに単位が含まれていればそのまま、なければ翻訳を付与 */}
                  {/^\d+$/.test(readTime.trim())
                    ? `${readTime} ${t("articles.readTime", "min read")}`
                    : readTime.replace(/['"]$/, "")}
                </span>
              </>
            )}
            {distance && (
              <>
                <span>•</span>
                <span>
                  {formatDistance(distance)} • {calculateWalkingTime(distance)}
                </span>
              </>
            )}
          </div>
        </header>

        {/* Cover Image + Title Overlay */}
        <div className="relative h-72 sm:h-96 md:h-[400px] lg:h-[450px] mb-8 rounded-lg overflow-hidden">
          <Image
            src={coverImage}
            alt={title}
            fill
            className="object-cover object-top sm:object-center md:object-top lg:object-center"
            priority={true}
          />
          {/* グラデーションオーバーレイ */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent"></div>
          {/* タイトルオーバーレイ */}
          <div className="absolute bottom-0 left-0 right-0 p-4 sm:p-6 md:p-8 text-white">
            <h1 className="text-xs sm:text-sm md:text-base lg:text-lg font-semibold text-white line-clamp-2 leading-tight mb-2 drop-shadow-lg">
              {title}
            </h1>
          </div>
        </div>

        {/* Content */}
        <div className="mdx-content prose prose-lg max-w-none">{content}</div>
        {/* Footer */}
        <footer className="mt-12 pt-8 border-t border-gray-200">
          <div className="flex flex-wrap gap-4 text-sm text-gray-600">
            <span>Published on {formatDate(date)}</span>
          </div>
        </footer>
      </article>
    </>
  );
};

export default ArticleTemplate;
