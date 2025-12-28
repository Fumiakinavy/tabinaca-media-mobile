import fs from "fs";
import path from "path";
import matter from "gray-matter";
import { serialize } from "next-mdx-remote/serialize";
import { getExperienceStatus } from "@/config/experienceSettings";

// スラッグ正規化関数（DBと一致させる）
function normalizeSlug(filename: string): string {
  return filename
    .replace(".mdx", "")
    .trim()
    .toLowerCase()
    .replace(/[""]/g, '"') // スマートクォート→通常
    .replace(/[']/g, "'")
    .replace(/[¥]/g, "") // 円記号を削除
    .replace(/[\s_]+/g, "-") // 空白/連続アンダー→ハイフン
    .replace(/[^a-z0-9-]/g, "-") // 記号→ハイフン
    .replace(/-+/g, "-") // 連続ハイフン圧縮
    .replace(/^-|-$/g, ""); // 端のハイフン除去
}

// ファイル名キャッシュ（パフォーマンス最適化）
const fileNameCache = new Map<string, Map<string, string>>();

function buildFileCache(folder: string): Map<string, string> {
  const cache = new Map<string, string>();

  if (!fs.existsSync(folder)) {
    return cache;
  }

  const files = fs.readdirSync(folder);
  const mdxFiles = files.filter(
    (file) => file.endsWith(".mdx") && !file.startsWith("_"),
  );

  mdxFiles.forEach((file) => {
    const normalizedSlug = normalizeSlug(file);
    cache.set(normalizedSlug, file);
  });

  return cache;
}

function getSource(dir: string, slug: string, locale: string = "en") {
  // キャッシュキーを生成
  const cacheKey = `${dir}:${locale}`;

  // キャッシュがなければ構築
  if (!fileNameCache.has(cacheKey)) {
    const folder = path.join(process.cwd(), "content", dir, locale);
    fileNameCache.set(cacheKey, buildFileCache(folder));
  }

  // キャッシュから検索
  const cache = fileNameCache.get(cacheKey);
  const fileName = cache?.get(slug);

  if (fileName) {
    const fullPath = path.join(process.cwd(), "content", dir, locale, fileName);
    return fs.readFileSync(fullPath, "utf8");
  }

  // 指定言語にファイルが存在しない場合は英語にフォールバック
  if (locale !== "en") {
    const enCacheKey = `${dir}:en`;
    if (!fileNameCache.has(enCacheKey)) {
      const enFolder = path.join(process.cwd(), "content", dir, "en");
      fileNameCache.set(enCacheKey, buildFileCache(enFolder));
    }

    const enCache = fileNameCache.get(enCacheKey);
    const enFileName = enCache?.get(slug);

    if (enFileName) {
      const fullPath = path.join(
        process.cwd(),
        "content",
        dir,
        "en",
        enFileName,
      );
      return fs.readFileSync(fullPath, "utf8");
    }
  }

  // 英語にもない場合はエラーを投げる
  throw new Error(`Article not found: ${slug} in ${dir}/${locale}`);
}

// 記事タイトルから対応する画像パスを生成する関数
export function getArticleImagePath(slug: string): string | null {
  try {
    const imagesDir = path.join(process.cwd(), "public", "images", "articles");
    const files = fs.readdirSync(imagesDir);

    // 記事slug名から画像ファイルを探すマッピング
    const articleImageMap: { [key: string]: string } = {
      "how to enjoy shibuya":
        "How to Enjoy Shibuya 8 of Shibuya's Most Famous Tourist Spots for Families!.png",
      "Shibuya (Area Guide) Your Easy-to-See Map to Tokyo's Dynamic Heart":
        "Shibuya (Area Guide) Your Easy-to-See Map to Tokyo's Dynamic Heart.png",
      "Shibuya Street Style Your Ultimate Guide to Fashion, Culture, and a Perfect Day in Tokyo":
        "Shibuya Street Style Your Ultimate Guide to Fashion, Culture, and a Perfect Day in Tokyo.png",
      "Shibuya Crossing View Guide 2025":
        "Shibuya Crossing View Guide 2025 7 Best Spots (Free & Paid) to See the Scramble.png",
      "Shibuya for Beginners Your Quick Guide to Tokyo's Iconic Hub":
        "Shibuya for Beginners Your Quick Guide to Tokyos Iconic Hub.png",
      "Shibuya Station Master Guide 2025":
        "Shibuya Station Master Guide 2025 How to Navigate the Maze Like a Local.png",
      "Shibuya Survival Guide 2025 Your Ultimate Digital Concierge":
        "Shibuya Tokyo 2025 Ultimate Guide — 19 Can't-Miss Spots & Local Secrets.png",
      "The Perfect Shibuya Half-Day Tour Ultimate Itinerary for Meiji Shrine, Harajuku, & the Scramble Crossing (2025 Visual Guide with Map)":
        "The Perfect Shibuya Half-Day Tour Ultimate Itinerary for Meiji Shrine, Harajuku, & the Scramble Crossing (2025 Visual Guide with Map.png",
      "Unveiling Tokyo's Magnets":
        "Unveiling Tokyo's Magnets Why Shibuya and Shinjuku Captivate Global Traveler.png",
      "what-to-do-in-shibuya-spare-time-2025":
        "Shibuya Tokyo 2025 Ultimate Guide — 19 Can't-Miss Spots & Local Secrets.png",
      "Your Ultimate Guide to Navigating Japan's Trendsetting Heart":
        "Shibuya, Tokyo Your Ultimate Guide to Navigating Japan's Trendsetting Heart.png",
    };

    // 直接マッピングから探す
    if (articleImageMap[slug]) {
      return `/images/articles/${articleImageMap[slug]}`;
    }

    // フォールバック1: キーワードベースのマッチング
    const keywordMatches = {
      "how to enjoy":
        "How to Enjoy Shibuya 8 of Shibuya's Most Famous Tourist Spots for Families!.png",
      "street style":
        "Shibuya Street Style Your Ultimate Guide to Fashion, Culture, and a Perfect Day in Tokyo.png",
      "area guide":
        "Shibuya (Area Guide) Your Easy-to-See Map to Tokyo's Dynamic Heart.png",
      "crossing view":
        "Shibuya Crossing View Guide 2025 7 Best Spots (Free & Paid) to See the Scramble.png",
      beginners:
        "Shibuya for Beginners Your Quick Guide to Tokyos Iconic Hub.png",
      "station master":
        "Shibuya Station Master Guide 2025 How to Navigate the Maze Like a Local.png",
      "survival guide":
        "Shibuya Tokyo 2025 Ultimate Guide — 19 Can't-Miss Spots & Local Secrets.png",
      "half-day tour":
        "The Perfect Shibuya Half-Day Tour Ultimate Itinerary for Meiji Shrine, Harajuku, & the Scramble Crossing (2025 Visual Guide with Map.png",
      magnets:
        "Unveiling Tokyo's Magnets Why Shibuya and Shinjuku Captivate Global Traveler.png",
      "spare time":
        "Shibuya Tokyo 2025 Ultimate Guide — 19 Can't-Miss Spots & Local Secrets.png",
      "trendsetting heart":
        "Shibuya, Tokyo Your Ultimate Guide to Navigating Japan's Trendsetting Heart.png",
    };

    const slugLower = slug.toLowerCase();
    for (const [keyword, imageName] of Object.entries(keywordMatches)) {
      if (slugLower.includes(keyword)) {
        return `/images/articles/${imageName}`;
      }
    }

    // フォールバック2: ファイル名の部分一致で探す
    const imageFile = files.find((file) => {
      const nameWithoutExt = file.replace(/\.(png|jpg|jpeg|webp)$/i, "");
      return (
        nameWithoutExt.toLowerCase().includes(slugLower) ||
        slugLower.includes(nameWithoutExt.toLowerCase())
      );
    });

    if (imageFile) {
      return `/images/articles/${imageFile}`;
    }

    return null;
  } catch (error) {
    console.warn(`Could not find image for article: ${slug}`);
    return null;
  }
}

// 体験の画像パスを取得する関数
export function getExperienceImagePath(slug: string): string | null {
  try {
    const imagesDir = path.join(
      process.cwd(),
      "public",
      "images",
      "activities",
    );
    const files = fs.readdirSync(imagesDir);

    // スラグに一致する画像ファイルを探す
    const imageFile = files.find((file) => {
      const nameWithoutExt = file.replace(/\.(png|jpg|jpeg|webp)$/i, "");
      return (
        nameWithoutExt.toLowerCase().includes(slug.toLowerCase()) ||
        slug.toLowerCase().includes(nameWithoutExt.toLowerCase())
      );
    });

    if (imageFile) {
      return `/images/activities/${imageFile}`;
    }

    return null;
  } catch (error) {
    console.warn(`Could not find image for experience: ${slug}`);
    return null;
  }
}

export async function getAllItems(dir: string, locale: string = "en") {
  const folder = path.join(process.cwd(), "content", dir, locale);

  if (!fs.existsSync(folder)) {
    // 指定言語フォルダが存在しない場合は英語フォルダにフォールバック
    const enFolder = path.join(process.cwd(), "content", dir, "en");
    if (!fs.existsSync(enFolder)) {
      return [];
    }
    return getAllItems(dir, "en");
  }

  const files = fs.readdirSync(folder);
  const mdxFiles = files.filter((file) => file.endsWith(".mdx"));

  return mdxFiles
    .filter((file) => !file.startsWith("_")) // Skip template files
    .map((file) => {
      const filePath = path.join(folder, file);
      const source = fs.readFileSync(filePath, "utf8");
      const { data } = matter(source);
      const slug = normalizeSlug(file);

      // 記事の場合、coverImageが設定されていない場合は自動的に画像パスを設定
      if (dir === "articles" && !data.coverImage) {
        const autoImagePath = getArticleImagePath(slug);
        if (autoImagePath) {
          data.coverImage = autoImagePath;
        }
      } else if (dir === "experiences" && !data.coverImage) {
        const autoImagePath = getExperienceImagePath(slug);
        if (autoImagePath) {
          data.coverImage = autoImagePath;
        }
      }

      // experiencesの場合、undefinedの値をnullに変換してJSONシリアライゼーションエラーを防ぐ
      if (dir === "experiences") {
        const processedData = { ...data };
        if (processedData.couponCode === undefined)
          processedData.couponCode = null;
        if (processedData.discount === undefined) processedData.discount = null;
        if (processedData.price === undefined) processedData.price = null;
        if (processedData.duration === undefined) processedData.duration = null;
        if (processedData.level === undefined) processedData.level = null;
        if (processedData.location === undefined) processedData.location = null;
        if (processedData.address === undefined) processedData.address = null;
        if (processedData.date === undefined)
          processedData.date = new Date().toISOString();
        if (processedData.summary === undefined) processedData.summary = "";
        if (processedData.tags === undefined) processedData.tags = [];
        if (processedData.motivationTags === undefined)
          processedData.motivationTags = [];
        if (processedData.googlePlaceId === undefined)
          processedData.googlePlaceId = null;
        // 複数画像の処理
        if (processedData.images === undefined) processedData.images = [];
        return { ...processedData, slug };
      }

      return { ...data, slug };
    })
    .filter((item) => {
      // experiencesの場合のみ、設定ファイルに基づいてフィルタリング
      if (dir === "experiences") {
        return getExperienceStatus(item.slug);
      }
      return true; // articles等の他のタイプはすべて表示
    });
}

export async function getItemBySlug(
  dir: string,
  slug: string,
  locale: string = "en",
) {
  const source = getSource(dir, slug, locale);
  const { data, content } = matter(source);

  // 記事の場合、coverImageが設定されていない場合は自動的に画像パスを設定
  if (dir === "articles" && !data.coverImage) {
    const autoImagePath = getArticleImagePath(slug);
    if (autoImagePath) {
      data.coverImage = autoImagePath;
    }
  } else if (dir === "experiences" && !data.coverImage) {
    const autoImagePath = getExperienceImagePath(slug);
    if (autoImagePath) {
      data.coverImage = autoImagePath;
    }
  }

  const mdxSource = await serialize(content, {
    mdxOptions: {
      remarkPlugins: [],
      rehypePlugins: [],
    },
    parseFrontmatter: false, // frontmatterは既にgray-matterで処理済み
  });
  return { content: mdxSource, frontMatter: data };
}

export async function getAllSlugs(
  dir: string,
  locale: string = "en",
): Promise<string[]> {
  const folder = path.join(process.cwd(), "content", dir, locale);

  if (!fs.existsSync(folder)) {
    // 指定言語フォルダが存在しない場合は英語フォルダにフォールバック
    const enFolder = path.join(process.cwd(), "content", dir, "en");
    if (!fs.existsSync(enFolder)) {
      return [];
    }
    return getAllSlugs(dir, "en");
  }

  const slugs = fs
    .readdirSync(folder)
    .filter((file) => file.endsWith(".mdx") && !file.startsWith("_"))
    .map((file) => normalizeSlug(file));

  // experiencesの場合のみ、設定ファイルに基づいてフィルタリング
  if (dir === "experiences") {
    return slugs.filter((slug) => getExperienceStatus(slug));
  }

  return slugs;
}

// 利用可能な言語を取得する関数
export function getAvailableLocales(dir: string): string[] {
  const contentDir = path.join(process.cwd(), "content", dir);

  if (!fs.existsSync(contentDir)) {
    return ["en"];
  }

  return fs
    .readdirSync(contentDir, { withFileTypes: true })
    .filter((dirent) => dirent.isDirectory())
    .map((dirent) => dirent.name);
}

// 特定の記事が指定言語で利用可能かチェックする関数
export function isArticleAvailableInLocale(
  dir: string,
  slug: string,
  locale: string,
): boolean {
  const filePath = path.join(
    process.cwd(),
    "content",
    dir,
    locale,
    `${slug}.mdx`,
  );
  return fs.existsSync(filePath);
}
