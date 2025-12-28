#!/usr/bin/env tsx

import { globby } from "globby";
import matter from "gray-matter";
import fs from "fs/promises";
import path from "path";

// 内部モデル型定義
interface Activity {
  slug: string;
  title: string;
  duration_minutes: number;
  location: string;
  is_active: boolean;
  originalFile: string; // デバッグ用
}

interface ParsedFrontmatter {
  slug?: string;
  title?: string;
  duration?: string | number;
  location?: string;
  isActive?: boolean;
  [key: string]: any; // その他のフィールド
}

// コマンドライン引数の解析
interface CliArgs {
  dryRun: boolean;
  limit?: number;
  help: boolean;
}

function parseArgs(): CliArgs {
  const args = process.argv.slice(2);
  const result: CliArgs = {
    dryRun: false,
    help: false,
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    switch (arg) {
      case "--dry-run":
        result.dryRun = true;
        break;
      case "--limit":
        const limitValue = parseInt(args[++i], 10);
        if (isNaN(limitValue) || limitValue <= 0) {
          console.error("❌ --limit には正の整数を指定してください");
          process.exit(1);
        }
        result.limit = limitValue;
        break;
      case "--help":
      case "-h":
        result.help = true;
        break;
      default:
        console.error(`❌ 不明なオプション: ${arg}`);
        process.exit(1);
    }
  }

  return result;
}

function showHelp(): void {
  console.log(`
Usage: pnpm tsx tools/generate-activity-sql.ts [options]

Options:
  --dry-run     SQLを標準出力に表示のみ（ファイルは書かない）
  --limit N     最初のN件だけ処理
  --help, -h    このヘルプを表示

Examples:
  pnpm tsx tools/generate-activity-sql.ts --dry-run
  pnpm tsx tools/generate-activity-sql.ts --limit 5
  pnpm tsx tools/generate-activity-sql.ts
`);
}

// slug生成・正規化関数
function generateSlug(input: string): string {
  return (
    input
      // 全角英数字を半角に変換
      .replace(/[Ａ-Ｚａ-ｚ０-９]/g, (char) => {
        return String.fromCharCode(char.charCodeAt(0) - 0xfee0);
      })
      // スペースをハイフンに変換
      .replace(/\s+/g, "-")
      // 小文字化
      .toLowerCase()
      // 英数字とハイフン以外を削除
      .replace(/[^a-z0-9-]/g, "")
      // 連続ハイフンを1つに統合
      .replace(/-+/g, "-")
      // 先頭末尾のハイフンを除去
      .replace(/^-+|-+$/g, "")
  );
}

// duration正規化関数
function normalizeDuration(durationInput: string | number): number {
  if (typeof durationInput === "number") {
    return durationInput;
  }

  const duration = String(durationInput).trim();

  // 各パターンの正規表現
  const patterns = [
    // 1h30m, 2h15m などの形式
    {
      regex: /(\d+)h\s*(\d+)m/i,
      handler: (match: RegExpMatchArray) =>
        parseInt(match[1]) * 60 + parseInt(match[2]),
    },
    // 1時間30分 などの形式
    {
      regex: /(\d+)時間\s*(\d+)分/,
      handler: (match: RegExpMatchArray) =>
        parseInt(match[1]) * 60 + parseInt(match[2]),
    },
    // 1h, 2hr, 3時間 などの形式（時間のみ）
    {
      regex: /(\d+)(?:h|hr|時間)/i,
      handler: (match: RegExpMatchArray) => parseInt(match[1]) * 60,
    },
    // 60 minutes, 90分 などの形式（分のみ）- スペースを含む
    {
      regex: /(\d+)\s*(?:min|minutes?|分)/i,
      handler: (match: RegExpMatchArray) => parseInt(match[1]),
    },
    // 数値のみ（分として扱う）
    {
      regex: /^(\d+)$/,
      handler: (match: RegExpMatchArray) => parseInt(match[1]),
    },
  ];

  // 「約」などの前置詞を除去
  const cleanDuration = duration.replace(/^(約|およそ|だいたい)\s*/i, "");

  for (const pattern of patterns) {
    const match = cleanDuration.match(pattern.regex);
    if (match) {
      const result = pattern.handler(match);
      if (result > 0) {
        return result;
      }
    }
  }

  // パースできない場合は警告を出して60分にフォールバック
  console.warn(
    `⚠️  duration "${durationInput}" を解析できませんでした。60分にフォールバックします。`,
  );
  return 60;
}

