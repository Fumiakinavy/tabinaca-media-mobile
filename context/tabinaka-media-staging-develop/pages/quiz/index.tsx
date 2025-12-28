"use client";

import {
  useEffect,
  useState,
  useMemo,
  useRef,
  type Dispatch,
  type MutableRefObject,
  type SetStateAction,
} from "react";
import Head from "next/head";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { useRouter } from "next/router";
import {
  ChevronLeft,
  Loader2,
  LocateFixed,
  LogIn,
} from "lucide-react";
import PhoneInput from "react-phone-number-input";
import "react-phone-number-input/style.css";
import {
  calculateTravelTypeFromAnswers,
  type TravelTypeQuizAnswer,
  type TravelTypeOptionValue,
  type TravelTypeAxis,
} from "@/components/TravelTypeQuiz";
import {
  getTravelTypeInfo,
  type TravelTypeCode,
  isValidTravelTypeCode,
} from "@/lib/travelTypeMapping";
import { signInWithGoogle } from "@/lib/supabaseAuth";
import {
  type StoredQuizResult,
  persistQuizResultLocal,
  queueQuizResultSync,
  flushPendingQuizResults,
  savePendingQuizResult,
  clearPendingQuizResult,
  resolveQuizResultState,
  getStoredQuizFormAnswers,
  createQuizSession,
  updateQuizSession,
  getQuizSession,
  type QuizSession,
} from "@/lib/quizClientState";
import { useAccount } from "@/context/AccountContext";
import { useQuizStatus } from "@/context/QuizStatusContext";
import { useLocation } from "@/context/LocationContext";
import { normalizeLocationError } from "@/lib/locationService";
import dynamic from "next/dynamic";

const QuizResultModal = dynamic(() => import("@/components/QuizResultModal"), {
  ssr: false,
  loading: () => null,
});

const HERO_IMAGES = [
  "https://images.unsplash.com/photo-1488646953014-85cb44e25828?auto=format&fit=crop&w=1400&q=80",
  "https://images.unsplash.com/photo-1469474968028-56623f02e42e?auto=format&fit=crop&w=1400&q=80",
  "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?auto=format&fit=crop&w=1400&q=80",
];

const HERO_TITLES = [
  "Let's start with the basics.",
  "Travel personality check · Part 1",
  "Travel personality check · Part 2",
];

// COUNTRY_OPTIONS removed - PhoneInput supports all countries

const TRAVEL_PARTY_OPTIONS = [
  { value: "solo", label: "Solo", icon: "🧳" },
  { value: "partner", label: "Partner", icon: "💑" },
  { value: "friends", label: "Friends", icon: "👥" },
  { value: "family", label: "Family", icon: "👨‍👩‍👧‍👦" },
] as const;

const AGE_OPTIONS = [
  "18-24",
  "25-34",
  "35-44",
  "45-54",
  "55-64",
  "65+",
] as const;

const WALK_OPTIONS = [
  { value: "5", label: "≤ 5 min", icon: "🚶" },
  { value: "10", label: "≤ 10 min", icon: "🚶‍♂️" },
  { value: "15", label: "≥ 15 min", icon: "🏃" },
] as const;

const DIETARY_OPTIONS = [
  { value: "vegetarian", label: "Vegetarian", icon: "🥗" },
  { value: "halal", label: "Halal", icon: "🕌" },
  { value: "allergies", label: "Allergies", icon: "⚠️" },
] as const;

const LANGUAGE_OPTIONS = [
  { value: "english", label: "English", icon: "🇬🇧" },
  { value: "japanese", label: "Japanese OK", icon: "🇯🇵" },
] as const;

const PHOTO_SUBJECT_OPTIONS = [
  { value: "raw fish", label: "Raw fish", icon: "🍣" },
  { value: "crowds", label: "Crowds", icon: "🧑‍🤝‍🧑" },
  { value: "expensive", label: "Expensive", icon: "💸" },
  { value: "long stairs", label: "Long stairs", icon: "🪜" },
  { value: "alcohol", label: "Alcohol", icon: "🍷" },
] as const;

const STEP2_QUESTION_IDS = ["q1", "q2", "q3", "q4", "q5", "q6"] as const;
const STEP3_QUESTION_IDS = ["q7", "q8", "q9", "q10", "q11"] as const;
const TRAVEL_TYPE_QUESTION_IDS = [
  ...STEP2_QUESTION_IDS,
  ...STEP3_QUESTION_IDS,
] as const;

const TRAVEL_TYPE_AXIS_MAP: Record<
  (typeof TRAVEL_TYPE_QUESTION_IDS)[number],
  TravelTypeAxis
> = {
  q1: "People",
  q2: "World",
  q3: "Decision",
  q4: "Time",
  q5: "People",
  q6: "World",
  q7: "Decision",
  q8: "Time",
  q9: "People",
  q10: "Decision",
  q11: "Time",
};

type TravelPersonalityQuestion = {
  id: (typeof TRAVEL_TYPE_QUESTION_IDS)[number];
  title: string;
  options: Array<{
    value: TravelTypeOptionValue;
    icon: string;
    label: string;
  }>;
};

// Question definition for new 7-point scale
type ScaleQuestion = {
  id: string;
  statement: string; // YES/NO形式の意見文
  axis: TravelTypeAxis;
  biasDirection: TravelTypeOptionValue; // YESが選ばれたときに加算される値（G/R/L/P）
  // S/D/H/F寄りの質問の場合は、スコアを反転する
};

// スコア値：-3〜+3
export type ScaleScore = -3 | -2 | -1 | 0 | 1 | 2 | 3;

// 7段階スケールUIコンポーネント
const ScaleSelector = ({
  value,
  onChange,
}: {
  value: ScaleScore | null;
  onChange: (score: ScaleScore) => void;
}) => {
  const scaleValues: ScaleScore[] = [-3, -2, -1, 0, 1, 2, 3];

  const getCircleSize = (score: ScaleScore) => {
    const absScore = Math.abs(score);
    // モバイル: 小さめ、デスクトップ: 大きめ
    if (absScore === 3) return "w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12"; // 最大
    if (absScore === 2) return "w-7 h-7 sm:w-8 sm:h-8 md:w-10 md:h-10";
    if (absScore === 1) return "w-6 h-6 sm:w-7 sm:h-7 md:w-8 md:h-8";
    return "w-5 h-5 sm:w-6 sm:h-6 md:w-6 md:h-6"; // 中央
  };

  const getCircleColor = (score: ScaleScore, isSelected: boolean) => {
    if (!isSelected) return "bg-gray-200 border-gray-300";
    if (score > 0) return "bg-green-500 border-green-600 shadow-lg";
    if (score < 0) return "bg-purple-500 border-purple-600 shadow-lg";
    return "bg-gray-400 border-gray-500 shadow-lg";
  };

  return (
    <div className="w-full py-6">
      <div className="grid grid-cols-3 items-center mb-4">
        <span className="text-sm font-medium text-purple-600 justify-self-start">
          Disagree
        </span>
        <span className="text-sm font-medium text-gray-500 justify-self-center">
          Neutral
        </span>
        <span className="text-sm font-medium text-green-600 justify-self-end">
          Agree
        </span>
      </div>
      <div className="grid grid-cols-7 items-center gap-1 sm:gap-2">
        {scaleValues.map((score) => {
          const isSelected = value === score;

          return (
            <button
              key={score}
              type="button"
              onClick={() => onChange(score)}
              aria-pressed={isSelected}
              className={`${getCircleSize(score)} justify-self-center rounded-full border-2 transition-all duration-200 flex items-center justify-center ${
                isSelected
                  ? getCircleColor(score, true)
                  : "bg-white border-gray-300 hover:border-gray-400"
              } ${isSelected ? "scale-110 sm:scale-110" : "hover:scale-105"}`}
              aria-label={`Score ${score}`}
            />
          );
        })}
      </div>
    </div>
  );
};

// New 8 scale questions (for 7-point scale)
const SCALE_QUESTIONS: ScaleQuestion[] = [
  // People axis (G/S)
  {
    id: "sq1",
    statement: "I find the time spent with others during travel to be the most enjoyable",
    axis: "People",
    biasDirection: "G", // YES=+score → G bias
  },
  {
    id: "sq2",
    statement: "It's necessary to intentionally spend time alone while traveling",
    axis: "People",
    biasDirection: "S", // YES=+score → S bias (score inversion required)
  },
  // World axis (R/D)
  {
    id: "sq3",
    statement: "Authentic local experiences are the most important part of travel",
    axis: "World",
    biasDirection: "R", // YES=+score → R bias
  },
  {
    id: "sq4",
    statement:
      "Travel becomes more enjoyable when you know the background and stories of places",
    axis: "World",
    biasDirection: "D", // YES=+score → D bias (score inversion required)
  },
  // Decision axis (L/H)
  {
    id: "sq5",
    statement: "When choosing restaurants or experiences, I want to thoroughly check reviews and information",
    axis: "Decision",
    biasDirection: "L", // YES=+score → L bias
  },
  {
    id: "sq6",
    statement: "I often end up choosing places based on intuition when I feel 'this is it'",
    axis: "Decision",
    biasDirection: "H", // YES=+score → H bias (score inversion required)
  },
  // Time axis (P/F)
  {
    id: "sq7",
    statement: "I want to plan a schedule to some extent before traveling",
    axis: "Time",
    biasDirection: "P", // YES=+score → P bias
  },
  {
    id: "sq8",
    statement: "It's part of the charm of travel when things don't go according to plan",
    axis: "Time",
    biasDirection: "F", // YES=+score → F bias (score inversion required)
  },
];

