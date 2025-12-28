import { GetStaticProps } from "next";
import Head from "next/head";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import Link from "next/link";
import Image from "next/image";
import { useTranslation } from "next-i18next";
import { serverSideTranslations } from "next-i18next/serverSideTranslations";
import ArticleCard from "@/components/ArticleCard";
import PageHero from "@/components/PageHero";
import SectionHeader from "@/components/SectionHeader";
import HorizontalSlider from "@/components/HorizontalSlider";

interface Article {
  title: string;
  slug: string;
  date: string;
  coverImage: string;
  summary: string;
  tags?: string[];
  author?: string;
  readTime?: string;
}

interface ArticlesPageProps {
  articles: Article[];
}

export default function ArticlesPage({ articles }: ArticlesPageProps) {
  const { t } = useTranslation("common");

  // coverImage補完（サーバー側で設定済み。無い場合のみプレースホルダー）
  const articlesWithImage = articles.map((article) => ({
    ...article,
    coverImage: article.coverImage || "/images/placeholder-experience.jpg",
  }));

  // --- Top Articles（人気記事ランキング） ---
  const rankingSlugs = [
    "shibuya-beginners-guide",
    "perfect-shibuya-half-day-tour-2025",
    "shibuya-crossing-view-guide-2025",
    "shibuya-area-guide-map",
    "shibuya-station-master-guide-2025",
    "shibuya-street-style-guide",
  ];
  const topArticles = rankingSlugs
    .map((slug) => articlesWithImage.find((a) => a.slug === slug))
    .filter(Boolean);

  // --- New Articles（新着記事） ---
  const sortedByDate = [...articlesWithImage].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
  );
  const newArticles = sortedByDate.slice(0, 6);

  // --- All Articles（全記事） ---
  const allArticles = articlesWithImage;

  return (
    <>
      <Head>
        <title>{`${t("articles.title")} | Gappy`}</title>
        <meta name="description" content={t("articles.subtitle")} />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="canonical" href="https://gappytravel.com/articles" />
      </Head>

      <Header />

      <main id="main-content" className="min-h-screen bg-gray-50">
        <PageHero
          title="Latest Articles in Shibuya"
          subtitle="Discover the best of Shibuya: trends, sightseeing, food, and unique experiences!"
          backgroundImage="/images/articles/shibuya-area-guide-map.png"
          backgroundAlt="Shibuya Hero"
          height="medium"
          overlayType="dark"
        />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Top Articles セクション */}
          {topArticles.length > 0 && (
            <section className="mb-12 sm:mb-16">
              <SectionHeader
                title="Top Articles"
                subtitle="Most popular guides and tips"
                backgroundImage="/images/articles/shibuya-beginners-guide.png"
                backgroundAlt="Top Articles"
              />

              <HorizontalSlider>
                {topArticles.map(
                  (article, index) =>
                    article && (
                      <div
                        key={article.slug}
                        className="flex-shrink-0 w-72 sm:w-80"
                      >
                        <div className="relative">
                          {/* ランキングバッジ */}
                          <div className="absolute top-3 left-3 z-10 bg-primary-500 text-white w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm shadow-lg">
                            {index + 1}
                          </div>
                          <ArticleCard article={article} />
                        </div>
                      </div>
                    ),
                )}
              </HorizontalSlider>
            </section>
          )}

          {/* New Articles セクション */}
          {newArticles.length > 0 && (
            <section className="mb-12 sm:mb-16">
              <SectionHeader
                title="New Articles"
                subtitle="Fresh content and latest updates"
                backgroundImage="/images/articles/navigating-japan-trendsetting-heart.png"
                backgroundAlt="New Articles"
                badge={{
                  text: "NEW",
                  color: "bg-red-500 text-white",
                }}
              />

              <HorizontalSlider>
                {newArticles.map((article) => (
                  <div
                    key={article.slug}
                    className="flex-shrink-0 w-72 sm:w-80"
                  >
                    <ArticleCard article={article} />
                  </div>
                ))}
              </HorizontalSlider>
            </section>
          )}

          {/* All Articles セクション */}
          {allArticles.length > 0 && (
            <section className="mb-12 sm:mb-16">
              <SectionHeader
                title="All Articles"
                subtitle="Complete collection of Shibuya guides"
                backgroundImage="/images/articles/unveiling-tokyo-magnets.png"
                backgroundAlt="All Articles"
              />

              <HorizontalSlider>
                {allArticles.map((article) => (
                  <div
                    key={article.slug}
                    className="flex-shrink-0 w-72 sm:w-80"
                  >
                    <ArticleCard article={article} />
                  </div>
                ))}
              </HorizontalSlider>
            </section>
          )}

          {/* 記事がない場合 */}
          {allArticles.length === 0 && (
            <div className="text-center py-16">
              <div className="text-gray-400 text-6xl mb-4">
                <div className="w-16 h-16 mx-auto bg-gray-100 rounded-full flex items-center justify-center">
                  <div className="w-8 h-8 bg-gray-300 rounded-full"></div>
                </div>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                {t("articles.noArticles", "No articles available")}
              </h3>
              <p className="text-gray-600">
                We're working on bringing you amazing content. Check back soon!
              </p>
            </div>
          )}
        </div>
      </main>

      <Footer />
    </>
  );
}

export const getStaticProps: GetStaticProps = async ({ locale }) => {
  const { getAllItems } = await import("@/lib/mdx");
  const articles = await getAllItems("articles", locale);

  return {
    props: {
      articles,
      ...(await serverSideTranslations(locale ?? "en", ["common"])),
    },
    revalidate: 3600, // 1時間ごとに再生成
  };
};
