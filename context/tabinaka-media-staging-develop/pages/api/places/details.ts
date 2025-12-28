import { NextApiRequest, NextApiResponse } from "next";
import { apiCache, generateCacheKey, CACHE_TTL } from "../../../lib/cache";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { place_id, fields } = req.body;

    if (!place_id) {
      return res.status(400).json({ error: "place_id is required" });
    }

    const googleApiKey =
      process.env.GOOGLE_PLACES_API_KEY_SERVER ||
      process.env.GOOGLE_PLACES_API_KEY;
    if (!googleApiKey) {
      return res
        .status(500)
        .json({ error: "Google Places API key not configured" });
    }

    // Default fields to retrieve
    const defaultFields = [
      "name",
      "formatted_address",
      "rating",
      "user_ratings_total",
      "photos",
      "opening_hours",
      "reviews",
      "price_level",
      "types",
      "website",
      "formatted_phone_number",
      "editorial_summary",
    ];

    const fieldsToRetrieve =
      fields && fields.length > 0 ? fields.join(",") : defaultFields.join(",");

    // Generate cache key
    const cacheKey = generateCacheKey.placeDetails(place_id, fieldsToRetrieve);

    // Check cache first
    const cachedResult = apiCache.get(cacheKey);
    if (cachedResult) {
      console.log("Using cached place details for:", place_id);
      return res.status(200).json(cachedResult);
    }

    const url = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${place_id}&fields=${fieldsToRetrieve}&key=${googleApiKey}`;

    const response = await fetch(url);
    const data = await response.json();

    if (data.status !== "OK") {
      return res
        .status(400)
        .json({ error: data.error_message || "Failed to get place details" });
    }

    const responseData = {
      success: true,
      place: data.result,
    };

    // Cache the result
    apiCache.set(cacheKey, responseData, CACHE_TTL.PLACE_DETAILS);

    res.status(200).json(responseData);
  } catch (error) {
    console.error("Place details API error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
}