// Keep old question data for backward compatibility (can be removed in the future)
const TRAVEL_PERSONALITY_PART1_QUESTIONS: TravelPersonalityQuestion[] = [
  {
    id: "q1",
    title: "What recharges you most when traveling?",
    options: [
      { value: "G", icon: "👥", label: "Hanging out with friends" },
      { value: "S", icon: "🧘", label: "Time alone and quiet" },
    ],
  },
  {
    id: "q2",
    title: "What's the stronger factor when choosing a destination?",
    options: [
      {
        value: "R",
        icon: "🛍️",
        label: 'Local flavors, scents, experiences = "Realness"',
      },
      {
        value: "D",
        icon: "📖",
        label: 'Stories, worldviews, meaning = "Narrative"',
      },
    ],
  },
  {
    id: "q3",
    title: "What do you prioritize when choosing food?",
    options: [
      { value: "L", icon: "📊", label: "Reviews, value, distance" },
      { value: "H", icon: "💓", label: "Intuition, atmosphere, current mood" },
    ],
  },
  {
    id: "q4",
    title: "How do you create your itinerary?",
    options: [
      {
        value: "P",
        icon: "🗓️",
        label: "Create a detailed schedule with timings",
      },
      {
        value: "F",
        icon: "🌊",
        label: "Decide the main points, then go with the flow",
      },
    ],
  },
  {
    id: "q5",
    title: "What scenes do you photograph more?",
    options: [
      { value: "G", icon: "📸", label: "Group shots with everyone" },
      { value: "S", icon: "🌄", label: "Landscapes and quiet snapshots" },
    ],
  },
  {
    id: "q6",
    title: "Which attracts you more?",
    options: [
      {
        value: "R",
        icon: "🏮",
        label: "Markets, food stalls, artisan workshops",
      },
      {
        value: "D",
        icon: "🖼️",
        label: "Galleries, narrative-driven exhibitions",
      },
    ],
  },
];

const TRAVEL_PERSONALITY_PART2_QUESTIONS: TravelPersonalityQuestion[] = [
  {
    id: "q7",
    title: "First reaction when plans go off track?",
    options: [
      {
        value: "L",
        icon: "⚙️",
        label: "Immediately recalculate route and find alternatives",
      },
      {
        value: "H",
        icon: "🎭",
        label: "Rebuild the plan based on current mood",
      },
    ],
  },
  {
    id: "q8",
    title: "How do you start your morning?",
    options: [
      { value: "P", icon: "⏰", label: "Set a departure time and go" },
      { value: "F", icon: "🌅", label: "Start when you wake up naturally" },
    ],
  },
  {
    id: "q9",
    title: "How do you spend time during transit?",
    options: [
      {
        value: "G",
        icon: "💬",
        label: "Conversation and vibes to liven up the journey",
      },
      { value: "S", icon: "🎧", label: "Music, podcasts, solo time" },
    ],
  },
  {
    id: "q10",
    title: "What do you do when you encounter a line?",
    options: [
      {
        value: "L",
        icon: "📈",
        label: "Check crowd data and wait times to decide",
      },
      {
        value: "H",
        icon: "🌀",
        label: "Might as well join, or take a break nearby",
      },
    ],
  },
  {
    id: "q11",
    title: "What do you do when you find an interesting alley?",
    options: [
      { value: "P", icon: "🧭", label: "Add it to the itinerary for later" },
      { value: "F", icon: "🚶", label: "Turn into it right now" },
    ],
  },
];

// 1ページに統合したため、ステップ数は1
const TOTAL_STEPS = 1;

const createInitialTravelTypeAnswers = () => {
  const map: Record<string, TravelTypeOptionValue | null> = {};
  TRAVEL_TYPE_QUESTION_IDS.forEach((questionId) => {
    map[questionId] = null;
  });
  return map;
};

type TravelQuizAnswers = {
  origin: string;
  ageRange: (typeof AGE_OPTIONS)[number] | "";
  isTravelingNow: boolean | null;
  homeBase: string;
  homeBaseLat: number | null;
  homeBaseLng: number | null;
  locationPermission: boolean | null;
  tripStartDate: string;
  tripEndDate: string;
  notSureAboutDates: boolean;
  travelParty: (typeof TRAVEL_PARTY_OPTIONS)[number]["value"] | "";
  walkingTolerance: (typeof WALK_OPTIONS)[number]["value"] | "";
  photoSubjects: Array<(typeof PHOTO_SUBJECT_OPTIONS)[number]["value"]>;
  dietaryPreferences: Array<(typeof DIETARY_OPTIONS)[number]["value"]>;
  languageComfort: Array<(typeof LANGUAGE_OPTIONS)[number]["value"]>;
  travelTypeAnswers: Record<string, TravelTypeOptionValue | null>;
  // 新しいスケール質問の回答（7段階スケール）
  scaleAnswers: Record<string, ScaleScore | null>;
  // 各軸のスコア（計算結果）
  axisScores: {
    People: number;
    World: number;
    Decision: number;
    Time: number;
  } | null;
  phoneNumber: string;
  // For backward compatibility (for migration from old data)
  phoneCountryCode?: string;
  phoneDigits?: string;
};

type QuizCompletionPayload = TravelQuizAnswers & {
  phoneNumber: string;
  travelTypeCode: TravelTypeCode | null;
  timestamp: number;
};

const createInitialScaleAnswers = () => {
  const map: Record<string, ScaleScore | null> = {};
  SCALE_QUESTIONS.forEach((question) => {
    map[question.id] = null;
  });
  return map;
};

const initialAnswers: TravelQuizAnswers = {
  origin: "",
  ageRange: "",
  isTravelingNow: null,
  homeBase: "",
  homeBaseLat: null,
  homeBaseLng: null,
  locationPermission: null,
  tripStartDate: "",
  tripEndDate: "",
  notSureAboutDates: false,
  travelParty: "",
  walkingTolerance: "",
  photoSubjects: [],
  dietaryPreferences: [],
  languageComfort: [],
  travelTypeAnswers: createInitialTravelTypeAnswers(),
  scaleAnswers: createInitialScaleAnswers(),
  axisScores: null,
  phoneNumber: "",
};

const coerceString = (value: unknown, fallback = ""): string =>
  typeof value === "string" ? value : fallback;

const coerceBoolean = (value: unknown, fallback = false): boolean =>
  typeof value === "boolean" ? value : fallback;

const coerceNullableBoolean = (
  value: unknown,
  fallback: boolean | null = null,
) => (typeof value === "boolean" ? value : fallback);

const coerceNumber = (value: unknown, fallback: number | null = null) =>
  typeof value === "number" && Number.isFinite(value) ? value : fallback;

const coerceStringArray = <T extends string>(
  value: unknown,
  fallback: T[] = [],
): T[] => {
  if (!Array.isArray(value)) return fallback;
  return value.filter((item) => typeof item === "string") as T[];
};

const buildPrefilledAnswers = (stored: unknown): TravelQuizAnswers => {
  if (!stored || typeof stored !== "object") {
    return initialAnswers;
  }

  const record = stored as Record<string, unknown>;
  const travelTypeAnswers = record.travelTypeAnswers as
    | Record<string, TravelTypeOptionValue | null>
    | undefined;

  // 電話番号の処理：新しい形式（phoneNumber）または古い形式（phoneCountryCode + phoneDigits）から変換
  let phoneNumber = coerceString(record.phoneNumber, "");
  if (!phoneNumber) {
    // 古い形式からの移行
    const phoneCountryCode = coerceString(record.phoneCountryCode, "");
    const phoneDigits = coerceString(record.phoneDigits, "");
    if (phoneCountryCode && phoneDigits) {
      phoneNumber = `${phoneCountryCode}${phoneDigits}`;
    }
  }

  // isTravelingNowの処理：boolean | nullをサポート
  let isTravelingNow: boolean | null = initialAnswers.isTravelingNow;
  if (record.isTravelingNow !== undefined && record.isTravelingNow !== null) {
    isTravelingNow =
      typeof record.isTravelingNow === "boolean" ? record.isTravelingNow : null;
  }

  // スケール質問の回答を復元
  const scaleAnswers = record.scaleAnswers as
    | Record<string, ScaleScore | null>
    | undefined;
  
  // 軸スコアを復元（計算済みの場合は使用）
  const axisScores = record.axisScores as
    | {
        People: number;
        World: number;
        Decision: number;
        Time: number;
      }
    | null
    | undefined;

  return {
    origin: coerceString(record.origin, initialAnswers.origin),
    ageRange: coerceString(
      record.ageRange,
      initialAnswers.ageRange,
    ) as TravelQuizAnswers["ageRange"],
    isTravelingNow,
    homeBase: coerceString(record.homeBase, initialAnswers.homeBase),
    homeBaseLat: coerceNumber(record.homeBaseLat, initialAnswers.homeBaseLat),
    homeBaseLng: coerceNumber(record.homeBaseLng, initialAnswers.homeBaseLng),
    locationPermission: coerceNullableBoolean(
      record.locationPermission,
      initialAnswers.locationPermission,
    ),
    tripStartDate: coerceString(
      record.tripStartDate,
      initialAnswers.tripStartDate,
    ),
    tripEndDate: coerceString(record.tripEndDate, initialAnswers.tripEndDate),
    notSureAboutDates: coerceBoolean(
      record.notSureAboutDates,
      initialAnswers.notSureAboutDates,
    ),
    travelParty: coerceString(
      record.travelParty,
      initialAnswers.travelParty,
    ) as TravelQuizAnswers["travelParty"],
    walkingTolerance: coerceString(
      record.walkingTolerance,
      initialAnswers.walkingTolerance,
    ) as TravelQuizAnswers["walkingTolerance"],
    photoSubjects: coerceStringArray<
      (typeof PHOTO_SUBJECT_OPTIONS)[number]["value"]
    >(record.photoSubjects, initialAnswers.photoSubjects),
    dietaryPreferences: coerceStringArray<
      (typeof DIETARY_OPTIONS)[number]["value"]
    >(record.dietaryPreferences, initialAnswers.dietaryPreferences),
    languageComfort: coerceStringArray<
      (typeof LANGUAGE_OPTIONS)[number]["value"]
    >(record.languageComfort, initialAnswers.languageComfort),
    travelTypeAnswers: {
      ...createInitialTravelTypeAnswers(),
      ...(travelTypeAnswers ?? {}),
    },
    scaleAnswers: {
      ...createInitialScaleAnswers(),
      ...(scaleAnswers ?? {}),
    },
    axisScores: axisScores ?? null,
    phoneNumber,
  };
};

