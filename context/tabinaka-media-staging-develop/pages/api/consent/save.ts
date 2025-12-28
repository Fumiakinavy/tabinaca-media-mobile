import type { NextApiRequest, NextApiResponse } from "next";
import { createClient } from "@supabase/supabase-js";
import { ACCOUNT_ID_COOKIE } from "@/lib/accountToken";
import { isDevelopment } from "@/lib/env";
import { handleCorsPreflightRequest, setCorsHeaders } from "@/lib/cors";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  // CORS: プリフライトリクエストを処理
  if (handleCorsPreflightRequest(req, res)) {
    return;
  }
  setCorsHeaders(req, res);

  if (req.method !== "POST") {
    res.setHeader("Allow", ["POST"]);
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  try {
    const { version, preferences, timestamp } = req.body;

    if (!version || !preferences || !timestamp) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    // 環境変数のチェック
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
      if (isDevelopment()) {
        console.warn(
          "⚠️  Supabase environment variables are not set. Skipping consent save in development mode.",
        );
        return res.status(200).json({
          success: true,
          message: "Consent save skipped (development mode - missing env vars)",
        });
      }
      return res.status(500).json({ error: "Server configuration error" });
    }

    // account_idを取得
    const accountId = req.cookies[ACCOUNT_ID_COOKIE];

    // IPアドレスとUser-Agentを取得（監査用）
    const ipAddress =
      (req.headers["x-forwarded-for"] as string)?.split(",")[0] ||
      req.socket.remoteAddress ||
      null;
    const userAgent = req.headers["user-agent"] || null;

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // 同意履歴を記録
    const { error: historyError } = await supabase
      .from("consent_history")
      .insert({
        account_id: accountId || null,
        consent_version: version,
        preferences,
        ip_address: ipAddress,
        user_agent: userAgent,
      });

    if (historyError) {
      console.error("Failed to save consent history:", historyError);
      // 履歴保存の失敗は致命的ではないので続行
    }

    // account_idがある場合は、account_profilesに保存
    if (accountId) {
      // まずaccountsテーブルにレコードがあるか確認・作成
      const { data: accountData, error: accountError } = await supabase
        .from("accounts")
        .select("id")
        .eq("id", accountId)
        .single();

      if (accountError && accountError.code === "PGRST116") {
        // アカウントが存在しない場合は作成
        await supabase.from("accounts").insert({
          id: accountId,
          status: "active",
          onboarding_state: {},
        });
      }

      const consentData = {
        consent: {
          version,
          timestamp,
          preferences,
        },
      };

      // accounts.profileへも保存（ベストエフォート）
      try {
        const { data: accountProfileRow } = await supabase
          .from("accounts" as any)
          .select("profile")
          .eq("id", accountId)
          .maybeSingle<{ profile?: Record<string, any> }>();

        const currentProfile = accountProfileRow?.profile || {};
        const nextPreferences = {
          ...(currentProfile.preferences || {}),
          ...consentData,
        };

        await supabase
          .from("accounts" as any)
          .update({
            profile: {
              ...currentProfile,
              preferences: nextPreferences,
              updatedAt: new Date().toISOString(),
            },
          })
          .eq("id", accountId);
      } catch (error) {
        console.warn("[consent/save] Failed to sync accounts.profile", error);
      }

      // account_profilesにレコードがあるか確認
      const { data: profileData } = await supabase
        .from("account_profiles")
        .select("account_id, preferences")
        .eq("account_id", accountId)
        .single();

      if (profileData) {
        // 既存のpreferencesとマージ
        const updatedPreferences = {
          ...(profileData.preferences || {}),
          ...consentData,
        };

        const { error: updateError } = await supabase
          .from("account_profiles")
          .update({
            preferences: updatedPreferences,
            updated_at: new Date().toISOString(),
          })
          .eq("account_id", accountId);

        if (updateError) {
          console.error("Failed to update consent in profile:", updateError);
          return res.status(500).json({ error: "Failed to save consent" });
        }
      } else {
        // 新規作成
        const { error: insertError } = await supabase
          .from("account_profiles")
          .insert({
            account_id: accountId,
            preferences: consentData,
          });

        if (insertError) {
          console.error("Failed to insert consent in profile:", insertError);
          return res.status(500).json({ error: "Failed to save consent" });
        }
      }
    }

    return res.status(200).json({
      success: true,
      message: "Consent saved successfully",
    });
  } catch (error) {
    console.error("Consent save error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}
