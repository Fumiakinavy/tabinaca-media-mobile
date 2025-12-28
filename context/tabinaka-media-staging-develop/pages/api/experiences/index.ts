import type { NextApiRequest, NextApiResponse } from "next";
import { getAllItems } from "@/lib/mdx";

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 50;

type Experience = {
  slug: string;
  title: string;
  summary: string;
  coverImage: string;
  price?: number | null;
  duration?: string | null;
  level?: string | null;
  tags?: string[];
  motivationTags?: string[];
  locationFromStation?: string | null;
  location?: { lat: number; lng: number } | null;
  couponCode?: string | null;
  discount?: string | null;
  googlePlaceId?: string | null;
  affiliateUrl?: string | null;
  date?: string;
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  try {
    const offset = Math.max(parseInt(String(req.query.offset ?? "0"), 10), 0);
    const limitRaw = parseInt(String(req.query.limit ?? DEFAULT_LIMIT), 10);
    const limit = Math.min(Math.max(limitRaw, 1), MAX_LIMIT);
    const locale =
      typeof req.query.locale === "string" ? req.query.locale : "en";

    const experiences = (await getAllItems(
      "experiences",
      locale,
    )) as Experience[];
    const total = experiences.length;
    if (offset >= total) {
      res.setHeader(
        "Cache-Control",
        "s-maxage=7200, stale-while-revalidate=86400",
      );
      return res.status(200).json({
        items: [],
        total,
        hasMore: false,
        nextOffset: total,
      });
    }

    const slice = experiences.slice(offset, offset + limit).map((exp) => ({
      slug: exp.slug,
      title: exp.title,
      summary: exp.summary,
      coverImage: exp.coverImage,
      price: exp.price ?? null,
      duration: exp.duration ?? null,
      level: exp.level ?? null,
      tags: exp.tags ?? [],
      motivationTags: exp.motivationTags ?? [],
      locationFromStation: exp.locationFromStation ?? null,
      location: exp.location ?? null,
      couponCode: exp.couponCode ?? null,
      discount: exp.discount ?? null,
      googlePlaceId: exp.googlePlaceId ?? null,
      affiliateUrl: exp.affiliateUrl ?? null,
      date: exp.date ?? null,
    }));

    const nextOffset = offset + slice.length;
    const hasMore = nextOffset < total;

    res.setHeader(
      "Cache-Control",
      "s-maxage=7200, stale-while-revalidate=86400",
    );
    return res.status(200).json({
      items: slice,
      total,
      hasMore,
      nextOffset,
    });
  } catch (error) {
    console.error("[api/experiences] error", error);
    return res.status(500).json({ error: "Failed to load experiences" });
  }
}
