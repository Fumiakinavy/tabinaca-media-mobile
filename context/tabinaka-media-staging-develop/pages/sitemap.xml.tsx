// pages/sitemap.xml.tsx
import type { GetServerSideProps } from "next";
import fs from "fs";
import path from "path";
import matter from "gray-matter";

const Sitemap = () => null;

// 安全に encode（既に % を含む場合の二重エンコードも抑止）
function safeEncodeSegment(seg: string): string {
  const trimmed = seg.trim();
  try {
    // 既に %xx が入っていても、いったん decode → 改めて encode で正規化
    const decoded = decodeURIComponent(trimmed);
    return encodeURIComponent(decoded);
  } catch {
    return encodeURIComponent(trimmed);
  }
}

// /foo/bar baz → /foo/bar%20baz
function normalizePath(input: string): string {
  if (!input || input === "/") return "/";
  const withSlash = input.startsWith("/") ? input : `/${input}`;
  const collapsed = withSlash.replace(/\/+/g, "/");
  const parts = collapsed.split("/");
  // 先頭（"" = ルート）はそのまま、以降のセグメントを encode
  const encoded = parts.map((p, i) => (i === 0 ? "" : safeEncodeSegment(p)));
  const joined = encoded.join("/");
  return joined || "/";
}

// XMLの保険エスケープ（URL内の & など）
function escapeXml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

// MDXファイルからスラッグ一覧を取得（英語のみ）
function getMdxSlugs(contentDir: string): string[] {
  const enPath = path.join(process.cwd(), "content", contentDir, "en");
  if (!fs.existsSync(enPath)) return [];

  return fs
    .readdirSync(enPath)
    .filter((file) => file.endsWith(".mdx"))
    .filter((file) => !file.startsWith("_")) // テンプレートファイルを除外
    .map((file) => file.replace(".mdx", ""));
}

// MDXファイルから最終更新日を取得
function getLastModified(contentDir: string, slug: string): string {
  try {
    const fullPath = path.join(
      process.cwd(),
      "content",
      contentDir,
      "en",
      `${slug}.mdx`,
    );

    if (!fs.existsSync(fullPath)) {
      return new Date().toISOString().split("T")[0];
    }

    const fileContent = fs.readFileSync(fullPath, "utf8");
    const { data } = matter(fileContent);

    // updatedAt または date フィールドがあれば使用
    if (data.updatedAt) {
      return new Date(data.updatedAt).toISOString().split("T")[0];
    }
    if (data.date) {
      return new Date(data.date).toISOString().split("T")[0];
    }

    // なければファイルの最終更新日
    const stats = fs.statSync(fullPath);
    return stats.mtime.toISOString().split("T")[0];
  } catch {
    return new Date().toISOString().split("T")[0];
  }
}

export const getServerSideProps: GetServerSideProps = async ({ res }) => {
  const BASE = "https://gappytravel.com";
  const today = new Date().toISOString().split("T")[0];

  // ── 固定ページ（英語のみ）───────────────────────────────
  const staticPages = [
    // メインページ（最高優先度）
    { path: "", priority: "1.0", changefreq: "daily" },

    // コアコンテンツページ（高優先度）
    { path: "/experiences", priority: "0.9", changefreq: "daily" },
    { path: "/quiz", priority: "0.8", changefreq: "weekly" },
    { path: "/chat", priority: "0.8", changefreq: "weekly" },

    // ユーザー機能ページ（中優先度）
    { path: "/liked-activities", priority: "0.6", changefreq: "weekly" },
    { path: "/completed-activities", priority: "0.6", changefreq: "weekly" },

    // 会社情報・法的ページ（低優先度）
    { path: "/about-us", priority: "0.5", changefreq: "monthly" },
    { path: "/contact-us", priority: "0.5", changefreq: "monthly" },
    { path: "/terms-of-use", priority: "0.3", changefreq: "yearly" },
  ];

  // ── 動的に体験を取得 ──────────────────────────
  const experienceSlugs = getMdxSlugs("experiences");
  console.log(`Found ${experienceSlugs.length} experiences`);

  const urlEntries: string[] = [];

  // 固定ページを追加
  staticPages.forEach(({ path: pagePath, priority, changefreq }) => {
    const norm = normalizePath(pagePath);
    const abs = `${BASE}${norm === "/" ? "" : norm}`;
    const safe = escapeXml(abs);

    urlEntries.push(`  <url>
    <loc>${safe}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>${changefreq}</changefreq>
    <priority>${priority}</priority>
  </url>`);
  });

  // 体験を追加
  experienceSlugs.forEach((slug) => {
    const lastmod = getLastModified("experiences", slug);
    const norm = normalizePath(`/experiences/${slug}`);
      const abs = `${BASE}${norm}`;
      const safe = escapeXml(abs);

      urlEntries.push(`  <url>
    <loc>${safe}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>daily</changefreq>
    <priority>0.9</priority>
  </url>`);
  });

  console.log(`Generated ${urlEntries.length} sitemap entries`);

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urlEntries.join("\n")}
</urlset>`;

  res.statusCode = 200;
  res.setHeader("Content-Type", "application/xml; charset=UTF-8");
  res.setHeader(
    "Cache-Control",
    "public, s-maxage=86400, stale-while-revalidate",
  );
  res.end(xml);
  return { props: {} };
};

export default Sitemap;
