// Experience関連の統一型定義

export interface ExperienceFrontMatter {
  title: string;
  summary: string;
  coverImage: string;
  price: number;
  duration: string;
  locationFromStation?: string;
  level?: string;
  couponCode?: string;
  discount?: string;
  date: string;
  tags: string[];
  motivationTags?: string[];
  address?: string;
  storeNameEn?: string; // 英語店舗名を追加
  location?: {
    lat: number;
    lng: number;
  };
  maxParticipants?: number;
  businessName?: string;
  placeId?: string;
  phone?: string;
  googlePlaceId?: string;
  affiliateUrl?: string; // アフィリエイトリンク
}

export interface Experience {
  id: string;
  slug: string;
  title: string;
  summary: string;
  coverImage: string;
  price: number;
  duration: string;
  walkingTimeFromStation: string;
  couponCode?: string;
  discount?: string;
  createdAt: string;
  categoryIds: string[];
  tags: string[];
  motivationTags?: string[];
  isActive: boolean;
  location?: {
    lat: number;
    lng: number;
  };
  address?: string;
  googlePlaceId?: string;
  affiliateUrl?: string; // アフィリエイトリンク
}

// MDXからExperienceへの変換ヘルパー
export function frontMatterToExperience(
  frontMatter: ExperienceFrontMatter,
  slug: string,
  categoryIds: string[] = [],
): Experience {
  return {
    id: slug,
    slug,
    title: frontMatter.title,
    summary: frontMatter.summary,
    coverImage: frontMatter.coverImage || "/images/placeholder-experience.jpg",
    price: frontMatter.price || 0,
    duration: frontMatter.duration || "60 min",
    walkingTimeFromStation:
      frontMatter.locationFromStation ||
      "5 min walk from shibuya station hachiko exit",
    couponCode: frontMatter.couponCode,
    discount: frontMatter.discount,
    createdAt: frontMatter.date || new Date().toISOString(),
    categoryIds,
    tags: frontMatter.tags || [],
    motivationTags: frontMatter.motivationTags || [],
    isActive: true,
    location: frontMatter.location,
    address: frontMatter.address,
    googlePlaceId: frontMatter.googlePlaceId,
    affiliateUrl: frontMatter.affiliateUrl, // アフィリエイトリンク
  };
}
