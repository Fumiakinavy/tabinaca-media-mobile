import {
  GETYOURGUIDE_AFFILIATES,
  getAffiliateExperiencesByLocation,
} from "@/config/experienceSettings";

export interface AffiliatePlace {
  place_id: string;
  name: string;
  formatted_address?: string;
  rating?: number;
  user_ratings_total?: number;
  price_level?: number;
  types?: string[];
  distance_m?: number;
  affiliateUrl?: string;
  price?: string;
  duration?: string;
  isAffiliate?: boolean;
  imageUrl?: string;
}

export interface BasePlace {
  place_id: string;
  name?: string;
  formatted_address?: string;
  rating?: number;
  user_ratings_total?: number;
  price_level?: number;
  types?: string[];
  distance_m?: number;
}

export interface AddAffiliateOptions {
  includeAffiliates?: boolean;
  maxRegularPlaces?: number;
  maxAffiliates?: number;
  logPrefix?: string;
}

const DEFAULT_MAX_REGULAR_PLACES = 17;
const DEFAULT_MAX_AFFILIATES = 3;

const DEFAULT_LOCATION_ALIASES: Record<string, string[]> = {
  "\u6e0b\u8c37": ["shibuya"],
  "\u539f\u5bbf": ["harajuku"],
  "\u65b0\u5bbf": ["shinjuku"],
};

const AFFILIATE_LOCATION_ALIASES = buildAffiliateLocationAliases();

function buildAffiliateLocationAliases(): Record<string, string[]> {
  const aliases = new Map<string, Set<string>>();

  for (const affiliate of GETYOURGUIDE_AFFILIATES) {
    const location = affiliate.location?.trim();
    if (!location) continue;
    if (!aliases.has(location)) {
      aliases.set(location, new Set([location]));
    }
    const defaultAliases = DEFAULT_LOCATION_ALIASES[location] ?? [];
    defaultAliases.forEach((alias) => aliases.get(location)?.add(alias));
  }

  return Object.fromEntries(
    Array.from(aliases.entries()).map(([location, values]) => [
      location,
      Array.from(values),
    ]),
  );
}

function createLogger(prefix?: string) {
  if (!prefix) return () => {};
  return (...args: unknown[]) => {
    console.log(`[${prefix}]`, ...args);
  };
}

function detectAffiliateLocationsFromPlaces(
  places: Array<{ name?: string; formatted_address?: string }>,
): string[] {
  const locationKeywords = new Set<string>();

  for (const place of places) {
    const address = place.formatted_address?.toLowerCase() ?? "";
    const name = place.name?.toLowerCase() ?? "";
    const searchText = `${address} ${name}`;

    for (const [location, aliases] of Object.entries(
      AFFILIATE_LOCATION_ALIASES,
    )) {
      const matches = aliases.some((alias) =>
        searchText.includes(alias.toLowerCase()),
      );
      if (matches) {
        locationKeywords.add(location);
      }
    }
  }

  return Array.from(locationKeywords);
}

export function addAffiliateExperiencesToPlaces<T extends BasePlace>(
  places: T[],
  options?: AddAffiliateOptions,
): Array<T | AffiliatePlace> {
  const {
    includeAffiliates = true,
    maxRegularPlaces = DEFAULT_MAX_REGULAR_PLACES,
    maxAffiliates = DEFAULT_MAX_AFFILIATES,
    logPrefix = "affiliate-merge",
  } = options ?? {};

  const log = createLogger(logPrefix);

  if (!includeAffiliates) {
    return places.slice(0, maxRegularPlaces);
  }

  if (!places || places.length === 0) {
    log("No places found, skipping affiliate addition");
    return [];
  }

  const regularPlaces = places.slice(0, maxRegularPlaces);
  const locationKeywords = detectAffiliateLocationsFromPlaces(places);

  const affiliatesToAdd: typeof GETYOURGUIDE_AFFILIATES = [];
  for (const location of locationKeywords) {
    const locationAffiliates = getAffiliateExperiencesByLocation(location);
    for (const affiliate of locationAffiliates) {
      if (!affiliatesToAdd.find((existing) => existing.id === affiliate.id)) {
        affiliatesToAdd.push(affiliate);
      }
    }
  }

  const defaultAffiliates = GETYOURGUIDE_AFFILIATES.slice(0, maxAffiliates);
  for (const affiliate of defaultAffiliates) {
    if (!affiliatesToAdd.find((existing) => existing.id === affiliate.id)) {
      affiliatesToAdd.push(affiliate);
    }
  }

  const limitedAffiliates = affiliatesToAdd.slice(0, maxAffiliates);

  log("Adding affiliates:", {
    locationKeywords,
    affiliatesFound: limitedAffiliates.length,
    affiliateIds: limitedAffiliates.map((affiliate) => affiliate.id),
  });

  const affiliatePlaces: AffiliatePlace[] = [];
  for (const affiliate of limitedAffiliates) {
    const affiliatePlace: AffiliatePlace = {
      place_id: `affiliate-${affiliate.id}`,
      name: affiliate.title,
      formatted_address: affiliate.meetingPointJa || affiliate.meetingPoint,
      types: ["affiliate", affiliate.category],
      affiliateUrl: affiliate.affiliateUrl,
      price: affiliate.price ? `¥${affiliate.price}` : undefined,
      duration: affiliate.duration ? `${affiliate.duration}h` : undefined,
      isAffiliate: true,
      imageUrl: affiliate.imageUrl,
    };

    if (!regularPlaces.find((place) => place.place_id === affiliatePlace.place_id)) {
      affiliatePlaces.push(affiliatePlace);
    }
  }

  const result = [...regularPlaces, ...affiliatePlaces];

  log("Final affiliate merge result:", {
    regularPlacesCount: regularPlaces.length,
    affiliatePlacesCount: affiliatePlaces.length,
    totalPlaces: result.length,
  });

  return result;
}
