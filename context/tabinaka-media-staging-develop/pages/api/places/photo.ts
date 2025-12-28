import type { NextApiRequest, NextApiResponse } from "next";
import { handleCorsPreflightRequest, setCorsHeaders } from "@/lib/cors";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  // CORS: プリフライトリクエストを処理
  if (handleCorsPreflightRequest(req, res)) {
    return;
  }
  setCorsHeaders(req, res);

  // Only allow GET requests
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const name = String(req.query.name || "");
    const maxHeightPx = Number(req.query.maxHeightPx || 400);
    const maxWidthPx = Number(req.query.maxWidthPx || 400);

    if (!name) {
      return res.status(400).json({ error: "missing photo name" });
    }

    // Check if server API key is configured
    const serverKey = process.env.GOOGLE_PLACES_API_KEY_SERVER;
    if (!serverKey) {
      console.error("Google Places API server key is not configured");
      return res.status(500).json({ error: "Photo service is not configured" });
    }

    // Build URL for Places API v1 photo media
    const url = new URL(`https://places.googleapis.com/v1/${name}:media`);
    url.searchParams.set("maxHeightPx", String(maxHeightPx));
    if (maxWidthPx) {
      url.searchParams.set("maxWidthPx", String(maxWidthPx));
    }

    console.log("Fetching photo:", url.toString());

    // Call Google Places API with server key
    const response = await fetch(url.toString(), {
      headers: {
        "X-Goog-Api-Key": serverKey,
        "User-Agent": "Gappy-App/1.0",
      },
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => "");
      console.error("Places API photo error:", response.status, errorText);

      // Return appropriate error status
      if (response.status === 403) {
        return res.status(403).json({
          error: "API access denied. Please check API key permissions.",
        });
      } else if (response.status === 404) {
        return res.status(404).json({
          error: "Photo not found",
        });
      } else if (response.status === 429) {
        return res.status(429).json({
          error: "API rate limit exceeded",
        });
      }

      return res.status(response.status).json({
        error: errorText || "Failed to fetch photo",
      });
    }

    // Get the image data
    const imageBuffer = Buffer.from(await response.arrayBuffer());
    const contentType = response.headers.get("Content-Type") || "image/jpeg";

    // Set appropriate headers for caching and content type
    res.setHeader("Content-Type", contentType);
    res.setHeader("Cache-Control", "public, max-age=86400, immutable"); // Cache for 24 hours
    res.setHeader("Content-Length", imageBuffer.length.toString());
    // CORS headers are already set by setCorsHeaders()

    console.log("Photo fetched successfully:", {
      name,
      size: imageBuffer.length,
      contentType,
      timestamp: new Date().toISOString(),
    });

    // Send the image data
    res.status(200).send(imageBuffer);
  } catch (error) {
    console.error("Photo proxy error:", error);
    res.status(500).json({
      error: error instanceof Error ? error.message : "Internal server error",
    });
  }
}