// SQLエスケープ関数
function escapeSqlString(str: string): string {
  return (
    str
      // 単一引用符をエスケープ
      .replace(/'/g, "''")
      // 改行・タブをスペースに正規化
      .replace(/[\n\r\t]+/g, " ")
      // 連続スペースを1つに統合
      .replace(/\s+/g, " ")
      .trim()
  );
}

// MDXファイルの解析
async function parseMdxFile(filePath: string): Promise<Activity | null> {
  try {
    const content = await fs.readFile(filePath, "utf-8");
    const { data } = matter(content) as { data: ParsedFrontmatter };

    // title必須チェック
    if (
      !data.title ||
      typeof data.title !== "string" ||
      data.title.trim() === ""
    ) {
      console.error(`❌ ${filePath}: title フィールドが必須です`);
      return null;
    }

    // slug生成
    let slug: string;
    if (data.slug && typeof data.slug === "string" && data.slug.trim() !== "") {
      slug = generateSlug(data.slug.trim());
    } else {
      const basename = path.basename(filePath, ".mdx");
      slug = generateSlug(basename);
    }

    // duration正規化
    const duration_minutes = data.duration
      ? normalizeDuration(data.duration)
      : 60;

    // location処理 - address フィールドを優先、次に locationFromStation
    let location = "";
    if (typeof data.address === "string" && data.address.trim() !== "") {
      location = data.address.trim();
    } else if (
      typeof data.locationFromStation === "string" &&
      data.locationFromStation.trim() !== ""
    ) {
      location = data.locationFromStation.trim();
    } else if (
      typeof data.location === "string" &&
      data.location.trim() !== ""
    ) {
      location = data.location.trim();
    }

    // is_active処理
    const is_active = data.isActive !== false; // デフォルトtrue、明示的にfalseの場合のみfalse

    // その他のフィールドをログ出力（任意フィールド）
    const otherFields = Object.keys(data).filter(
      (key) =>
        !["slug", "title", "duration", "location", "isActive"].includes(key),
    );
    if (otherFields.length > 0) {
      console.log(
        `📋 ${path.basename(filePath)}: その他のフィールド - ${otherFields.join(", ")}`,
      );
    }

    return {
      slug,
      title: data.title.trim(),
      duration_minutes,
      location,
      is_active,
      originalFile: filePath,
    };
  } catch (error) {
    console.error(`❌ ${filePath} の解析中にエラー:`, error);
    return null;
  }
}

// 重複チェック
function checkDuplicateSlugs(activities: Activity[]): void {
  const slugMap = new Map<string, string[]>();

  activities.forEach((activity) => {
    if (!slugMap.has(activity.slug)) {
      slugMap.set(activity.slug, []);
    }
    slugMap.get(activity.slug)!.push(activity.originalFile);
  });

  const duplicates = Array.from(slugMap.entries()).filter(
    ([_, files]) => files.length > 1,
  );

  if (duplicates.length > 0) {
    console.error("❌ slug の重複が検出されました:");
    duplicates.forEach(([slug, files]) => {
      console.error(`  - slug "${slug}": ${files.join(", ")}`);
    });
    process.exit(1);
  }
}

// SQL生成
function generateSql(activities: Activity[]): string {
  if (activities.length === 0) {
    return "begin;\n-- No activities found\ncommit;\n";
  }

  // slug昇順でソート（決定的な出力）
  const sortedActivities = [...activities].sort((a, b) =>
    a.slug.localeCompare(b.slug),
  );

  const values = sortedActivities
    .map((activity) => {
      const slug = escapeSqlString(activity.slug);
      const title = escapeSqlString(activity.title);
      const location = escapeSqlString(activity.location);

      return `  ('${slug}','${title}',${activity.duration_minutes},'${location}',${activity.is_active})`;
    })
    .join(",\n");

  return `begin;
insert into public.activities (slug, title, duration_minutes, location, is_active) values
${values}
on conflict (slug) do update set
  title=excluded.title,
  duration_minutes=excluded.duration_minutes,
  location=excluded.location,
  is_active=excluded.is_active;
commit;
`;
}

// メイン処理
async function main(): Promise<void> {
  const args = parseArgs();

  if (args.help) {
    showHelp();
    return;
  }

  console.log("🚀 MDX ファイルから activities SQL を生成開始...\n");

  try {
    // MDXファイルを検索
    const mdxFiles = await globby("content/experiences/**/*.mdx", {
      absolute: true,
      ignore: ["**/node_modules/**", "**/_template.mdx"],
    });

    if (mdxFiles.length === 0) {
      console.warn(
        "⚠️  content/experiences/**/*.mdx にファイルが見つかりませんでした",
      );
      return;
    }

    console.log(`📁 ${mdxFiles.length} 個のMDXファイルを発見`);

    // limit適用
    const filesToProcess = args.limit
      ? mdxFiles.slice(0, args.limit)
      : mdxFiles;
    if (args.limit) {
      console.log(
        `🔢 --limit ${args.limit} により ${filesToProcess.length} 件を処理`,
      );
    }

    // 各ファイルを解析
    const activities: Activity[] = [];
    for (const filePath of filesToProcess) {
      const activity = await parseMdxFile(filePath);
      if (activity) {
        activities.push(activity);
      }
    }

    console.log(`\n✅ ${activities.length} 件のアクティビティを解析完了`);

    if (activities.length === 0) {
      console.warn("⚠️  有効なアクティビティが見つかりませんでした");
      return;
    }

    // 重複チェック
    checkDuplicateSlugs(activities);

    // SQL生成
    const sql = generateSql(activities);

    // 出力
    if (args.dryRun) {
      console.log("\n📄 生成されたSQL (--dry-run):\n");
      console.log(sql);
    } else {
      const outputPath = "scripts/seed_activities.sql";
      await fs.writeFile(outputPath, sql, "utf-8");
      console.log(`\n💾 SQL を ${outputPath} に保存しました`);
    }

    // サマリ表示
    console.log(`\n📊 処理サマリ:`);
    console.log(`  - 処理ファイル数: ${filesToProcess.length}`);
    console.log(`  - 有効アクティビティ数: ${activities.length}`);
    console.log(`  - 生成SQL行数: ${sql.split("\n").length}`);
  } catch (error) {
    console.error("❌ 処理中にエラーが発生しました:", error);
    process.exit(1);
  }
}

// 実行
main().catch((error) => {
  console.error("❌ 予期しないエラー:", error);
  process.exit(1);
});
