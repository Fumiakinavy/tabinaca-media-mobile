// GA4イベント送信関数（共通ユーティリティを使用）
import {
  sendGA,
  sendImageLoadSuccess,
  sendMemorySummary,
  sendNetworkChange,
} from "./ga";

const sendGA4Event = (
  eventName: string,
  parameters: Record<string, any> = {},
) => {
  if (typeof window !== "undefined" && (window as any).gtag) {
    (window as any).gtag("event", eventName, parameters);
  }
};

// 画像読み込みパフォーマンスの監視
export const monitorImagePerformance = () => {
  if (typeof window === "undefined") return;

  // 画像読み込み時間を追跡
  const originalImage = window.Image;
  window.Image = function () {
    const img = new originalImage();
    const startTime = performance.now();

    img.addEventListener("load", () => {
      const loadTime = performance.now() - startTime;

      // パフォーマンスデータを送信（本番環境のみ）
      if (process.env.NODE_ENV === "production") {
        // Google Analytics 4 のイベントとして送信
        if (typeof (window as any).gtag !== "undefined") {
          (window as any).gtag("event", "image_load", {
            event_category: "performance",
            event_label: img.src,
            value: Math.round(loadTime),
          });
        }
      }
    });

    return img;
  } as any;
};

// Core Web Vitals監視
export const monitorCoreWebVitals = () => {
  if (typeof window === "undefined") return;

  // LCP (Largest Contentful Paint) の監視
  if ("PerformanceObserver" in window) {
    const observer = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      const lastEntry = entries[entries.length - 1];

      if (lastEntry && lastEntry.entryType === "largest-contentful-paint") {
        const lcp = lastEntry.startTime;

        if (
          process.env.NODE_ENV === "production" &&
          typeof (window as any).gtag !== "undefined"
        ) {
          (window as any).gtag("event", "web_vitals", {
            event_category: "Web Vitals",
            event_label: "LCP",
            value: Math.round(lcp),
          });
        }
      }
    });

    observer.observe({ entryTypes: ["largest-contentful-paint"] });
  }
};

// 画像の読み込み状態を追跡
export const trackImageLoad = (src: string, startTime: number) => {
  const loadTime = performance.now() - startTime;

  if (
    process.env.NODE_ENV === "production" &&
    typeof (window as any).gtag !== "undefined"
  ) {
    (window as any).gtag("event", "image_load_time", {
      event_category: "performance",
      event_label: src,
      value: Math.round(loadTime),
    });
  }
};

// 画像のキャッシュヒット率を測定
export const measureCacheHitRate = () => {
  if (typeof window === "undefined") return;

  const images = document.querySelectorAll("img");
  let cachedCount = 0;
  let totalCount = images.length;

  images.forEach((img) => {
    if (img.complete) {
      cachedCount++;
    }
  });

  const hitRate = (cachedCount / totalCount) * 100;

  if (
    process.env.NODE_ENV === "production" &&
    typeof (window as any).gtag !== "undefined"
  ) {
    (window as any).gtag("event", "cache_hit_rate", {
      event_category: "performance",
      event_label: "images",
      value: Math.round(hitRate),
    });
  }
};

// 画像の最適化効果を測定
export const measureOptimizationEffect = () => {
  if (typeof window === "undefined") return;

  const images = document.querySelectorAll("img");
  let totalSize = 0;
  let optimizedCount = 0;

  images.forEach((img) => {
    const src = img.src;
    if (src.includes(".webp") || src.includes(".avif")) {
      optimizedCount++;
    }

    // 画像サイズの推定（実際のサイズは取得できないため推定値）
    const rect = img.getBoundingClientRect();
    totalSize += rect.width * rect.height * 4; // 4 bytes per pixel (RGBA)
  });

  const optimizationRate = (optimizedCount / images.length) * 100;

  if (
    process.env.NODE_ENV === "production" &&
    typeof (window as any).gtag !== "undefined"
  ) {
    (window as any).gtag("event", "image_optimization", {
      event_category: "performance",
      event_label: "optimization_rate",
      value: Math.round(optimizationRate),
    });
  }
};

