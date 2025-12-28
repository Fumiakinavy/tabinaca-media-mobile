import type { NextApiRequest, NextApiResponse } from "next";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { supabaseServer } from "../../../lib/supabaseServer";
import {
  buildAuthCookie,
  cookieNameForVendor,
  signPayload,
} from "../../../lib/vendorAuth";

const schema = z.object({
  bookingId: z.string().min(1),
  password: z.string().min(1),
});

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  if (req.method !== "POST")
    return res.status(405).json({ error: "Method Not Allowed" });

  try {
    const { bookingId, password } = schema.parse(req.body);

    console.log("🔐 Vendor login attempt:", {
      bookingId,
      pwLen: password?.length,
    });

    const { data, error } = await supabaseServer
      .from("form_submissions" as any)
      .select("experience_slug")
      .eq("booking_id", bookingId)
      .single<{ experience_slug: string }>();

    if (error || !data?.experience_slug) {
      console.log("🔐 Booking not found or no slug", { error: error?.message });
      return res.status(404).json({ error: "Booking not found" });
    }

    const { data: activity, error: actErr } = await supabaseServer
      .from("activities" as any)
      .select("id, slug, title")
      .eq("slug", data.experience_slug)
      .single<{ id: string; slug: string; title: string }>();

    if (actErr || !activity) {
      console.log("🔐 Activity not found", { actErr: actErr?.message });
      return res.status(404).json({ error: "Activity not found" });
    }

    let ok = false;

    // 1) Shared password via env（必須）
    const sharedRaw = process.env.VENDOR_SHARED_PASSWORD;
    if (!sharedRaw) {
      console.error("🔐 Vendor shared password is not configured");
      return res
        .status(503)
        .json({ error: "Vendor access is temporarily unavailable" });
    }
    const shared = sharedRaw.trim();
    const input = String(password).trim();
    if (input === shared) {
      ok = true;
    }

    // 2) Per-activity hash（今回は列が無い環境でも動くようスキップ）

    // 3) Temporary fallback: "店舗名 + 111"
    if (!ok) {
      const fallback = `${activity.title}111`;
      if (input === fallback) {
        ok = true;
      }
    }

    if (!ok) {
      console.log("🔐 Invalid password for vendor", { slug: activity.slug });
      return res.status(401).json({ error: "Invalid password" });
    }

    const vendorId = activity.slug;
    const token = signPayload({ vendorId, iat: Date.now() });
    const cookie = buildAuthCookie(cookieNameForVendor(vendorId), token);

    res.setHeader("Set-Cookie", cookie);
    return res.status(200).json({ success: true });
  } catch (e) {
    if (e instanceof z.ZodError)
      return res.status(400).json({ error: "Invalid request" });
    return res.status(500).json({ error: "Internal Server Error" });
  }
}
