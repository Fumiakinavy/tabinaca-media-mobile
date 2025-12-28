import { CategoryConfig } from "../types";

/**
 * 旅行動機カテゴリの設定
 * handSortedIds: 手動で並び順を指定する体験ID配列
 * 配列の順序でカード表示順が決まる
 */
export const TRAVEL_MOTIVATION_CATEGORIES: CategoryConfig[] = [
  {
    id: "family-time",
    name: "family-time",
    displayName: "Family Time",
    bannerImage: "/images/travel motivation pics/family time.jpg",
    catchCopy: "Create unforgettable memories with your loved ones in Shibuya",
    handSortedIds: [
      // 手動ソート用: 体験IDを優先順に配列
      // 例: 'oku-shibuya-mini-aquarium-workshop'
    ],
  },
  {
    id: "move-adventure",
    name: "move-adventure",
    displayName: "Move & Adventure",
    bannerImage: "/images/travel motivation pics/move&adventure.png",
    catchCopy: "Discover thrilling adventures in Tokyo's dynamic heart",
    handSortedIds: [],
  },
  {
    id: "relax-recharge",
    name: "relax-recharge",
    displayName: "Relax & Recharge",
    bannerImage: "/images/travel motivation pics/relax&recharge.jpg",
    catchCopy: "Find your perfect escape in the heart of bustling Shibuya",
    handSortedIds: [],
  },
  {
    id: "culture-heritage",
    name: "culture-heritage",
    displayName: "Culture & Heritage",
    bannerImage: "/images/travel motivation pics/culture&heritage.jpg",
    catchCopy: "Immerse yourself in authentic Japanese culture and traditions",
    handSortedIds: [
      // 着付け体験を優先表示
      "shibuya-tsumugi-kimono-dressing-experience",
    ],
  },
  {
    id: "shop-craft",
    name: "shop-craft",
    displayName: "Shop & Craft",
    bannerImage: "/images/travel motivation pics/shop&craft.jpg",
    catchCopy: "Create and discover unique crafts and shopping experiences",
    handSortedIds: [],
  },
  {
    id: "taste-local-flavors",
    name: "taste-local-flavors",
    displayName: "Taste Local Flavors",
    bannerImage: "/images/travel motivation pics/taste local flavors.png",
    catchCopy: "Savor authentic Tokyo flavors in Shibuya",
    handSortedIds: [],
  },
  {
    id: "stroll-observe",
    name: "stroll-observe",
    displayName: "Stroll & Observe",
    bannerImage: "/images/travel motivation pics/stroll_shibuya.jpg",
    catchCopy: "Take leisurely walks and observe the vibrant life of Shibuya",
    handSortedIds: [],
  },
];

/**
 * カテゴリIDからカテゴリ設定を取得
 */
export const getCategoryConfig = (
  categoryId: string,
): CategoryConfig | undefined => {
  return TRAVEL_MOTIVATION_CATEGORIES.find(
    (category) => category.id === categoryId,
  );
};

/**
 * 利用可能なカテゴリIDの配列を取得
 */
export const getAvailableCategoryIds = (): string[] => {
  return TRAVEL_MOTIVATION_CATEGORIES.map((category) => category.id);
};

export const sortExperiencesByCategory = (
  experiences: any[], // TODO: 適切な型に置き換える
  categoryId: string,
): any[] => {
  const categoryExperiences = experiences.filter((experience) => {
    if (experience.motivationTags && Array.isArray(experience.motivationTags)) {
      return experience.motivationTags.includes(categoryId);
    }
    if (experience.tags && Array.isArray(experience.tags)) {
      return experience.tags.includes(categoryId);
    }
    return false;
  });

  const categoryConfig = getCategoryConfig(categoryId);
  if (!categoryConfig || !categoryConfig.handSortedIds.length) {
    return categoryExperiences.sort(
      (a, b) =>
        new Date(b.createdAt || b.date).getTime() -
        new Date(a.createdAt || a.date).getTime(),
    );
  }

  const { handSortedIds } = categoryConfig;
  const sortedExperiences: any[] = [];
  const unsortedExperiences: any[] = [];

  categoryExperiences.forEach((experience) => {
    const sortIndex = handSortedIds.indexOf(experience.slug);
    if (sortIndex !== -1) {
      sortedExperiences[sortIndex] = experience;
    } else {
      unsortedExperiences.push(experience);
    }
  });

  const filteredSortedExperiences = sortedExperiences.filter(Boolean);
  const sortedUnsortedExperiences = unsortedExperiences.sort(
    (a, b) =>
      new Date(b.createdAt || b.date).getTime() -
      new Date(a.createdAt || a.date).getTime(),
  );

  return [...filteredSortedExperiences, ...sortedUnsortedExperiences];
};
