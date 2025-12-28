import { useState, useEffect, useMemo } from "react";
import { GetStaticProps } from "next";
import Head from "next/head";
import { useRouter } from "next/router";
import { useTranslation } from "next-i18next";
import { serverSideTranslations } from "next-i18next/serverSideTranslations";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import PlaceCard from "@/components/PlaceCard";
import LikeButton from "@/components/LikeButton";
import LazyGoogleMapsRating from "@/components/LazyGoogleMapsRating";
import { useBatchRatings } from "@/hooks/useBatchRatings";
import { supabase } from "@/lib/supabaseAuth";
import { getAllItems } from "@/lib/mdx";
import { fetchGeneratedActivitySaves } from "@/lib/generatedActivitySaves";
import type {
  PlacePayload,
  PlaceSaveState,
} from "@/lib/generatedActivitySaves";
import Image from "next/image";
import Link from "next/link";

interface Experience {
  title: string;
  slug: string;
  date: string;
  coverImage: string;
  summary: string;
  price?: number;
  duration?: string;
  locationFromStation?: string;
  level?: string;
  couponCode?: string;
  discount?: string;
  tags?: string[];
  motivationTags?: string[];
  googlePlaceId?: string;
  affiliateUrl?: string;
}

interface LikedActivitiesPageProps {
  allExperiences: Experience[];
}

type SavedAiCard = {
  generatedActivityId: string;
  place: PlacePayload;
  source: string;
};

type SavedItem =
  | { type: "mdx"; data: Experience }
  | { type: "ai"; data: SavedAiCard };

