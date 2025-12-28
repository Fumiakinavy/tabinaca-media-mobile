import { NextApiRequest, NextApiResponse } from "next";

type ReverseGeocodeRequest = {
  lat?: number;
  lng?: number;
};

type ReverseGeocodeResponse = {
  formatted_address?: string;
  error?: string;
  error_code?: string;
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ReverseGeocodeResponse>,
) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { lat, lng }: ReverseGeocodeRequest = req.body || {};

  if (
    typeof lat !== "number" ||
    typeof lng !== "number" ||
    Number.isNaN(lat) ||
    Number.isNaN(lng)
  ) {
    return res.status(400).json({
      error: "Latitude and longitude are required",
    });
  }

  // Geocoding API 用キー（未指定なら既存の Places サーバーキーを流用）
  const apiKey =
    process.env.GOOGLE_GEOCODING_API_KEY_SERVER ??
    process.env.GOOGLE_PLACES_API_KEY_SERVER;

  if (!apiKey) {
    console.error("Google Maps API key is not configured");
    return res.status(500).json({ error: "Maps service is not configured" });
  }

  const reverseGeocodeUrl =
    "https://maps.googleapis.com/maps/api/geocode/json" +
    `?latlng=${lat},${lng}` +
    `&key=${apiKey}` +
    "&language=en" +
    "&result_type=street_address|premise|point_of_interest|sublocality|locality";

  try {
    const response = await fetch(reverseGeocodeUrl);
    const data = await response.json();

    console.log("Reverse geocoding response:", {
      status: data.status,
      results: data.results?.length,
      error_message: data.error_message,
    });

    if (data.status === "OK" && data.results?.length) {
      const result = data.results[0];
      return res.status(200).json({
        formatted_address: result.formatted_address,
      });
    }

    // Google側の設定問題はクライアントで判別しやすいようにコードも返す
    if (data.status === "REQUEST_DENIED") {
      const message =
        typeof data.error_message === "string" && data.error_message
          ? data.error_message
          : "Geocoding request was denied";
      console.error("Reverse geocoding denied:", data.status, data.error_message);
      return res.status(400).json({
        error: message,
        error_code: "GEOCODING_REQUEST_DENIED",
      });
    }

    const message =
      typeof data.error_message === "string" && data.error_message
        ? data.error_message
        : "Unable to resolve location";

    console.error("Reverse geocoding failed:", data.status, data.error_message);
    return res.status(400).json({ error: message });
  } catch (error) {
    console.error("Reverse geocoding API Error:", error);
    return res
      .status(500)
      .json({ error: "Error occurred while resolving location" });
  }
}
