import { GetStaticPaths, GetStaticProps } from "next";
import {
  getAllSlugs,
  getItemBySlug,
  getArticleImagePath,
  getAllItems,
} from "@/lib/mdx";
import ArticleTemplate from "@/components/ArticleTemplate";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import Head from "next/head";
import { MDXRemote } from "next-mdx-remote";
import { useTranslation } from "next-i18next";
import { serverSideTranslations } from "next-i18next/serverSideTranslations";
import SeoStructuredData from "@/components/SeoStructuredData";
import {
  buildArticleStructuredData,
  buildBreadcrumbStructuredData,
} from "@/lib/structuredData";

// Edge Runtimeはnext-i18nextと互換性がないため削除
// export const runtime = 'experimental-edge';

interface ArticlePageProps {
  content: any;
  frontMatter: {
    title: string;
    date: string;
    coverImage: string;
    summary: string;
    tags?: string[];
    author?: string;
    readTime?: string;
    location?: {
      lat: number;
      lng: number;
    };
  };
  allExperiences: any[]; // 追加
  pageUrl: string;
  siteUrl: string;
  localeCode: string;
}

export default function ArticlePage({
  content,
  frontMatter,
  allExperiences = [],
  pageUrl,
  siteUrl,
  localeCode,
}: ArticlePageProps) {
  const { t } = useTranslation("common");

  const structuredData = [
    buildArticleStructuredData({
      name: frontMatter.title,
      description: frontMatter.summary,
      image: frontMatter.coverImage,
      datePublished: frontMatter.date,
      dateModified: frontMatter.date,
      authorName: frontMatter.author || "Gappy Team",
      authorType: frontMatter.author ? "Person" : "Organization",
      publisherName: "Gappy",
      publisherLogo: "https://gappytravel.com/gappy_icon.png",
      url: pageUrl,
      inLanguage: localeCode,
      articleSection:
        frontMatter.tags && frontMatter.tags.length > 0
          ? frontMatter.tags[0]
          : undefined,
      aboutPlace: frontMatter.location
        ? {
            name: "Shibuya, Tokyo",
            latitude: frontMatter.location.lat,
            longitude: frontMatter.location.lng,
          }
        : undefined,
    }),
    buildBreadcrumbStructuredData([
      { name: "Home", url: siteUrl },
      { name: "Articles", url: `${siteUrl}/articles` },
      { name: frontMatter.title, url: pageUrl },
    ]),
  ];

  return (
    <>
      <Head>
        <title>{`${frontMatter.title}${t("pages.article.pageTitle")}`}</title>
        <meta name="description" content={frontMatter.summary} />
        <meta property="og:title" content={frontMatter.title} />
        <meta property="og:description" content={frontMatter.summary} />
        <meta property="og:image" content={frontMatter.coverImage} />
        <meta property="og:type" content="article" />
        <meta name="twitter:card" content="summary_large_image" />
        <link rel="canonical" href={pageUrl} />
        <SeoStructuredData data={structuredData} />
      </Head>

      <Header />

      <main>
        <ArticleTemplate
          title={frontMatter.title}
          date={frontMatter.date}
          coverImage={frontMatter.coverImage}
          content={<MDXRemote {...content} />}
          tags={frontMatter.tags}
          author={frontMatter.author}
          readTime={frontMatter.readTime}
          location={frontMatter.location}
          allExperiences={allExperiences}
        />
      </main>

      <Footer />
    </>
  );
}

export const getStaticPaths: GetStaticPaths = async ({ locales }) => {
  const paths: Array<{ params: { slug: string }; locale: string }> = [];

  // 各ロケールのパスを生成
  for (const locale of locales || ["en"]) {
    const slugs = await getAllSlugs("articles", locale);
    for (const slug of slugs) {
      paths.push({
        params: { slug },
        locale,
      });
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
      "articles",
      slug,
      locale,
    );
    // coverImage補完
    const coverImage =
      frontMatter.coverImage ||
      getArticleImagePath(slug) ||
      "/images/placeholder-experience.jpg";
    // 体験データも取得
    const allExperiences = await getAllItems("experiences", locale);
    const siteUrl =
      process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ??
      "https://gappytravel.com";
    return {
      props: {
        content,
        frontMatter: { ...frontMatter, coverImage },
        allExperiences,
        pageUrl: `${siteUrl}/articles/${slug}`,
        siteUrl,
        localeCode: locale ?? "en",
        ...(await serverSideTranslations(locale ?? "en", ["common"])),
      },
      // ISR: 1時間ごとに再生成
      revalidate: 3600,
    };
  } catch (error) {
    console.error("Error loading article:", error);
    return {
      notFound: true,
    };
  }
};
