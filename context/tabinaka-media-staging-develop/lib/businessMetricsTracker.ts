// ビジネスメトリクスの詳細分析トラッカー
import { sanitizeTrackingData } from "./privacyMasking";

interface BusinessMetricsData {
  sessionId: string;
  userId?: string;
  timestamp: string;
  pageUrl: string;
  experienceSlug?: string;
  experienceTitle?: string;
  metrics: {
    // コンバージョンメトリクス
    conversionFunnel: ConversionFunnel;
    revenueMetrics: RevenueMetrics;
    userJourney: UserJourney;
    contentPerformance: ContentPerformance;
    customerSatisfaction: CustomerSatisfaction;
  };
}

interface ConversionFunnel {
  pageViews: number;
  uniquePageViews: number;
  timeOnSite: number;
  bounceRate: number;
  exitRate: number;
  conversionRate: number;
  funnelSteps: {
    step: string;
    visitors: number;
    conversions: number;
    dropOffRate: number;
  }[];
}

interface RevenueMetrics {
  totalRevenue: number;
  averageOrderValue: number;
  customerLifetimeValue: number;
  revenuePerSession: number;
  conversionValue: number;
  transactions: number;
  refunds: number;
  netRevenue: number;
}

interface UserJourney {
  touchpoints: Touchpoint[];
  pathAnalysis: PathAnalysis;
  sessionReplay: SessionReplay;
  userSegments: UserSegment[];
}

interface Touchpoint {
  timestamp: string;
  pageUrl: string;
  action: string;
  element?: string;
  value?: string;
  duration: number;
}

interface PathAnalysis {
  commonPaths: string[][];
  pathLength: number;
  timeBetweenPages: number[];
  entryPoints: string[];
  exitPoints: string[];
}

interface SessionReplay {
  mouseMovements: MouseMovement[];
  clicks: Click[];
  scrolls: Scroll[];
  formInteractions: FormInteraction[];
}

interface MouseMovement {
  x: number;
  y: number;
  timestamp: number;
}

interface Click {
  x: number;
  y: number;
  element: string;
  timestamp: number;
}

interface Scroll {
  scrollTop: number;
  scrollLeft: number;
  timestamp: number;
}

interface FormInteraction {
  field: string;
  action: "focus" | "blur" | "input" | "submit";
  value?: string;
  timestamp: number;
}

interface UserSegment {
  segment: string;
  criteria: Record<string, any>;
  count: number;
  conversionRate: number;
  averageOrderValue: number;
}

interface ContentPerformance {
  contentViews: number;
  contentEngagement: number;
  contentShares: number;
  contentDownloads: number;
  contentComments: number;
  contentRating: number;
}

interface CustomerSatisfaction {
  satisfactionScore: number;
  netPromoterScore: number;
  customerEffortScore: number;
  feedback: Feedback[];
  complaints: Complaint[];
}

interface Feedback {
  type: "positive" | "negative" | "neutral";
  message: string;
  timestamp: string;
  category: string;
}

interface Complaint {
  issue: string;
  severity: "low" | "medium" | "high" | "critical";
  timestamp: string;
  resolved: boolean;
  resolutionTime?: number;
}

class BusinessMetricsTracker {
  private sessionId: string;
  private startTime: number;
  private touchpoints: Touchpoint[] = [];
  private sessionReplay: SessionReplay = {
    mouseMovements: [],
    clicks: [],
    scrolls: [],
    formInteractions: [],
  };
  private isTracking = false;

  constructor() {
    this.sessionId = this.generateSessionId();
    this.startTime = Date.now();
  }

