import type { NextApiRequest, NextApiResponse } from "next";
import { WeatherData } from "../../lib/weather";

/**
 * 天気情報を取得するAPIエンドポイント
 * OpenWeatherMap APIを使用
 */
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  // GETメソッドのみ許可
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { lat, lng } = req.query;

  // 緯度・経度のバリデーション
  if (!lat || !lng) {
    return res.status(400).json({
      error: "Latitude and longitude are required",
    });
  }

  const latitude = parseFloat(lat as string);
  const longitude = parseFloat(lng as string);

  if (
    isNaN(latitude) ||
    isNaN(longitude) ||
    latitude < -90 ||
    latitude > 90 ||
    longitude < -180 ||
    longitude > 180
  ) {
    return res.status(400).json({
      error: "Invalid latitude or longitude values",
    });
  }

  // OpenWeatherMap APIキーを取得
  const apiKey = process.env.OPENWEATHERMAP_API_KEY;

  if (!apiKey) {
    console.error("[Weather API] OPENWEATHERMAP_API_KEY is not set");
    return res.status(500).json({
      error: "Weather API key is not configured",
    });
  }

  try {
    // OpenWeatherMap APIを呼び出し
    const apiUrl = `https://api.openweathermap.org/data/2.5/weather?lat=${latitude}&lon=${longitude}&appid=${apiKey}&units=metric&lang=ja`;

    const response = await fetch(apiUrl);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error(
        "[Weather API] OpenWeatherMap API error:",
        response.status,
        errorData,
      );

      return res.status(response.status).json({
        error: "Failed to fetch weather data",
        details: errorData,
      });
    }

    const data = await response.json();

    // OpenWeatherMap APIのレスポンスを内部形式に変換
    const weatherData: WeatherData = {
      temperature: Math.round(data.main.temp),
      feelsLike: Math.round(data.main.feels_like),
      humidity: data.main.humidity,
      condition: {
        main: data.weather[0].main,
        description: data.weather[0].description,
        icon: data.weather[0].icon,
      },
      windSpeed: data.wind?.speed || 0,
      visibility: data.visibility ?? 10000,
      precipitation: data.rain?.["1h"] || data.rain?.["3h"] || undefined,
      clouds: data.clouds?.all || 0,
    };

    return res.status(200).json(weatherData);
  } catch (error) {
    console.error("[Weather API] Error fetching weather data:", error);
    return res.status(500).json({
      error: "Internal server error",
      message:
        error instanceof Error ? error.message : "Unknown error occurred",
    });
  }
}



