# 🗄️ データベース構築手順（Phase 1）

このガイドに従って、Supabaseでデータベースを構築してください。

---

## 📋 概要

Phase 1で作成するテーブル：
- ✅ `user_attributes` - ユーザー属性（国籍、年齢、旅行スタイル）
- ✅ `activity_feedback` - いいね・スキップ・予約データ
- ✅ `ai_suggestions` - AI提案履歴
- ✅ `user_preferences` - 学習済みユーザープリファレンス
- ✅ `chatbot_conversations` - チャット会話
- ✅ `chatbot_messages` - チャットメッセージ
- ✅ `conversation_context` - 会話コンテキスト

作成されるビュー：
- ✅ `cohort_activity_preferences` - コホート分析用

---

## 🚀 実行手順

### **Step 1: Supabase Dashboardにアクセス**

1. ブラウザで https://app.supabase.com/ を開く
2. プロジェクトを選択
3. 左サイドバーの **SQL Editor** をクリック

または直接アクセス：
```
https://supabase.com/dashboard/project/YOUR_PROJECT_ID/sql
```

---

### **Step 2: 新しいクエリを作成**

SQL Editorで：
1. 右上の **+ New query** ボタンをクリック
2. クエリ名を入力（例: "Phase 1 - AI System Tables"）

---

### **Step 3: SQLファイルの内容をコピー**

#### **3-1. メインテーブルの作成**

**📁 ファイルを開く**: [supabase/migrations/001_ai_recommendation_system.sql](../supabase/migrations/001_ai_recommendation_system.sql)

**このファイルの内容を全てコピーしてください**（404行）

---

### **Step 4: SQLを実行**

1. Supabase SQL Editorにコピーした内容を貼り付け
2. 右下の **Run** ボタンをクリック（または Cmd/Ctrl + Enter）
3. 実行完了まで待つ（約5-10秒）

**成功メッセージ**:
```
Success. No rows returned
```

**エラーが出た場合**: 後述の「トラブルシューティング」を参照

---

### **Step 5: テーブルの作成を確認**

左サイドバーの **Table Editor** をクリック

以下のテーブルが表示されることを確認：
- ✅ user_attributes
- ✅ activity_feedback
- ✅ ai_suggestions
- ✅ user_preferences
- ✅ chatbot_conversations
- ✅ chatbot_messages
- ✅ conversation_context

**確認方法（SQL）**:
```sql
-- SQL Editorで実行
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name IN (
    'user_attributes',
    'activity_feedback',
    'ai_suggestions',
    'user_preferences',
    'chatbot_conversations',
    'chatbot_messages',
    'conversation_context'
  )
ORDER BY table_name;
```

**期待される結果**: 7行（7つのテーブル名）

---

### **Step 6: テストデータの投入（開発環境のみ）**

#### **6-1. テストデータファイルをコピー**

**📁 ファイルを開く**: [supabase/migrations/002_insert_test_data.sql](../supabase/migrations/002_insert_test_data.sql)

**このファイルの内容を全てコピーしてください**

#### **6-2. 新しいクエリを作成**

1. SQL Editorで **+ New query** をクリック
2. クエリ名: "Phase 1 - Test Data"
3. コピーした内容を貼り付け
4. **Run** をクリック

**成功メッセージ**:
```
Success. No rows returned
```

⚠️ **注意**: 本番環境では実行しないでください！

---

### **Step 7: データの確認**

#### **7-1. テーブルデータを確認**

**Table Editor** で各テーブルをクリックして、データが入っているか確認：

**user_attributes**:
- 3行（テストユーザー3人分）
- 列: country_code, age_range, travel_style など

**activity_feedback**:
- 複数行（いいね/スキップのテストデータ）

**chatbot_conversations**:
- 3行（テスト会話3つ）

#### **7-2. SQLでデータ確認**

```sql
-- ユーザー属性の確認
SELECT 
  country_code, 
  age_range, 
  travel_style, 
  onboarding_completed,
  created_at
FROM user_attributes
ORDER BY created_at DESC;
```

