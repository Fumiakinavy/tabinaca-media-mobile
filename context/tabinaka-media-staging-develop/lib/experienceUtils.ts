import {
  ExperienceFrontMatter,
  Experience,
  frontMatterToExperience,
} from "../types/experiences";

/**
 * 体験データ処理のユーティリティ関数
 */

/**
 * カテゴリに基づいて体験をフィルタリング
 */
export function filterExperiencesByCategory(
  experiences: ExperienceFrontMatter[],
  categoryId: string,
): ExperienceFrontMatter[] {
  return experiences.filter((experience) => {
    // motivationTagsが存在し、指定されたカテゴリIDが含まれているかチェック
    if (experience.motivationTags && Array.isArray(experience.motivationTags)) {
      return experience.motivationTags.includes(categoryId);
    }
    // 後方互換性: 古いtagsシステムもサポート
    if (experience.tags && Array.isArray(experience.tags)) {
      return experience.tags.includes(categoryId);
    }
    return false;
  });
}

/**
 * 体験データを日付順にソート
 */
export function sortExperiencesByDate(
  experiences: ExperienceFrontMatter[],
): ExperienceFrontMatter[] {
  return experiences.sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
  );
}

/**
 * 手動ソートIDに基づいて体験をソート
 */
export function sortExperiencesByHandSortIds(
  experiences: ExperienceFrontMatter[],
  slugs: string[],
  handSortedIds: string[],
): ExperienceFrontMatter[] {
  if (!handSortedIds.length) {
    return sortExperiencesByDate(experiences);
  }

  const sortedExperiences: ExperienceFrontMatter[] = [];
  const unsortedExperiences: ExperienceFrontMatter[] = [];

  experiences.forEach((experience, index) => {
    const slug = slugs[index];
    const sortIndex = handSortedIds.indexOf(slug);
    if (sortIndex !== -1) {
      sortedExperiences[sortIndex] = experience;
    } else {
      unsortedExperiences.push(experience);
    }
  });

  const filteredSortedExperiences = sortedExperiences.filter(Boolean);
  const sortedUnsortedExperiences = sortExperiencesByDate(unsortedExperiences);

  return [...filteredSortedExperiences, ...sortedUnsortedExperiences];
}

/**
 * MDXデータをExperience型に正規化
 */
export function normalizeExperienceData(
  rawExperiences: any[],
  categoryId?: string,
): Experience[] {
  return rawExperiences.map((rawExperience) => {
    const frontMatter: ExperienceFrontMatter = {
      title: rawExperience.title,
      summary: rawExperience.summary,
      coverImage: rawExperience.coverImage,
      price: rawExperience.price,
      duration: rawExperience.duration,
      level: rawExperience.level,
      couponCode: rawExperience.couponCode,
      discount: rawExperience.discount,
      date: rawExperience.date,
      tags: rawExperience.tags || [],
      motivationTags: rawExperience.motivationTags || [],
      address: rawExperience.address,
      location: rawExperience.location,
      maxParticipants: rawExperience.maxParticipants,
      businessName: rawExperience.businessName,
      placeId: rawExperience.placeId,
      phone: rawExperience.phone,
    };

    return frontMatterToExperience(
      frontMatter,
      rawExperience.slug,
      categoryId ? [categoryId] : [],
    );
  });
}
