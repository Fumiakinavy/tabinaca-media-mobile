// API rate limiter for development environment
interface ApiCall {
  timestamp: number;
  endpoint: string;
}

class ApiLimiter {
  private calls: ApiCall[] = [];
  private maxCallsPerHour = 50; // Limit to 50 calls per hour in development
  private maxCallsPerDay = 200; // Limit to 200 calls per day in development

  canMakeCall(endpoint: string): boolean {
    if (process.env.NODE_ENV !== "development") {
      return true; // No limits in production
    }

    const now = Date.now();
    const oneHourAgo = now - 60 * 60 * 1000;
    const oneDayAgo = now - 24 * 60 * 60 * 1000;

    // Remove old calls
    this.calls = this.calls.filter((call) => call.timestamp > oneDayAgo);

    // Count calls in the last hour
    const recentCalls = this.calls.filter(
      (call) => call.timestamp > oneHourAgo,
    );
    const dailyCalls = this.calls.length;

    if (recentCalls.length >= this.maxCallsPerHour) {
      console.warn(
        `API rate limit exceeded: ${recentCalls.length}/${this.maxCallsPerHour} calls in the last hour`,
      );
      return false;
    }

    if (dailyCalls >= this.maxCallsPerDay) {
      console.warn(
        `Daily API limit exceeded: ${dailyCalls}/${this.maxCallsPerDay} calls today`,
      );
      return false;
    }

    return true;
  }

  recordCall(endpoint: string): void {
    if (process.env.NODE_ENV !== "development") {
      return; // Don't track in production
    }

    this.calls.push({
      timestamp: Date.now(),
      endpoint,
    });
  }

  getStats() {
    const now = Date.now();
    const oneHourAgo = now - 60 * 60 * 1000;
    const oneDayAgo = now - 24 * 60 * 60 * 1000;

    const recentCalls = this.calls.filter(
      (call) => call.timestamp > oneHourAgo,
    );
    const dailyCalls = this.calls.filter((call) => call.timestamp > oneDayAgo);

    return {
      recentCalls: recentCalls.length,
      dailyCalls: dailyCalls.length,
      maxCallsPerHour: this.maxCallsPerHour,
      maxCallsPerDay: this.maxCallsPerDay,
      canMakeCall: this.canMakeCall("stats"),
    };
  }

  reset(): void {
    this.calls = [];
  }
}

export const apiLimiter = new ApiLimiter();

// Helper function to check if API call is allowed
export const checkApiLimit = (endpoint: string): boolean => {
  if (apiLimiter.canMakeCall(endpoint)) {
    apiLimiter.recordCall(endpoint);
    return true;
  }
  return false;
};
