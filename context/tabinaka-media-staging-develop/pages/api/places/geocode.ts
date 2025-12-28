import { NextApiRequest, NextApiResponse } from "next";

interface GeocodeRequest {
  address: string;
}

interface GeocodeResponse {
  lat?: number;
  lng?: number;
  formatted_address?: string;
  error?: string;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<GeocodeResponse>,
) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { address }: GeocodeRequest = req.body;

    if (!address || typeof address !== "string") {
      return res.status(400).json({ error: "Address is required" });
    }

    const apiKey = process.env.GOOGLE_PLACES_API_KEY_SERVER;

    if (!apiKey) {
      console.error("Google Maps API key is not configured");
      return res.status(500).json({ error: "Maps service is not configured" });
    }

    // Google Geocoding API call
    const geocodeUrl = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=${apiKey}&region=jp`;

    console.log("Geocoding request:", { address, url: geocodeUrl });

    const response = await fetch(geocodeUrl);
    const data = await response.json();

    console.log("Geocoding response:", {
      status: data.status,
      results: data.results?.length,
      error_message: data.error_message,
    });

    if (data.status === "OK" && data.results && data.results.length > 0) {
      const result = data.results[0];
      const location = result.geometry.location;

      console.log("Geocoding success:", {
        address,
        lat: location.lat,
        lng: location.lng,
        formatted_address: result.formatted_address,
      });

      res.status(200).json({
        lat: location.lat,
        lng: location.lng,
        formatted_address: result.formatted_address,
      });
    } else {
      console.error("Geocoding failed:", data.status, data.error_message);
      res.status(400).json({
        error: `Could not find location: ${data.error_message || data.status}`,
      });
    }
  } catch (error) {
    console.error("Geocoding API Error:", error);
    res.status(500).json({
      error: "Error occurred while getting location",
    });
  }
}
