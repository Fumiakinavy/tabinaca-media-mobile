// ユーザー行動の詳細分析トラッカー
import {
  isSensitiveElement,
  maskUserActionValue,
  sanitizeElementPath,
  sanitizeTrackingData,
} from "./privacyMasking";

interface UserBehaviorData {
  sessionId: string;
  userId?: string;
  timestamp: string;
  pageUrl: string;
  userAgent: string;
  screenResolution: string;
  viewportSize: string;
  language: string;
  timezone: string;
  referrer: string;
  actions: UserAction[];
  performance: PerformanceData;
  engagement: EngagementData;
}

interface UserAction {
  type:
    | "click"
    | "scroll"
    | "input"
    | "hover"
    | "focus"
    | "blur"
    | "form_submit"
    | "page_view";
  element: string;
  value?: string;
  timestamp: number;
  position?: { x: number; y: number };
  scrollDepth?: number;
}

interface PerformanceData {
  pageLoadTime: number;
  domContentLoaded: number;
  firstPaint: number;
  firstContentfulPaint: number;
  largestContentfulPaint: number;
  cumulativeLayoutShift: number;
  firstInputDelay: number;
}

interface EngagementData {
  timeOnPage: number;
  scrollDepth: number;
  clickCount: number;
  formInteractions: number;
  uniqueElementsClicked: string[];
  mouseMovements: number;
  keyboardInteractions: number;
}

class UserBehaviorTracker {
  private sessionId: string;
  private startTime: number;
  private actions: UserAction[] = [];
  private performanceData: PerformanceData | null = null;
  private engagementData: EngagementData;
  private isTracking = false;

  constructor() {
    this.sessionId = this.generateSessionId();
    this.startTime = Date.now();
    this.engagementData = {
      timeOnPage: 0,
      scrollDepth: 0,
      clickCount: 0,
      formInteractions: 0,
      uniqueElementsClicked: [],
      mouseMovements: 0,
      keyboardInteractions: 0,
    };
  }

  private generateSessionId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  public startTracking(): void {
    if (this.isTracking) return;
    this.isTracking = true;

    // 未送信イベントの再送を試みる
    this.retryFailedEvents();

    // クリックイベントの追跡
    document.addEventListener("click", this.handleClick.bind(this));

    // スクロールイベントの追跡
    let scrollTimeout: NodeJS.Timeout;
    window.addEventListener("scroll", () => {
      clearTimeout(scrollTimeout);
      scrollTimeout = setTimeout(() => {
        this.handleScroll();
      }, 100);
    });

    // フォームイベントの追跡
    document.addEventListener("input", this.handleInput.bind(this));
    document.addEventListener("submit", this.handleFormSubmit.bind(this));

    // マウス移動の追跡（間引き）
    let mouseMoveCount = 0;
    document.addEventListener("mousemove", () => {
      mouseMoveCount++;
      if (mouseMoveCount % 10 === 0) {
        // 10回に1回のみ記録
        this.engagementData.mouseMovements++;
      }
    });

    // キーボードイベントの追跡
    document.addEventListener("keydown", () => {
      this.engagementData.keyboardInteractions++;
    });

    // フォーカス/ブラーイベントの追跡
    document.addEventListener("focus", this.handleFocus.bind(this), true);
    document.addEventListener("blur", this.handleBlur.bind(this), true);

    // ページ離脱時のデータ送信
    window.addEventListener("beforeunload", () => {
      this.sendData();
    });

    // 定期的なデータ送信（30秒ごと）
    setInterval(() => {
      this.updateEngagementData();
      this.sendData();
    }, 30000);
  }

  private handleClick(event: MouseEvent): void {
    const target = event.target as HTMLElement;
    const action: UserAction = {
      type: "click",
      element: this.getElementPath(target),
      timestamp: Date.now() - this.startTime,
      position: { x: event.clientX, y: event.clientY },
    };

    this.actions.push(action);
    this.engagementData.clickCount++;

    // ユニークな要素クリックの記録
    const elementPath = this.getElementPath(target);
    if (!this.engagementData.uniqueElementsClicked.includes(elementPath)) {
      this.engagementData.uniqueElementsClicked.push(elementPath);
    }
  }