  private generateSessionId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  public startTracking(): void {
    if (this.isTracking) return;
    this.isTracking = true;

    // 未送信イベントの再送を試みる
    this.retryFailedEvents();

    // マウス移動の記録（間引き）
    let mouseMoveCount = 0;
    document.addEventListener("mousemove", (event) => {
      mouseMoveCount++;
      if (mouseMoveCount % 5 === 0) {
        // 5回に1回のみ記録
        this.sessionReplay.mouseMovements.push({
          x: event.clientX,
          y: event.clientY,
          timestamp: Date.now() - this.startTime,
        });
      }
    });

    // クリックの記録
    document.addEventListener("click", (event) => {
      const target = event.target as HTMLElement;
      this.sessionReplay.clicks.push({
        x: event.clientX,
        y: event.clientY,
        element: this.getElementPath(target),
        timestamp: Date.now() - this.startTime,
      });

      this.addTouchpoint("click", this.getElementPath(target));
    });

    // スクロールの記録
    let scrollTimeout: NodeJS.Timeout;
    window.addEventListener("scroll", () => {
      clearTimeout(scrollTimeout);
      scrollTimeout = setTimeout(() => {
        this.sessionReplay.scrolls.push({
          scrollTop: window.pageYOffset,
          scrollLeft: window.pageXOffset,
          timestamp: Date.now() - this.startTime,
        });
      }, 100);
    });

    // フォームインタラクションの記録
    document.addEventListener("focus", (event) => {
      const target = event.target as HTMLElement;
      this.sessionReplay.formInteractions.push({
        field: this.getElementPath(target),
        action: "focus",
        timestamp: Date.now() - this.startTime,
      });
    });

    document.addEventListener("blur", (event) => {
      const target = event.target as HTMLElement;
      this.sessionReplay.formInteractions.push({
        field: this.getElementPath(target),
        action: "blur",
        timestamp: Date.now() - this.startTime,
      });
    });

    document.addEventListener("input", (event) => {
      const target = event.target as HTMLInputElement;
      this.sessionReplay.formInteractions.push({
        field: this.getElementPath(target),
        action: "input",
        value: target.value,
        timestamp: Date.now() - this.startTime,
      });
    });

    document.addEventListener("submit", (event) => {
      const target = event.target as HTMLFormElement;
      this.sessionReplay.formInteractions.push({
        field: this.getElementPath(target),
        action: "submit",
        timestamp: Date.now() - this.startTime,
      });
    });

    // ページビューの記録
    this.addTouchpoint("page_view", window.location.pathname);

    // ページ離脱時のデータ送信
    window.addEventListener("beforeunload", () => {
      this.sendData();
    });
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

  private addTouchpoint(
    action: string,
    element?: string,
    value?: string,
  ): void {
    this.touchpoints.push({
      timestamp: new Date().toISOString(),
      pageUrl: window.location.href,
      action,
      element,
      value,
      duration: Date.now() - this.startTime,
    });
  }

  public trackConversion(conversionType: string, value?: number): void {
    this.addTouchpoint("conversion", conversionType, value?.toString());
  }

  public trackRevenue(amount: number, currency: string = "JPY"): void {
    this.addTouchpoint("revenue", "purchase", `${amount} ${currency}`);
  }

  public trackContentEngagement(
    contentId: string,
    engagementType: string,
  ): void {
    this.addTouchpoint("content_engagement", contentId, engagementType);
  }

  public trackCustomerFeedback(feedback: Feedback): void {
    this.addTouchpoint("customer_feedback", feedback.type, feedback.message);
  }

  private calculateConversionFunnel(): ConversionFunnel {
    const pageViews = this.touchpoints.filter(
      (t) => t.action === "page_view",
    ).length;
    const uniquePageViews = new Set(
      this.touchpoints
        .filter((t) => t.action === "page_view")
        .map((t) => t.pageUrl),
    ).size;
    const conversions = this.touchpoints.filter(
      (t) => t.action === "conversion",
    ).length;
    const exits = this.touchpoints.filter((t) => t.action === "exit").length;

    return {
      pageViews,
      uniquePageViews,
      timeOnSite: Date.now() - this.startTime,
      bounceRate: pageViews === 1 ? 100 : 0,
      exitRate: (exits / pageViews) * 100,
      conversionRate: (conversions / pageViews) * 100,
      funnelSteps: [
        {
          step: "page_view",
          visitors: pageViews,
          conversions: pageViews,
          dropOffRate: 0,
        },
        {
          step: "engagement",
          visitors: this.sessionReplay.clicks.length,
          conversions: this.sessionReplay.clicks.length,
          dropOffRate:
            ((pageViews - this.sessionReplay.clicks.length) / pageViews) * 100,
        },
        {
          step: "conversion",
          visitors: conversions,
          conversions: conversions,
          dropOffRate:
            ((this.sessionReplay.clicks.length - conversions) /
              this.sessionReplay.clicks.length) *
            100,
        },
      ],
    };
  }

  private calculateRevenueMetrics(): RevenueMetrics {
    const revenueEvents = this.touchpoints.filter(
      (t) => t.action === "revenue",
    );
    const totalRevenue = revenueEvents.reduce((sum, event) => {
      const amount = parseFloat(event.value?.split(" ")[0] || "0");
      return sum + amount;
    }, 0);

    return {
      totalRevenue,
      averageOrderValue:
        revenueEvents.length > 0 ? totalRevenue / revenueEvents.length : 0,
      customerLifetimeValue: totalRevenue, // 簡易版
      revenuePerSession: totalRevenue,
      conversionValue: totalRevenue,
      transactions: revenueEvents.length,
      refunds: 0, // 別途実装が必要
      netRevenue: totalRevenue,
    };
  }

  private calculateUserJourney(): UserJourney {
    const pathAnalysis: PathAnalysis = {
      commonPaths: [this.touchpoints.map((t) => t.pageUrl)],
      pathLength: this.touchpoints.length,
      timeBetweenPages: [],
      entryPoints: [this.touchpoints[0]?.pageUrl || ""],
      exitPoints: [
        this.touchpoints[this.touchpoints.length - 1]?.pageUrl || "",
      ],
    };

    return {
      touchpoints: this.touchpoints,
      pathAnalysis,
      sessionReplay: this.sessionReplay,
      userSegments: [],
    };
  }

  private calculateContentPerformance(): ContentPerformance {
    const contentEvents = this.touchpoints.filter(
      (t) => t.action === "content_engagement",
    );

    return {
      contentViews: contentEvents.length,
      contentEngagement: this.sessionReplay.clicks.length,
      contentShares: contentEvents.filter((e) => e.value === "share").length,
      contentDownloads: contentEvents.filter((e) => e.value === "download")
        .length,
      contentComments: contentEvents.filter((e) => e.value === "comment")
        .length,
      contentRating: 0, // 別途実装が必要
    };
  }

  private calculateCustomerSatisfaction(): CustomerSatisfaction {
    const feedbackEvents = this.touchpoints.filter(
      (t) => t.action === "customer_feedback",
    );
    const positiveFeedback = feedbackEvents.filter(
      (e) => e.element === "positive",
    ).length;
    const totalFeedback = feedbackEvents.length;

    return {
      satisfactionScore:
        totalFeedback > 0 ? (positiveFeedback / totalFeedback) * 100 : 0,
      netPromoterScore: 0, // 別途実装が必要
      customerEffortScore: 0, // 別途実装が必要
      feedback: feedbackEvents.map((e) => ({
        type: e.element as "positive" | "negative" | "neutral",
        message: e.value || "",
        timestamp: e.timestamp,
        category: "general",
      })),
      complaints: [],
    };
  }

  private async sendData(): Promise<void> {
    const data: BusinessMetricsData = {
      sessionId: this.sessionId,
      timestamp: new Date().toISOString(),
      pageUrl: window.location.href,
      metrics: {
        conversionFunnel: this.calculateConversionFunnel(),
        revenueMetrics: this.calculateRevenueMetrics(),
        userJourney: this.calculateUserJourney(),
        contentPerformance: this.calculateContentPerformance(),
        customerSatisfaction: this.calculateCustomerSatisfaction(),
      },
    };

    // 機密情報をマスキング
    const sanitizedData = sanitizeTrackingData(data);

    try {
      await this.saveToDatabase(sanitizedData);

      if (process.env.NODE_ENV === "development") {
        console.log("Business Metrics Data (sanitized):", sanitizedData);
      }
    } catch (error) {
      console.error("Failed to save business metrics data:", error);
    }
  }

  private async saveToDatabase(data: BusinessMetricsData): Promise<void> {
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
        type: "business_metrics",
        data,
      });