const getOptionButtonClass = (active: boolean, extra?: string) =>
  [
    "rounded-2xl border px-4 py-3 text-left transition shadow-none",
    active
      ? "border-primary bg-primary/10 text-primary shadow-none"
      : "border-border/70 bg-white/80 hover:border-primary/40 shadow-none",
    extra ?? "",
  ]
    .filter(Boolean)
    .join(" ")
    .trim();

const QuizProgress = ({
  answers,
  isFetchingLocation,
  locationFallbackTimeoutRef,
  setLocationError,
}: {
  answers: TravelQuizAnswers;
  isFetchingLocation: boolean;
  locationFallbackTimeoutRef: MutableRefObject<number | null>;
  setLocationError: Dispatch<SetStateAction<string | null>>;
}) => {
  // 全体の完了度を計算
  const calculateOverallProgress = () => {
    // Step 0の必須項目
    const step0Required = {
      origin: answers.origin.trim() !== "",
      ageRange: answers.ageRange !== "",
      isTravelingNow: answers.isTravelingNow !== null,
      homeBase: answers.isTravelingNow === false || answers.homeBase.trim() !== "",
      dates: answers.isTravelingNow === false ||
        answers.notSureAboutDates ||
        (answers.tripStartDate && answers.tripEndDate),
      travelParty: answers.travelParty !== "",
      walkingTolerance: answers.walkingTolerance !== "",
    };
    const step0Completed = Object.values(step0Required).filter(Boolean).length;
    const step0Total = Object.keys(step0Required).length;

    // Step 1 (Part 1) の質問
    const step1Completed = STEP2_QUESTION_IDS.filter(
      (id) => answers.travelTypeAnswers[id] !== null &&
      answers.travelTypeAnswers[id] !== undefined
    ).length;
    const step1Total = STEP2_QUESTION_IDS.length;

    // Step 2 (Part 2) の質問（電話番号は任意なので含めない）
    const step2Completed = STEP3_QUESTION_IDS.filter(
      (id) => answers.travelTypeAnswers[id] !== null &&
      answers.travelTypeAnswers[id] !== undefined
    ).length;
    const step2Total = STEP3_QUESTION_IDS.length;

    const totalCompleted = step0Completed + step1Completed + step2Completed;
    const totalFields = step0Total + step1Total + step2Total;
    
    return totalFields > 0 ? Math.round((totalCompleted / totalFields) * 100) : 0;
  };

  const progress = calculateOverallProgress();

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    if (!isFetchingLocation) {
      if (locationFallbackTimeoutRef.current !== null) {
        window.clearTimeout(locationFallbackTimeoutRef.current);
        locationFallbackTimeoutRef.current = null;
      }
      return;
    }
    if (locationFallbackTimeoutRef.current !== null) {
      window.clearTimeout(locationFallbackTimeoutRef.current);
    }
    locationFallbackTimeoutRef.current = window.setTimeout(() => {
      setLocationError((prev) =>
        prev ??
        "位置情報の許可ダイアログが表示されない場合は、Safariの設定で位置情報を許可し、iOSの「位置情報サービス」がオンになっているか確認してください。",
      );
    }, 7000);

    return () => {
      if (locationFallbackTimeoutRef.current !== null) {
        window.clearTimeout(locationFallbackTimeoutRef.current);
        locationFallbackTimeoutRef.current = null;
      }
    };
  }, [isFetchingLocation, locationFallbackTimeoutRef, setLocationError]);
  
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="inline-flex items-center rounded-full bg-primary/10 px-4 py-1 text-[10px] font-semibold uppercase tracking-[0.35em] text-primary">
          Travel Personality Quiz
        </span>
        <span className="text-xs font-semibold text-muted-foreground">
          {progress}%
        </span>
      </div>
      <div className="h-2 w-full rounded-full bg-border/60">
        <div
          className="h-full rounded-full bg-primary transition-all duration-300"
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
};

