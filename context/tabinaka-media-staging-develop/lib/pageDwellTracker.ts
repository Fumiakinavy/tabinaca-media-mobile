import type { NextRouter } from "next/router";

type PageDwellPayload = {
  sessionId: string;
  pageUrl: string;
  pagePath: string;
  pageGroup: string;
  enterAt: string;
  leaveAt: string;
  totalDurationMs: number;
  activeDurationMs: number;
  referrer: string;
  userAgent: string;
};

type TrackerState = {
  pageUrl: string;
  pagePath: string;
  pageGroup: string;
  enterAtMs: number;
  activeDurationMs: number;
  activeStartMs: number | null;
  flushed: boolean;
};

class PageDwellTracker {
  private sessionId: string;
  private state: TrackerState | null = null;
  private isActive = true;
  private router: NextRouter | null = null;

  private handleRouteChangeStart = (url: string) => {
    const nextPath = this.toPath(url);
    if (!nextPath || this.state?.pagePath === nextPath) return;
    this.flush("route_change_start");
  };

  private handleRouteChangeComplete = (url: string) => {
    const nextPath = this.toPath(url);
    if (!nextPath) return;
    this.startPage(nextPath);
  };

  private handleRouteChangeError = () => {
    // ルート変更が失敗した場合は現ページを再開
    if (this.state?.flushed) {
      this.startPage(window.location.pathname);
    }
  };

  private handleVisibilityChange = () => {
    this.updateActiveState();
  };

  private handleFocus = () => {
    this.updateActiveState();
  };

  private handleBlur = () => {
    this.updateActiveState();
  };

  private handlePageHide = () => {
    this.flush("pagehide");
  };

  private handleBeforeUnload = () => {
    this.flush("beforeunload");
  };

  constructor() {
    this.sessionId = this.getSessionId();
    this.isActive = this.isDocumentActive();
  }

  public start(router: NextRouter) {
    if (typeof window === "undefined") return;
    if (this.router) return;
    this.router = router;

    this.startPage(window.location.pathname);

    router.events?.on("routeChangeStart", this.handleRouteChangeStart);
    router.events?.on("routeChangeComplete", this.handleRouteChangeComplete);
    router.events?.on("routeChangeError", this.handleRouteChangeError);

    document.addEventListener("visibilitychange", this.handleVisibilityChange);
    window.addEventListener("focus", this.handleFocus);
    window.addEventListener("blur", this.handleBlur);
    window.addEventListener("pagehide", this.handlePageHide);
    window.addEventListener("beforeunload", this.handleBeforeUnload);
  }

  public stop() {
    if (!this.router) return;
    const router = this.router;
    this.router = null;

    router.events?.off("routeChangeStart", this.handleRouteChangeStart);
    router.events?.off("routeChangeComplete", this.handleRouteChangeComplete);
    router.events?.off("routeChangeError", this.handleRouteChangeError);

    document.removeEventListener(
      "visibilitychange",
      this.handleVisibilityChange,
    );
    window.removeEventListener("focus", this.handleFocus);
    window.removeEventListener("blur", this.handleBlur);
    window.removeEventListener("pagehide", this.handlePageHide);
    window.removeEventListener("beforeunload", this.handleBeforeUnload);
  }

  private getSessionId(): string {
    let sessionId = sessionStorage.getItem("tracking_session_id");
    if (!sessionId) {
      sessionId = `sess_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      sessionStorage.setItem("tracking_session_id", sessionId);
    }
    return sessionId;
  }

  private startPage(pathname: string) {
    if (typeof window === "undefined") return;
    const url = window.location.href;
    const now = Date.now();
    const pagePath = pathname || window.location.pathname;
    const pageGroup = this.getPageGroup(pagePath);

    this.state = {
      pageUrl: url,
      pagePath,
      pageGroup,
      enterAtMs: now,
      activeDurationMs: 0,
      activeStartMs: this.isDocumentActive() ? now : null,
      flushed: false,
    };
  }

  private isDocumentActive(): boolean {
    if (typeof document === "undefined") return true;
    return document.visibilityState === "visible" && document.hasFocus();
  }

  private updateActiveState() {
    if (!this.state) return;
    const shouldBeActive = this.isDocumentActive();
    if (shouldBeActive === this.isActive) return;

    if (shouldBeActive) {
      this.isActive = true;
      this.state.activeStartMs = Date.now();
    } else {
      this.isActive = false;
      if (this.state.activeStartMs) {
        this.state.activeDurationMs += Date.now() - this.state.activeStartMs;
        this.state.activeStartMs = null;
      }
    }
  }

  private flush(reason: string) {
    if (!this.state || this.state.flushed) return;
    if (typeof window === "undefined") return;

    const leaveAtMs = Date.now();

    if (this.state.activeStartMs) {
      this.state.activeDurationMs += leaveAtMs - this.state.activeStartMs;
      this.state.activeStartMs = null;
    }

    const totalDurationMs = Math.max(0, leaveAtMs - this.state.enterAtMs);
    const activeDurationMs = Math.min(
      totalDurationMs,
      Math.max(0, this.state.activeDurationMs),
    );

    this.state.flushed = true;

    const payload: PageDwellPayload = {
      sessionId: this.sessionId,
      pageUrl: this.state.pageUrl,
      pagePath: this.state.pagePath,
      pageGroup: this.state.pageGroup,
      enterAt: new Date(this.state.enterAtMs).toISOString(),
      leaveAt: new Date(leaveAtMs).toISOString(),
      totalDurationMs,
      activeDurationMs,
      referrer: document.referrer,
      userAgent: navigator.userAgent,
    };

    void this.send(payload, reason);
  }

  private toPath(url: string): string | null {
    try {
      const parsed = new URL(url, window.location.origin);
      return parsed.pathname;
    } catch {
      return null;
    }
  }

  private getPageGroup(pathname: string): string {
    if (pathname.startsWith("/experiences")) return "experience";
    if (pathname.startsWith("/chat")) return "gappychat";
    return "other";
  }

  private async send(payload: PageDwellPayload, reason: string) {
    if (
      typeof window !== "undefined" &&
      localStorage.getItem("gappy_tracking_disabled") === "true"
    ) {
      return;
    }

    const body = JSON.stringify({
      type: "page_dwell",
      data: { ...payload, reason },
    });

    try {
      if (navigator.sendBeacon) {
        const blob = new Blob([body], { type: "application/json" });
        const sent = navigator.sendBeacon("/api/track/ingest", blob);
        if (sent) return;
      }

      await fetch("/api/track/ingest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body,
        keepalive: true,
      });
    } catch (error) {
      console.error("[PageDwellTracker] Failed to send", error);
    }
  }
}

let tracker: PageDwellTracker | null = null;

export const initializePageDwellTracking = (router: NextRouter): void => {
  if (typeof window === "undefined") return;
  if (!tracker) {
    tracker = new PageDwellTracker();
  }
  tracker.start(router);
};

export const stopPageDwellTracking = (): void => {
  tracker?.stop();
};

export default PageDwellTracker;
