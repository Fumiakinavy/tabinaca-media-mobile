import React, { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import Image from "next/image";
import {
  getPlacePhotoUrl,
  getCategoryFromTypes,
  isOpen,
  getGoogleMapsUrl,
} from "@/lib/placesHelpers";
import GeneratedActivitySaveButton from "./GeneratedActivitySaveButton";
import type {
  GeneratedActivitySaveSource,
  PlaceSaveState,
  PlacePayload,
} from "@/lib/generatedActivitySaves";

// 距離を表示用の文字列に変換（メートル単位）
function formatDistance(distanceMeters?: number): string | null {
  if (distanceMeters === undefined || distanceMeters === null) {
    return null;
  }

  if (distanceMeters < 1000) {
    return `${Math.round(distanceMeters)}m`;
  }
  return `${(distanceMeters / 1000).toFixed(1)}km`;
}

// 場所のタイプに基づいて活動タグを生成
function getActivityTags(types: string[], category: string): string[] {
  const activityMap: { [key: string]: string[] } = {
    // レストラン・カフェ系
    restaurant: [
      "Savor local flavors",
      "Dine like a local",
      "Feast on specialties",
    ],
    cafe: ["Sip artisan coffee", "Unwind with a latte", "Discover cozy vibes"],
    bakery: ["Savor fresh bread", "Indulge in pastries", "Grab morning treats"],
    bar: ["Toast the night", "Sip craft cocktails", "Experience nightlife"],
    meal_takeaway: ["Grab a quick bite", "Try takeaway treats"],
    ramen_restaurant: ["Slurp authentic ramen", "Savor rich broth"],
    sushi_restaurant: ["Taste fresh sushi", "Savor omakase"],
    izakaya: ["Experience izakaya culture", "Share plates with friends"],

    // エンターテイメント系
    amusement_park: [
      "Ride thrilling attractions",
      "Play games",
      "Create family memories",
    ],
    bowling_alley: ["Bowl with friends", "Strike up fun"],
    movie_theater: ["Catch the latest film", "Enjoy cinema magic"],
    casino: ["Try your luck", "Experience gaming"],
    night_club: ["Dance the night away", "Feel the beat"],
    karaoke: ["Sing your heart out", "Belt your favorites"],
    arcade: ["Conquer arcade games", "Win prizes"],
    escape_room: ["Solve the mystery", "Test your wits"],

    // 文化・学習系
    museum: ["Explore exhibitions", "Discover history", "Admire masterpieces"],
    art_gallery: ["Admire contemporary art", "Capture artistic moments"],
    library: ["Dive into books", "Find quiet inspiration"],
    tourist_attraction: ["Snap iconic photos", "Explore landmarks"],
    cultural_center: ["Immerse in culture", "Learn traditions"],
    workshop: ["Master a new skill", "Create something unique"],

    // 自然・公園系
    park: ["Stroll through greenery", "Enjoy a picnic", "Breathe fresh air"],
    natural_feature: ["Hike scenic trails", "Capture nature's beauty"],
    zoo: ["Meet amazing animals", "Discover wildlife"],
    aquarium: ["Dive into marine worlds", "Watch sea creatures"],
    botanical_garden: ["Wander through gardens", "Admire rare plants"],
    viewpoint: ["Gaze at panoramic views", "Capture the skyline"],

    // ショッピング系
    shopping_mall: ["Hunt for finds", "Browse trending shops"],
    store: ["Discover unique items", "Browse local goods"],
    department_store: ["Shop fashion", "Find perfect gifts"],
    flea_market: ["Hunt for vintage gems", "Score unique finds"],
    bookstore: ["Browse new reads", "Discover hidden gems"],

    // 健康・ウェルネス系
    spa: ["Pamper yourself", "Rejuvenate mind and body"],
    beauty_salon: ["Treat yourself", "Refresh your look"],
    gym: ["Energize your day", "Push your limits"],
    onsen: ["Soak in hot springs", "Relax in nature"],
    yoga_studio: ["Find your center", "Practice mindfulness"],

    // 宗教・精神系
    church: ["Admire sacred architecture", "Find peaceful reflection"],
    hindu_temple: ["Explore spiritual beauty", "Witness traditions"],
    mosque: ["Admire Islamic architecture", "Experience serenity"],
    synagogue: ["Discover heritage", "Admire craftsmanship"],
    temple: ["Find inner peace", "Explore ancient traditions"],
    shrine: ["Make a wish", "Experience Shinto culture"],

    // 宿泊・その他
    hotel: ["Check in and relax", "Enjoy hospitality"],
    ryokan: ["Experience traditional stays", "Savor kaiseki cuisine"],
    observation_deck: ["See the city from above", "Capture skyline views"],
    rooftop: ["Toast with a view", "Watch the sunset"],
  };

  const activities: string[] = [];

  // タイプに基づいて活動を追加（タイプ固有のフレーズを優先）
  types.forEach((type) => {
    if (activityMap[type]) {
      activities.push(...activityMap[type]);
    }
  });

  // タイプにマッチするものがない場合のみ、カテゴリフォールバックを使用
  // これにより、タイプと外れた動詞が使われることを防ぐ
  if (activities.length === 0) {
    const categoryActivities: { [key: string]: string[] } = {
      "Food & Dining": [
        "Savor local flavors",
        "Feast on specialties",
        "Taste something new",
      ],
      Entertainment: ["Have a blast", "Create memories", "Experience the fun"],
      "Culture & Learning": [
        "Immerse in culture",
        "Uncover history",
        "Discover traditions",
      ],
      "Nature & Relaxation": [
        "Escape to nature",
        "Find your calm",
        "Breathe and unwind",
      ],
      Shopping: [
        "Hunt for treasures",
        "Score unique finds",
        "Discover hidden gems",
      ],
      Nightlife: ["Experience the night", "Toast the evening", "Feel the vibe"],
      Wellness: ["Rejuvenate yourself", "Find your calm", "Pamper your soul"],
      "Arts & Crafts": [
        "Create something unique",
        "Express yourself",
        "Make memories",
      ],
      Adventure: ["Seek thrills", "Embrace the rush", "Live boldly"],
      Photography: ["Capture the moment", "Frame the view", "Snap memories"],
    };

    if (categoryActivities[category]) {
      activities.push(...categoryActivities[category]);
    }
  }

  // 重複を削除し、最大5個まで返す（ランダム選択のバリエーション用）
  return Array.from(new Set(activities)).slice(0, 5);
}

function normalizeActivityPhrase(raw: string): string {
  const phrase = raw.trim();
  if (!phrase) {
    return "Explore";
  }

  const lower = phrase.toLowerCase();
  const normalizedSeed = lower.replace(/\s+/g, " ").trim();
  const knownVerbs = [
    // 食・飲み系
    "dine",
    "taste",
    "savor",
    "sip",
    "feast",
    "indulge",
    "sample",
    "devour",
    "munch",
    "grab",
    "order",
    "cook",
    "brew",
    // 体験・探索系
    "explore",
    "discover",
    "experience",
    "try",
    "venture",
    "wander",
    "roam",
    "navigate",
    "uncover",
    "seek",
    "find",
    "hunt",
    // リラックス・ウェルネス系
    "relax",
    "unwind",
    "rejuvenate",
    "recharge",
    "refresh",
    "meditate",
    "breathe",
    "soak",
    "pamper",
    "escape",
    "retreat",
    // アクティブ・動き系
    "walk",
    "hike",
    "climb",
    "stroll",
    "run",
    "cycle",
    "swim",
    "dance",
    "play",
    "ride",
    "skate",
    "surf",
    // 観る・聴く系
    "see",
    "watch",
    "admire",
    "gaze",
    "observe",
    "view",
    "witness",
    "listen",
    "hear",
    // 学び・文化系
    "learn",
    "study",
    "master",
    "practice",
    "craft",
    "create",
    "design",
    "paint",
    "draw",
    "sculpt",
    "photograph",
    // ショッピング・コレクト系
    "shop",
    "browse",
    "collect",
    "pick",
    "select",
    "hunt",
    "score",
    "snag",
    // ソーシャル系
    "enjoy",
    "celebrate",
    "connect",
    "meet",
    "mingle",
    "chat",
    "share",
    "bond",
    "toast",
    "party",
    // 訪問・移動系
    "visit",
    "tour",
    "explore",
    "journey",
    "travel",
    "arrive",
    "enter",
    "step",
    // その他アクション
    "capture",
    "snap",
    "record",
    "book",
    "reserve",
    "join",
    "attend",
    "participate",
    "immerse",
    "embrace",
    "feel",
    "sense",
    "touch",
    "hold",
    "make",
    "build",
  ];

  if (knownVerbs.some((verb) => lower.startsWith(verb))) {
    return phrase;
  }

  const nounVerbMap: Record<string, string> = {
    // 飲み物系
    coffee: "Sip coffee",
    tea: "Savor tea",
    beer: "Enjoy craft beer",
    wine: "Taste wine",
    sake: "Sample sake",
    cocktails: "Mix cocktails",
    drinks: "Enjoy drinks",
    matcha: "Savor matcha",
    whisky: "Taste whisky",
    // 食べ物系
    ramen: "Slurp ramen",
    sushi: "Savor sushi",
    tempura: "Try tempura",
    yakitori: "Grill yakitori",
    udon: "Slurp udon",
    soba: "Enjoy soba",
    curry: "Devour curry",
    "street food": "Hunt street food",
    sweets: "Indulge in sweets",
    dessert: "Treat yourself to dessert",
    "local cuisine": "Taste local cuisine",
    "fresh bread": "Savor fresh bread",
    pastries: "Indulge in pastries",
    // ショッピング系
    shopping: "Go shopping",
    browse: "Browse new finds",
    fashion: "Discover fashion",
    souvenirs: "Hunt for souvenirs",
    antiques: "Hunt for antiques",
    vintage: "Discover vintage finds",
    crafts: "Discover local crafts",
    gifts: "Find the perfect gift",
    // 自然・アウトドア系
    nature: "Embrace nature",
    picnic: "Enjoy a picnic",
    garden: "Stroll through gardens",
    forest: "Wander through forest",
    beach: "Relax at the beach",
    mountain: "Conquer the mountain",
    "scenic views": "Capture scenic views",
    sunrise: "Catch the sunrise",
    sunset: "Watch the sunset",
    stars: "Gaze at stars",
    // リラックス・ウェルネス系
    relaxation: "Relax deeply",
    "self-care": "Practice self-care",
    spa: "Pamper yourself at spa",
    massage: "Enjoy a massage",
    "hot spring": "Soak in hot springs",
    onsen: "Soak in onsen",
    yoga: "Practice yoga",
    meditation: "Find inner peace",
    wellness: "Embrace wellness",
    // エンターテイメント系
    "family fun": "Enjoy family fun",
    games: "Play games",
    arcade: "Conquer the arcade",
    "group activity": "Join a group activity",
    nightlife: "Experience nightlife",
    karaoke: "Sing karaoke",
    "live music": "Enjoy live music",
    concert: "Rock out at concert",
    show: "Catch a show",
    festival: "Join the festival",
    // 文化・学び系
    art: "Admire art",
    history: "Discover history",
    culture: "Immerse in culture",
    exhibits: "Explore exhibits",
    architecture: "Admire architecture",
    temple: "Visit a temple",
    shrine: "Visit a shrine",
    museum: "Explore the museum",
    workshop: "Join a workshop",
    class: "Take a class",
    // アクティビティ系
    cycling: "Go cycling",
    hiking: "Go hiking",
    running: "Go for a run",
    swimming: "Go swimming",
    surfing: "Catch waves",
    skiing: "Hit the slopes",
    climbing: "Scale new heights",
    // 写真・記録系
    photography: "Capture moments",
    photos: "Snap photos",
    "photo spot": "Strike a pose",
    "instagram spot": "Get the perfect shot",
    // その他
    adventure: "Seek adventure",
    discovery: "Make discoveries",
    experience: "Live the experience",
    journey: "Begin your journey",
    exploration: "Start your exploration",
    escape: "Plan your escape",
  };

  if (nounVerbMap[lower]) {
    return nounVerbMap[lower];
  }

  const fallbackVerbs = [
    "Explore",
    "Discover",
    "Enjoy",
    "Try",
    "Experience",
    "Uncover",
    "Dive into",
  ];
  const selectedVerb = pickFromSeed(normalizedSeed, fallbackVerbs);
  return `${selectedVerb} ${phrase}`;
}

// Seeded random for consistent results per place_id
function seededRandom(seed: string): number {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    const char = seed.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  // Convert to a number between 0 and 1
  return Math.abs(hash % 1000) / 1000;
}

function pickFromSeed<T>(seed: string, options: T[]): T {
  if (options.length === 0) {
    throw new Error("pickFromSeed: options must not be empty");
  }
  const randomValue = seededRandom(seed);
  const index = Math.floor(randomValue * options.length);
  return options[Math.min(options.length - 1, Math.max(0, index))];
}

function buildActivityTitle(
  placeName: string,
  activityTags: string[],
  category: string,
  placeId?: string,
): string {
  const categoryFallback: Record<string, string[]> = {
    "Food & Dining": [
      "Savor local flavors",
      "Feast on specialties",
      "Taste something new",
      "Dine like a local",
    ],
    Entertainment: [
      "Have a blast",
      "Create memories",
      "Experience the fun",
      "Enjoy the show",
    ],
    "Culture & Learning": [
      "Immerse in culture",
      "Uncover history",
      "Discover traditions",
      "Explore heritage",
    ],
    "Nature & Relaxation": [
      "Find your calm",
      "Escape to nature",
      "Breathe and unwind",
      "Connect with nature",
    ],
    Shopping: [
      "Discover treasures",
      "Hunt for finds",
      "Score unique items",
      "Browse hidden gems",
    ],
    Nightlife: [
      "Experience the night",
      "Toast the evening",
      "Dance the night away",
      "Feel the vibe",
    ],
    Wellness: [
      "Rejuvenate yourself",
      "Pamper your soul",
      "Find inner peace",
      "Recharge fully",
    ],
    "Arts & Crafts": [
      "Create something unique",
      "Craft your vision",
      "Express yourself",
      "Make memories",
    ],
    Adventure: [
      "Seek thrills",
      "Push your limits",
      "Embrace the rush",
      "Live boldly",
    ],
    Photography: [
      "Capture the moment",
      "Snap the perfect shot",
      "Frame the view",
      "Preserve memories",
    ],
  };

  // Use seeded random for consistent results per place
  const seed = placeId || placeName;
  const randomValue = seededRandom(seed);

  let primaryPhrase: string;

  if (activityTags.length > 0) {
    // Randomly select from activity tags
    const tagIndex = Math.floor(randomValue * activityTags.length);
    primaryPhrase = activityTags[tagIndex];
  } else {
    // Randomly select from category fallback
    const fallbackOptions = categoryFallback[category] || [
      "Explore",
      "Discover",
      "Experience",
      "Visit",
    ];
    const fallbackIndex = Math.floor(randomValue * fallbackOptions.length);
    primaryPhrase = fallbackOptions[fallbackIndex];
  }

  const normalized = normalizeActivityPhrase(primaryPhrase);
  return `${normalized} at ${placeName}`;
}

interface PlaceCardProps {
  place: {
    place_id: string;
    name: string;
    formatted_address?: string;
    geometry?: {
      location: {
        lat: number;
        lng: number;
      };
    };
    rating?: number;
    user_ratings_total?: number;
    price_level?: number;
    types?: string[];
    photos?: Array<{
      photo_reference: string;
      height: number;
      width: number;
    }>;
    hook?: string;
    opening_hours?: {
      open_now?: boolean;
    };
    editorial_summary?: {
      overview?: string;
    };
    distance_m?: number;
    affiliateUrl?: string; // アフィリエイトリンク
    price?: string; // アフィリエイト価格表示
    duration?: string; // 所要時間
    isAffiliate?: boolean; // アフィリエイト体験フラグ
    imageUrl?: string; // アフィリエイト画像URL
  };
  onSelect?: (place: PlaceCardProps["place"]) => void;
  onDetailsClick?: (place: PlaceCardProps["place"]) => void;
  onAvailabilityClick?: (place: PlaceCardProps["place"]) => void;
  disableCardClick?: boolean;
  saveSource?: GeneratedActivitySaveSource;
  initialSaveState?: PlaceSaveState;
  onSaveStateChange?: (state: PlaceSaveState) => void;
  className?: string;
}

const MIN_PLACE_PHOTO_WIDTH = 480;
const MAX_PLACE_PHOTO_WIDTH = 1400;

export const PlaceCard: React.FC<PlaceCardProps> = ({
  place,
  onSelect,
  onDetailsClick,
  onAvailabilityClick,
  disableCardClick = false,
  saveSource = "chat",
  initialSaveState,
  onSaveStateChange,
  className,
}) => {
  const [photoWidth, setPhotoWidth] = useState(MIN_PLACE_PHOTO_WIDTH);
  const [isAvailabilityModalOpen, setIsAvailabilityModalOpen] = useState(false);
  const [isBookingLeadModalOpen, setIsBookingLeadModalOpen] = useState(false);
  const [bookingLeadName, setBookingLeadName] = useState("");
  const [bookingLeadEmail, setBookingLeadEmail] = useState("");
  const [bookingLeadError, setBookingLeadError] = useState<string | null>(null);
  const [isBookingLeadSubmitting, setIsBookingLeadSubmitting] = useState(false);

  useEffect(() => {
    const updatePhotoWidth = () => {
      if (typeof window === "undefined") {
        return;
      }
      const baseWidth = window.innerWidth || MIN_PLACE_PHOTO_WIDTH;
      const ratio = window.devicePixelRatio || 1;
      const computedWidth = Math.round(baseWidth * ratio);
      const clampedWidth = Math.min(
        MAX_PLACE_PHOTO_WIDTH,
        Math.max(MIN_PLACE_PHOTO_WIDTH, computedWidth),
      );

      setPhotoWidth((prevWidth) =>
        prevWidth === clampedWidth ? prevWidth : clampedWidth,
      );
    };

    updatePhotoWidth();
    window.addEventListener("resize", updatePhotoWidth);
    return () => window.removeEventListener("resize", updatePhotoWidth);
  }, []);

  useEffect(() => {
    if (!isAvailabilityModalOpen && !isBookingLeadModalOpen) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsAvailabilityModalOpen(false);
        setIsBookingLeadModalOpen(false);
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [isAvailabilityModalOpen, isBookingLeadModalOpen]);

  const primaryPhotoReference = place.photos?.[0]?.photo_reference;
  const photoUrl = useMemo(() => {
    // アフィリエイト画像がある場合はそれを使用
    if (place.imageUrl) {
      console.log(
        "PlaceCard: Using affiliate image",
        place.imageUrl,
        place.name,
      );
      return place.imageUrl;
    }
    if (!primaryPhotoReference) {
      return "/images/placeholder-experience.jpg";
    }
    return getPlacePhotoUrl(primaryPhotoReference, photoWidth);
  }, [photoWidth, primaryPhotoReference, place.imageUrl, place.name]);

  const placeTypes = place.types ?? [];
  const category = getCategoryFromTypes(placeTypes);
  const categoryLabel =
    category || (placeTypes[0]?.replace(/_/g, " ") ?? "Spot");
  // type表示（pill）は従来どおり place.types をそのまま整形して表示する
  const displayTypeTags = placeTypes.slice(0, 3).map((type) =>
    type
      .replace(/_/g, " ")
      .split(" ")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" "),
  );
  // 太字タイトルだけ、動詞フレーズを使ってバラエティを増やす
  const titleActivityTags = getActivityTags(placeTypes, category);
  const activityTitle =
    place.hook ||
    buildActivityTitle(place.name, titleActivityTags, category, place.place_id);
  const openStatus = isOpen(place.opening_hours?.open_now);
  const distanceLabel = formatDistance(place.distance_m);

  const handleViewGoogleMaps = () => {
    const mapsUrl = getGoogleMapsUrl(place.place_id, place.name);
    window.location.assign(mapsUrl);
    setIsAvailabilityModalOpen(false);
  };

  const getAvailabilityUrl = () => getGoogleMapsUrl(place.place_id, place.name);

  const handleOpenBookingLeadForm = () => {
    setBookingLeadError(null);
    setIsAvailabilityModalOpen(false);
    setIsBookingLeadModalOpen(true);
  };

  const handleSubmitBookingLead = async () => {
    if (isBookingLeadSubmitting) {
      return;
    }

    const fullName = bookingLeadName.trim();
    const email = bookingLeadEmail.trim();

    if (!fullName) {
      setBookingLeadError("Please enter your name");
      return;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setBookingLeadError("Please enter a valid email address");
      return;
    }

    setIsBookingLeadSubmitting(true);
    setBookingLeadError(null);

    try {
      const response = await fetch("/api/booking-leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          placeId: place.place_id,
          placeName: place.name,
          bookingUrl: getAvailabilityUrl(),
          pageUrl: typeof window !== "undefined" ? window.location.href : null,
          fullName,
          email,
        }),
      });

      if (!response.ok) {
        const message =
          (await response.json().catch(() => null))?.error ||
          "Failed to submit. Please try again.";
        setBookingLeadError(message);
        return;
      }

      window.location.assign(getAvailabilityUrl());
      setIsBookingLeadModalOpen(false);
    } catch (error) {
      console.error("[PlaceCard] Failed to submit booking lead", error);
      setBookingLeadError("Failed to submit. Please try again.");
    } finally {
      setIsBookingLeadSubmitting(false);
    }
  };

  // アフィリエイトクリックハンドラー
  const handleAffiliateClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (typeof window !== "undefined" && (window as any).gtag) {
      (window as any).gtag("event", "affiliate_click", {
        place_id: place.place_id,
        place_name: place.name,
        affiliate_url: place.affiliateUrl,
      });
    }
  };

  const cardContent = (
    <>
      {/* Image */}
      <div className="relative h-72 bg-gray-200">
        {primaryPhotoReference || place.imageUrl ? (
          place.imageUrl ? (
            // アフィリエイト画像の場合（通常のimgタグを使用）
            <img
              src={place.imageUrl}
              alt={place.name}
              className="w-full h-full object-cover"
              onError={(e) => {
                console.error(
                  "PlaceCard: Affiliate image failed to load",
                  place.imageUrl,
                  place.name,
                );
                e.currentTarget.src = "/images/placeholder-experience.jpg";
              }}
              onLoad={() => {
                console.log(
                  "PlaceCard: Affiliate image loaded successfully",
                  place.imageUrl,
                  place.name,
                );
              }}
            />
          ) : (
            // Google Places画像の場合
            <img
              src={photoUrl}
              alt={place.name}
              className="w-full h-full object-cover"
              onError={(e) => {
                console.log(
                  "PlaceCard: Image failed to load, using placeholder",
                );
                e.currentTarget.src = "/images/placeholder-experience.jpg";
              }}
              onLoad={() => {
                console.log("PlaceCard: Image loaded successfully");
              }}
            />
          )
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-gray-100 to-gray-200" />
        )}

        {/* 詳細ボタン（右上） */}
        <div className="absolute top-2 right-2 z-10">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              if (onDetailsClick) {
                onDetailsClick(place);
              } else {
                onSelect?.(place);
              }
            }}
            className="inline-flex items-center justify-center w-7 h-7 rounded-full border-2 border-black bg-white text-black shadow-sm hover:scale-110 transition-all duration-200"
            aria-label="Details"
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="16" x2="12" y2="12" />
              <line x1="12" y1="8" x2="12.01" y2="8" />
            </svg>
          </button>
        </div>

        {/* 下部バッジエリア */}
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 via-transparent to-transparent px-3 py-2 flex items-center justify-between">
          <div className="flex items-center gap-1">
            <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold text-white bg-black/30">
              {categoryLabel}
            </span>
          </div>
          <div className="flex items-center gap-1">
            {place.duration && (
              <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold text-white bg-blue-500">
                {place.duration}
              </span>
            )}
            {!place.isAffiliate &&
              place.opening_hours?.open_now !== undefined && (
                <span
                  className={`px-2 py-0.5 rounded-full text-[11px] font-semibold ${place.opening_hours.open_now ? "bg-emerald-500 text-white" : "bg-gray-500 text-white"}`}
                >
                  {openStatus}
                </span>
              )}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-4">
        <h3 className="text-xs font-semibold text-gray-900 mb-1 line-clamp-2">
          {activityTitle}
        </h3>

        {/* Rating & Reviews / Price for Affiliates */}
        {place.isAffiliate ? (
          <div className="space-y-2 mb-2">
            {/* 価格と時間を横並びで表示（ExperienceGridスタイル） */}
            {place.price || place.duration ? (
              <div className="text-[13px] text-gray-700">
                <div className="flex items-center gap-4">
                  {/* 価格を左に配置 */}
                  {place.price && (
                    <div className="font-semibold leading-tight">
                      {place.price}{" "}
                      <span className="text-gray-400 font-normal">from</span>
                    </div>
                  )}
                  {/* 時間を右に配置 */}
                  {place.duration && (
                    <div className="flex items-center gap-2 leading-tight">
                      <svg
                        width="18"
                        height="18"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        className="shrink-0 text-[#4ADE80]"
                      >
                        <circle cx="12" cy="12" r="10" />
                        <polyline points="12,6 12,12 16,14" />
                      </svg>
                      <span className="font-bold text-[#4ADE80]">
                        {place.duration}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            ) : null}

            {/* 評価とレビュー数 */}
            {(place.rating || place.user_ratings_total) && (
              <div className="flex items-center gap-1.5 text-[11px]">
                {place.rating && (
                  <div className="flex items-center gap-1">
                    <span className="text-yellow-500 font-semibold">
                      {place.rating.toFixed(1)}
                    </span>
                    <span className="text-yellow-500 text-xs">★</span>
                  </div>
                )}
                {place.user_ratings_total && (
                  <span className="text-[10px] text-gray-500">
                    ({place.user_ratings_total.toLocaleString()} reviews)
                  </span>
                )}
              </div>
            )}
          </div>
        ) : (
          (place.rating || place.user_ratings_total || distanceLabel) && (
            <div className="flex items-center gap-1.5 mb-1.5 text-[11px]">
              {place.rating && (
                <div className="flex items-center gap-1">
                  <span className="text-yellow-500 font-semibold">
                    {place.rating.toFixed(1)}
                  </span>
                  <span className="text-yellow-500 text-xs">★</span>
                </div>
              )}
              {place.user_ratings_total && (
                <span className="text-[10px] text-gray-500">
                  ({place.user_ratings_total.toLocaleString()} reviews)
                </span>
              )}
              {distanceLabel && (
                <span className="text-[10px] text-gray-500">
                  {place.rating ? "· " : ""}
                  {distanceLabel}
                </span>
              )}
            </div>
          )
        )}

        {/* What you can do here */}
        {!place.isAffiliate && (
          <div className="mb-1">
            <div className="flex flex-wrap gap-1 text-[11px]">
              {displayTypeTags.map((activity, index) => (
                <span
                  key={index}
                  className="px-1.5 py-0.5 bg-blue-100 text-blue-800 text-[10px] rounded-full leading-tight"
                >
                  {activity}
                </span>
              ))}
            </div>
          </div>
        )}

        <div className="flex gap-2">
          {!place.isAffiliate && (
            <div className="flex-1">
              <GeneratedActivitySaveButton
                placeId={place.place_id}
                place={place as PlacePayload}
                source={saveSource}
                initialState={initialSaveState}
                onStateChange={onSaveStateChange}
                variant="button"
              />
            </div>
          )}
          {place.affiliateUrl ? (
            <a
              href={place.affiliateUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={handleAffiliateClick}
              className={`${place.isAffiliate ? "w-full" : "flex-1"} rounded-lg bg-gradient-to-r from-purple-500 to-purple-600 px-3 py-1.5 text-[11px] font-semibold text-white shadow hover:shadow-lg transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-purple-500 text-center flex items-center justify-center gap-1`}
            >
              <span>Book</span>
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5l7 7-7 7"
                />
              </svg>
            </a>
          ) : (
            !place.isAffiliate && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onAvailabilityClick?.(place);
                  setIsAvailabilityModalOpen(true);
                }}
                className="flex-1 rounded-lg bg-blue-600 px-3 py-1.5 text-[11px] font-semibold text-white shadow hover:bg-blue-700 transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500"
              >
                Availability
              </button>
            )
          )}
        </div>
      </div>

      {isAvailabilityModalOpen && (
        <div
          className="fixed inset-0 z-[90] flex items-center justify-center px-4"
          role="dialog"
          aria-modal="true"
          aria-label="Availability options"
          onClick={(e) => {
            e.stopPropagation();
            setIsAvailabilityModalOpen(false);
          }}
        >
          <button
            type="button"
            aria-label="Close"
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={(e) => {
              e.stopPropagation();
              setIsAvailabilityModalOpen(false);
            }}
          />
          <div
            className="relative z-10 w-full max-w-sm rounded-2xl bg-white shadow-2xl ring-1 ring-black/5 p-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <div className="text-sm font-semibold text-gray-900">
                Availability
              </div>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsAvailabilityModalOpen(false);
                }}
                className="rounded-full bg-gray-100 px-2 py-1 text-xs font-semibold text-gray-700 hover:bg-gray-200 transition"
                aria-label="Close"
              >
                ✕
              </button>
            </div>
            <div className="mt-0.5 text-xs text-gray-600 line-clamp-2">
              {place.name}
            </div>

            <div className="mt-3 grid gap-2">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleViewGoogleMaps();
                }}
                className="w-full rounded-lg bg-blue-600 px-3 py-2 text-sm font-semibold text-white shadow hover:bg-blue-700 transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500"
              >
                View Google Map
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleOpenBookingLeadForm();
                }}
                className="w-full rounded-lg bg-gradient-to-r from-purple-500 to-purple-600 px-3 py-2 text-sm font-semibold text-white shadow hover:shadow-lg transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-purple-500"
              >
                See availability
              </button>
            </div>
          </div>
        </div>
      )}

      {isBookingLeadModalOpen && (
        <div
          className="fixed inset-0 z-[95] flex items-center justify-center px-4"
          role="dialog"
          aria-modal="true"
          aria-label="Availability form"
          onClick={(e) => {
            e.stopPropagation();
            setIsBookingLeadModalOpen(false);
          }}
        >
          <button
            type="button"
            aria-label="Close"
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={(e) => {
              e.stopPropagation();
              setIsBookingLeadModalOpen(false);
            }}
          />
          <div
            className="relative z-10 w-full max-w-sm rounded-2xl bg-white shadow-2xl ring-1 ring-black/5 p-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <div className="text-sm font-semibold text-gray-900">
                See availability
              </div>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsBookingLeadModalOpen(false);
                }}
                className="rounded-full bg-gray-100 px-2 py-1 text-xs font-semibold text-gray-700 hover:bg-gray-200 transition"
                aria-label="Close"
              >
                ✕
              </button>
            </div>
            <div className="mt-0.5 text-xs text-gray-600 line-clamp-2">
              {place.name}
            </div>

            <div className="mt-3 grid gap-2">
              <label className="grid gap-1 text-xs font-semibold text-gray-700">
                Name
                <input
                  type="text"
                  value={bookingLeadName}
                  onChange={(e) => setBookingLeadName(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Your name"
                  autoComplete="name"
                />
              </label>

              <label className="grid gap-1 text-xs font-semibold text-gray-700">
                Email
                <input
                  type="email"
                  value={bookingLeadEmail}
                  onChange={(e) => setBookingLeadEmail(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="you@example.com"
                  autoComplete="email"
                />
              </label>

              {bookingLeadError && (
                <div className="text-xs text-red-600">{bookingLeadError}</div>
              )}

              <button
                type="button"
                disabled={isBookingLeadSubmitting}
                onClick={(e) => {
                  e.stopPropagation();
                  handleSubmitBookingLead();
                }}
                className="mt-1 w-full rounded-lg bg-gradient-to-r from-purple-500 to-purple-600 px-3 py-2 text-sm font-semibold text-white shadow hover:shadow-lg transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-purple-500 disabled:opacity-60"
              >
                {isBookingLeadSubmitting
                  ? "Submitting..."
                  : "Continue to availability"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );

  // アフィリエイト体験の場合、カード全体をリンクでラップ
  if (place.isAffiliate && place.affiliateUrl) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className={`bg-white rounded-lg shadow-md overflow-hidden hover:shadow-xl transition-shadow ${className ?? ""}`}
        data-place-card
        data-affiliate-card
      >
        <a
          href={place.affiliateUrl}
          target="_blank"
          rel="noopener noreferrer"
          onClick={handleAffiliateClick}
          className="block"
        >
          {cardContent}
        </a>
      </motion.div>
    );
  }

  // 通常の場所カード
  const isCardClickable = Boolean(onSelect) && !disableCardClick;
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={`bg-white rounded-lg shadow-md overflow-hidden hover:shadow-xl transition-shadow ${isCardClickable ? "cursor-pointer" : ""} ${className ?? ""}`}
      data-place-card
      onClick={
        isCardClickable
          ? (e) => {
              e.stopPropagation();
              onSelect?.(place);
            }
          : (e) => {
              e.stopPropagation();
            }
      }
    >
      {cardContent}
    </motion.div>
  );
};

export default PlaceCard;