  private handleScroll(): void {
    const scrollTop = window.pageYOffset;
    const docHeight =
      document.documentElement.scrollHeight - window.innerHeight;
    const scrollPercent = Math.round((scrollTop / docHeight) * 100);

    if (scrollPercent > this.engagementData.scrollDepth) {
      this.engagementData.scrollDepth = scrollPercent;

      const action: UserAction = {
        type: "scroll",
        element: "window",
        timestamp: Date.now() - this.startTime,
        scrollDepth: scrollPercent,
      };

      this.actions.push(action);
    }
  }

  private handleInput(event: Event): void {
    const target = event.target as HTMLInputElement;

    // 機密情報フィールドの場合はvalueをマスキング
    const elementPath = this.getElementPath(target);
    const maskedValue = isSensitiveElement(target)
      ? undefined // 機密情報フィールドはvalueを記録しない
      : maskUserActionValue(elementPath, target.value);

    const action: UserAction = {
      type: "input",
      element: sanitizeElementPath(elementPath),
      value: maskedValue,
      timestamp: Date.now() - this.startTime,
    };

    this.actions.push(action);
    this.engagementData.formInteractions++;
  }

  private handleFormSubmit(event: Event): void {
    const target = event.target as HTMLFormElement;
    const action: UserAction = {
      type: "form_submit",
      element: this.getElementPath(target),
      timestamp: Date.now() - this.startTime,
    };

    this.actions.push(action);
  }

  private handleFocus(event: FocusEvent): void {
    const target = event.target as HTMLElement;
    const action: UserAction = {
      type: "focus",
      element: this.getElementPath(target),
      timestamp: Date.now() - this.startTime,
    };

    this.actions.push(action);
  }

  private handleBlur(event: FocusEvent): void {
    const target = event.target as HTMLElement;
    const action: UserAction = {
      type: "blur",
      element: this.getElementPath(target),
      timestamp: Date.now() - this.startTime,
    };

    this.actions.push(action);
  }

  private getElementPath(element: HTMLElement): string {
    const path: string[] = [];
    let current = element;

    while (current && current !== document.body) {
      let selector = current.tagName.toLowerCase();

      if (current.id) {
        selector += `#${current.id}`;
      } else if (current.className) {
        selector += `.${current.className.split(" ").join(".")}`;
      }

      path.unshift(selector);
      current = current.parentElement as HTMLElement;
    }

    return path.join(" > ");
  }

  private updateEngagementData(): void {
    this.engagementData.timeOnPage = Date.now() - this.startTime;
  }

  private collectPerformanceData(): void {
    if (typeof window === "undefined") return;

    const navigation = performance.getEntriesByType(
      "navigation",
    )[0] as PerformanceNavigationTiming;
    const paint = performance.getEntriesByType("paint");
    const lcp = performance.getEntriesByType(
      "largest-contentful-paint",
    )[0] as PerformanceEntry;
    const fid = performance.getEntriesByType("first-input")[0] as any; // any型で対応

    this.performanceData = {
      pageLoadTime: navigation.loadEventEnd - navigation.fetchStart,
      domContentLoaded:
        navigation.domContentLoadedEventEnd -
        navigation.domContentLoadedEventStart,
      firstPaint:
        paint.find((entry) => entry.name === "first-paint")?.startTime || 0,
      firstContentfulPaint:
        paint.find((entry) => entry.name === "first-contentful-paint")
          ?.startTime || 0,
      largestContentfulPaint: lcp?.startTime || 0,
      cumulativeLayoutShift: 0, // CLSは別途計算が必要
      firstInputDelay: fid?.processingStart
        ? fid.processingStart - fid.startTime
        : 0,
    };
  }

