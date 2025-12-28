import { LocationErrorCode } from "@/lib/locationService";

/**
 * Centralized location error messages with i18n support
 */
export const locationErrorMessages = {
  ja: {
    permission_denied: "位置情報へのアクセスが拒否されました",
    position_unavailable:
      "位置情報を取得できませんでした。通信状況を確認してください。",
    timeout: "位置情報の取得がタイムアウトしました。",
    unsupported: "このブラウザでは位置情報を利用できません。",
    insecure_context: "HTTPSでないと位置情報を取得できません。",
    unknown: "位置情報の取得に失敗しました",
  },
  en: {
    permission_denied: "Location access was denied",
    position_unavailable:
      "Unable to retrieve location. Please check your connection.",
    timeout: "Location request timed out.",
    unsupported: "Your browser does not support location services.",
    insecure_context: "Location services require HTTPS.",
    unknown: "Failed to get location",
  },
} as const;

export const detailedLocationErrorMessages = {
  ja: {
    permission_denied:
      "位置情報へのアクセスが拒否されました。手動で位置情報を入力してください。",
    position_unavailable:
      "位置情報を取得できませんでした。もう一度お試しいただくか、手動で入力してください。",
    timeout:
      "位置情報の取得がタイムアウトしました。もう一度お試しいただくか、手動で入力してください。",
    unsupported:
      "このブラウザでは位置情報を利用できません。手動で位置情報を入力してください。",
    insecure_context:
      "HTTPSを有効にして位置情報を使用するか、手動で入力してください。",
    unknown:
      "不明なエラーが発生しました。手動で位置情報を入力してください。",
  },
  en: {
    permission_denied:
      "Location access was denied. Please enter your location manually.",
    position_unavailable:
      "Location information is unavailable. Please try again or enter manually.",
    timeout:
      "Location request timed out. Please try again or enter manually.",
    unsupported:
      "Your browser does not support location. Please enter it manually.",
    insecure_context:
      "Enable HTTPS to use your location, or enter it manually.",
    unknown:
      "An unknown error occurred. Please enter your location manually.",
  },
} as const;

export type SupportedLanguage = keyof typeof locationErrorMessages;

/**
 * Gets a localized error message for a given error code
 * @param code - The location error code
 * @param lang - The language (defaults to "ja")
 * @param detailed - Whether to return detailed error message
 * @returns Localized error message
 */
export function getLocationErrorMessage(
  code: LocationErrorCode,
  lang: SupportedLanguage = "ja",
  detailed = false,
): string {
  const messages = detailed
    ? detailedLocationErrorMessages
    : locationErrorMessages;
  return messages[lang][code] || messages[lang].unknown;
}