      if (navigator.sendBeacon) {
        const blob = new Blob([payload], { type: "application/json" });
        const sent = navigator.sendBeacon("/api/track/ingest", blob);

        if (!sent) {
          await this.fallbackSend(payload);
        }
      } else {
        await this.fallbackSend(payload);
      }
    } catch (error) {
      console.error("Failed to send business metrics data:", error);
      this.saveToLocalStorage(data);
    }
  }

  private async fallbackSend(payload: string): Promise<void> {
    await fetch("/api/track/ingest", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: payload,
      keepalive: true,
    });
  }

  private saveToLocalStorage(data: BusinessMetricsData): void {
    try {
      const storedData = JSON.parse(
        localStorage.getItem("businessMetricsData") || "[]",
      );
      storedData.push(data);
      if (storedData.length > 100) {
        storedData.shift();
      }
      localStorage.setItem("businessMetricsData", JSON.stringify(storedData));
    } catch (error) {
      console.error("Failed to save to localStorage:", error);
    }
  }

  private async retryFailedEvents(): Promise<void> {
    try {
      const storedData = localStorage.getItem("businessMetricsData");
      if (!storedData) return;

      const events = JSON.parse(storedData);
      if (!Array.isArray(events) || events.length === 0) return;

      for (const event of events) {
        await this.saveToDatabase(event);
      }

      localStorage.removeItem("businessMetricsData");
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
let businessTracker: BusinessMetricsTracker | null = null;

export const initializeBusinessMetricsTracking = (): void => {
  if (typeof window === "undefined") return;

  businessTracker = new BusinessMetricsTracker();
  businessTracker.startTracking();
};

export const trackConversion = (
  conversionType: string,
  value?: number,
): void => {
  if (businessTracker) {
    businessTracker.trackConversion(conversionType, value);
  }
};

export const trackRevenue = (amount: number, currency?: string): void => {
  if (businessTracker) {
    businessTracker.trackRevenue(amount, currency);
  }
};

export const trackContentEngagement = (
  contentId: string,
  engagementType: string,
): void => {
  if (businessTracker) {
    businessTracker.trackContentEngagement(contentId, engagementType);
  }
};

export const trackCustomerFeedback = (feedback: Feedback): void => {
  if (businessTracker) {
    businessTracker.trackCustomerFeedback(feedback);
  }
};

export const stopBusinessMetricsTracking = (): void => {
  if (businessTracker) {
    businessTracker.stopTracking();
  }
};

export default BusinessMetricsTracker;
