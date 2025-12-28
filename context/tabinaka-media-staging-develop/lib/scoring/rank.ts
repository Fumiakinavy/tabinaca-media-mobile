// Ranking Algorithm for Places

import { UserVector, Constraints } from "./userVector";
import { CategoryMapping } from "./category";

export interface PlaceData {
  place_id: string;
  name: string;
  vicinity: string;
  types: string[];
  rating: number | null;
  user_ratings_total: number | null;
  price_level: number | null;
  distance_m: number;
  open_now: boolean | null;
  photo_url: string | null;
  photos?: Array<{
    photo_reference: string;
    width: number;
    height: number;
  }>;
  maps_url: string;
  geometry: {
    location: {
      lat: number;
      lng: number;
    };
  };
}

export interface ScoredPlace extends PlaceData {
  score: number;
  breakdown: {
    categoryMatch: number;
    distanceScore: number;
    priceFit: number;
    ratingNorm: number;
    openNow: number;
    socialFit: number;
    natureFit: number;
    immersionFit: number;
    budgetFit: number;
    durationFit: number;
  };
}

export function rankPlaces(
  places: PlaceData[],
  userVector: UserVector,
  constraints: Constraints,
  categoryMapping: CategoryMapping,
): ScoredPlace[] {
  const scoredPlaces = places.map((place, index) => {
    const breakdown = {
      categoryMatch: calculateCategoryMatch(place, categoryMapping),
      distanceScore: calculateDistanceScore(
        place.distance_m,
        constraints.radiusMeters,
      ),
      priceFit: calculatePriceFit(place.price_level, constraints),
      ratingNorm: calculateRatingNorm(place.rating, place.user_ratings_total),
      openNow: place.open_now ? 1 : 0,
      socialFit: calculateSocialFit(place, userVector),
      natureFit: calculateNatureFit(place, userVector),
      immersionFit: calculateImmersionFit(place, userVector),
      budgetFit: calculateBudgetFit(place, userVector),
      durationFit: calculateDurationFit(place, userVector),
    };

    // 新しいウェイト配分：パーソナライゼーションを重視
    let baseScore =
      0.25 * breakdown.categoryMatch +
      0.15 * breakdown.distanceScore +
      0.1 * breakdown.priceFit +
      0.1 * breakdown.ratingNorm +
      0.05 * breakdown.openNow +
      0.15 * breakdown.socialFit +
      0.1 * breakdown.natureFit +
      0.05 * breakdown.immersionFit +
      0.03 * breakdown.budgetFit +
      0.02 * breakdown.durationFit;

    // 多様性を促進するためのボーナス
    const diversityBonus = calculateDiversityBonus(place, userVector);

    // 時間帯に基づくボーナス
    const timeBonus = calculateTimeBonus(place);

    // ランダム性を追加（±5%の変動）
    const randomFactor = 0.95 + Math.random() * 0.1;

    // 最終スコア
    const finalScore = (baseScore + diversityBonus + timeBonus) * randomFactor;

    return {
      ...place,
      score: finalScore,
      breakdown: {
        ...breakdown,
        diversityBonus,
        timeBonus,
        randomFactor,
      },
    };
  });

  // スコアでソートし、上位10件を返す
  return scoredPlaces.sort((a, b) => b.score - a.score).slice(0, 10);
}

// 多様性を促進するボーナス計算
function calculateDiversityBonus(
  place: PlaceData,
  userVector: UserVector,
): number {
  let bonus = 0;

  // ユニークなタイプのボーナス
  const uniqueTypes = [
    "art_gallery",
    "museum",
    "cultural_center",
    "workshop",
    "spa",
    "onsen",
  ];
  if (uniqueTypes.some((type) => place.types.includes(type))) {
    bonus += 0.05;
  }

  // 高評価だが知名度の低い場所のボーナス
  if (
    place.rating &&
    place.rating >= 4.0 &&
    place.user_ratings_total &&
    place.user_ratings_total < 100
  ) {
    bonus += 0.03;
  }

  // 隠れた名店のボーナス（評価は高いがレビュー数が少ない）
  if (
    place.rating &&
    place.rating >= 4.2 &&
    place.user_ratings_total &&
    place.user_ratings_total < 50
  ) {
    bonus += 0.08;
  }

  return bonus;
}

