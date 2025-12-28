import { GetStaticProps, GetStaticPaths } from "next";
import { serverSideTranslations } from "next-i18next/serverSideTranslations";
import { getAllItems } from "../../lib/mdx";
import { getExperienceImagePath } from "../../lib/mdx";
import {
  getCategoryConfig,
  getAvailableCategoryIds,
} from "../../config/categories";
import { Experience, CategoryConfig } from "../../types";
import { ExperienceFrontMatter } from "../../types/experiences";
import MotivationView from "../../components/MotivationView";
import { i18n } from "../../next-i18next.config.js";
import {
  filterExperiencesByCategory,
  sortExperiencesByDate,
} from "../../lib/experienceUtils";

// Edge Runtimeはnext-i18nextと互換性がないため削除
// export const runtime = 'experimental-edge';

interface CategoryPageProps {
  experiences: Experience[];
  category: string;
  categoryConfig: CategoryConfig;
  initialTotalCount: number;
}

export default function CategoryPage(props: CategoryPageProps) {
  return <MotivationView {...props} />;
}

export const getStaticPaths: GetStaticPaths = async () => {
  const categoryIds = getAvailableCategoryIds();
  const locales = i18n.locales;

  const paths = locales.flatMap((locale) =>
    categoryIds.map((categoryId) => ({
      params: { category: categoryId },
      locale,
    })),
  );

  return {
    paths,
    fallback: "blocking",
  };
};

export const getStaticProps: GetStaticProps = async ({ params, locale }) => {
  const category = params?.category as string;
  const currentLocale = locale || i18n.defaultLocale;
  const categoryConfig = getCategoryConfig(category);

  if (!categoryConfig) {
    return {
      notFound: true,
    };
  }

  try {
    const allExperiences = (await getAllItems(
      "experiences",
      currentLocale,
    )) as unknown as ExperienceFrontMatter[];
    // 最新のカテゴリフィルタロジックを使用
    const filtered = filterExperiencesByCategory(allExperiences, category);
    const sorted = sortExperiencesByDate(filtered);
    // const initialExperiences = sorted.slice(0, 12);
    const initialExperiences = sorted;

    const normalizedExperiences: Experience[] = initialExperiences.map(
      (experience: any) => {
        let coverImage = experience.coverImage;
        if (!coverImage) {
          coverImage =
            getExperienceImagePath(experience.slug) ||
            "/images/placeholder-experience.jpg";
        }
        return {
          id: experience.slug,
          slug: experience.slug,
          title: experience.title,
          summary: experience.summary,
          coverImage,
          price: experience.price || 0,
          duration: experience.duration || "60 min",
          walkingTimeFromStation:
            experience.locationFromStation ||
            "5 min walk from shibuya station hachiko exit",
          couponCode: experience.couponCode || null,
          discount: experience.discount || null,
          createdAt: experience.date || new Date().toISOString(),
          categoryIds: [category],
          tags: experience.tags || [],
          motivationTags: experience.motivationTags || [],
          isActive: true,
          location: experience.location || null,
          address: experience.address || null,
        };
      },
    );

    return {
      props: {
        experiences: normalizedExperiences,
        category,
        categoryConfig,
        initialTotalCount: filtered.length,
        ...(await serverSideTranslations(currentLocale, ["common"])),
      },
      revalidate: 3600,
    };
  } catch (error) {
    console.error(
      `Error fetching experiences for category ${category} in locale ${currentLocale}:`,
      error,
    );
    return {
      props: {
        experiences: [],
        category,
        categoryConfig,
        initialTotalCount: 0,
        ...(await serverSideTranslations(currentLocale, ["common"])),
      },
    };
  }
};
