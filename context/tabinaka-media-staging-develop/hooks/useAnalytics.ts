/**
 * Analytics and tracking hooks
 * Extracted from _app.tsx for better separation of concerns
 */

import { useEffect } from "react";
import { useRouter } from "next/router";
import { sendGA, sendFormStart } from "@/lib/ga";

// GA4 event sending function (using common utility)
const sendGA4Event = (
  eventName: string,
  parameters: Record<string, any> = {},
) => {
  if (typeof window !== "undefined" && (window as any).gtag) {
    (window as any).gtag("event", eventName, parameters);
  }
};

/**
 * Hook for Google Analytics 4 tracking
 */
export function useGA4Tracking() {
  useEffect(() => {
    // Session start event
    sendGA4Event("session_start", {
      page_location: window.location.pathname,
      timestamp: new Date().toISOString(),
      user_agent: navigator.userAgent,
      screen_resolution: `${screen.width}x${screen.height}`,
      viewport_size: `${window.innerWidth}x${window.innerHeight}`,
      language: navigator.language,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    });
  }, []);
}

/**
 * Hook for detailed user behavior tracking
 */
export function useUserBehaviorTracking() {
  useEffect(() => {
    if (typeof window !== "undefined") {
      let startTime = Date.now();
      let lastActivity = Date.now();
      let isActive = true;

      // Event on page unload
      const handleBeforeUnload = () => {
        const sessionDuration = Date.now() - startTime;
        sendGA4Event("session_end", {
          session_duration: sessionDuration,
          page_location: window.location.pathname,
          timestamp: new Date().toISOString(),
        });
      };

      // Track user activity
      const handleUserActivity = () => {
        lastActivity = Date.now();
        if (!isActive) {
          isActive = true;
          sendGA4Event("user_return", {
            page_location: window.location.pathname,
            timestamp: new Date().toISOString(),
          });
        }
      };

      // Detect inactive state
      const checkInactivity = () => {
        const inactiveTime = Date.now() - lastActivity;
        if (inactiveTime > 30000 && isActive) {
          // Inactive for more than 30 seconds
          isActive = false;
          sendGA4Event("user_inactive", {
            inactive_duration: inactiveTime,
            page_location: window.location.pathname,
            timestamp: new Date().toISOString(),
          });
        }
      };

      // Track scroll depth
      let maxScrollDepth = 0;
      const handleScroll = () => {
        const scrollTop = window.pageYOffset;
        const docHeight =
          document.documentElement.scrollHeight - window.innerHeight;
        const scrollPercent = Math.round((scrollTop / docHeight) * 100);

        if (scrollPercent > maxScrollDepth) {
          maxScrollDepth = scrollPercent;

          // Send event at 25%, 50%, 75%, 100% scroll points
          if ([25, 50, 75, 100].includes(scrollPercent)) {
            sendGA4Event("scroll_depth", {
              scroll_percentage: scrollPercent,
              page_location: window.location.pathname,
              timestamp: new Date().toISOString(),
            });
          }
        }
      };

      // Track external link clicks
      const handleExternalLinkClick = (e: MouseEvent) => {
        const target = e.target as HTMLElement;
        const link = target.closest("a");
        if (link && link.hostname !== window.location.hostname) {
          sendGA4Event("external_link_click", {
            link_url: link.href,
            link_text: link.textContent,
            page_location: window.location.pathname,
            timestamp: new Date().toISOString(),
          });
        }
      };

      // Track form start (optimized version)
      const handleFormFocus = (e: Event) => {
        const target = e.target as
          | HTMLInputElement
          | HTMLTextAreaElement
          | HTMLSelectElement;
        if (
          target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.tagName === "SELECT"
        ) {
          const form = target.closest("form");
          if (form) {
            sendFormStart(
              form.getAttribute("data-form-name") || "unknown_form",
            );
          }
        }
      };

      // Set up event listeners
      window.addEventListener("beforeunload", handleBeforeUnload);
      window.addEventListener("mousemove", handleUserActivity);
      window.addEventListener("keydown", handleUserActivity);
      window.addEventListener("click", handleUserActivity);
      window.addEventListener("scroll", handleScroll);
      window.addEventListener("click", handleExternalLinkClick);
      window.addEventListener("focus", handleFormFocus);

      // Periodically check for inactivity
      const inactivityInterval = setInterval(checkInactivity, 10000); // Every 10 seconds

      // Cleanup
      return () => {
        window.removeEventListener("beforeunload", handleBeforeUnload);
        window.removeEventListener("mousemove", handleUserActivity);
        window.removeEventListener("keydown", handleUserActivity);
        window.removeEventListener("click", handleUserActivity);
        window.removeEventListener("scroll", handleScroll);
        window.removeEventListener("click", handleExternalLinkClick);
        window.removeEventListener("focus", handleFormFocus);
        clearInterval(inactivityInterval);
      };
    }
  }, []);
}

/**
 * Hook for custom performance and business metrics tracking
 */
export function usePerformanceAndBusinessTracking(router: ReturnType<typeof useRouter>) {
  useEffect(() => {
    // Initialize performance monitoring (production only)
    if (process.env.NODE_ENV === "production") {
      import("@/lib/performanceMonitor").then(
        ({ initializePerformanceMonitoring }) => {
          initializePerformanceMonitoring();
        },
      );
    }
  }, []);

  useEffect(() => {
    // Initialize custom trackers (production only)
    if (process.env.NODE_ENV === "production") {
      // Initialize user behavior tracker
      import("@/lib/userBehaviorTracker").then(
        ({ initializeUserBehaviorTracking }) => {
          initializeUserBehaviorTracking();
        },
      );

      // Initialize business metrics tracker
      import("@/lib/businessMetricsTracker").then(
        ({ initializeBusinessMetricsTracking }) => {
          initializeBusinessMetricsTracking();
        },
      );

      // Initialize page dwell tracker
      import("@/lib/pageDwellTracker").then(
        ({ initializePageDwellTracking }) => {
          initializePageDwellTracking(router);
        },
      );
    }
  }, [router]);
}