// 時間帯に基づくボーナス計算
function calculateTimeBonus(place: PlaceData): number {
  const hour = new Date().getHours();
  let bonus = 0;

  // 朝（6-11時）: カフェ、パン屋、朝食
  if (hour >= 6 && hour < 11) {
    if (
      place.types.includes("cafe") ||
      place.types.includes("bakery") ||
      place.name.toLowerCase().includes("breakfast") ||
      place.name.toLowerCase().includes("morning")
    ) {
      bonus += 0.05;
    }
  }

  // 昼（11-15時）: レストラン、ランチ
  if (hour >= 11 && hour < 15) {
    if (place.types.includes("restaurant") || place.types.includes("food")) {
      bonus += 0.05;
    }
  }

  // 夕方（15-18時）: カフェ、軽食
  if (hour >= 15 && hour < 18) {
    if (place.types.includes("cafe") || place.types.includes("bakery")) {
      bonus += 0.05;
    }
  }

  // 夜（18-23時）: レストラン、バー、ナイトライフ
  if (hour >= 18 && hour < 23) {
    if (
      place.types.includes("restaurant") ||
      place.types.includes("bar") ||
      place.types.includes("night_club")
    ) {
      bonus += 0.05;
    }
  }

  return bonus;
}

function calculateCategoryMatch(
  place: PlaceData,
  categoryMapping: CategoryMapping,
): number {
  let matchScore = 0;
  let matchCount = 0;

  // Type matching
  for (const type of place.types) {
    if (categoryMapping.types.includes(type)) {
      matchScore += 1;
      matchCount++;
    }
  }

  // Keyword matching (in name or vicinity)
  const searchText = `${place.name} ${place.vicinity}`.toLowerCase();
  for (const keyword of categoryMapping.keywords) {
    if (searchText.includes(keyword.toLowerCase())) {
      matchScore += 0.5;
      matchCount++;
    }
  }

  // Normalize by base weight
  return matchCount > 0
    ? Math.min(1, matchScore / 3) * categoryMapping.baseWeight
    : 0;
}

function calculateDistanceScore(distance: number, radius: number): number {
  if (distance > radius) return 0;
  return 1 - distance / radius;
}

function calculatePriceFit(
  priceLevel: number | null,
  constraints: Constraints,
): number {
  if (priceLevel === null) return 0.5; // Neutral for unknown

  if (
    priceLevel >= constraints.minPriceLevel &&
    priceLevel <= constraints.maxPriceLevel
  ) {
    return 1.0;
  }

  // Penalty for out of range
  const distance = Math.min(
    Math.abs(priceLevel - constraints.minPriceLevel),
    Math.abs(priceLevel - constraints.maxPriceLevel),
  );

  return Math.max(0, 1 - distance * 0.3);
}

function calculateRatingNorm(
  rating: number | null,
  totalRatings: number | null,
): number {
  if (rating === null) return 0.3; // Low default for unknown

  const ratingScore = rating / 5;
  const reviewWeight = totalRatings
    ? Math.log(1 + totalRatings) / Math.log(1 + 1000)
    : 0.5;

  return ratingScore * reviewWeight;
}

