import { useState, useEffect } from "react";
import Image from "next/image";
import Head from "next/head";
import { formatDistance, calculateWalkingTime } from "@/lib/haversine";
import SimpleMapEmbed from "./SimpleMapEmbed";
import ImageSlider from "./ImageSlider";
import {
  getExperienceUnifiedFormStatus,
  getExperienceMapStatus,
} from "@/config/experienceSettings";
import { useTranslation } from "react-i18next";
import Link from "next/link";
import LikeButton from "./LikeButton";
import ExperienceMeta from "./ExperienceMeta";

// GA4イベント送信関数
const sendGA4Event = (
  eventName: string,
  parameters: Record<string, any> = {},
) => {
  if (typeof window !== "undefined" && (window as any).gtag) {
    (window as any).gtag("event", eventName, parameters);
  }
};

interface ExperienceTemplateProps {
  content: React.ReactNode;
  meta: any;
  showUnifiedForm: boolean;
  slug: string;
}

const ExperienceTemplate: React.FC<ExperienceTemplateProps> = ({
  content,
  meta,
  showUnifiedForm,
  slug,
}) => {
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const calculateDistance = () => {
    if (!meta?.location || !meta?.userLocation) return null;

    const distance =
      Math.sqrt(
        Math.pow(meta.location.lat - meta.userLocation.lat, 2) +
          Math.pow(meta.location.lng - meta.userLocation.lng, 2),
      ) * 111000; // Convert to approximate meters

    return distance;
  };

  const distance = calculateDistance();
  const { t } = useTranslation();

  // ページビューイベントを送信
  useEffect(() => {
    sendGA4Event("experience_page_view", {
      experience_slug: slug,
      experience_title: meta.title || "",
      experience_price: meta.price,
      experience_duration: meta.duration,
      experience_level: meta.level,
      experience_tags: meta.tags,
      page_location: window.location.pathname,
      timestamp: new Date().toISOString(),
      user_agent: navigator.userAgent,
      referrer: document.referrer,
      distance_from_user: distance,
    });
  }, [slug, meta, distance]);

  return (
    <>
      <Head>
        <title>{`${meta.title || ""} | Gappy Experience`}</title>
        <meta name="description" content={meta.summary} />
        <meta property="og:title" content={meta.title || ""} />
        <meta property="og:description" content={meta.summary} />
        <meta property="og:image" content={meta.coverImage} />
        <meta property="og:type" content="website" />
      </Head>

      <div className="max-w-6xl mx-auto px-4 py-8 mt-8 mb-16">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* メインコンテンツ */}
          <div className="lg:col-span-2">
            {/* タイトルセクション */}
            <div className="mb-6">
              <div className="flex items-start justify-between mb-4">
                <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-gray-900 leading-tight flex-1">
                  {meta.title || ""}
                </h1>
                {/* LikeButtonをタイトルの右側に配置 */}
                <div className="ml-4 flex-shrink-0">
                  <LikeButton
                    activitySlug={slug}
                    source="detail"
                    className="text-lg"
                  />
                </div>
              </div>

              <ExperienceMeta
                price={meta.price}
                duration={meta.duration}
                discount={meta.discount}
                couponCode={meta.couponCode}
                googlePlaceId={meta.googlePlaceId}
                variant="detail"
                showRatingCount
                className="mb-4"
              />

              {/* メタ情報 */}
              <div className="flex flex-wrap items-center gap-4 text-sm sm:text-base text-gray-600">
                {meta.level && (
                  <div className="flex items-center gap-2">
                    <svg
                      className="w-4 h-4 sm:w-5 sm:h-5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                    <span>{meta.level}</span>
                  </div>
                )}

                {distance && meta.userLocation && (
                  <div className="flex items-center gap-2">
                    <svg
                      className="w-4 h-4 sm:w-5 sm:h-5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                      />
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                      />
                    </svg>
                    <span>
                      {formatDistance(distance)} •{" "}
                      {calculateWalkingTime(distance)}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* ヒーローセクション（画像のみ） */}
            <div className="relative mb-8">
              {(meta.images && meta.images.length > 0) || meta.coverImage ? (
                <div className="relative h-[300px] sm:h-[350px] md:h-[400px] lg:h-[450px] rounded-lg overflow-hidden">
                  <ImageSlider
                    images={[
                      // coverImageを最初に追加
                      ...(meta.coverImage ? [meta.coverImage] : []),
                      // 既存のimagesを追加
                      ...(meta.images || []),
                    ]}
                    alt={meta.title || ""}
                    className="h-full"
                    imagePositions={
                      meta.title?.includes("Kimono") ||
                      meta.title?.includes("着物")
                        ? [
                            "object-top",
                            "object-top",
                            "object-[center_10%]",
                            "object-[center_10%]",
                          ]
                        : undefined
                    }
                  />
                </div>
              ) : (
                <div className="relative h-[300px] sm:h-[350px] md:h-[400px] lg:h-[450px] rounded-lg overflow-hidden bg-gray-200">
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-gray-500">No image available</span>
                  </div>
                </div>
              )}
            </div>

            {/* 本文 */}
            <div className="mdx-content prose prose-lg max-w-none">
              {content}
            </div>
          </div>

          {/* サイドバー */}
          <div className="lg:col-span-1">
            <div className="sticky top-8 space-y-6 mb-8">
              {/* 体験情報カード */}
              <div className="bg-white rounded-lg shadow-lg p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  Experience Information
                </h3>

                <div className="space-y-4">
                  {meta.price && (
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">Price</span>
                      <span className="flex flex-col items-end">
                        {meta.discount && meta.price && (
                          <span className="text-sm text-gray-400 line-through mr-2">
                            ¥
                            {(
                              meta.price /
                              (1 - parseFloat(meta.discount) / 100)
                            ).toLocaleString("ja-JP")}
                          </span>
                        )}
                        <span className="text-base font-bold text-gray-900">
                          ¥{meta.price.toLocaleString("ja-JP")}
                        </span>
                        {meta.discount && (
                          <span className="text-sm text-red-500 font-semibold ml-2">
                            {meta.discount} OFF
                          </span>
                        )}
                      </span>
                    </div>
                  )}

                  {meta.duration && (
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">Duration</span>
                      <span className="text-lg font-bold text-[#4ADE80]">
                        {meta.duration}
                      </span>
                    </div>
                  )}

                  {meta.maxParticipants && (
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">Max Participants</span>
                      <span className="font-medium">
                        {meta.maxParticipants}
                      </span>
                    </div>
                  )}

                  {meta.address && (
                    <div>
                      <span className="text-gray-600 block mb-1">Location</span>
                      <span className="font-medium text-sm">
                        {meta.address}
                      </span>
                      {meta.phone && (
                        <div className="mt-1">
                          <span className="text-gray-600 text-xs">TEL: </span>
                          <span className="font-medium text-xs">
                            {meta.phone}
                          </span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Google Map - PC版 */}
              <div className="hidden lg:block">
                {slug && getExperienceMapStatus(slug) && meta.location && (
                  <div className="bg-white rounded-lg shadow-lg p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">
                      Location
                    </h3>
                    <SimpleMapEmbed
                      iframeHtml={meta.mapIframe}
                      lat={meta.location.lat}
                      lng={meta.location.lng}
                      storeName={
                        meta.title?.includes("Shibuya SKY")
                          ? "SHIBUYA SKY"
                          : meta.title?.includes("Kimono")
                            ? "TSUMUGI 着付け体験"
                            : meta.title?.includes("Miso Ramen")
                              ? "伊蔵八味噌らーめん"
                              : meta.title?.includes("Hachiko")
                                ? "ハチふる SHIBUYA meets AKITA"
                                : meta.title?.includes("Chiku Chiku")
                                  ? "ちくちくCAFE"
                                  : meta.title?.includes("MAG8")
                                    ? "CROSSING VIEW & ROOFTOP LOUNGE MAG 8"
                                    : meta.title?.includes("Open-Top Bus")
                                      ? "渋谷駅（渋谷フクラス）"
                                      : meta.title?.includes(
                                            "Catch Live DJ Beats",
                                          )
                                        ? "DJ Bar 東間屋"
                                        : meta.title?.includes("Hands-Free")
                                          ? "ワンダーコンパス 渋谷"
                                          : meta.title || ""
                      }
                      storeNameEn={meta.storeNameEn}
                      address={meta.address}
                      userLocation={meta.userLocation}
                      usePlaceSearch={
                        meta.title?.includes("Tokyu Food Show") ||
                        meta.storeNameEn?.includes("Tokyu Food Show")
                      }
                      className="mb-4"
                    />
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default ExperienceTemplate;
