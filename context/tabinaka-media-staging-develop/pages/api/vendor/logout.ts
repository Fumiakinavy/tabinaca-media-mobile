import type { NextApiRequest, NextApiResponse } from "next";
import { clearAuthCookie, cookieNameForVendor } from "../../../lib/vendorAuth";

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  const vendorId = (req.query.vendorId as string) || "";
  if (!vendorId) return res.status(400).json({ error: "vendorId is required" });
  const cookie = clearAuthCookie(cookieNameForVendor(vendorId));
  res.setHeader("Set-Cookie", cookie);
  res.status(200).json({ success: true });
}
