import type { NextApiRequest, NextApiResponse } from "next";
import { z } from "zod";
import { supabaseServer } from "@/lib/supabaseServer";
import {
  ACCOUNT_ID_COOKIE,
  ACCOUNT_TOKEN_COOKIE,
  ACCOUNT_TOKEN_TTL_MS,
  buildAccountCookie,
  createAccountId,
  signAccountToken,
} from "@/lib/accountToken";
import {
  ensureAccountRow,
  resolveAccountIdOnly,
} from "@/lib/server/accountResolver";

const schema = z.object({
  placeId: z.string().min(1),
  placeName: z.string().min(1),
  fullName: z.string().min(1),
  email: z.string().email(),
  bookingUrl: z.string().url().optional().nullable(),
  pageUrl: z.string().url().optional().nullable(),
});

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  if (req.method !== "POST") {
    res.setHeader("Allow", ["POST"]);
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  try {
    const payload = schema.parse(req.body);

    let accountId = await resolveAccountIdOnly(req, res, true);
    if (!accountId) {
      accountId = createAccountId();
      const tokenRecord = signAccountToken(accountId);
      const ttlSeconds = Math.floor(ACCOUNT_TOKEN_TTL_MS / 1000);
      res.setHeader("Set-Cookie", [
        buildAccountCookie(ACCOUNT_ID_COOKIE, accountId, ttlSeconds),
        buildAccountCookie(ACCOUNT_TOKEN_COOKIE, tokenRecord.token, ttlSeconds),
      ]);
      await ensureAccountRow(accountId);
    }
    const ipAddress =
      (req.headers["x-forwarded-for"] as string)?.split(",")[0] ||
      req.socket.remoteAddress ||
      null;
    const userAgent = req.headers["user-agent"] || null;
    const referrer = req.headers.referer || null;

    const { error } = await (supabaseServer.from("booking_leads" as any) as any).insert({
      account_id: accountId,
      place_id: payload.placeId,
      place_name: payload.placeName,
      full_name: payload.fullName,
      email: payload.email,
      booking_url: payload.bookingUrl ?? null,
      page_url: payload.pageUrl ?? null,
      ip_address: ipAddress,
      user_agent: userAgent,
      referrer,
    });

    if (error) {
      console.error("[booking-leads] Failed to save lead", error);
      return res.status(500).json({ error: "Failed to save lead" });
    }

    return res.status(200).json({ success: true });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: "Invalid request" });
    }
    console.error("[booking-leads] Failed", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
}
