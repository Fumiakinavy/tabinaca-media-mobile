# ✅ Phase 6 完全セットアップチェックリスト

Phase 6までを完全に動作させるための完全チェックリストです。

---

## 🎯 セットアップの流れ

```
1. データベース構築 (Supabase)
   ↓
2. 環境変数設定 (.env.local)
   ↓
3. 開発サーバー起動 (npm run dev)
   ↓
4. 動作確認テスト
   ↓
5. Phase 7へ進む
```

---

## 📋 チェックリスト

### **Phase 1: データベース構築** 🗄️

- [ ] **Supabase Dashboardにアクセス**
  - https://app.supabase.com/
  - プロジェクトを選択
  - SQL Editor を開く

- [ ] **001_ai_recommendation_system.sql を実行**
  - **📁 ファイルを開く**: [supabase/migrations/001_ai_recommendation_system.sql](../supabase/migrations/001_ai_recommendation_system.sql)
  - 全文をコピー
  - SQL Editorに貼り付け
  - **Run** をクリック
  - ✅ "Success. No rows returned" が表示される

- [ ] **002_insert_test_data.sql を実行**
  - **📁 ファイルを開く**: [supabase/migrations/002_insert_test_data.sql](../supabase/migrations/002_insert_test_data.sql)
  - 全文をコピー
  - SQL Editorに貼り付け
  - **Run** をクリック
  - ✅ "Success. No rows returned" が表示される

- [ ] **テーブルの確認**
  - Table Editor で以下が表示される:
    - ✅ user_attributes
    - ✅ activity_feedback
    - ✅ ai_suggestions
    - ✅ user_preferences
    - ✅ chatbot_conversations
    - ✅ chatbot_messages
    - ✅ conversation_context

**詳細**: `docs/vision-AIver/DATABASE_SETUP.md`

---

### **Phase 2-6: 環境変数設定** 🔑

- [ ] **`.env.local` ファイルを作成**
  - プロジェクトルートに作成
  - 以下をコピー＆ペースト:

```bash
# ============================================
# Supabase (既存)
# ============================================
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# ============================================
# OpenAI API (Phase 3)
# ============================================
OPENAI_API_KEY=sk-proj-...

# ============================================
# Google Maps API (Phase 5-6)
# ============================================
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=AIzaSy...
```

- [ ] **Supabase情報を入力**
  - Supabase Dashboard > Settings > API
  - `NEXT_PUBLIC_SUPABASE_URL` にProject URLをコピー
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY` にanon publicキーをコピー

- [ ] **OpenAI API Keyを取得**
  - https://platform.openai.com/api-keys にアクセス
  - **Create new secret key** をクリック
  - 名前: "Gappy AI Chat"
  - 生成されたキーをコピー
  - `OPENAI_API_KEY` に貼り付け

- [ ] **Google Maps API Keyを取得**
  - https://console.cloud.google.com/ にアクセス
  - 新規プロジェクト作成（または既存選択）
  - 請求先アカウント設定
  - APIs & Services > Library で有効化:
    - ✅ Maps JavaScript API
    - ✅ Places API (New)
  - Credentials > Create API Key
  - 生成されたキーをコピー
  - HTTP referrer 制限設定（開発中は `http://localhost:3000/*`）
  - `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` に貼り付け

**詳細**: `docs/vision-AIver/API_KEYS_SETUP_GUIDE.md`

---

### **開発サーバー起動** 🚀

- [ ] **依存関係のインストール（初回のみ）**
  ```bash
  npm install
  ```

- [ ] **開発サーバー起動**
  ```bash
  npm run dev
  ```

- [ ] **ブラウザでアクセス**
  - http://localhost:3000/chat
  - ページが読み込まれる
  - Console にエラーがない

---

### **動作確認テスト** 🧪

#### **Test 1: 基本チャット**
- [ ] `/chat` にアクセス
- [ ] ウェルカムメッセージが表示される（英語）
- [ ] 「Hello」と入力して送信
- [ ] AIが応答する（数秒以内）
- [ ] 会話履歴が保持される

#### **Test 2: オンボーディング（初回のみ）**
- [ ] 1秒後にオンボーディングモーダルが表示
- [ ] "Get Started" をクリック
- [ ] 5つの質問に回答
- [ ] プログレスバーが進む
- [ ] "Complete" クリックで閉じる
- [ ] Supabase `user_attributes` にデータが保存される

