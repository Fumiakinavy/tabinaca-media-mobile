import type { NextApiRequest, NextApiResponse } from "next";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { supabaseServer } from "../../../lib/supabaseServer";

const schema = z.object({
  slug: z.string().min(1),
  password: z.string().min(6),
});

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  if (req.method !== "POST")
    return res.status(405).json({ error: "Method Not Allowed" });

  // 簡易な管理者保護（環境変数でベアラートークン）
  const adminToken = process.env.VENDOR_ADMIN_TOKEN;
  const auth = req.headers.authorization || "";
  if (!adminToken || auth !== `Bearer ${adminToken}`) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  try {
    const { slug, password } = schema.parse(req.body);
    const hash = await bcrypt.hash(password, 10);

    const updateQuery = supabaseServer.from("activities" as any) as any;
    const { error } = await updateQuery
      .update({ vendor_password_hash: hash } as any)
      .eq("slug", slug);

    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json({ success: true });
  } catch (e) {
    if (e instanceof z.ZodError)
      return res.status(400).json({ error: "Invalid request" });
    return res.status(500).json({ error: "Internal Server Error" });
  }
}