// パフォーマンス監視の初期化
export const initializePerformanceMonitoring = () => {
  if (typeof window === "undefined") return;

  // ページ読み込み完了時のパフォーマンスデータ収集
  window.addEventListener("load", () => {
    setTimeout(() => {
      const navigation = performance.getEntriesByType(
        "navigation",
      )[0] as PerformanceNavigationTiming;
      const paint = performance.getEntriesByType("paint");

      const performanceData = {
        // ページ読み込み時間
        dom_content_loaded:
          navigation.domContentLoadedEventEnd -
          navigation.domContentLoadedEventStart,
        load_complete: navigation.loadEventEnd - navigation.loadEventStart,
        total_load_time: navigation.loadEventEnd - navigation.fetchStart,

        // 描画時間
        first_paint:
          paint.find((entry) => entry.name === "first-paint")?.startTime || 0,
        first_contentful_paint:
          paint.find((entry) => entry.name === "first-contentful-paint")
            ?.startTime || 0,

        // ネットワーク情報
        dns_lookup: navigation.domainLookupEnd - navigation.domainLookupStart,
        tcp_connection: navigation.connectEnd - navigation.connectStart,
        server_response: navigation.responseEnd - navigation.requestStart,

        // ページ情報
        page_location: window.location.pathname,
        timestamp: new Date().toISOString(),
        user_agent: navigator.userAgent,
      };

      // GA4イベント送信
      sendGA4Event("page_performance", performanceData);

      // コンソールにも出力（開発用）
      if (process.env.NODE_ENV === "development") {
        console.log("Performance Data:", performanceData);
      }
    }, 1000); // 1秒後に収集
  });

  // 画像読み込みエラーの監視
  const handleImageError = (event: Event) => {
    const img = event.target as HTMLImageElement;
    sendGA4Event("image_load_error", {
      image_src: img.src,
      image_alt: img.alt,
      page_location: window.location.pathname,
      timestamp: new Date().toISOString(),
    });
  };

  // 画像読み込み成功の監視（最適化版）
  const handleImageLoad = (event: Event) => {
    const img = event.target as HTMLImageElement;
    sendImageLoadSuccess(img.src, img.alt);
  };

  // 既存の画像にイベントリスナーを追加
  document.querySelectorAll("img").forEach((img) => {
    img.addEventListener("error", handleImageError);
    img.addEventListener("load", handleImageLoad);
  });

  // 新しく追加される画像の監視
  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      mutation.addedNodes.forEach((node) => {
        if (node.nodeType === Node.ELEMENT_NODE) {
          const element = node as Element;
          if (element.tagName === "IMG") {
            element.addEventListener("error", handleImageError);
            element.addEventListener("load", handleImageLoad);
          }
        }
      });
    });
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true,
  });

  // ネットワーク接続状況の監視（最適化版）
  if ("connection" in navigator) {
    const connection = (navigator as any).connection;

    // 初回のネットワーク情報のみ送信
    sendGA4Event("network_info", {
      effective_type: connection.effectiveType,
      downlink: connection.downlink,
      rtt: connection.rtt,
      save_data: connection.saveData,
      page_location: window.location.pathname,
      timestamp: new Date().toISOString(),
    });

    // online/offline の変化のみ監視
    let lastOnline = navigator.onLine;
    const handleOnlineChange = () => {
      if (navigator.onLine !== lastOnline) {
        lastOnline = navigator.onLine;
        sendNetworkChange(lastOnline);
      }
    };

    window.addEventListener("online", handleOnlineChange);
    window.addEventListener("offline", handleOnlineChange);
  }

  // メモリ使用量の監視（ページ離脱時に集約）
  if ("memory" in performance) {
    const handlePageHide = () => {
      sendMemorySummary();
    };

    window.addEventListener("pagehide", handlePageHide);
  }

  // エラーの監視
  window.addEventListener("error", (event) => {
    sendGA4Event("javascript_error", {
      error_message: event.message,
      error_filename: event.filename,
      error_lineno: event.lineno,
      error_colno: event.colno,
      page_location: window.location.pathname,
      timestamp: new Date().toISOString(),
    });
  });

  // Promise エラーの監視
  window.addEventListener("unhandledrejection", (event) => {
    sendGA4Event("promise_error", {
      error_reason: event.reason,
      page_location: window.location.pathname,
      timestamp: new Date().toISOString(),
    });
  });
};

// ユーザーエンゲージメントスコアの計算
export const calculateEngagementScore = () => {
  if (typeof window === "undefined") return 0;

  let score = 0;

  // スクロール深度
  const scrollTop = window.pageYOffset;
  const docHeight = document.documentElement.scrollHeight - window.innerHeight;
  const scrollPercent = Math.round((scrollTop / docHeight) * 100);
  score += Math.min(scrollPercent / 10, 10); // 最大10点

  // 滞在時間（分単位）
  const sessionDuration =
    (Date.now() - performance.timing.navigationStart) / 60000;
  score += Math.min(sessionDuration / 2, 10); // 最大10点

  // ページビュー数（セッション内）
  const pageViews = sessionStorage.getItem("pageViews") || "0";
  const pageViewCount = parseInt(pageViews) + 1;
  sessionStorage.setItem("pageViews", pageViewCount.toString());
  score += Math.min(pageViewCount, 10); // 最大10点

  // インタラクション数（クリック、フォーム入力など）
  const interactions = sessionStorage.getItem("interactions") || "0";
  const interactionCount = parseInt(interactions);
  score += Math.min(interactionCount / 5, 10); // 最大10点

  return Math.round(score);
};

// インタラクションカウントの増加
export const incrementInteractionCount = () => {
  if (typeof window === "undefined") return;

  const interactions = sessionStorage.getItem("interactions") || "0";
  const newCount = parseInt(interactions) + 1;
  sessionStorage.setItem("interactions", newCount.toString());

  // GA4イベント送信
  sendGA4Event("user_interaction", {
    interaction_count: newCount,
    engagement_score: calculateEngagementScore(),
    page_location: window.location.pathname,
    timestamp: new Date().toISOString(),
  });
};
