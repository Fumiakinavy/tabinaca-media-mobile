/**
 * サーバーサイド用の天気情報取得関数
 * OpenWeatherMap APIを直接呼び出す
 */

import type { WeatherData, WeatherRecommendation } from "./weather";

/**
 * サーバーサイドで天気情報を取得
 */
export async function fetchWeatherDataServer(
  lat: number,
  lng: number,
): Promise<WeatherData | null> {
  const apiKey = process.env.OPENWEATHERMAP_API_KEY;

  if (!apiKey) {
    console.error("[Weather] OPENWEATHERMAP_API_KEY is not set");
    return null;
  }

  try {
    const apiUrl = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lng}&appid=${apiKey}&units=metric&lang=ja`;

    const response = await fetch(apiUrl);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error(
        "[Weather] OpenWeatherMap API error:",
        response.status,
        errorData,
      );
      return null;
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

    return weatherData;
  } catch (error) {
    console.error("[Weather] Error fetching weather data:", error);
    return null;
  }
}