export default function LikedActivitiesPage({
  allExperiences,
}: LikedActivitiesPageProps) {
  const { t } = useTranslation("common");
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [likedSlugs, setLikedSlugs] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [savedAiCards, setSavedAiCards] = useState<SavedAiCard[]>([]);
  const [isLoadingAi, setIsLoadingAi] = useState(false);

  // ユーザー認証チェック
  useEffect(() => {
    const checkUser = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        // 未ログインの場合はホームにリダイレクト
        router.push("/");
        return;
      }

      setUser(user);
    };

    checkUser();

    // 認証状態の変更を監視
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session?.user) {
        router.push("/");
      } else {
        setUser(session.user);
      }
    });

    return () => subscription.unsubscribe();
  }, [router]);

  // いいね一覧を取得
  useEffect(() => {
    const fetchLikedActivities = async () => {
      if (!user) {
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (!session?.access_token) {
          setError("Session not found");
          return;
        }

        const response = await fetch("/api/likes/user", {
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
          cache: "no-store",
        });

        if (!response.ok) {
          const errorText = await response.text();
          let errorDetail = errorText;
          try {
            const errorJson = JSON.parse(errorText);
            errorDetail = errorJson.detail || errorJson.error || errorText;
          } catch (e) {
            // JSONでない場合はそのまま使用
          }

          throw new Error(`HTTP ${response.status}: ${errorDetail}`);
        }

        const result = await response.json();

        if (result.success && result.activities) {
          const slugs = result.activities.map((a: any) => a.slug);
          setLikedSlugs(slugs);
        } else {
          setError(result.error || "Failed to fetch activities");
        }
      } catch (err) {
        console.error("[LikedActivities] Failed to fetch:", err);
        setError("Network error occurred");
      } finally {
        setIsLoading(false);
      }
    };

    fetchLikedActivities();
  }, [user]);

  useEffect(() => {
    if (!user) {
      setSavedAiCards([]);
      return;
    }

    let active = true;
    const fetchAiCards = async () => {
      setIsLoadingAi(true);
      try {
        const saves = await fetchGeneratedActivitySaves();
        if (!active) return;
        const normalized: SavedAiCard[] = saves
          .map((item) => {
            const metadata =
              (item.generated_activity?.metadata as Record<
                string,
                any
              > | null) ?? null;
            const place = (metadata?.place ?? null) as PlacePayload | null;
            if (!place || !place.place_id || !place.name) {
              return null;
            }
            return {
              generatedActivityId: item.generated_activity_id,
              place,
              source: item.source,
            };
          })
          .filter(Boolean) as SavedAiCard[];
        setSavedAiCards(normalized);
      } catch (err) {
        console.error("[LikedActivities] Failed to fetch AI cards", err);
      } finally {
        if (active) {
          setIsLoadingAi(false);
        }
      }
    };

    fetchAiCards();
    return () => {
      active = false;
    };
  }, [user]);

  // いいねしたアクティビティ(MDX)をフィルタリング
  const likedExperiences = useMemo(() => {
    return allExperiences.filter((exp) => likedSlugs.includes(exp.slug));
  }, [allExperiences, likedSlugs]);

  // ヘッダーのURLパラメータ（検索・時間フィルタ）を取得
  const searchQuery = (router.query.q as string) || "";
  const selectedDuration = (router.query.duration as string) || "all";

  // 時間を分に変換
  const parseDuration = (duration: string): number => {
    const match = duration.match(/(\d+)/);
    return match ? parseInt(match[1]) : 0;
  };

  // 統合アイテムリストとフィルタリング
  const filteredItems = useMemo(() => {
    const mdxItems: SavedItem[] = likedExperiences.map((exp) => ({
      type: "mdx",
      data: exp,
    }));

    const aiItems: SavedItem[] = savedAiCards.map((card) => ({
      type: "ai",
      data: card,
    }));

    let all = [...mdxItems, ...aiItems];

    // 時間フィルタ
    if (selectedDuration !== "all") {
      all = all.filter((item) => {
        const duration = item.type === "mdx" ? item.data.duration : undefined;
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
      });
    }

    // 検索フィルタ
    const q = searchQuery.trim().toLowerCase();
    if (!q) return all;

    const terms = Array.from(
      new Set(
        q
          .split(/[,\s]+/)
          .map((s) => s.trim())
          .filter(Boolean),
      ),
    );

    const scored = all.map((item) => {
      let title = "",
        summary = "",
        tags: string[] = [],
        motivationTags: string[] = [];

      if (item.type === "mdx") {
        title = (item.data.title || "").toLowerCase();
        summary = (item.data.summary || "").toLowerCase();
        tags = (item.data.tags || []).map((t) => (t || "").toLowerCase());
        motivationTags = (item.data.motivationTags || []).map((t) =>
          (t || "").toLowerCase(),
        );
      } else {
        title = (item.data.place.name || "").toLowerCase();
        summary = (
          item.data.place.editorial_summary?.overview || ""
        ).toLowerCase();
        tags = (item.data.place.types || []).map((t) =>
          (t || "").toLowerCase(),
        );
        // AI items don't have separate motivationTags usually
      }

      let score = 0;
      for (const term of terms) {
        if (title.includes(term)) score += 10;
        if (tags.some((t) => t.includes(term))) score += 8;
        if (motivationTags.some((t) => t.includes(term))) score += 6;
        if (summary.includes(term)) score += 5;
      }

      return { item, score };
    });

    // スコア順にソート（スコア0は除外しない、または末尾にするなど調整可能）
    // ここではスコア > 0 のものだけに絞るか、並び替えて全部出すか。
    // 既存ロジックは並び替えのみだったので、並び替えにする。
    scored.sort((a, b) => b.score - a.score);

    // 検索クエリがある場合は、スコア > 0 のものに絞るのが一般的だが、
    // 前回の実装に合わせてスコア順で返すだけにする（ただし、全くマッチしないものを出すかどうかは仕様次第）
    // ここではスコア0でも出すが、順序は最後になる。
    // もし検索結果として「絞り込み」たいなら filter(s => s.score > 0) を入れるべき。
    // 既存の `filteredExperiences` はフィルタリングしていなかったので、並び替えのみ。
    // しかし `filterByDuration` は絞り込みだった。
    // 検索ワードが入っているのに全然関係ないものが出るのは変なので、score > 0 で絞る。
    return scored.filter((s) => s.score > 0).map((s) => s.item);
  }, [likedExperiences, savedAiCards, searchQuery, selectedDuration]);

  const handleAiSaveStateChange =
    (activityId: string) => (state: PlaceSaveState) => {
      if (!state.saved) {
        setSavedAiCards((prev) =>
          prev.filter((card) => card.generatedActivityId !== activityId),
        );
      }
    };

  const handlePlaceDetailsClick = (place: PlacePayload) => {
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
  };

  // MDXアイテム用のバッチ評価取得
  // MDXアイテムに含まれる googlePlaceId を抽出
  const mdxPlaceIds = useMemo(() => {
    return filteredItems
      .filter((item) => item.type === "mdx")
      .map((item) => (item.data as Experience).googlePlaceId)
      .filter(Boolean) as string[];
  }, [filteredItems]);

  const { getRating } = useBatchRatings({
    placeIds: mdxPlaceIds,
    enabled: mdxPlaceIds.length > 0,
  });

  if (!user) {
    return null; // リダイレクト中
  }

  return (
    <>
      <Head>
        <title>Saved Activities | Gappy</title>
        <meta name="description" content="View all your saved activities" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="robots" content="noindex, nofollow" />
        <link rel="canonical" href="https://gappytravel.com/liked-activities" />
      </Head>

      <Header />

      <main id="main-content" className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">
              Saved Activities
            </h1>
            <p className="text-gray-600">
              {isLoading || isLoadingAi
                ? "Loading..."
                : `${filteredItems.length} saved ${
                    filteredItems.length === 1 ? "item" : "items"
                  }`}
            </p>
          </div>

          {/* Error Display */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
              <p className="text-red-800">{error}</p>
            </div>
          )}

          {/* Loading State */}
          {(isLoading || (isLoadingAi && savedAiCards.length === 0)) && (
            <div className="flex items-center justify-center py-12">
              <div className="w-12 h-12 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
            </div>
          )}

          {/* Empty State */}
          {!isLoading &&
            !isLoadingAi &&
            !error &&
            filteredItems.length === 0 && (
              <div className="bg-white rounded-lg shadow-sm p-12 text-center">
                <svg
                  className="w-24 h-24 mx-auto mb-4 text-gray-300"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
                  />
                </svg>
                <h2 className="text-xl font-semibold text-gray-900 mb-2">
                  No saved activities yet
                </h2>
                <p className="text-gray-600 mb-6">
                  When you find activities you like, click the heart icon to
                  save them here
                </p>
                <button
                  onClick={() => router.push("/experiences")}
                  className="inline-flex items-center px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Explore Activities
                </button>
              </div>
            )}

          {/* Integrated Grid */}
          {!isLoading && !error && filteredItems.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {filteredItems.map((item) => {
                if (item.type === "mdx") {
                  const it = item.data;
                  const price = it.price ? `¥${it.price.toLocaleString()}` : "";
                  const duration = it.duration || "";
                  const imageUrl =
                    it.coverImage || "/images/placeholder-experience.jpg";

                  const CardContent = (
                    <div className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-xl transition-shadow h-full flex flex-col">
                      {/* Image Area - Fixed height matching PlaceCard */}
                      <div className="relative h-72 bg-gray-200">
                        <Image
                          src={imageUrl}
                          alt={it.title}
                          fill
                          sizes="(max-width: 1024px) 100vw, 25vw"
                          className="object-cover"
                          loading="lazy"
                        />

                        {/* Like Button removed from top right */}

                        {/* Overlay Badges */}
                        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 via-transparent to-transparent px-3 py-2 flex items-center justify-between">
                          <div className="flex items-center gap-1">
                            {it.affiliateUrl && (
                              <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold text-white bg-purple-500">
                                体験
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-1">
                            {duration && (
                              <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold text-white bg-blue-500">
                                {duration}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Content Area */}
                      <div className="p-4 flex flex-col flex-1">
                        <h3 className="text-xs font-semibold text-gray-900 mb-1 line-clamp-2">
                          {it.title}
                        </h3>

                        {/* Price / Rating Row */}
                        <div className="flex items-center justify-between mb-1.5">
                          {/* Rating */}
                          <div className="flex items-center gap-1.5 text-[11px]">
                            {it.googlePlaceId && (
                              <LazyGoogleMapsRating
                                placeId={it.googlePlaceId}
                                size="sm"
                                showCount={false}
                                className="text-xs"
                                rating={getRating(it.googlePlaceId)?.rating}
                                userRatingsTotal={
                                  getRating(it.googlePlaceId)
                                    ?.user_ratings_total
                                }
                              />
                            )}
                          </div>
                          {/* Price */}
                          <div className="text-sm font-bold text-green-600">
                            {price}
                          </div>
                        </div>

                        {/* Spacer */}
                        <div className="flex-1" />

                        {/* Footer Buttons */}
                        <div className="flex gap-2 mt-2">
                          <div className="flex-1">
                            <LikeButton
                              activitySlug={it.slug}
                              source="card"
                              variant="button"
                            />
                          </div>
                          {it.affiliateUrl ? (
                            <div className="flex-1 rounded-lg bg-gradient-to-r from-purple-500 to-purple-600 px-3 py-1.5 text-[11px] font-semibold text-white shadow hover:shadow-lg transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-purple-500 text-center">
                              Book Now
                            </div>
                          ) : (
                            <div className="flex-1 rounded-lg bg-blue-600 px-3 py-1.5 text-[11px] font-semibold text-white shadow hover:bg-blue-700 transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500 text-center">
                              View Details
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );

                  return (
                    <article key={`mdx-${it.slug}`}>
                      {it.affiliateUrl ? (
                        <a
                          href={it.affiliateUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="block h-full"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (
                              typeof window !== "undefined" &&
                              (window as any).gtag
                            ) {
                              (window as any).gtag("event", "affiliate_click", {
                                experience_slug: it.slug,
                                experience_title: it.title,
                                page_location: window.location.pathname,
                              });
                            }
                          }}
                        >
                          {CardContent}
                        </a>
                      ) : (
                        <Link
                          href={`/experiences/${it.slug}`}
                          className="block h-full"
                        >
                          {CardContent}
                        </Link>
                      )}
                    </article>
                  );
                } else {
                  // AI Item (PlaceCard)
                  const card = item.data;
                  return (
                    <PlaceCard
                      key={`ai-${card.generatedActivityId}`}
                      place={card.place}
                      saveSource={card.source as any}
                      initialSaveState={{
                        saved: true,
                        generatedActivityId: card.generatedActivityId,
                      }}
                      onSaveStateChange={handleAiSaveStateChange(
                        card.generatedActivityId,
                      )}
                      onSelect={handlePlaceDetailsClick}
                      onDetailsClick={handlePlaceDetailsClick}
                      disableCardClick
                      className="h-full"
                    />
                  );
                }
              })}
            </div>
          )}
        </div>
      </main>

      <Footer />
    </>
  );
}

export const getStaticProps: GetStaticProps = async ({ locale }) => {
  const allExperiences = await getAllItems("experiences", locale);

  return {
    props: {
      allExperiences,
      ...(await serverSideTranslations(locale ?? "en", ["common"])),
    },
    revalidate: 3600, // 1時間ごとに再生成
  };
};
