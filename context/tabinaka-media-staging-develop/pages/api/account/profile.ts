import type { NextApiRequest, NextApiResponse } from "next";
import { resolveAccountId } from "@/lib/server/accountResolver";
import { supabaseServer } from "@/lib/supabaseServer";
import { handleCorsPreflightRequest, setCorsHeaders } from "@/lib/cors";

type ErrorResponse = {
    error: string;
    details?: string;
};

type ProfileUpdatePayload = {
    name?: string;
    displayName?: string;
    email?: string;
    phoneNumber?: string;
    avatarUrl?: string;
    preferences?: Record<string, any>;
    travelStyle?: Record<string, any>;
};

// Supabaseクエリ結果の型定義
type ProfileData = {
    profile: Record<string, any> | null;
};

export default async function handler(
    req: NextApiRequest,
    res: NextApiResponse<any | ErrorResponse>,
) {
    // CORS: プリフライトリクエストを処理
    if (handleCorsPreflightRequest(req, res)) {
        return;
    }
    setCorsHeaders(req, res);

    if (req.method !== "PATCH" && req.method !== "GET") {
        res.setHeader("Allow", ["GET", "PATCH"]);
        return res.status(405).json({ error: "Method not allowed" });
    }

    const resolved = await resolveAccountId(req, res, false);
    if (!resolved) {
        return res.status(401).json({ error: "Missing account session" });
    }

    if (req.method === "GET") {
        try {
            const { data, error } = await supabaseServer
                .from("accounts" as any)
                .select("profile")
                .eq("id", resolved.accountId)
                .single<{ profile: Record<string, any> }>();

            if (error) {
                console.error("[account/profile] Failed to fetch profile", error);
                return res.status(500).json({ error: "Failed to fetch profile" });
            }

            const rawProfile = data?.profile || {};
            const resolvedDisplayName =
                rawProfile.display_name ||
                rawProfile.displayName ||
                rawProfile.name ||
                null;
            const resolvedAvatarUrl =
                rawProfile.avatarUrl || rawProfile.avatar_url || null;

            return res.status(200).json({
                profile: rawProfile,
                displayName: resolvedDisplayName,
                avatarUrl: resolvedAvatarUrl,
            });
        } catch (error) {
            console.error("[account/profile] Unexpected error", error);
            return res.status(500).json({ error: "Internal server error" });
        }
    }

    if (req.method === "PATCH") {
        const payload = req.body as ProfileUpdatePayload;

        try {
            // Fetch existing profile to merge
            const { data: currentData, error: fetchError } = await supabaseServer
                .from("accounts" as any)
                .select("profile")
                .eq("id", resolved.accountId)
                .single<{ profile: Record<string, any> }>();

            if (fetchError) {
                return res.status(500).json({ error: "Failed to fetch current profile" });
            }

            const currentProfile = currentData?.profile || {};

            const now = new Date().toISOString();
            const normalizedProfile: Record<string, any> = { ...currentProfile };

            const displayName =
                payload.displayName ??
                payload.name ??
                currentProfile.display_name ??
                currentProfile.displayName ??
                currentProfile.name;
            if (displayName) {
                normalizedProfile.display_name = displayName;
                normalizedProfile.displayName = displayName;
                normalizedProfile.name = displayName;
            }

            if (payload.avatarUrl) {
                normalizedProfile.avatarUrl = payload.avatarUrl;
                normalizedProfile.avatar_url = payload.avatarUrl;
            }

            if (payload.email) {
                normalizedProfile.email = payload.email;
            }

            if (payload.phoneNumber) {
                normalizedProfile.phoneNumber = payload.phoneNumber;
                normalizedProfile.phone_number = payload.phoneNumber;
            }

            if (payload.preferences) {
                normalizedProfile.preferences = {
                    ...(currentProfile.preferences || {}),
                    ...payload.preferences,
                };
            }

            if (payload.travelStyle) {
                normalizedProfile.travelStyle = {
                    ...(currentProfile.travelStyle || {}),
                    ...payload.travelStyle,
                };
            }

            normalizedProfile.updatedAt = now;

            const updatedProfile = normalizedProfile;

            const { error: updateError } = await (supabaseServer
                .from("accounts" as any) as any)
                .update({ profile: updatedProfile })
                .eq("id", resolved.accountId);

            if (updateError) {
                console.error("[account/profile] Failed to update profile", updateError);
                return res.status(500).json({
                    error: "Failed to update profile",
                    details: updateError.message
                });
            }

            return res.status(200).json({ profile: updatedProfile });
        } catch (error) {
            console.error("[account/profile] Unexpected error", error);
            return res.status(500).json({ error: "Internal server error" });
        }
    }
}
