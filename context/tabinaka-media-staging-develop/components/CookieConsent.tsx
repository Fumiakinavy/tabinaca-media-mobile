import { useState, useEffect } from "react";
import { useTranslation } from "next-i18next";

interface ConsentPreferences {
  necessary: boolean; // 常にtrue
  analytics: boolean;
  marketing: boolean;
  personalization: boolean;
}

const CONSENT_STORAGE_KEY = "gappy_cookie_consent";
const CONSENT_VERSION = "1.0";

export default function CookieConsent() {
  const { t } = useTranslation("common");
  const [showBanner, setShowBanner] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [preferences, setPreferences] = useState<ConsentPreferences>({
    necessary: true,
    analytics: false,
    marketing: false,
    personalization: false,
  });

  useEffect(() => {
    // 既存の同意設定を確認
    const savedConsent = localStorage.getItem(CONSENT_STORAGE_KEY);
    if (!savedConsent) {
      setShowBanner(true);
    } else {
      try {
        const parsed = JSON.parse(savedConsent);
        if (parsed.version === CONSENT_VERSION) {
          setPreferences(parsed.preferences);
          applyConsent(parsed.preferences);
        } else {
          // バージョンが異なる場合は再同意を求める
          setShowBanner(true);
        }
      } catch {
        setShowBanner(true);
      }
    }
  }, []);

  const applyConsent = (prefs: ConsentPreferences) => {
    // Google Analyticsの制御
    if (typeof window !== "undefined" && (window as any).gtag) {
      (window as any).gtag("consent", "update", {
        analytics_storage: prefs.analytics ? "granted" : "denied",
        ad_storage: prefs.marketing ? "granted" : "denied",
        personalization_storage: prefs.personalization ? "granted" : "denied",
      });
    }

    // トラッキングの制御
    if (!prefs.analytics) {
      // アナリティクスが拒否された場合、トラッキングを停止
      localStorage.setItem("gappy_tracking_disabled", "true");
    } else {
      localStorage.removeItem("gappy_tracking_disabled");
    }
  };

  const saveConsent = async (prefs: ConsentPreferences) => {
    const consentData = {
      version: CONSENT_VERSION,
      preferences: prefs,
      timestamp: new Date().toISOString(),
    };

    localStorage.setItem(CONSENT_STORAGE_KEY, JSON.stringify(consentData));
    applyConsent(prefs);

    // Supabaseに保存
    try {
      await fetch("/api/consent/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(consentData),
      });
    } catch (error) {
      console.error("Failed to save consent to server:", error);
    }

    setShowBanner(false);
    setShowSettings(false);
  };

  const acceptAll = () => {
    const allAccepted: ConsentPreferences = {
      necessary: true,
      analytics: true,
      marketing: true,
      personalization: true,
    };
    setPreferences(allAccepted);
    saveConsent(allAccepted);
  };

  const acceptNecessaryOnly = () => {
    const necessaryOnly: ConsentPreferences = {
      necessary: true,
      analytics: false,
      marketing: false,
      personalization: false,
    };
    setPreferences(necessaryOnly);
    saveConsent(necessaryOnly);
  };

  const saveCustomPreferences = () => {
    saveConsent(preferences);
  };

  const togglePreference = (key: keyof ConsentPreferences) => {
    if (key === "necessary") return; // 必須Cookieは変更不可
    setPreferences((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  if (!showBanner && !showSettings) return null;

  return (
    <>
      {/* Cookie同意バナー */}
      {showBanner && !showSettings && (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t-2 border-primary-500 shadow-2xl z-50 p-4 md:p-6">
          <div className="container mx-auto max-w-6xl">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div className="flex-1">
                <h3 className="text-lg font-bold text-gray-900 mb-2">
                  🍪 Cookieの使用について
                </h3>
                <p className="text-sm text-gray-700">
                  当サイトでは、サービスの向上と利用状況の分析のためCookieを使用します。
                  継続してご利用いただく場合、Cookieの使用に同意したものとみなします。
                  詳細は
                  <a
                    href="/privacy-policy"
                    className="text-primary-500 hover:underline ml-1"
                    target="_blank"
                  >
                    プライバシーポリシー
                  </a>
                  をご確認ください。
                </p>
              </div>
              <div className="flex flex-col sm:flex-row gap-2 w-full md:w-auto">
                <button
                  onClick={() => setShowSettings(true)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition"
                >
                  詳細設定
                </button>
                <button
                  onClick={acceptNecessaryOnly}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition"
                >
                  必要最小限のみ
                </button>
                <button
                  onClick={acceptAll}
                  className="px-6 py-2 text-sm font-medium text-white bg-primary-500 rounded-lg hover:bg-primary-600 transition"
                >
                  すべて許可
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Cookie設定モーダル */}
      {showSettings && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-start mb-6">
                <h2 className="text-2xl font-bold text-gray-900">Cookie設定</h2>
                <button
                  onClick={() => setShowSettings(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg
                    className="w-6 h-6"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              </div>

              <p className="text-sm text-gray-600 mb-6">
                Cookieの種類ごとに、利用の可否を設定できます。
              </p>

              {/* 必須Cookie */}
              <div className="border-b border-gray-200 pb-4 mb-4">
                <div className="flex justify-between items-center mb-2">
                  <h3 className="font-semibold text-gray-900">
                    必須Cookie（常に有効）
                  </h3>
                  <div className="w-12 h-6 bg-primary-500 rounded-full relative">
                    <div className="absolute right-1 top-1 w-4 h-4 bg-white rounded-full"></div>
                  </div>
                </div>
                <p className="text-sm text-gray-600">
                  サイトの基本機能に必要なCookieです。ログイン状態の維持、セキュリティ、セッション管理などに使用されます。
                </p>
              </div>

              {/* アナリティクスCookie */}
              <div className="border-b border-gray-200 pb-4 mb-4">
                <div className="flex justify-between items-center mb-2">
                  <h3 className="font-semibold text-gray-900">
                    アナリティクスCookie
                  </h3>
                  <button
                    onClick={() => togglePreference("analytics")}
                    className={`w-12 h-6 rounded-full relative transition ${
                      preferences.analytics ? "bg-primary-500" : "bg-gray-300"
                    }`}
                  >
                    <div
                      className={`absolute top-1 w-4 h-4 bg-white rounded-full transition ${
                        preferences.analytics ? "right-1" : "left-1"
                      }`}
                    ></div>
                  </button>
                </div>
                <p className="text-sm text-gray-600">
                  サイトの利用状況を分析し、サービス向上に役立てるためのCookieです。
                  訪問ページ、滞在時間、クリック数などを記録します。
                </p>
              </div>

              {/* マーケティングCookie */}
              <div className="border-b border-gray-200 pb-4 mb-4">
                <div className="flex justify-between items-center mb-2">
                  <h3 className="font-semibold text-gray-900">
                    マーケティングCookie
                  </h3>
                  <button
                    onClick={() => togglePreference("marketing")}
                    className={`w-12 h-6 rounded-full relative transition ${
                      preferences.marketing ? "bg-primary-500" : "bg-gray-300"
                    }`}
                  >
                    <div
                      className={`absolute top-1 w-4 h-4 bg-white rounded-full transition ${
                        preferences.marketing ? "right-1" : "left-1"
                      }`}
                    ></div>
                  </button>
                </div>
                <p className="text-sm text-gray-600">
                  広告配信や効果測定に使用されるCookieです。
                  お客様の興味関心に基づいた広告を表示するために使用されます。
                </p>
              </div>

              {/* パーソナライゼーションCookie */}
              <div className="pb-4 mb-6">
                <div className="flex justify-between items-center mb-2">
                  <h3 className="font-semibold text-gray-900">
                    パーソナライゼーションCookie
                  </h3>
                  <button
                    onClick={() => togglePreference("personalization")}
                    className={`w-12 h-6 rounded-full relative transition ${
                      preferences.personalization
                        ? "bg-primary-500"
                        : "bg-gray-300"
                    }`}
                  >
                    <div
                      className={`absolute top-1 w-4 h-4 bg-white rounded-full transition ${
                        preferences.personalization ? "right-1" : "left-1"
                      }`}
                    ></div>
                  </button>
                </div>
                <p className="text-sm text-gray-600">
                  お客様の好みに合わせたコンテンツや体験提案を行うためのCookieです。
                  旅行スタイル診断の結果やおすすめアクティビティの表示に使用されます。
                </p>
              </div>

              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  onClick={acceptNecessaryOnly}
                  className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition"
                >
                  必要最小限のみ
                </button>
                <button
                  onClick={saveCustomPreferences}
                  className="flex-1 px-4 py-2 text-sm font-medium text-white bg-gray-700 rounded-lg hover:bg-gray-800 transition"
                >
                  設定を保存
                </button>
                <button
                  onClick={acceptAll}
                  className="flex-1 px-4 py-2 text-sm font-medium text-white bg-primary-500 rounded-lg hover:bg-primary-600 transition"
                >
                  すべて許可
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
