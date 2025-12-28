import type { NextApiRequest, NextApiResponse } from "next";
import { supabaseServer } from "@/lib/supabaseServer";
import { resolveAccountId } from "@/lib/server/accountResolver";
import { normalizeUtmPayload, type UtmParams } from "@/lib/utm";
import { handleCorsPreflightRequest, setCorsHeaders } from "@/lib/cors";

type ApiResponse =
  | { saved: true; firstTouchPersisted: boolean }
  | { error: string };

/** Row type for account_utm_attributions table */
interface AccountUtmAttributionRow {
  account_id: string;
  first_touch: UtmParams | null;
  first_touch_at: string | null;
  last_touch: UtmParams | null;
  last_touch_at: string | null;
  updated_at: string;
}

/** Row type for accounts table utm query */
interface AccountUtmRow {
  utm_source: UtmParams | null;
}

const UTM_COOKIE_NAME = "gappy_utm";

function readUtmFromCookie(req: NextApiRequest): UtmParams | null {
  const raw = req.cookies[UTM_COOKIE_NAME];
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as unknown;
    return normalizeUtmPayload(parsed);
  } catch (error) {
    console.warn("[api/account/utm] Failed to parse UTM cookie", error);
    return null;
  }
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ApiResponse>,
) {
  // CORS: プリフライトリクエストを処理
  if (handleCorsPreflightRequest(req, res)) {
    return;
  }
  setCorsHeaders(req, res);

  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const resolved = await resolveAccountId(req, undefined, false);
    if (!resolved) {
      return res.status(401).json({ error: "Account not resolved" });
    }

    const bodyUtm = normalizeUtmPayload(req.body?.utm);
    const cookieUtm = bodyUtm ? null : readUtmFromCookie(req);
    const utm = bodyUtm ?? cookieUtm;

    if (!utm) {
      return res.status(204).json({ error: "No UTM provided" });
    }

    const now = new Date().toISOString();

    const { data: existing, error: existingError } = await supabaseServer
      .from("account_utm_attributions")
      .select("first_touch, first_touch_at")
      .eq("account_id", resolved.accountId)
      .maybeSingle<{
        first_touch: UtmParams | null;
        first_touch_at: string | null;
      }>();

    if (existingError) {
      console.error(
        "[api/account/utm] Failed to fetch existing",
        existingError,
      );
      return res
        .status(500)
        .json({ error: "Failed to fetch existing attribution" });
    }

    const firstTouch = existing?.first_touch ?? utm;
    const firstTouchAt = existing?.first_touch_at ?? now;

    // Type assertion needed: table not in generated Supabase types
    const table = supabaseServer.from(
      "account_utm_attributions",
    ) as unknown as {
      upsert: (
        values: AccountUtmAttributionRow,
        options: { onConflict: string },
      ) => Promise<{ error: unknown }>;
    };
    const { error: upsertError } = await table.upsert(
      {
        account_id: resolved.accountId,
        first_touch: firstTouch,
        first_touch_at: firstTouchAt,
        last_touch: utm,
        last_touch_at: now,
        updated_at: now,
      } satisfies AccountUtmAttributionRow,
      { onConflict: "account_id" },
    );

    if (upsertError) {
      console.error("[api/account/utm] Upsert failed", upsertError);
      return res.status(500).json({ error: "Failed to save UTM" });
    }

    // Sync to accounts.utm_source (First Touch Attribution)
    // We want to persist the FIRST touch source into the main account profile for easy access.
    // We only update if it currently has no attribution data to preserve the original source.
    try {
      const { data: currentAccount } = await (supabaseServer
        .from("accounts" as any) as any)
        .select("utm_source")
        .eq("id", resolved.accountId)
        .single() as { data: AccountUtmRow | null };

      const currentUtm = currentAccount?.utm_source;
      const isEmpty = !currentUtm || Object.keys(currentUtm as object).length === 0;

      if (isEmpty) {
        await (supabaseServer
          .from("accounts" as any) as any)
          .update({ utm_source: firstTouch })
          .eq("id", resolved.accountId);
      }
    } catch (syncError) {
      // Non-critical error, log and continue
      console.warn("[api/account/utm] Failed to sync to accounts table", syncError);
    }

    return res.status(existing ? 200 : 201).json({
      saved: true,
      firstTouchPersisted: Boolean(existing?.first_touch),
    });
  } catch (error) {
    console.error("[api/account/utm] Unexpected error", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}
