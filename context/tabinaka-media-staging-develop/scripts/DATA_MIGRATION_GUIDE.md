# データ移行ガイド: develop → main

## 概要

develop環境からmain環境にデータをコピーする際のガイドです。

## コピーすべきデータ（マスターデータ/参照データ）

### ✅ コピー推奨

1. **`activities`** - 体験データ
   - 体験のマスターデータ
   - 本番環境でも同じ体験データが必要

2. **`quiz_forms`** - クイズフォーム定義
   - クイズの質問・選択肢の定義
   - アプリケーションの動作に必要

### ⚠️ 条件付きでコピー

- **設定データ**: 必要に応じて
- **初期データ**: 必要に応じて

## コピーすべきでないデータ（ユーザーデータ/運用データ）

### ❌ コピーしない

以下のテーブルは**個人情報やユーザー固有のデータ**を含むため、コピーしないでください：

1. **`accounts`** - ユーザーアカウント
2. **`account_linkages`** - 認証情報（SupabaseユーザーIDとの紐付け）
3. **`account_metadata`** - ユーザーメタデータ
4. **`account_utm_attributions`** - UTMトラッキングデータ
5. **`chat_sessions`** - チャットセッション
6. **`chat_messages`** - チャットメッセージ
7. **`chat_session_summaries`** - チャットサマリー
8. **`quiz_sessions`** - クイズセッション
9. **`quiz_results`** - クイズ結果
10. **`quiz_answers`** - クイズ回答
11. **`activity_interactions`** - ユーザーのいいね・ブックマーク等
12. **`form_submissions`** - フォーム送信データ
13. **`reviews`** - レビュー
14. **`generated_activities`** - 生成された体験
15. **`generated_activity_saves`** - 保存された体験
16. **`search_queries`** - 検索クエリ
17. **`user_behavior_events`** - ユーザー行動イベント
18. **`business_metrics_events`** - ビジネスメトリクス
19. **`session_replay_events`** - セッションリプレイ

## 実行手順

### Step 1: develop環境からデータをエクスポート

```bash
# develop環境に接続
psql "postgresql://postgres.oqsaxmixaglwjugyqknk:[PASSWORD]@aws-1-ap-northeast-1.pooler.supabase.com:5432/postgres"

# エクスポート実行
\copy (SELECT * FROM public.activities ORDER BY created_at) TO 'activities.csv' WITH CSV HEADER;
\copy (SELECT * FROM public.quiz_forms ORDER BY created_at) TO 'quiz_forms.csv' WITH CSV HEADER;
```

### Step 2: main環境にデータをインポート

```bash
# main環境に接続
psql "postgresql://postgres.[MAIN_PROJECT_REF]:[PASSWORD]@aws-1-ap-northeast-1.pooler.supabase.com:5432/postgres"

# インポート実行
\copy public.activities FROM 'activities.csv' WITH CSV HEADER;
\copy public.quiz_forms FROM 'quiz_forms.csv' WITH CSV HEADER;
```

### Step 3: 確認

```sql
-- インポートされたデータ数を確認
SELECT COUNT(*) as activities_count FROM public.activities;
SELECT COUNT(*) as quiz_forms_count FROM public.quiz_forms;
```

## 注意事項

1. **IDの競合**: 既存データがある場合、UUIDの競合に注意
2. **外部キー制約**: 依存関係があるデータは順序に注意
3. **バックアップ**: インポート前に必ずmain環境のバックアップを取得
4. **個人情報**: ユーザーデータは絶対にコピーしない

## トラブルシューティング

### ID競合エラー

```sql
-- 既存データを確認
SELECT id FROM public.activities WHERE id IN (SELECT id FROM imported_data);

-- 必要に応じて既存データを削除（注意！）
-- DELETE FROM public.activities WHERE id IN (...);
```

### 外部キー制約エラー

依存関係を確認し、正しい順序でインポートしてください。







