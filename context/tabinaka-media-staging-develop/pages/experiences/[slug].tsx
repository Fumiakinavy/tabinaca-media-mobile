import { useMemo, useCallback } from "react";
import { GetStaticPaths, GetStaticProps } from "next";
import { getAllSlugs, getItemBySlug } from "@/lib/mdx";
import ExperienceTemplate from "@/components/ExperienceTemplate";
import ExperienceForm from "@/components/ExperienceForm";
import SimpleMapEmbed from "@/components/SimpleMapEmbed";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import Head from "next/head";
import SeoStructuredData from "@/components/SeoStructuredData";
import { buildExperienceStructuredData } from "@/lib/structuredData";
import { MDXRemote } from "next-mdx-remote";
import { useTranslation } from "next-i18next";
import { serverSideTranslations } from "next-i18next/serverSideTranslations";
import {
  getExperienceUnifiedFormStatus,
  getExperienceMapStatus,
} from "@/config/experienceSettings";
import { supabaseServer } from "@/lib/supabaseServer";
import Link from "next/link";
import { useLocation } from "@/context/LocationContext";

// Edge Runtimeはnext-i18nextと互換性がないため削除
// export const runtime = 'experimental-edge';

interface ExperiencePageProps {
  content: any;
  frontMatter: {
    title: string;
    date: string;
    coverImage: string;
    summary: string;
    tags?: string[];
    price?: number;
    level?: string;
    duration?: string;
    location?: {
      lat: number;
      lng: number;
    };
    couponCode?: string;
    discount?: string;
    address?: string;
    storeNameEn?: string;
    mapIframe?: string;
    maxParticipants?: number;
    included?: string[];
    requirements?: string[];
    motivationTags?: string[];
    googlePlaceId?: string;
  };
  showUnifiedForm: boolean;
  slug: string;
  pageUrl: string;
}

