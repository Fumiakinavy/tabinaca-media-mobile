/**
 * 検索クエリトラッキング
 * ユーザーの検索行動をSupabaseに記録
 */

import { inferSearchCategory } from "@/lib/searchCategory";

interface SearchTrackingData {
  searchQuery: string;
  searchSource?: string;
  searchContext?: Record<string, any>;
  pageUrl?: string;
  resultsCount?: number;
  clickedResultId?: string;
  clickedResultPosition?: number;
  location?: { lat: number; lng: number; accuracy?: number } | null;
  radiusMeters?: number | null;
  inferredCategory?: string | null;
  hasResults?: boolean | null;
}

class SearchTracker {
  private endpoint = "/api/track/search";

  /**
   * 検索クエリを記録
   */
  async trackSearch(data: SearchTrackingData): Promise<void> {
    try {
      // 同意チェック
      const trackingDisabled = localStorage.getItem("gappy_tracking_disabled");
      if (trackingDisabled === "true") {
        return;
      }

      const accountId = localStorage.getItem("gappy_account_id");
      const accountToken = localStorage.getItem("gappy_account_token");

      if (!accountId || !accountToken) {
        console.warn("[SearchTracker] No account credentials");
        return;
      }

      const inferredCategory =
        data.inferredCategory ?? inferSearchCategory(data.searchQuery);

      const payload = {
        account_id: accountId,
        session_id: this.getSessionId(),
        search_query: data.searchQuery.trim(),
        search_source: data.searchSource || "unknown",
        search_context: data.searchContext,
        page_url: data.pageUrl || window.location.href,
        results_count: data.resultsCount,
        clicked_result_id: data.clickedResultId,
        clicked_result_position: data.clickedResultPosition,
        location: data.location ?? null,
        radius_meters: typeof data.radiusMeters === "number" ? data.radiusMeters : null,
        inferred_category: inferredCategory,
        has_results: typeof data.hasResults === "boolean" ? data.hasResults : null,
      };

      // navigator.sendBeacon を使用（ページ離脱時も確実に送信）
      const blob = new Blob([JSON.stringify(payload)], {
        type: "application/json",
      });

      const sent = navigator.sendBeacon(
        `${this.endpoint}?accountId=${accountId}&accountToken=${accountToken}`,
        blob,
      );

      if (!sent) {
        // sendBeacon が失敗した場合は fetch でリトライ
        await this.fallbackSend(payload);
      }
    } catch (error) {
      console.error("[SearchTracker] Error:", error);
    }
  }

  /**
   * 検索結果のクリックを記録
   */
  async trackSearchClick(
    searchQuery: string,
    resultId: string,
    position: number,
    source?: string,
  ): Promise<void> {
    await this.trackSearch({
      searchQuery,
      searchSource: source,
      clickedResultId: resultId,
      clickedResultPosition: position,
    });
  }

  /**
   * fallback送信（fetch使用）
   */
  private async fallbackSend(payload: any): Promise<void> {
    try {
      await fetch(this.endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
        keepalive: true, // ページ離脱時も送信を継続
      });
    } catch (error) {
      console.error("[SearchTracker] Fallback send failed:", error);
      // LocalStorageに保存してリトライ
      this.saveToLocalStorage(payload);
    }
  }

  /**
   * LocalStorageに保存（オフライン対応）
   */
  private saveToLocalStorage(payload: any): void {
    try {
      const key = "search_tracking_retry";
      const existing = localStorage.getItem(key);
      const queue = existing ? JSON.parse(existing) : [];
      queue.push({
        payload,
        timestamp: Date.now(),
      });
      // 最大50件まで保持
      if (queue.length > 50) {
        queue.shift();
      }
      localStorage.setItem(key, JSON.stringify(queue));
    } catch (error) {
      console.error("[SearchTracker] Failed to save to localStorage:", error);
    }
  }

  /**
   * 失敗したイベントをリトライ
   */
  async retryFailedEvents(): Promise<void> {
    try {
      const key = "search_tracking_retry";
      const stored = localStorage.getItem(key);
      if (!stored) return;

      const queue = JSON.parse(stored);
      if (queue.length === 0) return;

      // 古いイベント（24時間以上）は削除
      const cutoff = Date.now() - 24 * 60 * 60 * 1000;
      const validQueue = queue.filter((item: any) => item.timestamp > cutoff);

      for (const item of validQueue) {
        await this.fallbackSend(item.payload);
      }

      // 送信成功したらクリア
      localStorage.removeItem(key);
    } catch (error) {
      console.error("[SearchTracker] Retry failed:", error);
    }
  }

  /**
   * セッションIDを取得（ブラウザセッション単位）
   */
  private getSessionId(): string {
    let sessionId = sessionStorage.getItem("tracking_session_id");
    if (!sessionId) {
      sessionId = `sess_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      sessionStorage.setItem("tracking_session_id", sessionId);
    }
    return sessionId;
  }
}

// シングルトンインスタンス
export const searchTracker = new SearchTracker();

// ページロード時にリトライ
if (typeof window !== "undefined") {
  window.addEventListener("load", () => {
    searchTracker.retryFailedEvents();
  });
}
