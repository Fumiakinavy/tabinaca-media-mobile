import Link from "next/link";
import { GetStaticProps } from "next";
import Head from "next/head";
import { getAllItems } from "@/lib/mdx";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import PlaceCard from "@/components/PlaceCard";
import type { PlacePayload } from "@/lib/generatedActivitySaves";
import { useTranslation } from "next-i18next";
import { serverSideTranslations } from "next-i18next/serverSideTranslations";
import React, {
  useMemo,
  useState,
  useEffect,
  useCallback,
  useRef,
} from "react";
import { useRouter } from "next/router";
import InspirationCard from "@/components/InspirationCard";
// Location is now managed globally by LocationContext
import { useLocation } from "@/context/LocationContext";

interface Experience {
  title: string;
  slug: string;
  date?: string | null;
  coverImage?: string;
  summary: string;
  price?: number | null;
  duration?: string | null;
  locationFromStation?: string | null;
  location?: { lat: number; lng: number } | null;
  level?: string | null;
  couponCode?: string | null;
  discount?: string | null;
  tags?: string[];
  motivationTags?: string[];
  googlePlaceId?: string | null;
  affiliateUrl?: string | null; // アフィリエイトリンク
}

interface ExperiencesPageProps {
  initialExperiences: Experience[];
  totalExperiences: number;
}

interface AiDiscoverySection {
  id: string;
  title: string;
  description: string;
  chatQuery: string;
  locationName?: string;
  places: PlacePayload[];
}

const INITIAL_LIMIT = 20;
const PAGE_SIZE = 20;
const EXPERIENCE_RADIUS_METERS = 700;