export default function ExperiencePage({
  content,
  frontMatter,
  showUnifiedForm,
  slug,
  pageUrl,
}: ExperiencePageProps) {
  const { t } = useTranslation("common");
  const {
    userLocation: contextUserLocation,
    requestLocation,
    locationStatus,
    locationError,
    locationErrorCode,
    browserPermission,
  } = useLocation();

  const handleRequestLocation = useCallback(() => {
    void requestLocation({ source: "user" });
  }, [requestLocation]);

  const shouldShowLocationButton = !contextUserLocation;
  const isRequestingLocation = locationStatus === "requesting";
  const locationPermissionHint =
    browserPermission === "prompt"
      ? "位置情報を使うにはブラウザの許可が必要です。ボタンを押すと許可ダイアログが表示されます。"
      : browserPermission === "denied" || locationStatus === "denied"
        ? "ブラウザの設定で位置情報を許可してください。"
        : null;
  const safariPermissionHint =
    browserPermission === "denied" || locationStatus === "denied"
      ? "Safari の場合は aA → Webサイトの設定 → 位置情報 を確認してください。"
      : null;
  const browserPermissionLabel =
    {
      granted: "許可",
      denied: "拒否",
      prompt: "未許可",
      unknown: "不明",
      unsupported: "未対応",
    }[browserPermission] ?? browserPermission;
  const locationStatusLabel =
    {
      idle: "未要求",
      requesting: "取得中",
      granted: "取得済",
      denied: "拒否",
      unsupported: "未対応",
      insecure: "HTTPS必須",
      error: "エラー",
    }[locationStatus] ?? locationStatus;
  const locationStatusNote = `状態: browser=${browserPermissionLabel}, location=${locationStatusLabel}${
    locationErrorCode ? `, error=${locationErrorCode}` : ""
  }`;

  // エクスペリエンスのカテゴリを取得（motivationTagsから）
  const getCurrentCategory = () => {
    if (frontMatter.motivationTags && frontMatter.motivationTags.length > 0) {
      return frontMatter.motivationTags[0]; // 最初のカテゴリを使用
    }
    return null;
  };

  const currentCategory = getCurrentCategory();
  const structuredData = useMemo(
    () =>
      buildExperienceStructuredData({
        name: frontMatter.title,
        description: frontMatter.summary,
        image: frontMatter.coverImage,
        price: frontMatter.price,
        priceCurrency: "JPY",
        brandName: "Gappy",
        url: pageUrl,
      }),
    [
      frontMatter.coverImage,
      frontMatter.price,
      frontMatter.summary,
      frontMatter.title,
      pageUrl,
    ],
  );

  return (
    <>
      <Head>
        <title>{frontMatter.title} | Gappy</title>
        <meta name="description" content={frontMatter.summary} />
        <meta property="og:title" content={frontMatter.title} />
        <meta property="og:description" content={frontMatter.summary} />
        <meta property="og:image" content={frontMatter.coverImage} />
        <meta property="og:type" content="article" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={frontMatter.title} />
        <meta name="twitter:description" content={frontMatter.summary} />
        <meta name="twitter:image" content={frontMatter.coverImage} />
        <link rel="canonical" href={pageUrl} />
        <SeoStructuredData data={[structuredData]} />
      </Head>

      <Header />
      <main>
        {/* 本文直下表示用のフラグ（モバイル地図があるか） */}
        {(() => {
          try {
            return null;
          } catch {
            return null;
          }
        })()}
          <ExperienceTemplate
            content={<MDXRemote {...content} />}
            meta={{
              ...frontMatter,
              userLocation: contextUserLocation,
            }}
            showUnifiedForm={showUnifiedForm}
            slug={slug}
          />

          {shouldShowLocationButton && (
            <section className="bg-white border-t border-gray-100 py-6">
              <div className="max-w-5xl mx-auto px-4">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                  <button
                    type="button"
                    onClick={handleRequestLocation}
                    disabled={isRequestingLocation}
                    className={`inline-flex items-center justify-center rounded-full border px-4 py-2 text-sm font-semibold transition ${isRequestingLocation
                      ? "border-gray-200 bg-gray-100 text-gray-400"
                      : "border-green-200 bg-white text-gray-900 hover:shadow-sm"
                      }`}
                  >
                    {isRequestingLocation
                      ? "Requesting location…"
                      : "Use current location"}
                  </button>
                  {locationError && (
                    <p className="text-xs text-gray-500">{locationError}</p>
                  )}
                  {locationPermissionHint && (
                    <p className="text-xs text-gray-500">
                      {locationPermissionHint}
                    </p>
                  )}
                  {safariPermissionHint && (
                    <p className="text-xs text-gray-500">
                      {safariPermissionHint}
                    </p>
                  )}
                  <p className="text-xs text-gray-400">{locationStatusNote}</p>
                </div>
              </div>
            </section>
          )}

        {/* Google Map - モバイル版（クーポンセクションの下） */}
        {getExperienceMapStatus(slug) && frontMatter.location && (
          <section className="lg:hidden bg-white py-16">
            <div className="max-w-4xl mx-auto px-4">
              <div className="text-center mb-8">
                <h2 className="text-3xl font-bold text-gray-900 mb-4">
                  Location
                </h2>
                <p className="text-lg text-gray-600">Find us on the map</p>
              </div>
              <SimpleMapEmbed
                iframeHtml={frontMatter.mapIframe}
                lat={frontMatter.location.lat}
                lng={frontMatter.location.lng}
                storeName={
                  frontMatter.title.includes("Shibuya SKY")
                    ? "SHIBUYA SKY"
                    : frontMatter.title.includes("Kimono")
                      ? "TSUMUGI 着付け体験"
                      : frontMatter.title.includes("Miso Ramen")
                        ? "伊蔵八味噌らーめん"
                        : frontMatter.title.includes("Hachiko")
                          ? "ハチふる SHIBUYA meets AKITA"
                          : frontMatter.title.includes("Chiku Chiku")
                            ? "ちくちくCAFE"
                            : frontMatter.title.includes("MAG8")
                              ? "CROSSING VIEW & ROOFTOP LOUNGE MAG 8"
                              : frontMatter.title.includes("Open-Top Bus")
                                ? "渋谷駅（渋谷フクラス）"
                                : frontMatter.title.includes(
                                  "Catch Live DJ Beats",
                                )
                                  ? "DJ Bar 東間屋"
                                  : frontMatter.title.includes("Hands-Free")
                                    ? "ワンダーコンパス 渋谷"
                                    : frontMatter.title
                }
                storeNameEn={frontMatter.storeNameEn}
                address={frontMatter.address}
                userLocation={contextUserLocation || undefined}
                usePlaceSearch={
                  frontMatter.title.includes("Tokyu Food Show") ||
                  frontMatter.storeNameEn?.includes("Tokyu Food Show")
                }
                className="mb-4"
              />

              {/* Go to Google Maps CTA */}
              <div className="mt-8 text-center">
                <a
                  href={
                    frontMatter.googlePlaceId
                      ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(frontMatter.storeNameEn || frontMatter.title)}&query_place_id=${frontMatter.googlePlaceId}`
                      : `https://www.google.com/maps/search/?api=1&query=${frontMatter.location.lat},${frontMatter.location.lng}`
                  }
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center bg-[#36D879] hover:bg-[#2B9E5A] text-white px-8 py-4 rounded-xl font-bold text-lg transition-all duration-300 transform hover:scale-105 shadow-lg gap-3"
                >
                  <svg
                    className="w-6 h-6"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                  >
                    <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" />
                  </svg>
                  <span>Open in Google Maps</span>
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                    />
                  </svg>
                </a>
              </div>

              {/* Looking for more experiences? をロケーションの直下に表示（モバイル） */}
              <div className="mt-12 text-center">
                <div className="bg-gray-50 rounded-xl p-8">
                  <h3 className="text-2xl font-bold text-gray-900 mb-6">
                    Looking for more experiences?
                  </h3>
                  <Link
                    href="/experiences"
                    className="inline-flex items-center justify-center bg-[#36D879] hover:bg-[#2B9E5A] text-white px-8 py-4 rounded-xl font-bold text-lg transition-all duration-300 transform hover:scale-105 shadow-lg"
                  >
                    <span className="mr-3">Back to Experience Page</span>
                    <svg
                      className="w-5 h-5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M17 8l4 4m0 0l-4 4m4-4H3"
                      />
                    </svg>
                  </Link>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* Go to Google Maps CTA - デスクトップ版 */}
        {frontMatter.location && (
          <section className="hidden lg:block bg-gradient-to-r from-green-50 to-emerald-100 py-12">
            <div className="max-w-4xl mx-auto px-4 text-center">
              <h3 className="text-2xl font-bold text-gray-900 mb-4">
                Ready to visit?
              </h3>
              <p className="text-gray-600 mb-6">
                View {frontMatter.storeNameEn || frontMatter.title} on Google
                Maps
              </p>
              <a
                href={
                  frontMatter.googlePlaceId
                    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(frontMatter.storeNameEn || frontMatter.title)}&query_place_id=${frontMatter.googlePlaceId}`
                    : `https://www.google.com/maps/search/?api=1&query=${frontMatter.location.lat},${frontMatter.location.lng}`
                }
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center bg-[#36D879] hover:bg-[#2B9E5A] text-white px-10 py-4 rounded-xl font-bold text-lg transition-all duration-300 transform hover:scale-105 shadow-lg gap-3"
              >
                <svg
                  className="w-6 h-6"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                >
                  <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" />
                </svg>
                <span>Open in Google Maps</span>
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                  />
                </svg>
              </a>
            </div>
          </section>
        )}

        {/* ロケーションが無い場合は本文直後に表示 */}
        {!(getExperienceMapStatus(slug) && frontMatter.location) && (
          <section className="bg-white py-16">
            <div className="max-w-4xl mx-auto px-4">
              <div className="mt-0 text-center">
                <div className="bg-gray-50 rounded-xl p-8">
                  <h3 className="text-2xl font-bold text-gray-900 mb-6">
                    Looking for more experiences?
                  </h3>
                  <Link
                    href="/experiences"
                    className="inline-flex items-center justify-center bg-[#36D879] hover:bg-[#2B9E5A] text-white px-8 py-4 rounded-xl font-bold text-lg transition-all duration-300 transform hover:scale-105 shadow-lg"
                  >
                    <span className="mr-3">Back to Experience Page</span>
                    <svg
                      className="w-5 h-5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M17 8l4 4m0 0l-4 4m4-4H3"
                      />
                    </svg>
                  </Link>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* Looking for more experiences? - デスクトップ版（ロケーションがある場合） */}
        {frontMatter.location && (
          <section className="hidden lg:block bg-white py-16">
            <div className="max-w-4xl mx-auto px-4">
              <div className="text-center">
                <div className="bg-gray-50 rounded-xl p-8">
                  <h3 className="text-2xl font-bold text-gray-900 mb-6">
                    Looking for more experiences?
                  </h3>
                  <Link
                    href="/experiences"
                    className="inline-flex items-center justify-center bg-[#36D879] hover:bg-[#2B9E5A] text-white px-8 py-4 rounded-xl font-bold text-lg transition-all duration-300 transform hover:scale-105 shadow-lg"
                  >
                    <span className="mr-3">Back to Experience Page</span>
                    <svg
                      className="w-5 h-5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M17 8l4 4m0 0l-4 4m4-4H3"
                      />
                    </svg>
                  </Link>
                </div>
              </div>
            </div>
          </section>
        )}
      </main>
      <Footer />
    </>
  );
}

export const getStaticPaths: GetStaticPaths = async ({ locales }) => {
  const paths: Array<{
    params: { slug: string };
    locale: string;
  }> = [];

  if (locales) {
    for (const locale of locales) {
      const slugs = await getAllSlugs("experiences", locale);
      for (const slug of slugs) {
        paths.push({
          params: { slug },
          locale,
        });
      }
    }
  }

  return {
    paths,
    fallback: "blocking",
  };
};

export const getStaticProps: GetStaticProps = async ({ params, locale }) => {
  const slug = params?.slug as string;

  if (!slug) {
    return {
      notFound: true,
    };
  }

  try {
    const { content, frontMatter } = await getItemBySlug(
      "experiences",
      slug,
      locale ?? "en",
    );

    // 統一フォームの表示状態を取得
    const showUnifiedForm = getExperienceUnifiedFormStatus(slug, frontMatter);

    const siteUrl =
      process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ??
      "https://gappytravel.com";

    return {
      props: {
        ...(await serverSideTranslations(locale ?? "en", ["common"])),
        content,
        frontMatter,
        showUnifiedForm,
        slug,
        pageUrl: `${siteUrl}/experiences/${slug}`,
      },
      revalidate: 300, // 5分ごとに再生成
    };
  } catch (error) {
    console.error("Error in getStaticProps:", error);
    return {
      notFound: true,
    };
  }
};