// 新しいパーソナライゼーション関数
function calculateSocialFit(place: PlaceData, userVector: UserVector): number {
  if (userVector.social === undefined) return 0.5; // Neutral if no data

  // 社交的な場所のキーワード（英語 + 日本語）
  const socialKeywords = [
    // 英語
    "bar",
    "restaurant",
    "cafe",
    "club",
    "pub",
    "izakaya",
    "karaoke",
    "entertainment",
    "nightlife",
    "social",
    "group",
    "party",
    "event",
    "lounge",
    "tavern",
    "bistro",
    "dining",
    "gathering",
    "meetup",
    // 日本語
    "居酒屋",
    "バー",
    "カフェ",
    "レストラン",
    "クラブ",
    "パブ",
    "カラオケ",
    "飲み会",
    "宴会",
    "交流",
    "集まり",
    "パーティー",
    "社交",
    "にぎやか",
    "賑わい",
    "活気",
    "盛り上がり",
    "宴",
    "飲食",
    "食事会",
    "懇親会",
    "親睦会",
    "ダイニング",
    "ラウンジ",
  ];

  // 一人向けの場所のキーワード（英語 + 日本語）
  const soloKeywords = [
    // 英語
    "library",
    "museum",
    "gallery",
    "temple",
    "shrine",
    "park",
    "garden",
    "quiet",
    "peaceful",
    "meditation",
    "zen",
    "solo",
    "alone",
    "tranquil",
    "serene",
    "calm",
    "silent",
    "contemplative",
    // 日本語
    "図書館",
    "美術館",
    "ギャラリー",
    "寺",
    "神社",
    "公園",
    "庭園",
    "静か",
    "落ち着く",
    "瞑想",
    "禅",
    "一人",
    "独り",
    "ひとり",
    "穏やか",
    "平和",
    "静寂",
    "癒し",
    "リラックス",
    "安らぎ",
    "静粛",
    "閑静",
    "静謐",
    "のんびり",
    "ゆったり",
  ];

  // Google Places APIのtypesも活用
  const socialTypes = [
    "bar",
    "night_club",
    "restaurant",
    "cafe",
    "meal_takeaway",
    "bowling_alley",
    "amusement_park",
    "casino",
    "movie_theater",
  ];

  const soloTypes = [
    "library",
    "museum",
    "art_gallery",
    "park",
    "cemetery",
    "church",
    "hindu_temple",
    "mosque",
    "synagogue",
  ];

  const placeText =
    `${place.name} ${place.vicinity} ${place.types.join(" ")}`.toLowerCase();

  // typesベースのマッチング
  const socialTypeCount = place.types.filter((t) =>
    socialTypes.includes(t),
  ).length;
  const soloTypeCount = place.types.filter((t) => soloTypes.includes(t)).length;

  // キーワードベースのマッチング
  const socialKeywordCount = socialKeywords.filter((k) =>
    placeText.includes(k.toLowerCase()),
  ).length;
  const soloKeywordCount = soloKeywords.filter((k) =>
    placeText.includes(k.toLowerCase()),
  ).length;

  // 統合スコア
  if (
    socialTypeCount === 0 &&
    soloTypeCount === 0 &&
    socialKeywordCount === 0 &&
    soloKeywordCount === 0
  ) {
    return 0.5; // No match found
  }

  const typeScore =
    socialTypeCount / Math.max(1, socialTypeCount + soloTypeCount);
  const keywordScore =
    socialKeywordCount / Math.max(1, socialKeywordCount + soloKeywordCount);
  const placeSocialScore = (typeScore + keywordScore) / 2;

  // ユーザーの社交性との一致度を計算
  const userSocial = userVector.social;
  if (userSocial >= 0.7) {
    return placeSocialScore;
  } else if (userSocial <= 0.3) {
    return 1 - placeSocialScore;
  } else {
    return 0.5 + (placeSocialScore - 0.5) * (userSocial - 0.5) * 2;
  }
}

