// Category Inference: Map user category to Google Places types

import { UserVector } from "./userVector";

export type Category = "eat" | "feel" | "make" | "learn" | "play";

export interface CategoryMapping {
  types: string[];
  keywords: string[];
  baseWeight: number;
}

export interface SearchStrategy {
  primaryTypes: string[];
  fallbackTypes: string[];
  keywords: string[];
  searchRadius: number;
}

const CATEGORY_MAPPINGS: Record<Category, CategoryMapping> = {
  eat: {
    types: ["restaurant", "food", "cafe", "bakery"],
    keywords: ["food", "restaurant", "cafe", "dining"],
    baseWeight: 1.0,
  },
  feel: {
    types: [
      "tourist_attraction",
      "park",
      "natural_feature",
      "point_of_interest",
      "spa",
      "beauty_salon",
      "health",
    ],
    keywords: [
      "view",
      "scenic",
      "attraction",
      "landmark",
      "relaxing",
      "peaceful",
      "zen",
      "meditation",
      "wellness",
      "spa",
      "massage",
      "healing",
      "tranquil",
      "serene",
      "calm",
      "experience",
      "feeling",
      "emotional",
      "sensory",
      "体験",
      "癒し",
      "リラックス",
      "瞑想",
      "スパ",
    ],
    baseWeight: 1.1, // 体験系は重要度を上げる
  },
  make: {
    types: [
      "tourist_attraction",
      "art_gallery",
      "museum",
      "point_of_interest",
      "establishment",
      "store",
      "shopping_mall",
    ],
    keywords: [
      "workshop",
      "craft",
      "experience",
      "hands-on",
      "art",
      "pottery",
      "ceramics",
      "painting",
      "sculpture",
      "class",
      "lesson",
      "studio",
      "atelier",
      "maker",
      "creative",
      "diy",
      "traditional",
      "cultural",
      "activity",
      "体験",
      "工房",
      "教室",
      "アトリエ",
    ],
    baseWeight: 1.2, // workshop系は重要度を上げる
  },
  learn: {
    types: ["museum", "art_gallery", "library", "tourist_attraction"],
    keywords: ["museum", "gallery", "educational", "cultural", "history"],
    baseWeight: 1.0,
  },
  play: {
    types: ["bowling_alley", "amusement_park", "night_club", "bar", "aquarium"],
    keywords: ["entertainment", "fun", "game", "nightlife"],
    baseWeight: 1.0,
  },
};

export function getCategoryMapping(
  category: Category,
  userVector: UserVector,
  indoorPreferred: boolean,
): CategoryMapping {
  const baseMapping = { ...CATEGORY_MAPPINGS[category] };

  // Adjust based on userVector
  const adjustedTypes = [...baseMapping.types];
  const adjustedKeywords = [...baseMapping.keywords];

  // Nature high → upweight nature-related types
  if (userVector.nature >= 0.7) {
    adjustedTypes.push("park", "natural_feature");
    adjustedKeywords.push("nature", "outdoor", "garden");
    baseMapping.baseWeight += 0.2;
  }

  // Social high → upweight group/賑やか types
  if (userVector.social >= 0.7) {
    adjustedTypes.push("night_club", "amusement_park", "bar");
    adjustedKeywords.push("social", "lively", "group");
  }

  // Plan low → prefer free-walking types
  if (userVector.plan <= 0.3) {
    adjustedTypes.push("park", "tourist_attraction");
    adjustedKeywords.push("walk", "explore", "free");
  }

  // Immersion high → prefer workshop/cultural
  if (userVector.immersion >= 0.7) {
    adjustedTypes.push("museum", "art_gallery");
    adjustedKeywords.push("workshop", "experience", "cultural", "immersive");
  }

  // Indoor preferred
  if (indoorPreferred) {
    adjustedTypes.push("museum", "art_gallery", "shopping_mall", "aquarium");
    adjustedKeywords.push("indoor", "covered", "mall");
  } else {
    adjustedTypes.push("park", "natural_feature");
    adjustedKeywords.push("outdoor", "nature");
  }

  return {
    types: [...new Set(adjustedTypes)],
    keywords: [...new Set(adjustedKeywords)],
    baseWeight: baseMapping.baseWeight,
  };
}

export function getIndoorTypes(): string[] {
  return ["museum", "art_gallery", "shopping_mall", "aquarium", "library"];
}

export function getOutdoorTypes(): string[] {
  return ["park", "natural_feature", "campground"];
}

/**
 * カテゴリに基づいて最適な検索クエリを生成
 */
export function generateSearchQueries(
  category: Category,
  userVector: UserVector,
  location?: string,
): string[] {
  const baseQueries: Record<Category, string[]> = {
    eat: ["restaurants", "cafes", "food", "dining"],
    feel: ["spa", "wellness", "relaxing places", "meditation", "zen"],
    make: [
      "workshop",
      "craft",
      "pottery",
      "art class",
      "creative experience",
      "atelier",
    ],
    learn: ["museum", "gallery", "cultural", "educational", "history"],
    play: [
      "entertainment",
      "fun activities",
      "nightlife",
      "games",
      "amusement",
    ],
  };

  let queries = [...baseQueries[category]];

  // ユーザー属性に基づいてクエリを調整
  if (userVector.social >= 0.7) {
    queries = queries.map((q) => `${q} group social`);
  }

  if (userVector.nature >= 0.7) {
    queries = queries.map((q) => `${q} outdoor nature`);
  }

  if (userVector.immersion >= 0.7) {
    queries = queries.map((q) => `${q} immersive experience`);
  }

  // 場所が指定されている場合は追加
  if (location) {
    queries = queries.map((q) => `${q} in ${location}`);
  }

  return queries;
}

