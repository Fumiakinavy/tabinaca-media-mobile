type CategoryRule = {
  category: string;
  patterns: RegExp[];
};

const CATEGORY_RULES: CategoryRule[] = [
  {
    category: "food",
    patterns: [
      /ramen|sushi|yakiniku|bbq|restaurant|diner|eat|meal|food/i,
      /ラーメン|寿司|焼肉|レストラン|食事|ごはん|グルメ/i,
    ],
  },
  {
    category: "cafe",
    patterns: [/cafe|coffee|bakery|dessert/i, /カフェ|喫茶|コーヒー|スイーツ/i],
  },
  {
    category: "bar",
    patterns: [/bar|pub|drink|cocktail|nightlife/i, /バー|飲み|ナイトライフ/i],
  },
  {
    category: "culture",
    patterns: [
      /museum|gallery|art|temple|shrine|theater/i,
      /美術館|博物館|ギャラリー|寺|神社|劇場/i,
    ],
  },
  {
    category: "nature",
    patterns: [
      /park|garden|view|scenic|nature/i,
      /公園|庭園|自然|景色|展望/i,
    ],
  },
  {
    category: "shopping",
    patterns: [/shopping|mall|market|store/i, /ショッピング|モール|市場|店/i],
  },
  {
    category: "wellness",
    patterns: [/spa|sauna|onsen|wellness|relax/i, /スパ|サウナ|温泉|癒し/i],
  },
  {
    category: "family",
    patterns: [/family|kids|child|zoo|aquarium/i, /家族|子供|キッズ|動物園|水族館/i],
  },
  {
    category: "accommodation",
    patterns: [/hotel|stay|accommodation/i, /ホテル|宿|宿泊/i],
  },
  {
    category: "transport",
    patterns: [/station|train|bus|airport/i, /駅|電車|バス|空港/i],
  },
];

export function inferSearchCategory(query?: string | null): string | null {
  if (!query) return null;
  const trimmed = query.trim();
  if (!trimmed) return null;

  for (const rule of CATEGORY_RULES) {
    if (rule.patterns.some((pattern) => pattern.test(trimmed))) {
      return rule.category;
    }
  }

  return null;
}