#### **Test 3: Places検索（Function Calling）** 🆕
- [ ] 「Show me cafes in Shibuya」と入力
- [ ] AIが「検索します」的な応答
- [ ] PlaceCardが複数表示される（2～20件）
- [ ] 各カードに以下が表示:
  - ✅ 写真
  - ✅ 店名
  - ✅ 住所
  - ✅ 評価（星）
  - ✅ レビュー数
  - ✅ 営業状態
  - ✅ ボタン

#### **Test 4: マップ連携** 🗺️
- [ ] デスクトップ: 右側にマップが表示
- [ ] マップに緑色のピンが表示される
- [ ] ピンの数 = PlaceCardの数
- [ ] マップが自動ズームして全ピンが見える
- [ ] 左上に "X places" バッジ

#### **Test 5: レスポンシブデザイン** 📱
- [ ] ブラウザ幅を狭める（モバイルサイズ）
- [ ] "Chat" と "Map" タブが表示
- [ ] タブ切り替えが動作
- [ ] デスクトップに戻すと2カラム表示

**詳細**: `docs/vision-AIver/TESTING_GUIDE.md`

---

## 🐛 トラブルシューティング

### **データベース関連**

**エラー**: `extension "uuid-ossp" does not exist`
```sql
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
```

**エラー**: `extension "vector" does not exist`
```sql
CREATE EXTENSION IF NOT EXISTS vector;
```

**エラー**: `relation "activities" does not exist`
- → 正常です！無視してください

---

### **API Key関連**

**エラー**: `OpenAI API key not configured`
- → `.env.local` に `OPENAI_API_KEY` が設定されているか確認
- → サーバーを再起動: `npm run dev`

**エラー**: `Google Maps API error: ApiNotActivatedMapError`
- → Google Cloud Console で Maps JavaScript API を有効化
- → 請求先アカウントが設定されているか確認

**エラー**: `RefererNotAllowedMapError`
- → API Key の HTTP referrer 制限を確認
- → 開発中は制限解除 or `http://localhost:3000/*` を追加

---

### **Places検索が動作しない**

**問題**: 「cafes in Shibuya」と入力してもPlaceCardが表示されない

**確認方法**:
1. DevTools Console を開く
2. 以下のログがあるか確認:
   ```
   Function call detected: {"query":"cafes in Shibuya"}
   Places API returned X results
   ```
3. ない場合:
   - OpenAI API Keyが正しいか確認
   - ネットワークタブで `/api/chat/send-message` のレスポンスを確認
   - `places` フィールドがあるか確認

---

## 📊 成功基準

以下が全て動作すれば、Phase 6完了です：

- ✅ チャットが動作する
- ✅ オンボーディングが表示される（初回のみ）
- ✅ 「cafes in Shibuya」でPlaces検索が実行される
- ✅ PlaceCardが表示される
- ✅ マップにピンが表示される
- ✅ レスポンシブデザイン（タブ切り替え）
- ✅ Console にエラーがない

---

## 🚀 次のステップ

Phase 6が完了したら：

### **Option A: Phase 7（アクティビティ自動生成）に進む**
- PlaceCardから直接アクティビティ作成
- ChatGPTで動詞始まりのタイトル生成
- Cloudinaryへ画像アップロード

### **Option B: 既存機能の改善**
- ピンのInfoWindow追加
- マップ移動での自動検索
- 会話のDB保存
- パフォーマンス最適化

---

## 📚 ドキュメント一覧

| ドキュメント | 内容 |
|-------------|------|
| `QUICK_SQL_GUIDE.md` | SQL実行の最速ガイド |
| `DATABASE_SETUP.md` | データベース構築の詳細手順 |
| `API_KEYS_SETUP_GUIDE.md` | APIキー取得・設定の完全ガイド |
| `TESTING_GUIDE.md` | 詳細なテストケースとトラブルシューティング |
| `PHASE_1-6_CHECKLIST.md` | Phase 1-6の機能別チェックリスト |
| `PHASE_6_COMPLETION.md` | Phase 6の技術詳細と完了報告 |

---

## 📞 サポート

問題が解決しない場合、以下の情報を含めて報告してください：

1. **エラーメッセージ**（Console / ターミナル）
2. **再現手順**
3. **環境情報**:
   - Node.jsバージョン: `node -v`
   - npmバージョン: `npm -v`
   - ブラウザ: Chrome / Safari / Firefox

---

**Phase 6のセットアップを楽しんでください！** 🎉

問題があればいつでも質問してください！

