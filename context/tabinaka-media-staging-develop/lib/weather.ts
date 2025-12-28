/**
 * 天気情報取得と旅行プラン推奨ロジック
 * 旅行中に天気情報を活用して最適な提案を行う
 */

export interface WeatherCondition {
  /** 天気状態のメインカテゴリ */
  main:
    | "Clear"
    | "Clouds"
    | "Rain"
    | "Drizzle"
    | "Thunderstorm"
    | "Snow"
    | "Mist"
    | "Fog"
    | "Haze"
    | "Dust"
    | "Sand"
    | "Ash"
    | "Squall"
    | "Tornado";
  /** 天気状態の詳細説明 */
  description: string;
  /** 天気アイコンコード */
  icon: string;
}

export interface WeatherData {
  /** 現在の気温（摂氏） */
  temperature: number;
  /** 体感気温（摂氏） */
  feelsLike: number;
  /** 湿度（%） */
  humidity: number;
  /** 天気状態 */
  condition: WeatherCondition;
  /** 風速（m/s） */
  windSpeed: number;
  /** 視認性（メートル） */
  visibility: number;
  /** 降水量（mm/h、降雨時のみ） */
  precipitation?: number;
  /** 雲量（%） */
  clouds: number;
}

export interface WeatherRecommendation {
  /** 推奨アクティビティタイプ */
  activityType: "indoor" | "outdoor" | "flexible";
  /** 推奨理由 */
  reason: string;
  /** 具体的な推奨事項 */
  suggestions: string[];
  /** 気温に基づく推奨事項 */
  temperatureNote?: string;
}

/**
 * 天気データを取得（サーバーサイドから呼び出す）
 */
export async function fetchWeatherData(
  lat: number,
  lng: number,
): Promise<WeatherData | null> {
  try {
    const response = await fetch(
      `/api/weather?lat=${lat}&lng=${lng}`,
    );

    if (!response.ok) {
      console.error("[Weather] Failed to fetch weather data:", response.status);
      return null;
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error("[Weather] Error fetching weather data:", error);
    return null;
  }
}

/**
 * 天気情報に基づいて推奨アクティビティタイプを決定
 */
export function getWeatherRecommendation(
  weather: WeatherData,
): WeatherRecommendation {
  const { condition, temperature, precipitation, windSpeed, visibility } =
    weather;

  // 雨や雷雨の場合は室内推奨
  if (
    condition.main === "Rain" ||
    condition.main === "Drizzle" ||
    condition.main === "Thunderstorm"
  ) {
    return {
      activityType: "indoor",
      reason: "雨のため、室内アクティビティが快適です",
      suggestions: [
        "博物館・美術館",
        "カフェ・レストラン",
        "ショッピングモール",
        "映画館・劇場",
        "屋内スポーツ施設",
      ],
      temperatureNote: getTemperatureNote(temperature),
    };
  }

  // 雪の場合は室内またはスキー場など雪向けのアクティビティ
  if (condition.main === "Snow") {
    return {
      activityType: "flexible",
      reason: "雪が降っているため、雪を楽しむアクティビティまたは室内アクティビティがおすすめです",
      suggestions: [
        "スキー場・スノーボード場",
        "雪まつり",
        "温泉・スパ",
        "屋内スポーツ施設",
        "カフェ・レストラン",
      ],
      temperatureNote: getTemperatureNote(temperature),
    };
  }

  // 視認性が低い場合（霧、もやなど）
  if (
    condition.main === "Fog" ||
    condition.main === "Mist" ||
    condition.main === "Haze" ||
    visibility < 1000
  ) {
    return {
      activityType: "indoor",
      reason: "視認性が低いため、室内アクティビティが安全です",
      suggestions: [
        "博物館・美術館",
        "カフェ・レストラン",
        "ショッピングモール",
        "屋内スポーツ施設",
      ],
      temperatureNote: getTemperatureNote(temperature),
    };
  }

  // 強風の場合
  if (windSpeed > 10) {
    return {
      activityType: "flexible",
      reason: "風が強いため、風を避けられる場所がおすすめです",
      suggestions: [
        "室内アクティビティ",
        "風を避けられる場所でのアクティビティ",
        "建物の多いエリアでの散策",
      ],
      temperatureNote: getTemperatureNote(temperature),
    };
  }

  // 快晴・晴れの場合は屋外推奨
  if (condition.main === "Clear" || condition.main === "Clouds") {
    const suggestions: string[] = [
      "公園での散策",
      "屋外カフェ",
      "観光スポット巡り",
      "ハイキング・ウォーキング",
    ];

    // 気温が適温の場合はより積極的に屋外を推奨
    if (temperature >= 15 && temperature <= 28) {
      suggestions.push("ピクニック", "ビーチアクティビティ", "屋外イベント");
    }

    return {
      activityType: "outdoor",
      reason: "天気が良いため、屋外アクティビティが快適です",
      suggestions,
      temperatureNote: getTemperatureNote(temperature),
    };
  }

  // デフォルトは柔軟
  return {
    activityType: "flexible",
    reason: "天気に応じて柔軟に計画できます",
    suggestions: [
      "天気を見ながら決定",
      "屋内外両方のオプションを用意",
    ],
    temperatureNote: getTemperatureNote(temperature),
  };
}

/**
 * 気温に基づく注意事項を取得
 */
function getTemperatureNote(temperature: number): string {
  if (temperature < 5) {
    return "気温が低いため、防寒対策をおすすめします";
  } else if (temperature < 15) {
    return "少し肌寒いため、上着があると快適です";
  } else if (temperature >= 15 && temperature <= 28) {
    return "過ごしやすい気温です";
  } else if (temperature <= 35) {
    return "気温が高いため、日陰や水分補給にご注意ください";
  } else {
    return "気温が非常に高いため、熱中症にご注意ください。室内アクティビティをおすすめします";
  }
}

/**
 * 天気情報をプロンプト用のテキストに変換
 */
export function formatWeatherForPrompt(
  weather: WeatherData | null,
): string {
  if (!weather) {
    return "天気情報は現在取得できません。";
  }

  const { condition, temperature, feelsLike, humidity, windSpeed } = weather;
  const recommendation = getWeatherRecommendation(weather);

  return `
天気情報:
- 天気: ${condition.description} (${condition.main})
- 気温: ${temperature}°C (体感: ${feelsLike}°C)
- 湿度: ${humidity}%
- 風速: ${windSpeed}m/s
- 推奨アクティビティタイプ: ${recommendation.activityType === "indoor" ? "室内" : recommendation.activityType === "outdoor" ? "屋外" : "柔軟"}
- 推奨理由: ${recommendation.reason}
${recommendation.temperatureNote ? `- 気温に関する注意: ${recommendation.temperatureNote}` : ""}
- 推奨アクティビティ例: ${recommendation.suggestions.join(", ")}
`.trim();
}



