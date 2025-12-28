// GA4イベント送信の共通ユーティリティ
// デデュープ、サンプリング、TTL機能付き

export function sendGA(
  event: string,
  params: Record<string, any> = {},
  opts: { dedupeKey?: string; ttlMs?: number; sample?: number } = {},
) {
  if (typeof window === "undefined" || !(window as any).gtag) return;

  const { dedupeKey, ttlMs = 60_000, sample = 1 } = opts;

  // サンプリング
  if (Math.random() > sample) return;

  // デデュープ処理
  if (dedupeKey) {
    const key = `ga_dedupe:${event}:${dedupeKey}`;
    const now = Date.now();
    const last = Number(sessionStorage.getItem(key) || 0);
    if (now - last < ttlMs) return; // 一定時間内の重複を抑制
    sessionStorage.setItem(key, String(now));
  }

  (window as any).gtag("event", event, params);
}

// 画像読み込み成功イベント（1画像につき最大1回）
export function sendImageLoadSuccess(src: string, alt?: string) {
  const url = src.split("?")[0]; // URLで一意化
  sendGA(
    "image_load_success",
    {
      image_src: url,
      image_alt: alt || "",
      page_location: window.location.pathname,
      timestamp: new Date().toISOString(),
    },
    {
      dedupeKey: url,
      ttlMs: 24 * 60 * 60 * 1000, // 24時間
      sample: 0.1, // 10%だけ送信
    },
  );
}

// メモリ使用量サマリー（ページ離脱時に集約）
export function sendMemorySummary() {
  const perf = performance as any;
  if (!perf?.memory) return;

  const m = perf.memory;
  sendGA(
    "memory_usage_summary",
    {
      used: m.usedJSHeapSize,
      total: m.totalJSHeapSize,
      limit: m.jsHeapSizeLimit,
      page_location: window.location.pathname,
      timestamp: new Date().toISOString(),
    },
    { sample: 0.02 },
  ); // 2%だけ送信
}

// ネットワーク変化（online/offlineのみ）
export function sendNetworkChange(isOnline: boolean) {
  sendGA(
    "network_change",
    {
      online: isOnline ? 1 : 0,
      page_location: window.location.pathname,
      timestamp: new Date().toISOString(),
    },
    {
      dedupeKey: String(isOnline),
      ttlMs: 60 * 1000, // 1分間
    },
  );
}

// フォーム開始イベント
export function sendFormStart(formName: string) {
  sendGA(
    "form_start",
    {
      form_name: formName,
      page_location: window.location.pathname,
      timestamp: new Date().toISOString(),
    },
    {
      dedupeKey: formName,
      ttlMs: 60 * 1000, // 1分間
    },
  );
}

// フォーム送信イベント
export function sendFormSubmit(formName: string, success: boolean) {
  sendGA("form_submit", {
    form_name: formName,
    success: success ? 1 : 0,
    page_location: window.location.pathname,
    timestamp: new Date().toISOString(),
  });
}

// 検索クエリイベント
export function sendSearchQuery(query: string, source: string = "header") {
  const trimmedQuery = query.trim();
  if (!trimmedQuery) return;

  sendGA(
    "search_query",
    {
      search_term: trimmedQuery,
      search_source: source,
      page_location: window.location.pathname,
      timestamp: new Date().toISOString(),
    },
    {
      dedupeKey: `${source}:${trimmedQuery}`,
      ttlMs: 30 * 1000, // 30秒間の重複を抑制
    },
  );
}

// 時間フィルタリングイベント
export function sendDurationFilter(
  duration: string,
  action: "select" | "deselect",
  source: string = "header",
) {
  sendGA(
    "duration_filter",
    {
      filter_duration: duration,
      filter_action: action,
      filter_source: source,
      page_location: window.location.pathname,
      timestamp: new Date().toISOString(),
    },
    {
      dedupeKey: `${source}:${duration}:${action}`,
      ttlMs: 10 * 1000, // 10秒間の重複を抑制
    },
  );
}

// 検索実行イベント（Enterキーやボタンクリック時）
export function sendSearchExecute(
  query: string,
  duration?: string,
  source: string = "header",
) {
  const trimmedQuery = query.trim();

  sendGA("search_execute", {
    search_term: trimmedQuery || "",
    filter_duration: duration || "all",
    search_source: source,
    page_location: window.location.pathname,
    timestamp: new Date().toISOString(),
  });
}