  private async sendData(): Promise<void> {
    this.updateEngagementData();
    this.collectPerformanceData();

    const data: UserBehaviorData = {
      sessionId: this.sessionId,
      timestamp: new Date().toISOString(),
      pageUrl: window.location.href,
      userAgent: navigator.userAgent,
      screenResolution: `${screen.width}x${screen.height}`,
      viewportSize: `${window.innerWidth}x${window.innerHeight}`,
      language: navigator.language,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      referrer: document.referrer,
      actions: this.actions,
      performance: this.performanceData!,
      engagement: this.engagementData,
    };

    // 機密情報をマスキング
    const sanitizedData = sanitizeTrackingData(data);

    try {
      // データベースに保存（Supabaseなど）
      await this.saveToDatabase(sanitizedData);

      // コンソールにも出力（開発用）
      if (process.env.NODE_ENV === "development") {
        console.log("User Behavior Data (sanitized):", sanitizedData);
      }
    } catch (error) {
      console.error("Failed to save user behavior data:", error);
    }
  }

  private async saveToDatabase(data: UserBehaviorData): Promise<void> {
    // トラッキングが無効化されている場合はスキップ
    if (
      typeof window !== "undefined" &&
      localStorage.getItem("gappy_tracking_disabled") === "true"
    ) {
      return;
    }

    try {
      // navigator.sendBeaconを使用（ページ離脱時でも確実に送信）
      const payload = JSON.stringify({
        type: "user_behavior",
        data,
      });

      if (navigator.sendBeacon) {
        const blob = new Blob([payload], { type: "application/json" });
        const sent = navigator.sendBeacon("/api/track/ingest", blob);

        if (!sent) {
          // sendBeaconが失敗した場合はfetchで送信
          await this.fallbackSend(payload);
        }
      } else {
        // sendBeaconがサポートされていない場合はfetchで送信
        await this.fallbackSend(payload);
      }
    } catch (error) {
      console.error("Failed to send user behavior data:", error);
      // エラー時はlocalStorageに保存して後で再送
      this.saveToLocalStorage(data);
    }
  }

  private async fallbackSend(payload: string): Promise<void> {
    await fetch("/api/track/ingest", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: payload,
      keepalive: true, // ページ離脱後も送信を継続
    });
  }

  private saveToLocalStorage(data: UserBehaviorData): void {
    try {
      const storedData = JSON.parse(
        localStorage.getItem("userBehaviorData") || "[]",
      );
      storedData.push(data);
      // 最大100件まで保存（古いものから削除）
      if (storedData.length > 100) {
        storedData.shift();
      }
      localStorage.setItem("userBehaviorData", JSON.stringify(storedData));
    } catch (error) {
      console.error("Failed to save to localStorage:", error);
    }
  }

  // localStorageに保存された未送信データを再送
  private async retryFailedEvents(): Promise<void> {
    try {
      const storedData = localStorage.getItem("userBehaviorData");
      if (!storedData) return;

      const events = JSON.parse(storedData);
      if (!Array.isArray(events) || events.length === 0) return;

      // バッチで送信
      for (const event of events) {
        await this.saveToDatabase(event);
      }

      // 送信成功したらlocalStorageをクリア
      localStorage.removeItem("userBehaviorData");
    } catch (error) {
      console.error("Failed to retry failed events:", error);
    }
  }

  public stopTracking(): void {
    this.isTracking = false;
    this.sendData();
  }
}

// シングルトンインスタンス
let tracker: UserBehaviorTracker | null = null;

export const initializeUserBehaviorTracking = (): void => {
  if (typeof window === "undefined") return;

  tracker = new UserBehaviorTracker();
  tracker.startTracking();
};

export const stopUserBehaviorTracking = (): void => {
  if (tracker) {
    tracker.stopTracking();
  }
};

export default UserBehaviorTracker;
