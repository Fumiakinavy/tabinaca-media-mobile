// Dynamic Context Info Generator
// Generates dynamically updated context information

import {
  getSearchQueryVariants,
  isValidTravelTypeCode,
  type TravelTypeCode,
} from "./travelTypeMapping";
import type { WeatherData, WeatherRecommendation } from "./weather";

export interface TodayInfo {
  isoDate: string;
  isoDateTime: string;
  display: string;
  timezone: string;
  offsetMinutes: number;
  source: "location" | "fallback";
}

function clamp(num: number, min: number, max: number): number {
  return Math.min(Math.max(num, min), max);
}

function getOffsetFromLongitude(lng?: number): number | null {
  if (typeof lng !== "number" || Number.isNaN(lng)) return null;
  // Approximate offset: 15 degrees per hour, clamp to realistic bounds
  const offsetHours = clamp(Math.round(lng / 15), -12, 14);
  return offsetHours * 60;
}

function formatIsoWithOffset(date: Date, offsetMinutes: number): string {
  const localDate = new Date(date.getTime() + offsetMinutes * 60_000);
  const yyyy = localDate.getFullYear();
  const mm = String(localDate.getMonth() + 1).padStart(2, "0");
  const dd = String(localDate.getDate()).padStart(2, "0");
  const hh = String(localDate.getHours()).padStart(2, "0");
  const mi = String(localDate.getMinutes()).padStart(2, "0");
  const ss = String(localDate.getSeconds()).padStart(2, "0");
  const sign = offsetMinutes >= 0 ? "+" : "-";
  const absMinutes = Math.abs(offsetMinutes);
  const offH = String(Math.floor(absMinutes / 60)).padStart(2, "0");
  const offM = String(absMinutes % 60).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}T${hh}:${mi}:${ss}${sign}${offH}:${offM}`;
}

export function today(location?: { lat?: number; lng?: number }): TodayInfo {
  const defaultOffset = 9 * 60; // JST fallback
  const offsetMinutes =
    getOffsetFromLongitude(location?.lng) ?? defaultOffset;
  const source =
    typeof location?.lng === "number" ? "location" : ("fallback" as const);
  const now = new Date();
  const isoDateTime = formatIsoWithOffset(now, offsetMinutes);
  const isoDate = isoDateTime.slice(0, 10);
  const display = `${isoDate} (UTC${offsetMinutes >= 0 ? "+" : "-"}${String(
    Math.abs(offsetMinutes / 60),
  ).padStart(2, "0")}:${String(Math.abs(offsetMinutes % 60)).padStart(2, "0")})`;
  const timezone = `approx by location${source === "fallback" ? " (fallback JST)" : ""}`;

  return {
    isoDate,
    isoDateTime,
    display,
    timezone,
    offsetMinutes,
    source,
  };
}

function getDefaultInspirationVariants(locationContext?: {
  status: "available" | "unavailable";
}): string[] {
  const locationPhrase =
    locationContext?.status === "available"
      ? "near current location"
      : "in the area";
  return [
    `highlights must-see view spots ${locationPhrase}`,
    `trendsetting cafes and dessert bars ${locationPhrase}`,
    `hands-on experiences and workshops ${locationPhrase}`,
    `night vibes rooftops bars live music ${locationPhrase}`,
  ];
}

const HOME_DURATION_MAP: Record<
  NonNullable<UserContext["homeDurationPreference"]>,
  {
    label: string;
    maxWalkingMinutes: number;
    maxRadiusMeters: number;
    activityHint: string;
  }
> = {
  under15: {
    label: "under 15 min",
    maxWalkingMinutes: 5,
    maxRadiusMeters: 400,
    activityHint: "~15 minutes",
  },
  "15-30": {
    label: "15-30 min",
    maxWalkingMinutes: 10,
    maxRadiusMeters: 800,
    activityHint: "15-30 minutes",
  },
  "30-60": {
    label: "30-60 min",
    maxWalkingMinutes: 15,
    maxRadiusMeters: 1200,
    activityHint: "30-60 minutes",
  },
  "60+": {
    label: "60+ min",
    maxWalkingMinutes: 30,
    maxRadiusMeters: 3000,
    activityHint: "60 minutes or more",
  },
};

const STATIC_INSTRUCTIONS_COMPACT = [
  // Intent-based actions (simplified)
  "Intent→Action: inspiration=2-3 diverse queries | specific=narrow search+top picks | details=get_place_details | clarify=ask 1Q→search",

  // Reply guidance
  "Reply to latest turn using CONVERSATION_SUMMARY+CONTEXT_JSON; don't restart topic",

  // Card reuse logic
  'Reuse displayed_cards only when user refers to them ("that place", card click, details/compare). Otherwise fresh search',

  // Location coordinates (CRITICAL)
  "CRITICAL: user_lat & user_lng MUST be passed to search_places from user_coordinates in CONTEXT_JSON",

  // Search behavior
  "Call search_places when user asks new options. Respect explicit distance/location first, then quiz tolerance. Default ~500m. Set allow_extended_radius=true only if user explicitly widens",

  // Query construction
  'search_places.query MUST include: location phrase ("near current location") + time constraint if exists ("within 10min walk")',

  // Distance mapping (compact)
  "Time→Distance: 5min≈400m | 10min≈800m | 15min≈1.2km | default≈500m",

  // Answer directly when possible
  "If answer in displayed_cards or prior turns, respond directly without tools",

  // Keep replies compact
  "Replies: ≤3 sentences + ≤3 bullet suggestions (name+hook+distance)",
];

export interface UserContext {
  currentLocation?: {
    lat: number;
    lng: number;
    permission: boolean;
  };
  weather?: (WeatherData & { recommendation: WeatherRecommendation }) | null;
  homeDurationPreference?: "under15" | "15-30" | "30-60" | "60+";
  sessionHistory?: {
    searchedPlaces?: string[];
    recommendedPlaces?: string[];
    userFeedback?: string[];
  };
  intent?: {
    label: "inspiration" | "specific" | "details" | "clarify";
    reason?: string;
  };
  displayedCards?: Array<{
    place_id: string;
    name: string;
    formatted_address?: string;
    rating?: number;
    user_ratings_total?: number;
    price_level?: number;
    types?: string[];
    distance_m?: number;
    clicked?: boolean;
    displayedAt?: Date;
    reviews?: Array<{
      author_name: string;
      rating: number;
      text: string;
      relative_time_description: string;
      time: number;
    }>;
  }>;
  quizResults?: {
    travelType?: {
      travelTypeCode: string;
      travelTypeName: string;
      travelTypeEmoji: string;
      travelTypeDescription: string;
      locationLat?: number;
      locationLng?: number;
      locationPermission?: boolean;
    };
    answers?: {
      walkingTolerance?: string; // '5', '10', or '15'
      dietaryPreferences?: string[]; // 'vegetarian', 'halal', 'allergies'
      languageComfort?: string[]; // 'english', 'japanese'
      photoSubjects?: string[]; // 'raw fish', 'crowds', 'expensive', 'long stairs', 'alcohol'
      origin?: string; // User's origin country/city (for persona only, NOT for search)
    };
    recommendation?: any;
    places?: any[];
    timestamp?: number;
  };
}

/**
 * Generates dynamically updated context information
 * This information is updated for each message and added to the system prompt
 */
export function generateDynamicContextInfo(userContext: UserContext): string {
  const cardLimit = 5; // Increased from 2 for better context
  const displayedCards = (userContext.displayedCards ?? [])
    .slice(0, cardLimit)
    .map((card) => ({
      name: card.name,
      average_rating:
        typeof card.rating === "number"
          ? Number(card.rating.toFixed(1))
          : undefined,
      review_count: card.user_ratings_total,
      place_id: card.place_id,
    }));

  // Determine effective location: prefer currentLocation, fallback to quiz location
  const effectiveLocation = userContext.currentLocation?.permission
    ? {
        lat: userContext.currentLocation.lat,
        lng: userContext.currentLocation.lng,
        source: "current" as const,
      }
    : userContext.quizResults?.travelType?.locationLat !== undefined &&
        userContext.quizResults?.travelType?.locationLng !== undefined &&
        userContext.quizResults?.travelType?.locationPermission
      ? {
          lat: userContext.quizResults.travelType.locationLat,
          lng: userContext.quizResults.travelType.locationLng,
          source: "quiz" as const,
        }
      : undefined;

  const locationContext: {
    status: "available" | "unavailable";
    lat?: number;
    lng?: number;
    source?: "current" | "quiz";
  } = effectiveLocation
    ? {
        status: "available",
        lat: effectiveLocation.lat,
        lng: effectiveLocation.lng,
        source: effectiveLocation.source,
      }
    : { status: "unavailable" };

  const quizTravelType = userContext.quizResults?.travelType
    ? {
        code: userContext.quizResults.travelType.travelTypeCode,
        name: userContext.quizResults.travelType.travelTypeName,
        emoji: userContext.quizResults.travelType.travelTypeEmoji,
      }
    : undefined;

  const homeDuration = userContext.homeDurationPreference
    ? HOME_DURATION_MAP[userContext.homeDurationPreference]
    : undefined;
  const walkingTolerance = userContext.quizResults?.answers?.walkingTolerance;
  const quizTimeConstraint = walkingTolerance
    ? walkingTolerance === "5"
      ? {
          max_walking_minutes: 5,
          max_radius_meters: 400,
          source: "quiz" as const,
        }
      : walkingTolerance === "10"
        ? {
            max_walking_minutes: 10,
            max_radius_meters: 800,
            source: "quiz" as const,
          }
        : walkingTolerance === "15"
          ? {
              max_walking_minutes: 15,
              max_radius_meters: 1200,
              source: "quiz" as const,
            }
          : undefined
    : undefined;
  const durationTimeConstraint = homeDuration
    ? {
        max_walking_minutes: homeDuration.maxWalkingMinutes,
        max_radius_meters: homeDuration.maxRadiusMeters,
        activity_hint: homeDuration.activityHint,
        source: "home_duration" as const,
      }
    : undefined;
  const timeConstraint = durationTimeConstraint ?? quizTimeConstraint;
  const radiusKmHint = timeConstraint
    ? Math.round((timeConstraint.max_radius_meters / 1000) * 10) / 10
    : null;

  const dietaryPreferences =
    userContext.quizResults?.answers?.dietaryPreferences;
  const languageComfort = userContext.quizResults?.answers?.languageComfort;
  const photoSubjects = userContext.quizResults?.answers?.photoSubjects;
  const origin = userContext.quizResults?.answers?.origin;
  const todayInfo = today(userContext.currentLocation);

  // Build mandatory constraints from optional quiz questions
  const mandatoryConstraints: string[] = [];
  if (dietaryPreferences && dietaryPreferences.length > 0) {
    const dietaryMap: Record<string, string> = {
      vegetarian: "vegetarian",
      halal: "halal",
      allergies: "allergy-friendly",
    };
    const dietaryLabels = dietaryPreferences
      .map((p) => dietaryMap[p] || p)
      .join(", ");
    mandatoryConstraints.push(
      `MUST ONLY show places that accommodate: ${dietaryLabels}`,
    );
  }
  if (languageComfort && languageComfort.length > 0) {
    const languageLabels = languageComfort
      .map((l) =>
        l === "english" ? "English" : l === "japanese" ? "Japanese" : l,
      )
      .join(" or ");
    mandatoryConstraints.push(
      `MUST ONLY show places with ${languageLabels} language support`,
    );
  }
  if (photoSubjects && photoSubjects.length > 0) {
    const avoidLabels = photoSubjects
      .map((p) => {
        const map: Record<string, string> = {
          "raw fish": "raw fish/sushi",
          crowds: "crowded places",
          expensive: "expensive places",
          "long stairs": "places with long stairs",
          alcohol: "alcohol-serving establishments",
        };
        return map[p] || p;
      })
      .join(", ");
    mandatoryConstraints.push(`MUST EXCLUDE places with: ${avoidLabels}`);
  }

  const inspirationQueries =
    userContext.intent?.label === "inspiration"
      ? (() => {
          const code = quizTravelType?.code as TravelTypeCode | undefined;
          if (code && isValidTravelTypeCode(code)) {
            return getSearchQueryVariants(code);
          }
          return getDefaultInspirationVariants(locationContext);
        })()
      : undefined;

  // Format weather information for instructions
  const weatherInstruction = userContext.weather
    ? `Current weather at user's location:
