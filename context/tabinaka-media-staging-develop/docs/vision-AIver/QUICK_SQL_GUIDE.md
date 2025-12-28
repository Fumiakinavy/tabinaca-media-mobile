# ⚡ SQL実行クイックガイド

最速でデータベースを構築する手順です。

---

## 🎯 5分で完了する手順

### **Step 1: Supabase SQL Editorを開く**

https://app.supabase.com/ → プロジェクト選択 → **SQL Editor**

---

### **Step 2: 001のSQLを実行**

1. **+ New query** をクリック
2. **📁 ファイルを開く**: [supabase/migrations/001_ai_recommendation_system.sql](../supabase/migrations/001_ai_recommendation_system.sql)
3. 内容を**全てコピー**
4. SQL Editorに**貼り付け**
5. **Run** をクリック（または Cmd/Ctrl + Enter）
6. ✅ "Success. No rows returned" が表示される

---

### **Step 3: 002のSQLを実行（テストデータ）**

1. **+ New query** をクリック
2. **📁 ファイルを開く**: [supabase/migrations/002_insert_test_data.sql](../supabase/migrations/002_insert_test_data.sql)
3. 内容を**全てコピー**
4. SQL Editorに**貼り付け**
5. **Run** をクリック
6. ✅ "Success. No rows returned" が表示される

---

### **Step 4: 確認**

左サイドバーの **Table Editor** をクリック

以下が表示されればOK：
- ✅ user_attributes
- ✅ activity_feedback
- ✅ ai_suggestions
- ✅ user_preferences
- ✅ chatbot_conversations
- ✅ chatbot_messages
- ✅ conversation_context

---

## 🔍 1行で確認するSQL

```sql
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('user_attributes', 'activity_feedback', 'ai_suggestions', 
                   'user_preferences', 'chatbot_conversations', 'chatbot_messages', 
                   'conversation_context')
ORDER BY table_name;
```

**期待される結果**: 7行（7つのテーブル名）

---

## 🚨 エラーが出た場合

### **`extension "uuid-ossp" does not exist`**

**解決策**:
```sql
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
```
実行後、再度 001 を実行

---

### **`extension "vector" does not exist`**

**解決策**:
```sql
CREATE EXTENSION IF NOT EXISTS vector;
```
実行後、再度 001 を実行

---

### **`relation "activities" does not exist`**

**これは正常です！**  
`activities` テーブルは別途存在するため、テストデータの一部がスキップされるだけです。

**確認方法**:
```sql
SELECT COUNT(*) FROM user_attributes;
```
3が返ればOK

---

## ✅ 完了後の次のステップ

1. **APIキーを設定**  
   `.env.local` ファイルを作成:
   ```bash
   NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
   OPENAI_API_KEY=sk-proj-...
   NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=AIza...
   ```

2. **開発サーバー起動**
   ```bash
   npm run dev
   ```

3. **動作確認**
   http://localhost:3000/chat にアクセス

---

## 📚 詳細ガイド

もっと詳しい説明が必要な場合:
- `docs/vision-AIver/DATABASE_SETUP.md` - 詳細な手順書
- `docs/vision-AIver/API_KEYS_SETUP_GUIDE.md` - APIキー設定
- `docs/vision-AIver/TESTING_GUIDE.md` - 動作確認

---

**これで準備完了です！** 🎉

