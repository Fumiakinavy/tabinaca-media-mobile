import type { NextApiRequest, NextApiResponse } from "next";
import { z } from "zod";
import { supabaseServer } from "@/lib/supabaseServer";
import { cookieNameForVendor, verifyToken } from "@/lib/vendorAuth";

const querySchema = z.object({
  slug: z.string().min(1),
  limit: z.string().optional(),
  from: z.string().optional(),
  to: z.string().optional(),
});

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  if (req.method !== "GET")
    return res.status(405).json({ error: "Method Not Allowed" });

  try {
    const { slug, limit, from, to } = querySchema.parse(req.query);

    // Cookie ベースの簡易認証
    const cookieHeader = req.headers.cookie || "";
    const name = cookieNameForVendor(slug);
    const match = cookieHeader
      .split(";")
      .map((v) => v.trim())
      .find((v) => v.startsWith(`${name}=`));
    if (!match) return res.status(401).json({ error: "Unauthorized" });
    const token = match.split("=")[1];
    const payload = verifyToken(token);
    if (!payload || payload.vendorId !== slug)
      return res.status(401).json({ error: "Unauthorized" });

    const q = supabaseServer
      .from("activity_completions")
      .select(
        `
        booking_id,
        coupon_code,
        activity_name,
        experience_slug,
        user_name,
        user_email,
        party_size,
        completed_at
      `,
      )
      .eq("experience_slug", slug)
      .order("completed_at", { ascending: false });

    if (from) q.gte("completed_at", from);
    if (to) q.lte("completed_at", to);
    const rowLimit = Math.min(parseInt(limit || "50", 10) || 50, 200);
    q.limit(rowLimit);

    const { data, error } = await q;
    if (error) return res.status(500).json({ error: error.message });

    return res.status(200).json({ data });
  } catch (e) {
    if (e instanceof z.ZodError)
      return res.status(400).json({ error: "Invalid query" });
    return res.status(500).json({ error: "Internal Server Error" });
  }
}
