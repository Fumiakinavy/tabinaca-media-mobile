import type { NextApiRequest, NextApiResponse } from "next";
import { createClient } from "@supabase/supabase-js";
import { ACCOUNT_ID_COOKIE } from "@/lib/accountToken";
import { getEnvVar } from "@/lib/env";

const supabaseUrl = getEnvVar("NEXT_PUBLIC_SUPABASE_URL");
const supabaseServiceKey = getEnvVar("SUPABASE_SERVICE_ROLE_KEY");

// レート制限用のメモリストア（本番環境ではRedisなどを使用）
const rateLimitStore = new Map<string, { count: number; resetAt: number }>();

const RATE_LIMIT_MAX_REQUESTS = 100; // 1分間あたりの最大リクエスト数
const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1分

function checkRateLimit(identifier: string): boolean {
  const now = Date.now();
  const record = rateLimitStore.get(identifier);

  if (!record || now > record.resetAt) {
    rateLimitStore.set(identifier, {
      count: 1,
      resetAt: now + RATE_LIMIT_WINDOW_MS,
    });
    return true;
  }

  if (record.count >= RATE_LIMIT_MAX_REQUESTS) {
    return false;
  }

  record.count++;
  return true;
}

// 簡易的な署名検証（本番環境ではHMACなどを使用）
function verifySignature(
  payload: string,
  signature: string | undefined,
): boolean {
  if (!signature) return false;
  // TODO: 実際のHMAC-SHA256署名検証を実装
  // const expectedSignature = crypto
  //   .createHmac('sha256', process.env.TRACKING_SECRET!)
  //   .update(payload)
  //   .digest('hex');
  // return signature === expectedSignature;
  return true; // 開発中は常にtrue
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  if (req.method !== "POST") {
    res.setHeader("Allow", ["POST"]);
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  try {
    const { type, data, signature } = req.body;

    if (!type || !data) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    // レート制限チェック
    const clientIp =
      (req.headers["x-forwarded-for"] as string)?.split(",")[0] ||
      req.socket.remoteAddress ||
      "unknown";

    if (!checkRateLimit(clientIp)) {
      return res
        .status(429)
        .json({ error: "Rate limit exceeded. Please try again later." });
    }

    // 署名検証（オプション）
    if (signature && !verifySignature(JSON.stringify(data), signature)) {
      return res.status(401).json({ error: "Invalid signature" });
    }

    // account_idを取得
    const accountId = req.cookies[ACCOUNT_ID_COOKIE] || null;

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // トラッキングタイプに応じて適切なテーブルに保存
    if (type === "user_behavior") {
      const {
        sessionId,
        timestamp,
        pageUrl,
        userAgent,
        screenResolution,
        viewportSize,
        language,
        timezone,
        referrer,
        actions,
        performance,
        engagement,
      } = data;

      const { error } = await supabase.from("user_behavior_events").insert({
        account_id: accountId,
        session_id: sessionId,
        event_timestamp: timestamp,
        page_url: pageUrl,
        user_agent: userAgent,
        screen_resolution: screenResolution,
        viewport_size: viewportSize,
        language,
        timezone,
        referrer,
        actions: actions || [],
        performance: performance || null,
        engagement: engagement || {},
      });

      if (error) {
        console.error("Failed to save user behavior event:", error);
        return res.status(500).json({ error: "Failed to save event" });
      }
    } else if (type === "business_metrics") {
      const {
        sessionId,
        timestamp,
        pageUrl,
        experienceSlug,
        experienceTitle,
        metrics,
      } = data;

      const { error } = await supabase.from("business_metrics_events").insert({
        account_id: accountId,
        session_id: sessionId,
        event_timestamp: timestamp,
        page_url: pageUrl,
        experience_slug: experienceSlug || null,
        experience_title: experienceTitle || null,
        conversion_funnel: metrics?.conversionFunnel || null,
        revenue_metrics: metrics?.revenueMetrics || null,
        user_journey: metrics?.userJourney || null,
        content_performance: metrics?.contentPerformance || null,
        customer_satisfaction: metrics?.customerSatisfaction || null,
      });

      if (error) {
        console.error("Failed to save business metrics event:", error);
        return res.status(500).json({ error: "Failed to save event" });
      }
    } else if (type === "page_dwell") {
      const {
        sessionId,
        pageUrl,
        pagePath,
        pageGroup,
        enterAt,
        leaveAt,
        totalDurationMs,
        activeDurationMs,
        referrer,
        userAgent,
        reason,
      } = data;

      const { error } = await supabase.from("page_dwell_events").insert({
        account_id: accountId,
        session_id: sessionId,
        page_url: pageUrl,
        page_path: pagePath,
        page_group: pageGroup || null,
        enter_at: enterAt,
        leave_at: leaveAt,
        total_duration_ms: totalDurationMs,
        active_duration_ms: activeDurationMs,
        referrer: referrer || null,
        user_agent: userAgent || null,
        metadata: reason ? { reason } : {},
      });

      if (error) {
        console.error("Failed to save page dwell event:", error);
        return res.status(500).json({ error: "Failed to save event" });
      }
    } else if (type === "session_replay") {
      // セッションリプレイイベント（将来の拡張用）
      const { sessionId, events } = data;

      if (Array.isArray(events)) {
        const replayEvents = events.map((event: any) => ({
          session_id: sessionId,
          event_type: event.type,
          event_data: event.data,
          timestamp: event.timestamp,
        }));

        const { error } = await supabase
          .from("session_replay_events")
          .insert(replayEvents);

        if (error) {
          console.error("Failed to save session replay events:", error);
          return res.status(500).json({ error: "Failed to save events" });
        }
      }
    } else {
      return res.status(400).json({ error: "Invalid tracking type" });
    }

    return res.status(200).json({
      success: true,
      message: "Event ingested successfully",
    });
  } catch (error) {
    console.error("Tracking ingestion error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}

// CORSの設定（必要に応じて）
export const config = {
  api: {
    bodyParser: {
      sizeLimit: "1mb", // ペイロードサイズ制限
    },
  },
};
