# Activities SQL Generator

既存リポジトリの `content/activities/**/*.mdx` から frontmatter を読み取り、`public.activities` テーブルへの UPSERT SQL を生成する Node/TypeScript スクリプトです。

## 🚀 使用方法

### 基本実行

```bash
# SQLファイルを生成
npm run generate:activities

# または直接実行
npx ts-node --esm tools/generate-activity-sql.ts
```

### Dry-run モード（SQLを標準出力のみ）

```bash
# SQLをファイルに書き出さず、標準出力に表示
npm run generate:activities:dry

# または直接実行
npx ts-node --esm tools/generate-activity-sql.ts --dry-run
```

### オプション

```bash
# 最初の N 件のみ処理（大規模リポジトリ対策）
npx ts-node --esm tools/generate-activity-sql.ts --limit 10

# ヘルプ表示
npx ts-node --esm tools/generate-activity-sql.ts --help
```

## 📋 処理対象フィールド

### 必須フィールド

- **`title`**: アクティビティのタイトル（必須、空の場合はエラー）

### 自動生成・正規化フィールド

- **`slug`**: frontmatter の `slug` を優先、無ければファイル名から生成
  - kebab-case に正規化（小文字、英数字とハイフンのみ）
- **`duration`**: 様々な表記を分単位の整数に正規化
  - 対応形式: `60`, `60 minutes`, `90 min`, `1h`, `1h30m`, `1時間30分`, `約60分` など
- **`location`**: 任意フィールド、未指定なら空文字
- **`is_active`**: デフォルト `true`、`isActive: false` の場合のみ `false`

### その他のフィールド

`price`, `language`, `tags`, `vendor` などはログに表示されますが、SQL には含まれません。

## 📄 出力 SQL の形式

- ファイル: `scripts/seed_activities.sql`
- 再実行可能な UPSERT 形式（`ON CONFLICT (slug) DO UPDATE`）
- レコードは slug の昇順でソート（決定的な出力）
- 文字列は適切にエスケープ（`'` → `''`、改行・タブはスペースに正規化）

### 出力例

```sql
begin;
insert into public.activities (slug, title, duration_minutes, location, is_active) values
  ('kimono-experience-shibuya','Kimono Dressing Experience (Shibuya)',60,'Shibuya, Tokyo',true),
  ('sushi-workshop','寿司づくり体験',90,'浅草',true)
on conflict (slug) do update set
  title=excluded.title,
  duration_minutes=excluded.duration_minutes,
  location=excluded.location,
  is_active=excluded.is_active;
commit;
```

## ⚠️ エラーハンドリング

### 必須フィールド欠落
- `title` が空の場合、赤色でエラーメッセージを表示し、該当ファイルを処理から除外

### slug 重複
- 重複する slug が検出された場合、エラーメッセージと該当ファイル一覧を表示してプロセス終了

### duration 解析失敗
- パースできない duration 形式の場合、警告を表示して 60 分にフォールバック

## 📊 サンプル frontmatter

```yaml
---
slug: kimono-experience-shibuya
title: Kimono Dressing Experience (Shibuya)
duration: "60 minutes"
location: "Shibuya, Tokyo"
price: "¥5,000"
language: "English, Japanese"
tags: ["culture", "traditional", "photo"]
---
```

```yaml
---
title: 寿司づくり体験
duration: "1時間30分"
location: "浅草"
isActive: true
---
```

## 🛠 依存関係

以下のパッケージが `devDependencies` に追加されています：

- `gray-matter`: MDX frontmatter の解析
- `globby`: ファイル検索
- `ts-node`: TypeScript の実行

## 🗄️ データベーススキーマ

生成される SQL は以下のテーブル構造を前提としています：

```sql
CREATE TABLE public.activities (
  id SERIAL PRIMARY KEY,
  slug VARCHAR UNIQUE NOT NULL,
  title VARCHAR NOT NULL,
  duration_minutes INTEGER NOT NULL,
  location VARCHAR NOT NULL DEFAULT '',
  is_active BOOLEAN NOT NULL DEFAULT true
);
```

## 🧪 テスト

サンプルファイルが `content/activities/_samples/` に用意されており、様々な duration 形式や edge case をテストできます。

```bash
# サンプルファイルでテスト
npm run generate:activities:dry
```