export default function QuizPage() {
  const router = useRouter();
  const {
    accountId,
    sessionStatus,
    refreshSession,
    authState,
    supabaseAccessToken,
  } = useAccount();
  const { quizResult, requestOpenModal } = useQuizStatus();
  const {
    requestLocation,
    browserPermission,
    locationStatus,
    locationErrorCode,
  } = useLocation();
  const QUIZ_CHAT_REDIRECT = "/chat?action=new&showQuizResult=true";
  // currentStep not used since integrated into one page (kept for backward compatibility)
  const [currentStep] = useState(0);
  const [answers, setAnswers] = useState<TravelQuizAnswers>(initialAnswers);
  const [hasAppliedEditPrefill, setHasAppliedEditPrefill] = useState(false);
  const [isFetchingLocation, setIsFetchingLocation] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);
  const locationFallbackTimeoutRef = useRef<number | null>(null);
  const locationPermissionHint =
    browserPermission === "prompt"
      ? "位置情報を使うにはブラウザの許可が必要です。ボタンを押すと許可ダイアログが表示されます。"
      : browserPermission === "denied" || locationStatus === "denied"
        ? "ブラウザの設定で位置情報を許可してください。"
        : null;
  const safariPermissionHint =
    browserPermission === "denied" || locationStatus === "denied"
      ? "Safari の場合は aA → Webサイトの設定 → 位置情報 を確認してください。"
      : null;
  const browserPermissionLabel =
    {
      granted: "許可",
      denied: "拒否",
      prompt: "未許可",
      unknown: "不明",
      unsupported: "未対応",
    }[browserPermission] ?? browserPermission;
  const locationStatusLabel =
    {
      idle: "未要求",
      requesting: "取得中",
      granted: "取得済",
      denied: "拒否",
      unsupported: "未対応",
      insecure: "HTTPS必須",
      error: "エラー",
    }[locationStatus] ?? locationStatus;
  const locationStatusNote = `状態: browser=${browserPermissionLabel}, location=${locationStatusLabel}${
    locationErrorCode ? `, error=${locationErrorCode}` : ""
  }`;
  const [isSavingQuizResult, setIsSavingQuizResult] = useState(false);
  const [nearbyPlaces, setNearbyPlaces] = useState<
    Array<{
      place_id: string;
      name: string;
      geometry: { location: { lat: number; lng: number } };
      vicinity?: string;
    }>
  >([]);
  const [isLoadingNearbyPlaces, setIsLoadingNearbyPlaces] = useState(false);
  const [pendingLocation, setPendingLocation] = useState<{
    lat: number;
    lng: number;
  } | null>(null);
  const [quizSession, setQuizSession] = useState<QuizSession | null>(null);
  const [hasStartedSession, setHasStartedSession] = useState(false);
  const isAccountReady = sessionStatus === "ready" && Boolean(accountId);
  const isCreatingSessionRef = useRef(false);

  // スケール質問用の状態
  const [showScaleQuiz, setShowScaleQuiz] = useState(true); // 新しいスケール質問を使用

  // 1ページ統合により、ステップ変更時のスクロールは不要
  // useEffect(() => {
  //   window.scrollTo({ top: 0, behavior: "smooth" });
  // }, [currentStep]);

  // ページ離脱時にセッションをabandonedに更新
  useEffect(() => {
    if (!quizSession || quizSession.status !== "in_progress") {
      return;
    }

    const sessionId = quizSession.sessionId;

    const handleBeforeUnload = () => {
      // ページ離脱時にセッションをabandonedに更新（最新の進捗情報を含む）
      if (quizSession && quizSession.status === "in_progress") {
        const progress = calculateProgress(answers, 0); // 1ページ統合後は常に0
        const requestId = `abandon_${quizSession.sessionId}_${Date.now()}`;
        const updateData = {
          sessionId: quizSession.sessionId,
          status: "abandoned" as const,
          metadata: {
            currentStep: 0,
            progress,
            abandonedAt: new Date().toISOString(),
            lastUpdatedAt: new Date().toISOString(),
          },
        };

        // navigator.sendBeaconを使用して確実に送信
        if (navigator.sendBeacon) {
          try {
            const blob = new Blob(
              [
                JSON.stringify({
                  ...updateData,
                  requestId,
                }),
              ],
              { type: "application/json" },
            );
            navigator.sendBeacon("/api/quiz/session/abandon", blob);
          } catch (error) {
            console.warn("[Quiz] Failed to send beacon on unload", error);
          }
        }

        // フォールバック: 通常のfetch（確実性は低い）
        updateQuizSession(quizSession.sessionId, {
          status: "abandoned",
          metadata: updateData.metadata,
          requestId,
        }).catch((error) => {
          console.warn("[Quiz] Failed to update session on unload", error);
        });
      }
    };

    // ページ離脱時の処理
    window.addEventListener("beforeunload", handleBeforeUnload);

    // ページ遷移時の処理（Next.jsのrouterを使用）
    const handleRouteChange = () => {
      if (quizSession && quizSession.status === "in_progress") {
        const progress = calculateProgress(answers, 0); // 1ページ統合後は常に0
        const requestId = `route_abandon_${quizSession.sessionId}_${Date.now()}`;
        updateQuizSession(quizSession.sessionId, {
          status: "abandoned",
          metadata: {
            currentStep: 0,
            progress,
            abandonedAt: new Date().toISOString(),
            lastUpdatedAt: new Date().toISOString(),
          },
          requestId,
        }).catch((error) => {
          console.warn("[Quiz] Failed to update session on route change", error);
        });
      }
    };

    router.events?.on("routeChangeStart", handleRouteChange);

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
      router.events?.off("routeChangeStart", handleRouteChange);
    };
  }, [quizSession, router.events, answers]);

  useEffect(() => {
    if (!router.isReady) {
      return;
    }

    const shouldPrefill = router.query.edit === "1";
    if (!shouldPrefill) {
      if (hasAppliedEditPrefill) {
        setHasAppliedEditPrefill(false);
      }
      return;
    }

    if (hasAppliedEditPrefill) {
      return;
    }

    let sourceAnswers = quizResult?.answers ?? null;

    if (!sourceAnswers && accountId) {
      try {
        const state = resolveQuizResultState(accountId);
        if (state.status !== "missing" && state.record.answers) {
          sourceAnswers = state.record.answers;
        }
      } catch (error) {
        console.warn("[Quiz] Failed to resolve stored quiz answers", error);
      }
    }

    if (!sourceAnswers && accountId) {
      const cachedForm = getStoredQuizFormAnswers(accountId);
      if (cachedForm) {
        sourceAnswers = cachedForm;
      }
    }

    if (!sourceAnswers) {
      return;
    }

    setAnswers(buildPrefilledAnswers(sourceAnswers));
    // 1ページ統合後はcurrentStepは常に0なので設定不要
    setHasAppliedEditPrefill(true);
  }, [
    router.isReady,
    router.query.edit,
    quizResult?.answers,
    hasAppliedEditPrefill,
    accountId,
  ]);

  const allPart1Answered = useMemo(
    () =>
      STEP2_QUESTION_IDS.every(
        (questionId) => answers.travelTypeAnswers[questionId],
      ),
    [answers.travelTypeAnswers],
  );

  const allPart2Answered = useMemo(
    () =>
      STEP3_QUESTION_IDS.every(
        (questionId) => answers.travelTypeAnswers[questionId],
      ),
    [answers.travelTypeAnswers],
  );

  // 電話番号のバリデーション：8桁以上の数字があるか確認
  const isPhoneValid = useMemo(() => {
    if (!answers.phoneNumber) return false;
    // +記号と数字以外を除去して、数字部分が8桁以上あるか確認
    const digitsOnly = answers.phoneNumber.replace(/\D/g, "");
    return digitsOnly.length >= 8;
  }, [answers.phoneNumber]);

  // スケール質問が全て回答されているかチェック
  const allScaleQuestionsAnswered = useMemo(() => {
    return SCALE_QUESTIONS.every(
      (question) =>
        answers.scaleAnswers[question.id] !== null &&
        answers.scaleAnswers[question.id] !== undefined,
    );
  }, [answers.scaleAnswers]);

  // 全体の完了チェック（1ページ統合後のバリデーション）
  const canCompleteQuiz = () => {
    // Step 0の必須項目チェック
        if (answers.isTravelingNow === null) {
          return false;
        }

        const isTraveling = answers.isTravelingNow === true;
        const hasDates = isTraveling
          ? answers.notSureAboutDates ||
          (answers.tripStartDate && answers.tripEndDate)
          : true; // 旅行していない場合は日付は不要

    const step0Valid = (
          answers.origin.trim() !== "" &&
          answers.ageRange !== "" &&
          (!isTraveling || answers.homeBase.trim() !== "") && // 旅行中の場合のみhomeBaseが必要
          hasDates &&
          answers.travelParty !== "" &&
          answers.walkingTolerance !== ""
        );

    // 新しいスケール質問を使用する場合
    if (showScaleQuiz) {
      return step0Valid && allScaleQuestionsAnswered;
    }

    // When using old format questions
    const allTravelTypeQuestionsAnswered = 
      allPart1Answered && allPart2Answered;

    return step0Valid && allTravelTypeQuestionsAnswered;
  };

  // 新しいスケール質問からスコアを計算する関数
  const calculateAxisScoresFromScale = (
    scaleAnswers: Record<string, ScaleScore | null>,
  ): {
    People: number;
    World: number;
    Decision: number;
    Time: number;
  } | null => {
    const axisScores: {
      People: number[];
      World: number[];
      Decision: number[];
      Time: number[];
    } = {
      People: [],
      World: [],
      Decision: [],
      Time: [],
    };

    SCALE_QUESTIONS.forEach((question) => {
      const score = scaleAnswers[question.id];
      if (score === null || score === undefined) return;

      // S/D/H/F寄りの質問（biasDirectionがS/D/H/F）の場合は符号を反転
      const needsInversion =
        question.biasDirection === "S" ||
        question.biasDirection === "D" ||
        question.biasDirection === "H" ||
        question.biasDirection === "F";

      const adjustedScore = needsInversion ? -score : score;
      axisScores[question.axis].push(adjustedScore);
    });

    // 各軸のスコアを計算（平均値）
    const result = {
      People:
        axisScores.People.length > 0
          ? axisScores.People.reduce((a, b) => a + b, 0) /
            axisScores.People.length
          : 0,
      World:
        axisScores.World.length > 0
          ? axisScores.World.reduce((a, b) => a + b, 0) / axisScores.World.length
          : 0,
      Decision:
        axisScores.Decision.length > 0
          ? axisScores.Decision.reduce((a, b) => a + b, 0) /
            axisScores.Decision.length
          : 0,
      Time:
        axisScores.Time.length > 0
          ? axisScores.Time.reduce((a, b) => a + b, 0) / axisScores.Time.length
          : 0,
    };

    // 全ての質問に回答されているか確認
    const allAnswered = SCALE_QUESTIONS.every(
      (q) => scaleAnswers[q.id] !== null && scaleAnswers[q.id] !== undefined,
    );

    return allAnswered ? result : null;
  };

  // スコアからトラベルタイプコードを計算
  const calculateTravelTypeFromScores = (
    scores: {
      People: number;
      World: number;
      Decision: number;
      Time: number;
    },
  ): TravelTypeCode => {
    const people = scores.People > 0 ? "G" : "S";
    const world = scores.World > 0 ? "R" : "D";
    const decision = scores.Decision > 0 ? "L" : "H";
    const time = scores.Time > 0 ? "P" : "F";

    const code = `${people}${world}${decision}${time}` as TravelTypeCode;
    if (!isValidTravelTypeCode(code)) {
      console.warn("Invalid travel type code calculated:", code);
      return "GRLP";
    }
    return code;
  };

  const buildCompletionPayload = (): {
    travelTypeCode: TravelTypeCode | null;
    payload: QuizCompletionPayload;
    axisScores: {
      People: number;
      World: number;
      Decision: number;
      Time: number;
    } | null;
  } => {
    // 新しいスケール質問を使用する場合
    let axisScores = calculateAxisScoresFromScale(answers.scaleAnswers);
    let travelTypeCode: TravelTypeCode | null = null;

    if (showScaleQuiz && axisScores) {
      travelTypeCode = calculateTravelTypeFromScores(axisScores);
    } else if (!showScaleQuiz) {
      axisScores = null;
      // Fallback: use old format questions
    const aggregatedAnswers = TRAVEL_TYPE_QUESTION_IDS.map(
      (questionId, index) => {
        const value = answers.travelTypeAnswers[questionId];
        const axis = TRAVEL_TYPE_AXIS_MAP[questionId];
        if (!value || !axis) return null;
        return {
          axis,
          value,
          questionIndex: index,
        } as TravelTypeQuizAnswer;
      },
    ).filter(Boolean) as TravelTypeQuizAnswer[];

      travelTypeCode =
      aggregatedAnswers.length === TRAVEL_TYPE_QUESTION_IDS.length
        ? calculateTravelTypeFromAnswers(aggregatedAnswers)
        : null;
    }

    const payload: QuizCompletionPayload = {
      ...answers,
      phoneNumber: answers.phoneNumber || "",
      travelTypeCode,
      timestamp: Date.now(),
    };

    return { travelTypeCode, payload, axisScores };
  };

  const saveQuizResult = async (
    travelTypeCode: TravelTypeCode | null,
    payload: QuizCompletionPayload,
  ): Promise<boolean> => {
    if (typeof window === "undefined") {
      return false;
    }

    // 既に保存中の場合は重複保存を防ぐ
    if (isSavingQuizResult) {
      console.log("[Quiz] Already saving quiz result, skipping duplicate save");
      return false;
    }

    if (!travelTypeCode) {
      console.error("[Quiz] Missing travelTypeCode");
      return false;
    }

    const info = getTravelTypeInfo(travelTypeCode);
    
    // travel_type_payloadに保存される値の例:
    // {
    //   name: "The Itinerary CEO",
    //   emoji: "📍",
    //   description: "Travel is a spreadsheet...",
    //   shortDescription: "Plans never falter..."
    // }
    const travelTypePayloadForSession = {
      name: info.name,
      emoji: info.emoji,
      description: info.description,
      shortDescription: info.shortDescription,
    };

    // セッションを完了状態に更新（最終的な進捗情報を含む）
    if (quizSession && quizSession.status === "in_progress") {
      const progress = calculateProgress(answers, 0); // 1ページ統合後は常に0
      const updatedSession = await updateQuizSession(quizSession.sessionId, {
        status: "completed",
        travelTypeCode: travelTypeCode,
        travelTypePayload: travelTypePayloadForSession,
        metadata: {
          ...(quizSession as any).metadata,
          currentStep: 0,
          progress,
          completed: true,
          travelTypeCode,
          completedAt: new Date().toISOString(),
          lastUpdatedAt: new Date().toISOString(),
        },
      });

      if (updatedSession) {
        setQuizSession(updatedSession);
        console.log("[Quiz] Session updated to completed:", updatedSession.sessionId);
      }
    }

    let targetAccountId = accountId;
    if (!targetAccountId) {
      await refreshSession();
      try {
        const response = await fetch("/api/account/session", {
          method: "GET",
          credentials: "include",
        });
        if (response.ok) {
          const data = await response.json();
          targetAccountId = data.accountId;
        }
      } catch (error) {
        // AbortError はページ遷移時に発生する正常な動作
        if (error instanceof Error && error.name === "AbortError") {
          console.debug("[Quiz] Fetch aborted (page navigation)");
        } else {
          console.error("[Quiz] Failed to fetch accountId after refresh:", error);
        }
      }
      if (!targetAccountId) {
        targetAccountId = accountId;
      }
    }

    const travelLocation =
      answers.homeBaseLat !== null && answers.homeBaseLng !== null
        ? {
          locationLat: answers.homeBaseLat,
          locationLng: answers.homeBaseLng,
          locationPermission: true,
          currentLocation: answers.homeBase || undefined,
        }
        : {
          locationPermission: answers.locationPermission ?? undefined,
          currentLocation: answers.homeBase || undefined,
        };
    const travelTypePayload = {
      travelTypeCode,
      travelTypeName: info.name,
      travelTypeEmoji: info.emoji,
      travelTypeDescription: info.description,
      travelTypeShortDescription: info.shortDescription,
      ...travelLocation,
    };

    // RECOMMENDATIONに統一して保存
    const recommendation: StoredQuizResult = {
      travelType: travelTypePayload,
      answers: payload,
      timestamp: payload.timestamp,
      places: [],
    };

    // 既存のクイズ結果をチェック（重複保存を防ぐ）
    if (targetAccountId) {
      const existingState = resolveQuizResultState(targetAccountId);
      if (existingState.status !== "missing" && existingState.record) {
        const existingAnswersHash = JSON.stringify(
          existingState.record.answers,
        );
        const newAnswersHash = JSON.stringify(payload);

        // 回答内容が同じで、最近保存された場合は重複保存をスキップ
        if (existingAnswersHash === newAnswersHash) {
          const existingTimestamp = existingState.record.timestamp ?? 0;
          const timeDiff = Math.abs(payload.timestamp - existingTimestamp);

          // 5分以内に同じ回答内容が保存されている場合は重複保存をスキップ
          if (timeDiff < 5 * 60 * 1000) {
            console.log(
              "[Quiz] Duplicate quiz result detected, skipping save",
              {
                existingTimestamp,
                newTimestamp: payload.timestamp,
                timeDiff,
              },
            );
            return true; // 既に保存済みなので成功として扱う
          }
        }
      }
    }

    setIsSavingQuizResult(true);

    try {
      savePendingQuizResult(recommendation, targetAccountId ?? null);

      console.log("[Quiz] saveQuizResult:", {
        hasTargetAccountId: !!targetAccountId,
        targetAccountId,
        travelTypeCode: travelTypePayload.travelTypeCode,
      });

      if (!targetAccountId) {
        console.error("[Quiz] Account session could not be established");
        if (typeof window !== "undefined") {
          window.alert(
            "Failed to get session. Please reload the page and try again.",
          );
        }
        return false;
      }

      const persisted = persistQuizResultLocal(targetAccountId, recommendation, {
        status: "pending",
        emitEvent: false,
      });

      if (!persisted) {
        console.error("[Quiz] Failed to persist quiz result locally");
        return false;
      }

      clearPendingQuizResult();

      const syncResult = await flushPendingQuizResults({
        accountId: targetAccountId,
        authToken: supabaseAccessToken,
      });

      if (!syncResult.success && syncResult.retriable) {
        queueQuizResultSync({
          accountId: targetAccountId,
          authToken: supabaseAccessToken,
        });
      }

      return true;
    } finally {
      setIsSavingQuizResult(false);
    }
  };

  // 進捗情報を計算する関数（1ページ統合後）
  const calculateProgress = (answers: TravelQuizAnswers, step: number = 0) => {
    // Step 0の完了状況
    const step0Completed = {
      origin: answers.origin.trim() !== "",
      ageRange: answers.ageRange !== "",
      isTravelingNow: answers.isTravelingNow !== null,
      homeBase: answers.isTravelingNow === false || answers.homeBase.trim() !== "",
      dates: answers.isTravelingNow === false ||
        answers.notSureAboutDates ||
        (answers.tripStartDate && answers.tripEndDate),
      travelParty: answers.travelParty !== "",
      walkingTolerance: answers.walkingTolerance !== "",
    };
    const step0Progress = {
      completed: Object.values(step0Completed).every(Boolean),
      fields: step0Completed,
      completedCount: Object.values(step0Completed).filter(Boolean).length,
      totalCount: Object.keys(step0Completed).length,
    };

    // Step 1 (Part 1) の完了状況
    const step1Answers = STEP2_QUESTION_IDS.map((id) => ({
      questionId: id,
      answered: answers.travelTypeAnswers[id] !== null &&
        answers.travelTypeAnswers[id] !== undefined,
    }));
    const step1Progress = {
      completed: step1Answers.every((a) => a.answered),
      questions: step1Answers,
      completedCount: step1Answers.filter((a) => a.answered).length,
      totalCount: step1Answers.length,
    };

    // Step 2 (Part 2) の完了状況
    const step2Answers = STEP3_QUESTION_IDS.map((id) => ({
      questionId: id,
      answered: answers.travelTypeAnswers[id] !== null &&
        answers.travelTypeAnswers[id] !== undefined,
    }));
    const phoneAnswered = answers.phoneNumber.trim() !== "";
    const step2Progress = {
      completed: step2Answers.every((a) => a.answered),
      questions: step2Answers,
      phoneAnswered,
      completedCount: step2Answers.filter((a) => a.answered).length,
      totalCount: step2Answers.length,
    };

    // 全体の進捗
    const totalQuestions = STEP2_QUESTION_IDS.length + STEP3_QUESTION_IDS.length;
    const answeredQuestions = Object.values(answers.travelTypeAnswers).filter(
      (v) => v !== null && v !== undefined,
    ).length;

    return {
      currentStep: step,
      step0: step0Progress,
      step1: step1Progress,
      step2: step2Progress,
      overall: {
        totalSteps: TOTAL_STEPS,
        currentStep: step,
        totalQuestions,
        answeredQuestions,
        completionPercentage: Math.round(
          ((step0Progress.completedCount +
            step1Progress.completedCount +
            step2Progress.completedCount) /
            (step0Progress.totalCount +
              step1Progress.totalCount +
              step2Progress.totalCount)) * 100
        ),
      },
      lastUpdatedAt: new Date().toISOString(),
    };
  };

  // Session Creation Effect (starts session on first answer)
  useEffect(() => {
    // Skip if already started or creating
    if (hasStartedSession || quizSession || isCreatingSessionRef.current) return;

    // Check if we have meaningful answers to start a session
    const hasAnyAnswer = Object.values(answers.travelTypeAnswers).some(
      (value) => Boolean(value),
    ) || answers.origin.trim() !== "" || answers.ageRange !== "";

    if (hasAnyAnswer && isAccountReady) {
      const createSession = async () => {
        if (isCreatingSessionRef.current) return;
        isCreatingSessionRef.current = true;

        try {
          const progress = calculateProgress(answers, 0); // 1ページ統合後は常に0
          // Only create session if we have data
          const session = await createQuizSession(
            answers.locationPermission,
            {
              currentStep: 0,
              progress,
              hasAnswers: true,
            },
          );

          if (session) {
            setQuizSession(session);
            setHasStartedSession(true);
            console.log("[Quiz] Session created on answer:", session.sessionId);

            // Initial sync of the answers we just verified triggered the creation
            updateQuizSession(session.sessionId, {
              currentStep: 0,
              answers,
              requestId: `init_sync_${session.sessionId}_${Date.now()}_${Math.random()
                .toString(36)
                .slice(2, 8)}`,
            }).catch(console.warn);
          }
        } finally {
          isCreatingSessionRef.current = false;
        }
      };

      void createSession();
    }
  }, [answers, hasStartedSession, quizSession, isAccountReady]);

  // Session Update Effect (Syncs answers to server)
  useEffect(() => {
    if (!quizSession || quizSession.status !== "in_progress") return;

    const syncToSession = async () => {
      const progress = calculateProgress(answers, 0); // 1ページ統合後は常に0
      const requestId = `sync_${quizSession.sessionId}_${Date.now()}_${Math.random()
        .toString(36)
        .slice(2, 8)}`;
      try {
        await updateQuizSession(quizSession.sessionId, {
          metadata: {
            currentStep: 0, // 1ページ統合後は常に0
            progress,
            hasAnswers: true,
            lastUpdatedAt: new Date().toISOString(),
          },
          currentStep: 0,
          answers, // Save ALL answers
          requestId,
        });
      } catch (error) {
        console.warn("[Quiz] Failed to sync session in background", error);
      }
    };

    // Debounce updates to avoid spamming the server on keystrokes
    const timerId = setTimeout(syncToSession, 1000);
    return () => clearTimeout(timerId);
  }, [answers, quizSession]);

  const updateAnswers = (patch: Partial<TravelQuizAnswers>) => {
    setAnswers((prev) => ({ ...prev, ...patch }));
  };

  const updateTravelTypeAnswer = (
    questionId: string,
    value: TravelTypeOptionValue,
  ) => {
    setAnswers((prev) => ({
      ...prev,
      travelTypeAnswers: {
        ...prev.travelTypeAnswers,
        [questionId]: value,
      },
    }));
  };

  // スケール質問の回答を更新
  const updateScaleAnswer = (questionId: string, score: ScaleScore) => {
    setAnswers((prev) => {
      const newScaleAnswers = {
        ...prev.scaleAnswers,
        [questionId]: score,
      };

      // スコアを再計算
      const axisScores = calculateAxisScoresFromScale(newScaleAnswers);

      return {
        ...prev,
        scaleAnswers: newScaleAnswers,
        axisScores,
      };
    });
  };

  const scaleAnsweredCount = useMemo(() => {
    return SCALE_QUESTIONS.filter(
      (q) =>
        answers.scaleAnswers[q.id] !== null &&
        answers.scaleAnswers[q.id] !== undefined,
    ).length;
  }, [answers.scaleAnswers]);

  const fetchNearbyPlaces = async (lat: number, lng: number) => {
    setIsLoadingNearbyPlaces(true);
    try {
      const response = await fetch("/api/places/nearby-landmarks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lat, lng, radius: 1500 }),
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success && Array.isArray(data.places)) {
          setNearbyPlaces(data.places);
        } else if (data.error) {
          // API error from Google Maps
          console.warn("[Quiz] Failed to fetch nearby places:", data.error);
          setLocationError(
            "Unable to load nearby places. You can still enter your location manually.",
          );
        }
      } else {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage =
          errorData.error ||
          "Unable to load nearby places. You can still enter your location manually.";
        console.warn("[Quiz] Failed to fetch nearby places:", errorMessage);
        setLocationError(errorMessage);
      }
    } catch (error) {
      console.warn("[Quiz] Failed to fetch nearby places", error);
      setLocationError(
        "Unable to load nearby places. You can still enter your location manually.",
      );
    } finally {
      setIsLoadingNearbyPlaces(false);
    }
  };

  const handleSelectNearbyPlace = (place: {
    place_id: string;
    name: string;
    geometry: { location: { lat: number; lng: number } };
  }) => {
    updateAnswers({
      homeBase: place.name,
      homeBaseLat: place.geometry.location.lat,
      homeBaseLng: place.geometry.location.lng,
      locationPermission: true,
    });
    setNearbyPlaces([]);
    setPendingLocation(null);
  };

  const handleClearNearbyPlaces = () => {
    setNearbyPlaces([]);
    setPendingLocation(null);
  };

  const fillHomeBaseWithCurrentLocation = async () => {
    // ユーザー操作起点でのみ実行する
    if (isFetchingLocation) return;

    const applyLocationFailure = (
      message: string,
      permissionGranted: boolean | null = false,
    ) => {
      setLocationError(message);
      updateAnswers({
        homeBaseLat: null,
        homeBaseLng: null,
        locationPermission: permissionGranted,
      });
    };

    setLocationError(null);
    setNearbyPlaces([]);
    setIsFetchingLocation(true);

    try {
      const options: PositionOptions = {
        enableHighAccuracy: true,
        timeout: 12000,
        maximumAge: 300000,
      };
      const { location, error } = await requestLocation({
        source: "user",
        options,
      });

      if (!location) {
        const normalized = normalizeLocationError(error);
        const permissionGranted =
          normalized.code === "permission_denied" ? false : null;

        if (normalized.code === "insecure_context") {
          applyLocationFailure(
            "Enable HTTPS to use current location, or enter it manually.",
            permissionGranted,
          );
          return;
        }
        if (normalized.code === "unsupported") {
          applyLocationFailure(
            "This browser cannot access your location. Please type it in.",
            permissionGranted,
          );
          return;
        }
        if (normalized.code === "permission_denied") {
          applyLocationFailure(
            "Location permission is required. Please enable it in your browser settings.",
            permissionGranted,
          );
          return;
        }
        if (normalized.code === "position_unavailable") {
          applyLocationFailure(
            "Could not determine your position. Try again or enter it manually.",
            permissionGranted,
          );
          return;
        }
        if (normalized.code === "timeout") {
          applyLocationFailure(
            "Location request timed out. Please try again.",
            permissionGranted,
          );
          return;
        }
        applyLocationFailure(
          "Failed to fetch location. Please enter it manually.",
          permissionGranted,
        );
        return;
      }

      // Store pending location and fetch nearby places for dropdown
      setPendingLocation({ lat: location.lat, lng: location.lng });
      fetchNearbyPlaces(location.lat, location.lng);

      // Even if reverse geocoding fails, keep the coordinates so we can
      // still use the user's current location for recommendations.
      updateAnswers({
        homeBaseLat: location.lat,
        homeBaseLng: location.lng,
        locationPermission: true,
      });

      // Reverse geocode to auto-fill the address
      fetch("/api/places/reverse-geocode", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lat: location.lat, lng: location.lng }),
      })
        .then(async (res) => {
          let data: any = null;
          try {
            data = await res.json();
          } catch {
            data = null;
          }
          if (!res.ok) {
            const message =
              (data && typeof data.error === "string" && data.error) ||
              "Failed to resolve address from current location.";
            throw new Error(message);
          }
          return data;
        })
        .then((data) => {
          if (data.formatted_address) {
            updateAnswers({
              homeBase: data.formatted_address,
              locationPermission: true,
            });
          } else {
            setLocationError(
              "Could not retrieve address. Please enter manually (location has been obtained).",
            );
          }
        })
        .catch((err) => {
          console.error("[Quiz] Reverse geocoding failed", err);
          setLocationError(
            err instanceof Error && err.message
              ? `${err.message} Please enter manually.`
              : "Failed to get address. Please enter manually.",
          );
        });
    } finally {
      setIsFetchingLocation(false);
    }
  };

  const syncProfile = async (currentAnswers: TravelQuizAnswers) => {
    if (!isAccountReady) return;

    try {
      const profilePayload = {
        travelStyle: {
          origin: currentAnswers.origin,
          ageRange: currentAnswers.ageRange,
          travelParty: currentAnswers.travelParty,
          walkingTolerance: currentAnswers.walkingTolerance,
          photoSubjects: currentAnswers.photoSubjects,
          dietaryPreferences: currentAnswers.dietaryPreferences,
        },
        phoneNumber: currentAnswers.phoneNumber, // Top-level or inside a contact object
      };

      await fetch("/api/account/profile", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(profilePayload),
      });
    } catch (error) {
      console.warn("[Quiz] Failed to sync profile", error);
    }
  };

  // 1ページ統合により、handleNextとhandleBackは不要
  // プロフィールデータは回答変更時に自動的に同期される（useEffectで処理）

  const handleViewTravelType = async () => {
    if (!canCompleteQuiz()) return;

    try {
      const { travelTypeCode, payload } = buildCompletionPayload();
      await saveQuizResult(travelTypeCode, payload);

      // TODO: Replace with external URL navigation for viewing travel type details.
    } catch (error) {
      // AbortError はページ遷移時に発生する正常な動作
      if (error instanceof Error && error.name === "AbortError") {
        console.debug("[Quiz] handleViewTravelType aborted (page navigation)");
        return;
      }
      console.error("[Quiz] handleViewTravelType failed:", error);
    }
  };

  const handleSignInForResults = async () => {
    if (!canCompleteQuiz()) return;

    try {
      const { travelTypeCode, payload } = buildCompletionPayload();
      const currentResult = {
        travelType: {
          ...payload,
          travelTypeCode,
        },
        answers,
        timestamp: Date.now(),
      };

      if (authState !== "authenticated") {
        // Guest User: Save pending result and redirect to Sign In
        console.log("[Quiz] Guest user: Saving pending result and redirecting to sign-in");

        // Save to local storage so we can restore after redirect
        if (typeof window !== "undefined") {
          const { savePendingQuizResult } = require("@/lib/quizClientState");
          savePendingQuizResult(currentResult, null);
        }

        // Redirect to Google Sign-in, returning to the Chat page with a flag to open the result modal
        const returnUrl = "/chat?showQuizResult=true";
        await signInWithGoogle({ returnTo: returnUrl });
        return;
      }

      // Authenticated User: Normal Flow
      // Sync profile before saving results
      await syncProfile(answers);

      console.log("[Quiz] Saving quiz result for signed-in user", { accountId });

      // Use the component's saveQuizResult which handles API/Local logic
      const persisted = await saveQuizResult(travelTypeCode, payload);
      if (!persisted) {
        console.error("[Quiz] Failed to persist quiz result");
        // Optionally show error
        return;
      }

      console.log("[Quiz] Quiz result persisted successfully, redirecting to chat...");

      // Redirect to Chat page to show results
      await router.push("/chat?showQuizResult=true");
    } catch (error) {
      // AbortError はページ遷移時に発生する正常な動作
      if (error instanceof Error && error.name === "AbortError") {
        console.debug("[Quiz] handleSignInForResults aborted (page navigation)");
        return;
      }
      console.error("[Quiz] handleSignInForResults failed:", error);
    }
  };

  return (
    <>
      <Head>
        <title>Travel Personality Quiz | Gappy</title>
        <meta
          name="description"
          content="Discover your travel personality and get personalized Tokyo experience recommendations"
        />
        <meta name="robots" content="noindex, nofollow" />
        <link rel="canonical" href="https://gappytravel.com/quiz" />
      </Head>
      <div className="flex min-h-screen flex-col bg-white text-foreground">
        <Header />
        <main className="flex-1 flex flex-col min-h-0 overscroll-y-none">
          <div className="mx-auto flex flex-1 min-h-0 flex-col md:flex-row">
            <aside className="relative mb-6 w-full shrink md:mb-0 md:w-1/3 lg:w-2/5 xl:w-1/2">
              <div className="h-56 overflow-hidden rounded-b-3xl md:h-[420px] md:rounded-none lg:sticky lg:top-12 lg:h-[calc(100vh-3rem)] xl:top-16 xl:h-[calc(100vh-4rem)]">
                <img
                  src={HERO_IMAGES[0]}
                  alt="Travel Personality Quiz"
                  className="h-full w-full object-cover"
                  loading="lazy"
                />
              </div>
            </aside>

            <section className="flex w-full flex-1 flex-col bg-white">
              <div className="flex-1 px-5 pb-10 pt-4 sm:px-10 sm:pb-12 sm:pt-6 lg:px-16">
                <div className="mx-auto w-full max-w-2xl space-y-8">
                  <div className="space-y-5">
                    <QuizProgress
                      answers={answers}
                      isFetchingLocation={isFetchingLocation}
                      locationFallbackTimeoutRef={locationFallbackTimeoutRef}
                      setLocationError={setLocationError}
                    />
                    <h1 className="text-3xl font-semibold leading-tight tracking-tight text-slate-900 sm:text-[34px]">
                      Let's start with the basics.
                    </h1>
                    <p className="text-sm text-muted-foreground sm:text-base sm:leading-relaxed">
                      To unlock your personal AI concierge, answer a few
                      questions in one minute. Get travel recommendations truly
                      crafted for you.
                    </p>
                  </div>

                  {/* Step 0: Basic Information */}
                    <div className="space-y-8">
                    <div className="border-t border-border/60 pt-6">
                      <h2 className="text-xl font-semibold text-slate-900 mb-4">
                        Basic Information
                      </h2>
                      <div className="grid gap-6">
                        <div className="space-y-2">
                          <label
                            className="text-sm font-semibold"
                            htmlFor="origin"
                          >
                            Origin (country / city)
                          </label>
                          <input
                            id="origin"
                            type="text"
                            value={answers.origin}
                            onChange={(event) =>
                              updateAnswers({ origin: event.target.value })
                            }
                            placeholder="e.g. New York, London, Seoul"
                            className="w-full rounded-2xl border border-border bg-white px-4 py-3 text-sm text-slate-900 focus:border-primary focus:outline-none"
                          />
                        </div>

                        <div className="space-y-3">
                          <p className="text-sm font-semibold">Age</p>
                          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:flex md:flex-nowrap md:gap-2 md:overflow-x-auto md:pb-1 md:[-webkit-overflow-scrolling:touch]">
                            {AGE_OPTIONS.map((option) => (
                              <button
                                key={option}
                                type="button"
                                onClick={() =>
                                  updateAnswers({
                                    ageRange:
                                      answers.ageRange === option ? "" : option,
                                  })
                                }
                                className={getOptionButtonClass(
                                  answers.ageRange === option,
                                  "w-full whitespace-nowrap md:w-auto md:min-w-[104px]",
                                )}
                              >
                                <span className="text-sm font-semibold">
                                  {option}
                                </span>
                              </button>
                            ))}
                          </div>
                        </div>

                        <div className="space-y-3">
                          <p className="text-sm font-semibold">
                            Are you traveling now?
                          </p>
                          <div className="grid grid-cols-2 gap-2 sm:gap-3">
                            <button
                              type="button"
                              onClick={() => {
                                setLocationError(null);
                                setIsFetchingLocation(false);
                                updateAnswers({ isTravelingNow: true });
                              }}
                              className={getOptionButtonClass(
                                answers.isTravelingNow === true,
                              )}
                            >
                              <span className="text-sm font-semibold">Yes</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setLocationError(null);
                                setIsFetchingLocation(false);
                                updateAnswers({
                                  isTravelingNow: false,
                                  homeBase: "",
                                  homeBaseLat: null,
                                  homeBaseLng: null,
                                  locationPermission: null,
                                  tripStartDate: "",
                                  tripEndDate: "",
                                  notSureAboutDates: false,
                                });
                              }}
                              className={getOptionButtonClass(
                                answers.isTravelingNow === false,
                              )}
                            >
                              <span className="text-sm font-semibold">No</span>
                            </button>
                          </div>
                        </div>

                        {answers.isTravelingNow === true && (
                          <>
                            <div className="space-y-2">
                              <div className="flex flex-wrap items-center justify-between gap-3">
                                <label
                                  className="text-sm font-semibold"
                                  htmlFor="homeBase"
                                >
                                  Where are you staying?
                                </label>
                                <button
                                  type="button"
                                  onClick={fillHomeBaseWithCurrentLocation}
                                  disabled={isFetchingLocation}
                                  className="inline-flex items-center gap-2 rounded-full border border-border/80 bg-white px-3 py-2 text-xs font-semibold text-slate-700 shadow-none transition hover:border-primary hover:text-primary disabled:cursor-not-allowed disabled:opacity-60"
                                >
                                  {isFetchingLocation ? (
                                    <>
                                      <Loader2 className="h-4 w-4 animate-spin" />
                                      Locating...
                                    </>
                                  ) : (
                                    <>
                                      <LocateFixed className="h-4 w-4" />
                                      Use current location
                                    </>
                                  )}
                                </button>
                              </div>
                              <input
                                id="homeBase"
                                type="text"
                                value={answers.homeBase}
                                onChange={(event) =>
                                  updateAnswers({
                                    homeBase: event.target.value,
                                    homeBaseLat: null,
                                    homeBaseLng: null,
                                    locationPermission: null,
                                  })
                                }
                                placeholder="shibuya"
                                className="w-full rounded-2xl border border-border bg-white px-4 py-3 text-sm text-slate-900 focus:border-primary focus:outline-none"
                              />
                              {locationError && (
                                <div
                                  className="flex flex-wrap items-center gap-2 text-xs text-rose-600"
                                  aria-live="polite"
                                >
                                  <p className="font-medium">{locationError}</p>
                                  {locationPermissionHint && (
                                    <p className="text-rose-500">
                                      {locationPermissionHint}
                                    </p>
                                  )}
                                  {safariPermissionHint && (
                                    <p className="text-rose-500">
                                      {safariPermissionHint}
                                    </p>
                                  )}
                                  <p className="text-rose-400">
                                    {locationStatusNote}
                                  </p>
                                  <button
                                    type="button"
                                    onClick={fillHomeBaseWithCurrentLocation}
                                    disabled={isFetchingLocation}
                                    className="inline-flex items-center gap-1 rounded-full border border-rose-200 bg-white px-2.5 py-1 font-semibold text-rose-700 shadow-none transition hover:border-rose-400 hover:text-rose-800 disabled:cursor-not-allowed disabled:opacity-60"
                                  >
                                    {isFetchingLocation ? (
                                      <>
                                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                        Requesting permission...
                                      </>
                                    ) : (
                                      "Request location permission"
                                    )}
                                  </button>
                                </div>
                              )}

                              {/* Nearby places selection */}
                              {isLoadingNearbyPlaces && (
                                <div className="flex items-center gap-2 text-sm text-slate-600">
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                  Loading nearby places...
                                </div>
                              )}

                            </div>


                            <div className="space-y-3">
                              <p className="text-sm font-semibold">
                                Travel dates
                              </p>
                              <div className="grid gap-4 sm:grid-cols-2">
                                <label
                                  className="space-y-1 text-xs text-muted-foreground"
                                  htmlFor="startDate"
                                >
                                  Start date
                                  <input
                                    id="startDate"
                                    type="date"
                                    value={answers.tripStartDate}
                                    onChange={(event) =>
                                      updateAnswers({
                                        tripStartDate: event.target.value,
                                      })
                                    }
                                    disabled={answers.notSureAboutDates}
                                    className="mt-1 w-full rounded-2xl border border-border bg-white px-4 py-3 text-sm text-slate-900 focus:border-primary focus:outline-none disabled:bg-slate-200/60"
                                  />
                                </label>
                                <label
                                  className="space-y-1 text-xs text-muted-foreground"
                                  htmlFor="endDate"
                                >
                                  End date
                                  <input
                                    id="endDate"
                                    type="date"
                                    value={answers.tripEndDate}
                                    onChange={(event) =>
                                      updateAnswers({
                                        tripEndDate: event.target.value,
                                      })
                                    }
                                    disabled={answers.notSureAboutDates}
                                    className="mt-1 w-full rounded-2xl border border-border bg-white px-4 py-3 text-sm text-slate-900 focus:border-primary focus:outline-none disabled:bg-slate-200/60"
                                  />
                                </label>
                              </div>
                              <label className="flex items-center gap-2 text-xs text-muted-foreground">
                                <input
                                  type="checkbox"
                                  checked={answers.notSureAboutDates}
                                  onChange={(event) =>
                                    updateAnswers({
                                      notSureAboutDates: event.target.checked,
                                      ...(event.target.checked
                                        ? { tripStartDate: "", tripEndDate: "" }
                                        : {}),
                                    })
                                  }
                                  className="h-4 w-4 rounded border-border"
                                />
                                Dates are not decided yet
                              </label>
                            </div>
                          </>
                        )}

                        <div className="space-y-3">
                          <p className="text-sm font-semibold">
                            Who do you typically travel with?
                          </p>
                          <div className="grid grid-cols-2 gap-2 sm:gap-3 lg:flex lg:flex-wrap lg:gap-2">
                            {TRAVEL_PARTY_OPTIONS.map((option) => (
                              <button
                                key={option.value}
                                type="button"
                                onClick={() =>
                                  updateAnswers({
                                    travelParty:
                                      answers.travelParty === option.value
                                        ? ""
                                        : option.value,
                                  })
                                }
                                className={getOptionButtonClass(
                                  answers.travelParty === option.value,
                                  "w-full lg:w-auto lg:min-w-[136px]",
                                )}
                              >
                                <span className="flex items-center gap-2 text-sm font-semibold">
                                  <span>{option.icon}</span>
                                  {option.label}
                                </span>
                              </button>
                            ))}
                          </div>
                        </div>

                        <div className="space-y-3">
                          <p className="text-sm font-semibold">
                            Walking tolerance (minutes between spots)
                          </p>
                          <div className="flex flex-wrap gap-2">
                            {WALK_OPTIONS.map((option) => (
                              <button
                                key={option.value}
                                type="button"
                                onClick={() =>
                                  updateAnswers({
                                    walkingTolerance:
                                      answers.walkingTolerance === option.value
                                        ? ""
                                        : option.value,
                                  })
                                }
                                className={getOptionButtonClass(
                                  answers.walkingTolerance === option.value,
                                  "min-w-[120px]",
                                )}
                              >
                                <span className="flex items-center gap-2 text-sm font-semibold">
                                  <span>{option.icon}</span>
                                  {option.label}
                                </span>
                              </button>
                            ))}
                          </div>
                        </div>

                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-semibold">
                              Things to avoid
                            </p>
                            <span className="text-[11px] text-muted-foreground">
                              Optional
                            </span>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {PHOTO_SUBJECT_OPTIONS.map((option) => {
                              const isActive = answers.photoSubjects.includes(
                                option.value,
                              );
                              const nextSubjects = isActive
                                ? answers.photoSubjects.filter(
                                  (v) => v !== option.value,
                                )
                                : [...answers.photoSubjects, option.value];
                              return (
                                <button
                                  key={option.value}
                                  type="button"
                                  onClick={() =>
                                    updateAnswers({
                                      photoSubjects: nextSubjects,
                                    })
                                  }
                                  className={getOptionButtonClass(
                                    isActive,
                                    "min-w-[140px]",
                                  )}
                                >
                                  <span className="flex items-center gap-2 text-sm font-semibold">
                                    <span>{option.icon}</span>
                                    {option.label}
                                  </span>
                                </button>
                              );
                            })}
                          </div>
                        </div>

                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-semibold">
                              Dietary preferences
                            </p>
                            <span className="text-[11px] text-muted-foreground">
                              Optional
                            </span>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {DIETARY_OPTIONS.map((option) => {
                              const isActive =
                                answers.dietaryPreferences.includes(
                                  option.value,
                                );
                              const next = isActive
                                ? answers.dietaryPreferences.filter(
                                  (v) => v !== option.value,
                                )
                                : [...answers.dietaryPreferences, option.value];
                              return (
                                <button
                                  key={option.value}
                                  type="button"
                                  onClick={() =>
                                    updateAnswers({ dietaryPreferences: next })
                                  }
                                  className={getOptionButtonClass(
                                    isActive,
                                    "min-w-[140px]",
                                  )}
                                >
                                  <span className="flex items-center gap-2 text-sm font-semibold">
                                    <span>{option.icon}</span>
                                    {option.label}
                                  </span>
                                </button>
                              );
                            })}
                          </div>
                        </div>

                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-semibold">
                              Language comfort
                            </p>
                            <span className="text-[11px] text-muted-foreground">
                              Optional
                            </span>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {LANGUAGE_OPTIONS.map((option) => {
                              const isActive = answers.languageComfort.includes(
                                option.value,
                              );
                              const next = isActive
                                ? answers.languageComfort.filter(
                                  (v) => v !== option.value,
                                )
                                : [...answers.languageComfort, option.value];
                              return (
                                <button
                                  key={option.value}
                                  type="button"
                                  onClick={() =>
                                    updateAnswers({ languageComfort: next })
                                  }
                                  className={getOptionButtonClass(
                                    isActive,
                                    "min-w-[140px]",
                                  )}
                                >
                                  <span className="flex items-center gap-2 text-sm font-semibold">
                                    <span>{option.icon}</span>
                                    {option.label}
                                  </span>
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    </div>

                  {/* Travel Personality Check - 7段階スケール質問 */}
                  {showScaleQuiz && (
                    <div className="space-y-8 border-t border-border/60 pt-6">
                      <div className="flex items-center justify-between mb-6">
                        <h2 className="text-xl font-semibold text-slate-900">
                          Travel Personality Check
                        </h2>
                        <span className="text-sm text-muted-foreground">
                          {scaleAnsweredCount} / {SCALE_QUESTIONS.length}
                        </span>
                      </div>

                      {/* プログレスバー */}
                      <div className="w-full bg-gray-200 rounded-full h-2 mb-6">
                        <div
                          className="bg-primary h-2 rounded-full transition-all duration-300"
                          style={{
                            width: `${(scaleAnsweredCount / SCALE_QUESTIONS.length) * 100}%`,
                          }}
                        />
                      </div>

                      <div className="space-y-8">
                        {SCALE_QUESTIONS.map((question, index) => (
                          <div
                            key={question.id}
                            className="rounded-3xl border border-border/70 bg-white p-6"
                          >
                            <p className="text-base font-semibold text-slate-900 leading-relaxed">
                              Q{index + 1}. {question.statement}
                            </p>
                            <ScaleSelector
                              value={answers.scaleAnswers[question.id]}
                              onChange={(score) =>
                                updateScaleAnswer(question.id, score)
                              }
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Old format questions (kept for backward compatibility) */}
                  {!showScaleQuiz && (
                    <div>
                      <div className="space-y-6 border-t border-border/60 pt-6">
                        <h2 className="text-xl font-semibold text-slate-900 mb-4">
                          Travel Personality Check · Part 1
                        </h2>
                        <div className="space-y-8">
                        {TRAVEL_PERSONALITY_PART1_QUESTIONS.map((question) => {
                          const questionNumber = parseInt(
                            question.id.replace("q", ""),
                            10,
                          );
                          const questionLabel = Number.isNaN(questionNumber)
                            ? question.title
                            : `Q${questionNumber}. ${question.title}`;

                              const selectedValue = answers.travelTypeAnswers[question.id];
                              const yesValue = question.options[0].value;
                              const noValue = question.options[1].value;
                              const isYes = selectedValue === yesValue;
                              const isNo = selectedValue === noValue;

                          return (
                                <div key={question.id} className="space-y-4">
                                  <p className="text-base font-semibold text-slate-900 pb-3 border-b border-slate-200">
                                {questionLabel}
                              </p>
                                  <div className="flex gap-4">
                                  <button
                                    type="button"
                                    onClick={() =>
                                      updateTravelTypeAnswer(
                                        question.id,
                                          yesValue,
                                        )
                                      }
                                      className={`flex-1 py-4 px-6 rounded-xl border-2 transition-all font-semibold text-base ${
                                        isYes
                                          ? "border-primary bg-primary/10 text-primary shadow-md"
                                          : "border-border/70 bg-white hover:border-primary/40 hover:bg-slate-50 text-slate-700"
                                      }`}
                                    >
                                      YES
                                  </button>
                                    <button
                                      type="button"
                                      onClick={() =>
                                        updateTravelTypeAnswer(
                                          question.id,
                                          noValue,
                                        )
                                      }
                                      className={`flex-1 py-4 px-6 rounded-xl border-2 transition-all font-semibold text-base ${
                                        isNo
                                          ? "border-primary bg-primary/10 text-primary shadow-md"
                                          : "border-border/70 bg-white hover:border-primary/40 hover:bg-slate-50 text-slate-700"
                                      }`}
                                    >
                                      NO
                                    </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                      <div className="space-y-8 border-t border-border/60 pt-6">
                        <h2 className="text-xl font-semibold text-slate-900 mb-4">
                          Travel Personality Check · Part 2
                        </h2>
                    <div className="space-y-8">
                        {TRAVEL_PERSONALITY_PART2_QUESTIONS.map((question) => {
                          const questionNumber = parseInt(
                            question.id.replace("q", ""),
                            10,
                          );
                          const questionLabel = Number.isNaN(questionNumber)
                            ? question.title
                            : `Q${questionNumber}. ${question.title}`;

                              const selectedValue = answers.travelTypeAnswers[question.id];
                              const yesValue = question.options[0].value;
                              const noValue = question.options[1].value;
                              const isYes = selectedValue === yesValue;
                              const isNo = selectedValue === noValue;

                          return (
                                <div key={question.id} className="space-y-4">
                                  <p className="text-base font-semibold text-slate-900 pb-3 border-b border-slate-200">
                                {questionLabel}
                              </p>
                                  <div className="flex gap-4">
                                  <button
                                    type="button"
                                    onClick={() =>
                                      updateTravelTypeAnswer(
                                        question.id,
                                          yesValue,
                                        )
                                      }
                                      className={`flex-1 py-4 px-6 rounded-xl border-2 transition-all font-semibold text-base ${
                                        isYes
                                          ? "border-primary bg-primary/10 text-primary shadow-md"
                                          : "border-border/70 bg-white hover:border-primary/40 hover:bg-slate-50 text-slate-700"
                                      }`}
                                    >
                                      YES
                                  </button>
                                    <button
                                      type="button"
                                      onClick={() =>
                                        updateTravelTypeAnswer(
                                          question.id,
                                          noValue,
                                        )
                                      }
                                      className={`flex-1 py-4 px-6 rounded-xl border-2 transition-all font-semibold text-base ${
                                        isNo
                                          ? "border-primary bg-primary/10 text-primary shadow-md"
                                          : "border-border/70 bg-white hover:border-primary/40 hover:bg-slate-50 text-slate-700"
                                      }`}
                                    >
                                      NO
                                    </button>
                              </div>
                            </div>
                          );
                        })}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Contact info (optional) - displayed in both formats */}
                  <div className="border-t border-border/60 pt-6">
                        <div className="rounded-3xl border border-border/70 bg-white p-6 shadow-none">
                          <div className="space-y-4">
                            <h2 className="text-2xl font-semibold text-slate-900">
                              Contact info (optional)
                            </h2>
                            <p className="text-sm text-muted-foreground">
                              If you want the AI concierge to send tailored
                              plans or special offers, enter your phone number.
                            </p>
                            <div className="flex flex-col gap-3">
                              <PhoneInput
                                international
                                defaultCountry="US"
                                value={answers.phoneNumber}
                                onChange={(value) =>
                                  updateAnswers({ phoneNumber: value || "" })
                                }
                                className="w-full rounded-xl border border-border bg-white px-4 py-3 text-sm focus:border-primary focus:outline-none"
                                placeholder="Enter your phone number"
                                aria-label="Phone number"
                                countrySelectProps={{
                                  unicodeFlags: true,
                                }}
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                </div>
              </div>

              <div className="border-t border-border/60 bg-white/90 px-5 py-6 backdrop-blur lg:px-16">
                <div className="mx-auto flex w-full max-w-2xl flex-wrap items-center justify-center gap-4">
                      <button
                        type="button"
                    onClick={() => router.push("/")}
                    className="flex items-center gap-2 rounded-full px-5 py-2 text-sm font-semibold text-muted-foreground transition hover:text-slate-900"
                      >
                        <ChevronLeft className="h-4 w-4" />
                    Back to Home
                      </button>
                      <button
                        type="button"
                        onClick={handleSignInForResults}
                    disabled={!canCompleteQuiz() || !isAccountReady}
                    className="flex items-center justify-center gap-2 rounded-full bg-primary px-6 py-2 text-sm font-semibold text-primary-foreground shadow-none transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        <span className="text-center">
                          Sign in to view results
                        </span>
                        <LogIn className="h-4 w-4" />
                      </button>
                </div>
              </div>
            </section>
          </div>
        </main>
        <Footer />
        <QuizResultModal />
      </div>
    </>
  );
}