**期待される結果**:
```
country_code | age_range | travel_style | onboarding_completed
-------------|-----------|--------------|---------------------
US           | 20s       | solo         | true
CN           | 30s       | couple       | true
UK           | 40s       | family       | true
```

```sql
-- フィードバック集計
SELECT 
  action_type, 
  COUNT(*) as count 
FROM activity_feedback 
GROUP BY action_type;
```

**期待される結果**:
```
action_type | count
------------|------
like        | X
skip        | X
```

---

## ✅ 完了確認チェックリスト

Phase 1のデータベース構築が完了したか確認してください：

### **必須項目**:
- [ ] `001_ai_recommendation_system.sql` を実行した
- [ ] `002_insert_test_data.sql` を実行した（開発環境のみ）
- [ ] Table Editorで7つのテーブルが表示される
- [ ] `user_attributes` にテストデータが3件ある
- [ ] `activity_feedback` にデータがある
- [ ] エラーが出ていない

### **確認SQL**:
```sql
-- 全テーブルの存在確認
SELECT 
  table_name,
  (SELECT COUNT(*) FROM information_schema.columns 
   WHERE table_name = t.table_name AND table_schema = 'public') as column_count
FROM information_schema.tables t
WHERE table_schema = 'public' 
  AND table_name IN (
    'user_attributes',
    'activity_feedback',
    'ai_suggestions',
    'user_preferences',
    'chatbot_conversations',
    'chatbot_messages',
    'conversation_context'
  )
ORDER BY table_name;
```

**期待される結果**: 7行（各テーブルとそのカラム数）

---

## 🛠️ トラブルシューティング

### **エラー1: `extension "uuid-ossp" does not exist`**

**原因**: UUID生成拡張機能が無効

**解決方法**:
```sql
-- SQL Editorで実行
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
```

その後、再度 `001_ai_recommendation_system.sql` を実行

---

### **エラー2: `relation "auth.users" does not exist`**

**原因**: Supabase Authが無効化されている（稀）

**解決方法**:
1. Supabase Dashboard > Authentication > Settings
2. "Enable email signups" がONになっているか確認
3. または、`user_id UUID REFERENCES auth.users(id)` の部分を一時的に削除

---

### **エラー3: `extension "vector" does not exist`**

**原因**: pgvector拡張機能が無効（Embeddings用）

**解決方法**:
```sql
-- SQL Editorで実行
CREATE EXTENSION IF NOT EXISTS vector;
```

その後、再度 `001_ai_recommendation_system.sql` を実行

⚠️ **注意**: pgvectorはSupabaseの一部プランで利用可能です。Freeプランでも利用できますが、有効化が必要な場合があります。

---

### **エラー4: `permission denied for schema public`**

**原因**: 権限不足（稀）

**解決方法**:
Supabase Dashboardで作業している場合、通常この問題は起きません。
Supabase CLIを使っている場合は、`--db-url` オプションで正しい接続文字列を指定してください。

---

### **エラー5: テストデータ投入時に `relation "activities" does not exist`**

**原因**: `activities` テーブルがまだ作成されていない（正常）

**これは問題ありません！**  
`002_insert_test_data.sql` の一部（`activity_feedback` への `activity_id` の挿入）がスキップされますが、テストデータの主要部分は正常に投入されます。

**確認方法**:
```sql
SELECT COUNT(*) FROM user_attributes;
-- 3が返ればOK
```

---

### **問題が解決しない場合**

以下の情報をコピーして報告してください：

```sql
-- デバッグ情報の取得
SELECT 
  'PostgreSQL Version' as info, 
  version() as value
UNION ALL
SELECT 
  'Tables Count',
  COUNT(*)::text
FROM information_schema.tables 
WHERE table_schema = 'public'
UNION ALL
SELECT 
  'Extensions',
  string_agg(extname, ', ')
FROM pg_extension;
```

---

## 📊 データベーススキーマ図