/**
 * カテゴリとユーザー属性に基づいて検索戦略を生成
 * Google Places APIの制約に対応するためのフォールバック戦略
 */
export function getSearchStrategies(
  category: Category,
  userVector: UserVector,
): SearchStrategy[] {
  const strategies: SearchStrategy[] = [];

  switch (category) {
    case "make":
      // workshop系は見つかりにくいので、複数の戦略を用意
      strategies.push(
        {
          primaryTypes: ["tourist_attraction", "art_gallery"],
          fallbackTypes: ["store", "establishment"],
          keywords: ["workshop", "craft", "hands-on", "体験", "工房", "教室"],
          searchRadius: 2000,
        },
        {
          primaryTypes: ["point_of_interest"],
          fallbackTypes: ["shopping_mall"],
          keywords: ["pottery", "ceramic", "cooking class", "陶芸", "料理教室"],
          searchRadius: 3000,
        },
        {
          primaryTypes: ["establishment"],
          fallbackTypes: ["tourist_attraction"],
          keywords: ["experience", "activity", "体験", "アクティビティ"],
          searchRadius: 5000,
        },
      );
      break;

    case "feel":
      // 体験・癒し系
      strategies.push(
        {
          primaryTypes: ["spa", "beauty_salon", "health"],
          fallbackTypes: ["tourist_attraction", "park"],
          keywords: [
            "spa",
            "massage",
            "healing",
            "relax",
            "スパ",
            "マッサージ",
            "癒し",
          ],
          searchRadius: 2000,
        },
        {
          primaryTypes: ["park", "natural_feature"],
          fallbackTypes: ["tourist_attraction"],
          keywords: ["zen", "meditation", "peaceful", "禅", "瞑想", "静寂"],
          searchRadius: 3000,
        },
      );
      break;

    case "eat":
      // 食事系 - より多様な戦略を追加
      strategies.push(
        {
          primaryTypes: ["restaurant"],
          fallbackTypes: ["food", "cafe"],
          keywords: ["restaurant", "dining", "レストラン", "食事"],
          searchRadius: 1500,
        },
        {
          primaryTypes: ["cafe"],
          fallbackTypes: ["bakery", "meal_takeaway"],
          keywords: ["cafe", "coffee", "カフェ", "コーヒー"],
          searchRadius: 1200,
        },
        {
          primaryTypes: ["meal_takeaway"],
          fallbackTypes: ["food"],
          keywords: ["quick", "fast", "casual", "手軽", "カジュアル"],
          searchRadius: 1000,
        },
        {
          primaryTypes: ["bakery"],
          fallbackTypes: ["cafe"],
          keywords: ["bakery", "bread", "pastry", "パン", "ベーカリー"],
          searchRadius: 1000,
        },
      );
      break;

    case "learn":
      // 学習・文化系
      strategies.push({
        primaryTypes: ["museum", "art_gallery", "library"],
        fallbackTypes: ["tourist_attraction"],
        keywords: [
          "museum",
          "gallery",
          "cultural",
          "educational",
          "美術館",
          "ギャラリー",
          "文化",
        ],
        searchRadius: 2000,
      });
      break;

    case "play":
      // エンターテイメント系
      strategies.push({
        primaryTypes: ["bowling_alley", "amusement_park", "night_club", "bar"],
        fallbackTypes: ["movie_theater", "casino"],
        keywords: [
          "entertainment",
          "fun",
          "nightlife",
          "エンターテイメント",
          "楽しい",
          "ナイトライフ",
        ],
        searchRadius: 2000,
      });
      break;

    default:
      // デフォルト戦略
      strategies.push({
        primaryTypes: ["tourist_attraction", "point_of_interest"],
        fallbackTypes: ["establishment"],
        keywords: ["experience", "activity", "体験", "アクティビティ"],
        searchRadius: 2000,
      });
  }

  // ユーザー属性に基づいて戦略を調整
  return strategies.map((strategy) => {
    const adjustedStrategy = { ...strategy };

    // 社交性が高い場合は、より多くの場所を検索
    if (userVector.social >= 0.7) {
      adjustedStrategy.searchRadius = Math.min(
        adjustedStrategy.searchRadius * 1.5,
        5000,
      );
    }

    // 自然志向が高い場合は、公園や自然エリアを優先
    if (userVector.nature >= 0.7) {
      adjustedStrategy.primaryTypes = [
        "park",
        "natural_feature",
        ...adjustedStrategy.primaryTypes,
      ];
      adjustedStrategy.keywords = [
        "outdoor",
        "nature",
        "屋外",
        "自然",
        ...adjustedStrategy.keywords,
      ];
    }

    return adjustedStrategy;
  });
}