const haversineMeters = (
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number => {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const R = 6371e3; // meters
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

export default function ExperiencesPage({
  initialExperiences,
  totalExperiences,
}: ExperiencesPageProps) {
  const { t } = useTranslation("common");
  const router = useRouter();
  const {
    userLocation,
    isLoadingLocation: isLoadingGlobalLocation,
    locationError,
    locationErrorCode,
    locationStatus,
    browserPermission,
    requestLocation,
  } = useLocation();
  // Location is now managed globally by LocationContext
  const [query, setQuery] = useState("");
  const [selectedDuration, setSelectedDuration] = useState<string>("all");
  const [isMounted, setIsMounted] = useState(false);
  const [shuffledExperiences, setShuffledExperiences] =
    useState<Experience[]>(initialExperiences);
  const [inspirationCount, setInspirationCount] = useState(INITIAL_LIMIT); // Inspiration表示件数
  const [aiSections, setAiSections] = useState<AiDiscoverySection[]>([]);
  const [aiStatus, setAiStatus] = useState<
    "idle" | "loading" | "ready" | "error"
  >("idle");
  const [aiError, setAiError] = useState<string | null>(null);
  const [nextOffset, setNextOffset] = useState<number>(
    initialExperiences.length,
  );
  const [hasMoreExperiences, setHasMoreExperiences] = useState<boolean>(
    initialExperiences.length < totalExperiences,
  );
  const [isFetchingMore, setIsFetchingMore] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const inspirationScrollRef = useRef<HTMLDivElement | null>(null);

  const handleRequestLocation = useCallback(() => {
    void requestLocation({ source: "user" });
  }, [requestLocation]);

  const shouldShowLocationCTA = !userLocation;
  const isRequestingLocation =
    locationStatus === "requesting" || isLoadingGlobalLocation;
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

  const handlePlaceDetailsClick = useCallback(
    (place: PlacePayload) => {
      const query: Record<string, string> = {
        action: "new",
        placeId: place.place_id,
        placeName: place.name,
        q: `Tell me more about ${place.name}`,
      };

      if (place.formatted_address) {
        query.placeAddress = place.formatted_address;
      }
      if (typeof place.rating === "number") {
        query.placeRating = place.rating.toString();
      }
      if (typeof place.user_ratings_total === "number") {
        query.placeReviews = place.user_ratings_total.toString();
      }
      if (typeof place.price_level === "number") {
        query.placePriceLevel = place.price_level.toString();
      }

      void router.push({ pathname: "/chat", query });
    },
    [router],
  );

  // フィッシャー・イェーツシャッフルアルゴリズム
  const shuffleArray = useCallback((array: Experience[]): Experience[] => {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }, []);

  // クライアントサイドでのみマウント状態を設定
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Location is now managed globally by LocationContext

  // Note: Location auto-fetch is now handled globally by LocationContext

  useEffect(() => {
    let active = true;

    const loadAiSections = async () => {
      setAiStatus("loading");
      setAiError(null);

      try {
        // ユーザーの現在地をクエリパラメータとして渡す
        const url = new URL(
          "/api/experiences/ai-cards",
          window.location.origin,
        );
        url.searchParams.set("radius", String(EXPERIENCE_RADIUS_METERS));
        if (userLocation) {
          url.searchParams.set("lat", userLocation.lat.toString());
          url.searchParams.set("lng", userLocation.lng.toString());
        }

        const response = await fetch(url.toString());
        const body = (await response.json()) as {
          success: boolean;
          sections?: AiDiscoverySection[];
          error?: string;
        };

        if (!active) return;
        if (!response.ok || !body.success) {
          throw new Error(body.error || "Failed to load Gappy chat cards");
        }

        setAiSections(body.sections ?? []);
        setAiStatus("ready");
      } catch (error) {
        if (!active) return;
        console.error("[Experiences] Failed to fetch Gappy chat cards", error);
        setAiError(
          error instanceof Error
            ? error.message
            : "Failed to load Gappy chat cards",
        );
        setAiStatus("error");
      }
    };

    // 位置情報が取得できた場合、または位置情報取得を試みた後にロード
    // 位置情報がない場合でも、API側で適切に処理される
    loadAiSections();
    return () => {
      active = false;
    };
  }, [userLocation]);

  // ページロード時にアクティビティをシャッフル（クライアントサイドでのみ）
  // 毎回異なる順序を保証するため、ページロードのたびにシャッフル
  useEffect(() => {
    if (isMounted) {
      setShuffledExperiences(shuffleArray(initialExperiences));
    }
  }, [initialExperiences, shuffleArray, isMounted]);

  // 追加の体験データを取得
  const fetchMoreExperiences = useCallback(async () => {
    if (!hasMoreExperiences || isFetchingMore) return;

    setIsFetchingMore(true);
    setFetchError(null);
    try {
      const locale = router.locale ?? "en";
      const params = new URLSearchParams({
        offset: String(nextOffset),
        limit: String(PAGE_SIZE),
        locale,
      });
      const res = await fetch(`/api/experiences?${params.toString()}`);
      if (!res.ok) {
        throw new Error("Failed to load more experiences");
      }
      const body = (await res.json()) as {
        items: Experience[];
        hasMore: boolean;
        nextOffset: number;
      };

      setShuffledExperiences((prev) => shuffleArray([...prev, ...body.items]));
      setHasMoreExperiences(body.hasMore);
      setNextOffset(body.nextOffset);
      setInspirationCount((prev) => prev + body.items.length);
    } catch (error) {
      console.error("[Experiences] failed to fetch more", error);
      setFetchError(
        error instanceof Error ? error.message : "Failed to load experiences",
      );
    } finally {
      setIsFetchingMore(false);
    }
  }, [
    hasMoreExperiences,
    isFetchingMore,
    nextOffset,
    router.locale,
    shuffleArray,
  ]);

  // URLのqクエリとdurationクエリで初期化
  useEffect(() => {
    if (typeof router.query.q === "string") {
      setQuery(router.query.q);
    } else {
      setQuery("");
    }

    if (typeof router.query.duration === "string") {
      setSelectedDuration(router.query.duration);
    } else {
      setSelectedDuration("all");
    }
  }, [router.query.q, router.query.duration]);

  // フィルターや検索が変わったら表示件数をリセット
  useEffect(() => {
    setInspirationCount(INITIAL_LIMIT); // 初期件数にリセット
  }, [query, selectedDuration]);

  // 時間を分に変換する関数
  const parseDuration = (duration: string): number => {
    const match = duration.match(/(\d+)/);
    return match ? parseInt(match[1]) : 0;
  };

  // 時間フィルタを適用する関数
  const filterByDuration = useCallback(
    (exp: Experience): boolean => {
      if (selectedDuration === "all") return true;

      const duration = exp.duration;
      if (!duration) return false;

      const minutes = parseDuration(duration);

      switch (selectedDuration) {
        case "under15":
          return minutes <= 15;
        case "15-30":
          return minutes >= 15 && minutes <= 30;
        case "30-60":
          return minutes > 30 && minutes <= 60;
        case "60+":
          return minutes > 60;
        default:
          return true;
      }
    },
    [selectedDuration],
  );

  const filtered = useMemo(() => {
    // まず時間フィルタを適用（シャッフルされた配列を使用）
    let filteredExperiences = shuffledExperiences.filter(filterByDuration);

    if (userLocation) {
      const beforeLocationFilter = filteredExperiences.length;
      filteredExperiences = filteredExperiences.filter((exp) => {
        if (!exp.location) return false;
        const distance = haversineMeters(
          userLocation.lat,
          userLocation.lng,
          exp.location.lat,
          exp.location.lng,
        );
        return distance <= EXPERIENCE_RADIUS_METERS;
      });
    }

    const q = query.trim().toLowerCase();
    if (!q) return filteredExperiences;

    // 複数語句対応（空白・カンマ区切り）
    const terms = Array.from(
      new Set(
        q
          .split(/[,\s]+/)
          .map((s) => s.trim())
          .filter(Boolean),
      ),
    );

    const scored = filteredExperiences.map((e) => {
      const title = (e.title || "").toLowerCase();
      const summary = (e.summary || "").toLowerCase();
      const slug = (e.slug || "").toLowerCase();
      const tags = (e.tags || []).map((t) => (t || "").toLowerCase());
      const motivationTags = (e.motivationTags || []).map((t) =>
        (t || "").toLowerCase(),
      );
      const duration = (e.duration || "").toLowerCase();
      const level = (e.level || "").toLowerCase();
      const locationFromStation = (e.locationFromStation || "").toLowerCase();
      const priceText = typeof e.price === "number" ? String(e.price) : "";

      let score = 0;
      for (const term of terms) {
        // 強い一致: タイトル/タグ
        if (title.includes(term)) score += 10;
        if (tags.some((t) => t.includes(term))) score += 8;

        // 中程度: 動機タグ/概要
        if (motivationTags.some((t) => t.includes(term))) score += 6;
        if (summary.includes(term)) score += 5;

        // 弱い一致: スラッグ/所要時間/レベル/場所/価格文字列
        if (slug.includes(term)) score += 3;
        if (duration.includes(term)) score += 3;
        if (level.includes(term)) score += 2;
        if (locationFromStation.includes(term)) score += 2;
        if (priceText.includes(term)) score += 1;
      }

      return { exp: e, score };
    });

    // スコア順に並べ替え。スコア0は末尾に送る
    scored.sort((a, b) => b.score - a.score);

    // すべて返す（ヒット優先、その後その他）
    return scored.map((s) => s.exp);
  }, [shuffledExperiences, query, filterByDuration, userLocation]);

  // 表示する配列（最初の displayCount 件のみ）
  const displayedExperiences = useMemo(() => {
    return filtered.slice(0, inspirationCount);
  }, [filtered, inspirationCount]);

  // Location UI is now managed globally by LocationContext

  // まだ表示していないアイテムがあるかチェック
  const hasMore = inspirationCount < filtered.length;

  // 位置情報フィルタでカードが不足する場合、背景で追加読み込みして補完
  useEffect(() => {
    if (!userLocation) return;
    if (query.trim()) return;
    if (isFetchingMore) return;
    if (!hasMoreExperiences) return;
    if (filtered.length >= INITIAL_LIMIT) return;
    void fetchMoreExperiences();
  }, [
    userLocation,
    query,
    filtered.length,
    isFetchingMore,
    hasMoreExperiences,
    fetchMoreExperiences,
  ]);

  // インスピレーション横スクロール: 端に到達したら自動で追加読み込み
  useEffect(() => {
    const container = inspirationScrollRef.current;
    if (!container) return;

    const onScroll = () => {
      if (!hasMore && !hasMoreExperiences) return;
      const { scrollLeft, clientWidth, scrollWidth } = container;
      const nearEnd = scrollLeft + clientWidth >= scrollWidth - 48; // 48px手前で発火
      if (nearEnd) {
        if (hasMore) {
          setInspirationCount((prev) =>
            prev < filtered.length
              ? Math.min(prev + 20, filtered.length)
              : prev,
          );
        } else if (hasMoreExperiences && !isFetchingMore) {
          void fetchMoreExperiences();
        }
      }
    };

    container.addEventListener("scroll", onScroll, { passive: true });
    return () => container.removeEventListener("scroll", onScroll);
  }, [
    hasMore,
    filtered.length,
    hasMoreExperiences,
    isFetchingMore,
    fetchMoreExperiences,
  ]);

  return (
    <>
      <Head>
        <title>{`${t("experiences.title", "Experiences")} | Gappy`}</title>
        <meta
          name="description"
          content={t(
            "experiences.subtitle",
            "Find your best activities in Shibuya",
          )}
        />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="canonical" href="https://gappytravel.com/experiences" />
      </Head>

      <Header />

      <main
        id="main-content"
        className="min-h-screen bg-gray-50 overflow-x-hidden"
      >
        <div className="max-w-7xl mx-auto px-3 xs:px-0 sm:px-0 md:px-6 lg:px-8 xl:px-10 py-4 sm:py-6 md:py-8 lg:py-10">
          <section className="mb-10 rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
            <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-gray-400">
                  Gappy Picks
                </p>
                <h2 className="text-2xl font-semibold text-gray-900">
                 Let's find your experiences!
                </h2>
               
              </div>
              <Link
                href="/chat?action=new"
                className="inline-flex items-center justify-center rounded-full bg-gradient-to-r from-[#36D879] to-[#2fb765] px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:shadow-md"
              >
                Open Gappy Chat
              </Link>
            </div>

            {shouldShowLocationCTA && (
              <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center">
                <button
                  type="button"
                  onClick={handleRequestLocation}
                  disabled={isRequestingLocation}
                  className={`inline-flex items-center justify-center rounded-full border px-4 py-2 text-sm font-semibold transition ${
                    isRequestingLocation
                      ? "border-gray-200 bg-gray-100 text-gray-400"
                      : "border-green-200 bg-white text-gray-900 hover:shadow-sm"
                  }`}
                >
                  {isRequestingLocation
                    ? "Requesting location…"
                    : "Use current location"}
                </button>
                {locationError && (
                  <p className="text-xs text-rose-600">{locationError}</p>
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
            )}

            {aiStatus === "loading" && (
              <p className="mt-4 text-sm text-gray-500">
                Loading Gappy chat cards…
              </p>
            )}

            {aiStatus === "error" && (
              <p className="mt-4 text-sm text-red-600">
                {aiError ||
                  "Failed to load Gappy chat cards. Please try again soon."}
              </p>
            )}

            {aiStatus === "ready" && (
              <div className="space-y-10 mt-6">
                {aiSections.length === 0 && (
                  <p className="text-sm text-gray-500">
                    No Gappy chat cards are available right now. Start a chat to
                    generate fresh ideas.
                  </p>
                )}

                {aiSections.map((section) => {
                  const sectionHref = `/chat?action=new&q=${encodeURIComponent(
                    section.chatQuery,
                  )}`;

                  return (
                    <div key={section.id} className="space-y-4">
                      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                        <div>
                          <p className="text-base font-semibold text-gray-900">
                            {section.title}
                          </p>
                          <p className="text-sm text-gray-500">
                            {section.description}
                          </p>
                          {section.locationName && (
                            <p className="text-xs text-green-600">
                              Location: {section.locationName}
                            </p>
                          )}
                        </div>
                        <Link
                          href={sectionHref}
                          className="inline-flex items-center rounded-full border border-green-200 bg-white px-4 py-2 text-sm font-semibold text-gray-900 shadow-sm transition hover:shadow-md"
                        >
                          {section.title} on Gappy chat
                        </Link>
                      </div>
                      {section.places.length > 0 ? (
                        <div className="overflow-x-auto overflow-y-visible pb-3 -mx-4 sm:-mx-6 px-4 sm:px-6 md:mx-0 md:px-0">
                          <div className="flex gap-4 pb-1 snap-x snap-mandatory px-1 sm:px-2 lg:px-4">
                            {section.places.map((place) => (
                              <div
                                key={place.place_id}
                                className="w-[280px] flex-shrink-0 snap-start sm:w-[320px] lg:w-[340px] min-w-0"
                              >
                                <PlaceCard
                                  place={place}
                                  className="h-full min-h-[440px]"
                                  onSelect={handlePlaceDetailsClick}
                                  onDetailsClick={handlePlaceDetailsClick}
                                  disableCardClick
                                />
                              </div>
                            ))}
                          </div>
                        </div>
                      ) : (
                        <p className="text-sm text-gray-500">
                          AI is still thinking about this category.
                        </p>
                      )}
                    </div>
                  );
                })}

                <div className="space-y-4" id="inspiration">
                  <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                    <div>
                      <p className="text-base font-semibold text-gray-900">
                        Inspiration
                      </p>
                      <p className="text-sm text-gray-500">
                        Curated MDX experiences, shown in the same layout as AI
                        picks.
                      </p>
                      {userLocation && (
                        <p className="text-xs text-green-600">
                          Showing cards within {EXPERIENCE_RADIUS_METERS}m of
                          your location
                        </p>
                      )}
                    </div>
                    <Link
                      href={`/chat?action=new&q=${encodeURIComponent("Give me inspiration for unique experiences")}`}
                      className="inline-flex items-center rounded-full border border-green-200 bg-white px-4 py-2 text-sm font-semibold text-gray-900 shadow-sm transition hover:shadow-md"
                    >
                      inspiration on Gappy chat
                    </Link>
                  </div>

                  <div
                    className="overflow-x-auto overflow-y-visible pb-3 -mx-4 sm:-mx-6 px-4 sm:px-6 md:mx-0 md:px-0"
                    ref={inspirationScrollRef}
                  >
                    {displayedExperiences.length === 0 ? (
                      <p className="text-sm text-gray-500 py-4">
                        {userLocation
                          ? query.trim()
                            ? `No matches found within ${EXPERIENCE_RADIUS_METERS}m.`
                            : `No inspiration cards found within ${EXPERIENCE_RADIUS_METERS}m.`
                          : query.trim()
                            ? "No matches found."
                            : "No inspiration cards are available right now."}
                      </p>
                    ) : (
                      <div className="flex gap-4 pb-1 snap-x snap-mandatory px-1 sm:px-2 lg:px-4">
                        {displayedExperiences.map((experience) => (
                          <div
                            key={experience.slug}
                            className="w-[280px] flex-shrink-0 snap-start sm:w-[320px] lg:w-[340px] min-w-0"
                          >
                            <InspirationCard experience={experience} />
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {!hasMore && !hasMoreExperiences && filtered.length > 0 && (
                    <div className="flex justify-center mt-4">
                      <p className="text-gray-500 text-sm">
                        Showing all {filtered.length} inspiration cards
                      </p>
                    </div>
                  )}
                  {isFetchingMore && (
                    <div className="flex justify-center mt-4">
                      <p className="text-gray-500 text-sm">
                        Loading more inspiration…
                      </p>
                    </div>
                  )}
                  {fetchError && (
                    <div className="flex justify-center mt-4">
                      <p className="text-red-500 text-sm">{fetchError}</p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </section>
        </div>
      </main>

      <Footer />
    </>
  );
}

export const getStaticProps: GetStaticProps = async ({ locale }) => {
  const experiences = (await getAllItems(
    "experiences",
    locale,
  )) as Experience[];

  const initialExperiences = experiences.slice(0, INITIAL_LIMIT).map((exp) => ({
    ...exp,
  }));

  return {
    props: {
      initialExperiences,
      totalExperiences: experiences.length,
      ...(await serverSideTranslations(locale ?? "en", ["common"])),
    },
    revalidate: 21600, // 6時間ごとに再生成
  };
};
