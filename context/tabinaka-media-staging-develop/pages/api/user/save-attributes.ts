import { NextApiRequest, NextApiResponse } from "next";
import OpenAI from "openai";

// Groq client initialization (OpenAI-compatible)
const groq = new OpenAI({
  apiKey: process.env.GROQ_API_KEY,
  baseURL: "https://api.groq.com/openai/v1",
});

const COUNTRY_MODEL = process.env.GROQ_CHAT_MODEL_ID || "llama-3.1-8b-instant";

interface SaveAttributesRequest {
  userId: string;
  attributes: {
    country_name?: string;
    age_range?: string;
    travel_style?: string;
    trip_duration?: string;
    budget_level?: string;
  };
}

interface SaveAttributesResponse {
  success: boolean;
  error?: string;
  country_code?: string;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<SaveAttributesResponse>,
) {
  // Only allow POST requests
  if (req.method !== "POST") {
    return res.status(405).json({
      success: false,
      error: "Method not allowed",
    });
  }

  try {
    const { userId, attributes }: SaveAttributesRequest = req.body;

    // Validate input
    if (!userId || !attributes) {
      return res.status(400).json({
        success: false,
        error: "User ID and attributes are required",
      });
    }

    // Determine country code using OpenAI if country_name is provided
    let country_code = "US"; // default
    if (attributes.country_name) {
      try {
        const completion = await groq.chat.completions.create({
          model: COUNTRY_MODEL,
          messages: [
            {
              role: "system",
              content:
                "You are a country code converter. Given a country name, return the ISO 3166-1 alpha-2 country code. Return only the 2-letter code, nothing else.",
            },
            {
              role: "user",
              content: `Convert this country name to ISO 3166-1 alpha-2 code: ${attributes.country_name}`,
            },
          ],
          max_tokens: 10,
          temperature: 0,
        });

        const response = completion.choices[0]?.message?.content?.trim();
        if (response && response.length === 2) {
          country_code = response.toUpperCase();
        }
      } catch (error) {
        console.error("Country code conversion error:", error);
        // Continue with default country code
      }
    }

    // TODO: Save to Supabase database
    // For now, just return success
    console.log("User attributes to save:", {
      userId,
      attributes,
      country_code,
    });

    // Simulate successful save
    res.status(200).json({
      success: true,
      country_code,
    });
  } catch (error) {
    console.error("Save attributes error:", error);
    res.status(500).json({
      success: false,
      error: "Failed to save attributes",
    });
  }
}
