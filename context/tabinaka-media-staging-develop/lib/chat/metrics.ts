/**
 * Chat performance metrics tracking
 * Provides utilities for measuring and logging response time breakdowns
 */

export interface ResponseTimeMetrics {
  sessionId: string;
  accountId: string;
  totalTime: number;
  breakdown: {
    validation: number;
    promptBuild: number;
    firstModelCall: number;
    toolExecution: number;
    additionalModelCalls: number;
    streaming: number;
  };
  modelInfo: {
    modelId: string;
    tokenUsage: {
      input: number;
      output: number;
      cacheCreation?: number;
      cacheRead?: number;
    };
  };
  toolInfo: {
    callCount: number;
    calls: Array<{
      name: string;
      duration: number;
      success: boolean;
    }>;
  };
  intent: string;
  cacheHit: boolean;
  timestamp: string;
}

export class MetricsCollector {
  private startTime: number = 0;
  private checkpoints: Map<string, number> = new Map();
  private toolCalls: Array<{
    name: string;
    duration: number;
    success: boolean;
  }> = [];

  start(): void {
    this.startTime = Date.now();
    this.checkpoint("start");
  }

  checkpoint(name: string): void {
    this.checkpoints.set(name, Date.now());
  }

  addToolCall(name: string, duration: number, success: boolean): void {
    this.toolCalls.push({ name, duration, success });
  }

  getDuration(from: string, to: string): number {
    const fromTime = this.checkpoints.get(from);
    const toTime = this.checkpoints.get(to);

    if (!fromTime || !toTime) return 0;
    return toTime - fromTime;
  }

  getTotalDuration(): number {
    return Date.now() - this.startTime;
  }

  getToolCalls(): Array<{ name: string; duration: number; success: boolean }> {
    return [...this.toolCalls];
  }

  reset(): void {
    this.startTime = 0;
    this.checkpoints.clear();
    this.toolCalls = [];
  }
}

export function createMetricsCollector(): MetricsCollector {
  return new MetricsCollector();
}

export async function trackResponseMetrics(
  metrics: ResponseTimeMetrics
): Promise<void> {
  console.log("[Metrics] Response time breakdown:", {
    sessionId: metrics.sessionId,
    totalTime: `${metrics.totalTime}ms`,
    breakdown: metrics.breakdown,
    toolCallCount: metrics.toolInfo.callCount,
    cacheHit: metrics.cacheHit,
    cacheHitRate: metrics.modelInfo.tokenUsage.cacheRead
      ? `${Math.round((metrics.modelInfo.tokenUsage.cacheRead / metrics.modelInfo.tokenUsage.input) * 100)}%`
      : "0%",
  });

  // TODO: Send to CloudWatch Metrics, DataDog, etc.
  // await sendToMonitoring(metrics);
}

/**
 * Log performance summary to console
 */
export function logPerformanceSummary(metrics: ResponseTimeMetrics): void {
  console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("⚡ Response Performance Summary");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log(`Total Time: ${metrics.totalTime}ms`);
  console.log(`\nBreakdown:`);
  console.log(`  Validation:       ${metrics.breakdown.validation}ms`);
  console.log(`  Prompt Build:     ${metrics.breakdown.promptBuild}ms`);
  console.log(`  1st Model Call:   ${metrics.breakdown.firstModelCall}ms`);
  console.log(`  Tool Execution:   ${metrics.breakdown.toolExecution}ms`);
  console.log(`  Additional Calls: ${metrics.breakdown.additionalModelCalls}ms`);
  console.log(`  Streaming:        ${metrics.breakdown.streaming}ms`);
  console.log(`\nModel Info:`);
  console.log(`  Model ID: ${metrics.modelInfo.modelId}`);
  console.log(`  Input Tokens:  ${metrics.modelInfo.tokenUsage.input}`);
  console.log(`  Output Tokens: ${metrics.modelInfo.tokenUsage.output}`);
  if (metrics.modelInfo.tokenUsage.cacheRead) {
    console.log(`  Cache Read:    ${metrics.modelInfo.tokenUsage.cacheRead}`);
    console.log(
      `  Cache Hit Rate: ${Math.round((metrics.modelInfo.tokenUsage.cacheRead / metrics.modelInfo.tokenUsage.input) * 100)}%`
    );
  }
  console.log(`\nTool Calls: ${metrics.toolInfo.callCount}`);
  metrics.toolInfo.calls.forEach((call, i) => {
    console.log(
      `  ${i + 1}. ${call.name}: ${call.duration}ms ${call.success ? "✓" : "✗"}`
    );
  });
  console.log(`\nIntent: ${metrics.intent}`);
  console.log(`Cache Hit: ${metrics.cacheHit ? "Yes" : "No"}`);
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");
}

/**
 * Calculate average response times from multiple metrics
 */
export function calculateAverageMetrics(
  metricsArray: ResponseTimeMetrics[]
): {
  avgTotalTime: number;
  avgTokenUsage: { input: number; output: number };
  avgToolCalls: number;
  cacheHitRate: number;
} {
  if (metricsArray.length === 0) {
    return {
      avgTotalTime: 0,
      avgTokenUsage: { input: 0, output: 0 },
      avgToolCalls: 0,
      cacheHitRate: 0,
    };
  }

  const totals = metricsArray.reduce(
    (acc, m) => ({
      totalTime: acc.totalTime + m.totalTime,
      inputTokens: acc.inputTokens + m.modelInfo.tokenUsage.input,
      outputTokens: acc.outputTokens + m.modelInfo.tokenUsage.output,
      toolCalls: acc.toolCalls + m.toolInfo.callCount,
      cacheHits: acc.cacheHits + (m.cacheHit ? 1 : 0),
    }),
    {
      totalTime: 0,
      inputTokens: 0,
      outputTokens: 0,
      toolCalls: 0,
      cacheHits: 0,
    }
  );

  const count = metricsArray.length;

  return {
    avgTotalTime: Math.round(totals.totalTime / count),
    avgTokenUsage: {
      input: Math.round(totals.inputTokens / count),
      output: Math.round(totals.outputTokens / count),
    },
    avgToolCalls: Math.round((totals.toolCalls / count) * 10) / 10,
    cacheHitRate: Math.round((totals.cacheHits / count) * 100),
  };
}