function calculateNatureFit(place: PlaceData, userVector: UserVector): number {
  if (userVector.nature === undefined) return 0.5; // Neutral if no data

  // 自然・屋外のキーワード（英語 + 日本語）
  const natureKeywords = [
    // 英語
    "park",
    "garden",
    "forest",
    "mountain",
    "river",
    "lake",
    "beach",
    "outdoor",
    "nature",
    "green",
    "trees",
    "flowers",
    "hiking",
    "walking",
    "zen",
    "peaceful",
    "quiet",
    "natural",
    "botanical",
    "wildlife",
    "scenic",
    "landscape",
    "trail",
    "path",
    "meadow",
    "valley",
    // 日本語
    "公園",
    "庭園",
    "森",
    "山",
    "川",
    "湖",
    "海",
    "ビーチ",
    "屋外",
    "自然",
    "緑",
    "木",
    "花",
    "ハイキング",
    "散歩",
    "禅",
    "平和",
    "静か",
    "自然",
    "植物園",
    "野生動物",
    "景色",
    "風景",
    "トレイル",
    "小道",
    "草原",
    "谷",
  ];

  // 屋内のキーワード（英語 + 日本語）
  const indoorKeywords = [
    // 英語
    "museum",
    "gallery",
    "shopping",
    "mall",
    "center",
    "building",
    "indoor",
    "air-conditioned",
    "covered",
    "roof",
    "store",
    "department",
    "complex",
    "plaza",
    "station",
    "terminal",
    // 日本語
    "美術館",
    "ギャラリー",
    "ショッピング",
    "モール",
    "センター",
    "ビル",
    "屋内",
    "エアコン",
    "屋根",
    "店",
    "デパート",
    "複合施設",
    "プラザ",
    "駅",
    "ターミナル",
    "建物",
    "室内",
  ];

  // Google Places APIのtypesも活用
  const natureTypes = [
    "park",
    "natural_feature",
    "campground",
    "hiking_area",
    "zoo",
    "aquarium",
    "botanical_garden",
  ];

  const indoorTypes = [
    "shopping_mall",
    "department_store",
    "electronics_store",
    "museum",
    "art_gallery",
    "movie_theater",
    "bowling_alley",
  ];

  const placeText =
    `${place.name} ${place.vicinity} ${place.types.join(" ")}`.toLowerCase();

  // typesベースのマッチング
  const natureTypeCount = place.types.filter((t) =>
    natureTypes.includes(t),
  ).length;
  const indoorTypeCount = place.types.filter((t) =>
    indoorTypes.includes(t),
  ).length;

  // キーワードベースのマッチング
  const natureKeywordCount = natureKeywords.filter((k) =>
    placeText.includes(k.toLowerCase()),
  ).length;
  const indoorKeywordCount = indoorKeywords.filter((k) =>
    placeText.includes(k.toLowerCase()),
  ).length;

  // 統合スコア
  if (
    natureTypeCount === 0 &&
    indoorTypeCount === 0 &&
    natureKeywordCount === 0 &&
    indoorKeywordCount === 0
  ) {
    return 0.5; // No match found
  }

  const typeScore =
    natureTypeCount / Math.max(1, natureTypeCount + indoorTypeCount);
  const keywordScore =
    natureKeywordCount / Math.max(1, natureKeywordCount + indoorKeywordCount);
  const placeNatureScore = (typeScore + keywordScore) / 2;

  // ユーザーの自然志向との一致度を計算
  const userNature = userVector.nature;
  if (userNature >= 0.7) {
    return placeNatureScore;
  } else if (userNature <= 0.3) {
    return 1 - placeNatureScore;
  } else {
    return 0.5 + (placeNatureScore - 0.5) * (userNature - 0.5) * 2;
  }
}

function calculateImmersionFit(
  place: PlaceData,
  userVector: UserVector,
): number {
  if (userVector.immersion === undefined) return 0.5; // Neutral if no data

  // 没入感のある場所のキーワード（英語 + 日本語）
  const immersiveKeywords = [
    // 英語
    "museum",
    "gallery",
    "exhibition",
    "cultural",
    "traditional",
    "historical",
    "experience",
    "workshop",
    "class",
    "tour",
    "guided",
    "interactive",
    "theater",
    "show",
    "performance",
    "art",
    "craft",
    "ceremony",
    "immersive",
    "authentic",
    "hands-on",
    "educational",
    "learning",
    // 日本語
    "美術館",
    "ギャラリー",
    "展示",
    "文化",
    "伝統",
    "歴史",
    "体験",
    "ワークショップ",
    "教室",
    "ツアー",
    "ガイド",
    "参加型",
    "劇場",
    "ショー",
    "公演",
    "アート",
    "工芸",
    "儀式",
    "没入",
    "本格的",
    "手作り",
    "教育",
    "学習",
    "体験型",
  ];

  // カジュアルな場所のキーワード（英語 + 日本語）
  const casualKeywords = [
    // 英語
    "cafe",
    "restaurant",
    "shopping",
    "mall",
    "street",
    "market",
    "casual",
    "quick",
    "grab",
    "fast",
    "simple",
    "easy",
    "convenient",
    "accessible",
    "relaxed",
    "informal",
    // 日本語
    "カフェ",
    "レストラン",
    "ショッピング",
    "モール",
    "通り",
    "市場",
    "カジュアル",
    "手軽",
    "簡単",
    "早い",
    "シンプル",
    "気軽",
    "便利",
    "アクセス",
    "リラックス",
    "カジュアル",
  ];

  // Google Places APIのtypesも活用
  const immersiveTypes = [
    "museum",
    "art_gallery",
    "aquarium",
    "zoo",
    "tourist_attraction",
    "amusement_park",
    "movie_theater",
    "bowling_alley",
  ];

  const casualTypes = [
    "cafe",
    "restaurant",
    "shopping_mall",
    "store",
    "meal_takeaway",
    "convenience_store",
    "gas_station",
  ];

  const placeText =
    `${place.name} ${place.vicinity} ${place.types.join(" ")}`.toLowerCase();

  // typesベースのマッチング
  const immersiveTypeCount = place.types.filter((t) =>
    immersiveTypes.includes(t),
  ).length;
  const casualTypeCount = place.types.filter((t) =>
    casualTypes.includes(t),
  ).length;

  // キーワードベースのマッチング
  const immersiveKeywordCount = immersiveKeywords.filter((k) =>
    placeText.includes(k.toLowerCase()),
  ).length;
  const casualKeywordCount = casualKeywords.filter((k) =>
    placeText.includes(k.toLowerCase()),
  ).length;

  // 統合スコア
  if (
    immersiveTypeCount === 0 &&
    casualTypeCount === 0 &&
    immersiveKeywordCount === 0 &&
    casualKeywordCount === 0
  ) {
    return 0.5; // No match found
  }

  const typeScore =
    immersiveTypeCount / Math.max(1, immersiveTypeCount + casualTypeCount);
  const keywordScore =
    immersiveKeywordCount /
    Math.max(1, immersiveKeywordCount + casualKeywordCount);
  const placeImmersionScore = (typeScore + keywordScore) / 2;

  // ユーザーの没入志向との一致度を計算
  const userImmersion = userVector.immersion;
  if (userImmersion >= 0.7) {
    return placeImmersionScore;
  } else if (userImmersion <= 0.3) {
    return 1 - placeImmersionScore;
  } else {
    return 0.5 + (placeImmersionScore - 0.5) * (userImmersion - 0.5) * 2;
  }
}