- Weather: ${userContext.weather.condition.description} (${userContext.weather.condition.main})
- Temperature: ${userContext.weather.temperature}°C (feels like ${userContext.weather.feelsLike}°C)
- Recommended activity type: ${userContext.weather.recommendation.activityType === "indoor" ? "indoor" : userContext.weather.recommendation.activityType === "outdoor" ? "outdoor" : "flexible"}
- Recommendation reason: ${userContext.weather.recommendation.reason}
- Suggested activities: ${userContext.weather.recommendation.suggestions.join(", ")}

IMPORTANT: Use this weather information when making recommendations. If the weather suggests indoor activities (rain, snow, poor visibility), prioritize indoor places. If outdoor is recommended, favor outdoor experiences.`
    : locationContext.status === "unavailable"
      ? `Weather information: Not available (user's location is not accessible). 
When asked about weather, politely explain that you cannot provide current weather information because location access is not available. 
However, you can still suggest indoor/outdoor activities based on general seasonal advice. 
For current weather, recommend checking weather apps or websites.`
      : null;

  const instructions = [
    `today(): ${todayInfo.display} | ${todayInfo.timezone} (source=${todayInfo.source}). Use this as the current date/time.`,
    userContext.intent
      ? `Intent: ${userContext.intent.label}.`
      : "Intent: clarify.",
    ...STATIC_INSTRUCTIONS_TOP,
    ...(weatherInstruction ? [weatherInstruction] : []),
    ...(locationContext.status === "available" &&
    locationContext.lat !== undefined &&
    locationContext.lng !== undefined
      ? [
          `LOCATION AVAILABLE (source: ${locationContext.source}): lat=${locationContext.lat}, lng=${locationContext.lng}. CRITICAL: ALWAYS pass these as user_lat and user_lng to search_places for EVERY search.`,
        ]
      : [
          "LOCATION UNAVAILABLE: Ask user for location or suggest popular areas in Tokyo.",
        ]),
    timeConstraint
      ? `Walk constraint: ${timeConstraint.source === "home_duration" ? "Home duration" : "quiz"} ~${timeConstraint.max_walking_minutes}min / ~${radiusKmHint ?? 0.5}km. Default ~500m if not specified.`
      : "Default search radius: ~500m",
    ...(homeDuration
      ? [
          `Home duration: ${homeDuration.label} (${homeDuration.activityHint}, walk ~${radiusKmHint ?? 0.5}km).`,
        ]
      : []),
    ...(mandatoryConstraints.length > 0
      ? [`Hard filters (ALWAYS enforce): ${mandatoryConstraints.join(" | ")}`]
      : []),
    ...(origin ? [`Origin: ${origin} (persona only, NOT for search)`] : []),
    ...(inspirationQueries && inspirationQueries.length > 0
      ? [
          `Inspiration mode: use 2-3 queries from pool: ${inspirationQueries.slice(0, 4).join(" | ")}. Ensure diversity (food+activity+view).`,
        ]
      : []),
  ];

  const payload: Record<string, unknown> = {
    context: {
      today: todayInfo,
      location: locationContext,
      // Provide coordinates explicitly for AI to use in search_places
      ...(locationContext.status === "available" &&
      locationContext.lat !== undefined &&
      locationContext.lng !== undefined
        ? {
            user_coordinates: {
              lat: locationContext.lat,
              lng: locationContext.lng,
              source: locationContext.source,
              note: "CRITICAL: ALWAYS pass these coordinates as user_lat and user_lng when calling search_places for EVERY search",
            },
          }
        : {
            user_coordinates: {
              status: "unavailable",
              note: "Location not available. Ask user for location or suggest popular areas.",
            },
          }),
      quiz_travel_type: quizTravelType,
      ...(timeConstraint ? { walking_tolerance: timeConstraint } : {}),
      ...(homeDuration
        ? {
            home_duration_filter: {
              key: userContext.homeDurationPreference,
              label: homeDuration.label,
              activity_minutes_hint: homeDuration.activityHint,
              radius_hint_m: homeDuration.maxRadiusMeters,
            },
          }
        : {}),
      intent: userContext.intent
        ? { label: userContext.intent.label }
        : undefined,
      ...(origin
        ? {
            origin: `${origin} (PERSONA ONLY - do NOT use in search queries or suggest places in ${origin})`,
          }
        : {}),
      ...(dietaryPreferences && dietaryPreferences.length > 0
        ? { dietary_preferences: dietaryPreferences }
        : {}),
      ...(languageComfort && languageComfort.length > 0
        ? { language_comfort: languageComfort }
        : {}),
      ...(photoSubjects && photoSubjects.length > 0
        ? { photo_subjects_to_avoid: photoSubjects }
        : {}),
      ...(inspirationQueries && inspirationQueries.length > 0
        ? { inspiration_queries: inspirationQueries }
        : {}),
      ...(userContext.weather
        ? {
            weather: {
              temperature: userContext.weather.temperature,
              feelsLike: userContext.weather.feelsLike,
              condition: userContext.weather.condition,
              recommendation: userContext.weather.recommendation,
            },
          }
        : {}),
    },
    displayed_cards: displayedCards.length ? displayedCards : undefined,
    instructions,
  };

  return `CONTEXT_JSON:\n${JSON.stringify(payload)}`;
}
