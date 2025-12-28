import type { NextApiRequest, NextApiResponse } from "next";
import { resolveAccountId } from "@/lib/server/accountResolver";
import { supabaseServer } from "@/lib/supabaseServer";

type LocationPermissionState = "granted" | "denied" | "unknown";

type LocationPermissionResponse = {
  granted: boolean | null;
  state: LocationPermissionState;
  updatedAt?: string | null;
};

type LocationPermissionPayload = {
  granted?: boolean;
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<LocationPermissionResponse | { error: string }>,
) {
  if (req.method !== "GET" && req.method !== "POST") {
    res.setHeader("Allow", ["GET", "POST"]);
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  const resolved = await resolveAccountId(req, res, false);
  if (!resolved) {
    if (req.method === "GET") {
      return res.status(200).json({ granted: null, state: "unknown" });
    }
    return res.status(401).json({ error: "Missing account session" });
  }

  if (req.method === "GET") {
    try {
      const { data, error } = await supabaseServer
        .from("accounts" as any)
        .select("profile")
        .eq("id", resolved.accountId)
        .single<{ profile?: Record<string, any> }>();

      if (error) {
        console.error(
          "[account/location-permission] failed to fetch profile",
          error,
        );
        // エラーでも一旦falseを返しておく
        return res.status(200).json({ granted: false, state: "denied" });
      }

      // プロフィール内のpreferencesに保存されていると想定
      const preferences = data?.profile?.preferences || {};
      const stored = preferences.locationPermissionGranted;
      const granted = typeof stored === "boolean" ? stored : null;
      const state: LocationPermissionState =
        granted === true ? "granted" : granted === false ? "denied" : "unknown";
      const updatedAt =
        typeof preferences.locationPermissionUpdatedAt === "string"
          ? preferences.locationPermissionUpdatedAt
          : null;

      return res.status(200).json({ granted, state, updatedAt });
    } catch (error) {
      console.error(
        "[account/location-permission] Unexpected error in GET",
        error,
      );
      return res
        .status(200)
        .json({ granted: null, state: "unknown" });
    }
  }

  // POST: Update permission
  const payload = (req.body ?? {}) as LocationPermissionPayload;
  const granted = typeof payload.granted === "boolean" ? payload.granted : true;

  const responsePayload = (updatedAt?: string | null): LocationPermissionResponse => ({
    granted,
    state: (granted ? "granted" : "denied") as LocationPermissionState,
    updatedAt,
  });

  try {
    // まず現在のProfileを取得してマージする必要がある
    const { data: currentData, error: fetchError } = await supabaseServer
      .from("accounts" as any)
      .select("profile")
      .eq("id", resolved.accountId)
      .single<{ profile?: Record<string, any> }>();

    if (fetchError) {
      console.error(
        "[account/location-permission] failed to fetch current profile for update",
        fetchError,
      );
      // 位置情報許可フラグはUX向上のための付加情報なので、保存失敗でも
      // 体験をブロックしない（クライアント側の警告/エラー連鎖を防ぐ）
      return res.status(200).json(responsePayload(null));
    }

    const currentProfile = currentData?.profile || {};
    const currentPreferences = currentProfile.preferences || {};

    const updatedProfile = {
      ...currentProfile,
      preferences: {
        ...currentPreferences,
        locationPermissionGranted: granted,
        locationPermissionUpdatedAt: new Date().toISOString(),
      },
      updated_at: new Date().toISOString(),
    };

    const { error: updateError } = await (supabaseServer
      .from("accounts" as any) as any)
      .update({
        profile: updatedProfile,
        updated_at: new Date().toISOString(),
      })
      .eq("id", resolved.accountId);

    if (updateError) {
      console.error(
        "[account/location-permission] failed to update accounts table",
        updateError,
      );
      return res.status(200).json(responsePayload(null));
    }

    return res.status(200).json(
      responsePayload(updatedProfile.preferences?.locationPermissionUpdatedAt ?? null),
    );
  } catch (error) {
    console.error(
      "[account/location-permission] Unexpected error in POST",
      error,
    );
    return res.status(200).json(responsePayload(null));
  }
}