function calculateBudgetFit(place: PlaceData, userVector: UserVector): number {
  if (userVector.budgetJPY === undefined) return 0.5; // Neutral if no data

  const userBudget = userVector.budgetJPY;
  const placePriceLevel = place.price_level;

  if (placePriceLevel === null) return 0.5; // Unknown price

  // 価格レベルを予想金額に変換（概算）
  const priceLevelToJPY: Record<number, number> = {
    0: 500, // 安い
    1: 1500, // 普通
    2: 3000, // 高い
    3: 5000, // とても高い
    4: 10000, // 最高級
  };

  const estimatedCost = priceLevelToJPY[placePriceLevel] || 1500;

  // ユーザーの予算との適合度を計算
  if (estimatedCost <= userBudget * 0.5) {
    return 1.0; // 予算の半分以下 - 非常に良い
  } else if (estimatedCost <= userBudget) {
    return 0.8; // 予算内 - 良い
  } else if (estimatedCost <= userBudget * 1.5) {
    return 0.4; // 予算の1.5倍 - やや高い
  } else {
    return 0.1; // 予算の1.5倍以上 - 高すぎる
  }
}

function calculateDurationFit(
  place: PlaceData,
  userVector: UserVector,
): number {
  if (userVector.durationMinutes === undefined) return 0.5; // Neutral if no data

  const userDuration = userVector.durationMinutes;

  // 場所のタイプから推定所要時間を計算
  const placeText =
    `${place.name} ${place.vicinity} ${place.types.join(" ")}`.toLowerCase();

  let estimatedDuration = 60; // デフォルト1時間

  // 短時間の場所
  if (
    placeText.includes("cafe") ||
    placeText.includes("quick") ||
    placeText.includes("grab")
  ) {
    estimatedDuration = 30;
  }
  // 中時間の場所
  else if (
    placeText.includes("restaurant") ||
    placeText.includes("shopping") ||
    placeText.includes("museum")
  ) {
    estimatedDuration = 90;
  }
  // 長時間の場所
  else if (
    placeText.includes("tour") ||
    placeText.includes("experience") ||
    placeText.includes("workshop")
  ) {
    estimatedDuration = 180;
  }

  // ユーザーの希望時間との適合度を計算
  const timeDiff = Math.abs(estimatedDuration - userDuration);
  const maxDiff = Math.max(userDuration, estimatedDuration);

  return Math.max(0, 1 - timeDiff / maxDiff);
}

export function haversineDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number {
  const R = 6371e3; // Earth radius in meters
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lng2 - lng1) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}