```
┌─────────────────────┐
│  user_attributes    │
│  - id (PK)          │
│  - country_code     │
│  - age_range        │
│  - travel_style     │
│  - interests        │
└──────────┬──────────┘
           │ 1
           │
           │ N
┌──────────┴──────────┐
│ activity_feedback   │
│  - id (PK)          │
│  - user_id (FK)     │
│  - activity_id      │
│  - action_type      │
│  - created_at       │
└──────────┬──────────┘
           │
           │
┌──────────┴──────────┐
│ user_preferences    │
│  - id (PK)          │
│  - user_id (FK)     │
│  - embedding        │ ← Phase 10で使用
│  - updated_at       │
└─────────────────────┘

┌─────────────────────┐
│chatbot_conversations│
│  - id (PK)          │
│  - user_id (FK)     │
│  - status           │
│  - started_at       │
└──────────┬──────────┘
           │ 1
           │
           │ N
┌──────────┴──────────┐
│ chatbot_messages    │
│  - id (PK)          │
│  - conversation_id  │
│  - role             │
│  - content          │
│  - created_at       │
└─────────────────────┘
```

---

## 🔍 テーブル詳細

### **user_attributes**
**目的**: ユーザーの基本属性を保存（オンボーディングで収集）

**主要カラム**:
- `country_code`: 国コード（US, JP, CN など）
- `age_range`: 年齢層（'20s', '30s' など）
- `travel_style`: 旅行スタイル（'solo', 'couple', 'family'）
- `interests`: 興味（JSON形式、会話から推定）

**使用フェーズ**: Phase 4, 10, 11

---

### **activity_feedback**
**目的**: ユーザーのアクティビティへのフィードバックを記録

**主要カラム**:
- `user_id`: ユーザーID
- `activity_id`: アクティビティID（既存のactivitiesテーブルを参照）
- `action_type`: アクション（'like', 'skip', 'bookmark', 'book'）
- `created_at`: 実行日時

**使用フェーズ**: Phase 9, 10（学習データとして使用）

---

### **user_preferences**
**目的**: 学習済みのユーザープリファレンスを保存

**主要カラム**:
- `user_id`: ユーザーID
- `preference_embedding`: ベクトル表現（pgvector型、1536次元）
- `like_count`: いいね数
- `last_activity_at`: 最終アクティビティ日時

**使用フェーズ**: Phase 10, 12（パーソナライズレコメンド）

---

### **chatbot_conversations**
**目的**: チャット会話のセッションを管理

**主要カラム**:
- `user_id`: ユーザーID
- `status`: ステータス（'active', 'completed', 'abandoned'）
- `conversation_type`: 会話タイプ（'onboarding', 'search', 'general'）
- `metadata`: メタデータ（JSON形式）

**使用フェーズ**: Phase 3以降（会話履歴保存）

---

### **chatbot_messages**
**目的**: チャットメッセージを保存

**主要カラム**:
- `conversation_id`: 会話ID（外部キー）
- `role`: 役割（'user', 'assistant', 'system'）
- `content`: メッセージ内容
- `metadata`: メタデータ（Places結果など）

**使用フェーズ**: Phase 3以降

---

## 🎯 次のステップ

データベース構築が完了したら：

1. **APIキーを設定**  
   → `docs/vision-AIver/API_KEYS_SETUP_GUIDE.md`

2. **開発サーバーを起動**  
   ```bash
   npm run dev
   ```

3. **動作確認**  
   → `docs/vision-AIver/TESTING_GUIDE.md`

---

## 📚 関連ドキュメント

- `supabase/migrations/README.md` - マイグレーション概要
- `docs/vision-AIver/05_LEARNING_RECOMMENDATION_ENGINE.md` - 学習システム詳細
- `docs/vision-AIver/PHASE_1-6_CHECKLIST.md` - 全体チェックリスト

---

**Phase 1のデータベース構築を楽しんでください！** 🎉

問題があればいつでも質問してください！

