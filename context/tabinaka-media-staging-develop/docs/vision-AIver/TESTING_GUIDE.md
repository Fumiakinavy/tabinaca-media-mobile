# Phase 6 Testing Guide 🧪

Phase 6までの実装が完了しました。このガイドに沿って動作確認を行ってください。

---

## 🚀 セットアップ

### 1. 環境変数の設定

`.env.local` ファイルを作成し、以下を設定してください：

```bash
# Supabase (既存)
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# OpenAI API (Phase 3)
OPENAI_API_KEY=sk-proj-...

# Google Maps API (Phase 5-6)
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=AIzaSy...
```

詳細: `docs/vision-AIver/API_KEYS_SETUP_GUIDE.md`

### 2. 開発サーバーの起動

```bash
npm run dev
```

ブラウザで http://localhost:3000/chat を開く

---

## ✅ テストケース

### **Test 1: 基本チャット動作**

#### 操作:
1. `/chat` にアクセス
2. 「Hello」と入力して送信

#### 期待される結果:
- ✅ AIが応答する（数秒以内）
- ✅ メッセージが会話履歴に表示される
- ✅ エラーが表示されない

#### 確認方法:
- DevTools Console を開く
- エラーメッセージがないか確認
- ネットワークタブで `/api/chat/send-message` のレスポンスを確認

---

### **Test 2: Places検索（Function Calling）** 🆕

#### 操作:
1. チャットに以下のいずれかを入力:
   ```
   "Show me cafes in Shibuya"
   "Find good restaurants in Shinjuku"
   "I want to visit temples in Asakusa"
   "Where can I find ramen near Tokyo Station?"
   ```

#### 期待される結果:
- ✅ AIが「検索します」的な応答をする
- ✅ チャット内にPlaceCardが複数表示される（2～20件程度）
- ✅ 各PlaceCardに以下が表示:
  - 写真
  - 店名
  - 住所
  - 評価（星）
  - レビュー数
  - 価格レベル
  - 営業状態（Open now / Closed）
  - "View on Maps" ボタン
  - "Details" ボタン

#### 確認方法:
```javascript
// DevTools Console で確認
// ネットワークタブ → send-message のレスポンスに "places" が含まれている
```

#### もし動作しない場合:
1. DevTools Console でエラーを確認
2. `send-message` APIのログを確認:
   ```
   Function call detected: {"query":"cafes in Shibuya"}
   Places API returned X results
   ```
3. Google Places API Keyが正しく設定されているか確認

---

### **Test 3: マップ連携** 🗺️

#### 操作:
1. Test 2を実行（Places検索）
2. デスクトップの場合: 右側のマップを確認
3. モバイルの場合: "Map" タブをクリック

#### 期待される結果:
- ✅ マップに緑色のピンが表示される（検索結果の数だけ）
- ✅ マップが自動的にズームして全てのピンが見える
- ✅ ピンをクリックすると場所名が表示される（予定）
- ✅ 左上に "X places" バッジが表示される

#### 確認方法:
- マップが灰色のままでないか
- Console に Google Maps エラーがないか
- ピンが正しい位置に表示されているか

---

### **Test 4: レスポンシブデザイン** 📱

#### 操作:
1. ブラウザ幅を狭める（モバイルサイズに）
2. "Chat" と "Map" のタブが表示されることを確認
3. タブを切り替える

#### 期待される結果:
- ✅ タブ切り替えボタンが表示される
- ✅ "Chat" タブ: チャットのみ表示
- ✅ "Map" タブ: マップのみ表示
- ✅ Map タブに "Map (X)" と件数が表示される
- ✅ デスクトップに戻すと2カラム表示になる

---

### **Test 5: オンボーディング（初回訪問）** 🎯

#### 操作:
1. LocalStorageをクリア:
   ```javascript
   // DevTools Console
   localStorage.clear();
   location.reload();
   ```
2. 1秒待つ

#### 期待される結果:
- ✅ オンボーディングモーダルが表示される
- ✅ "Welcome to Gappy AI" イントロ画面
- ✅ "Get Started" をクリック
- ✅ 5つの質問が順番に表示:
  1. Where are you from? (テキスト入力)
  2. What's your age range? (セレクトボックス)
  3. What's your travel style? (セレクトボックス)
  4. How long is your trip? (セレクトボックス)
  5. What's your budget level? (セレクトボックス)
- ✅ プログレスバーが進む（1/5 → 5/5）
- ✅ 全て回答後、"Complete" ボタン
- ✅ Complete後、モーダルが閉じる
- ✅ 2回目以降は表示されない

#### データ保存確認:
- Supabase Dashboard > Table Editor > `user_attributes`
- 新しいレコードが追加されている
- `country_code` が自動判定されている（"US", "JP" など）

---

### **Test 6: 会話の継続性** 💬

#### 操作:
1. 「Hello」と送信
2. 「What did I just say?」と送信

#### 期待される結果:
- ✅ AIが「You said "Hello"」的な応答をする
- ✅ 会話履歴が保持されている

---

### **Test 7: エラーハンドリング** 🚨

#### Test 7a: API Key未設定

操作:
1. `.env.local` から `OPENAI_API_KEY` を削除
2. サーバー再起動
3. メッセージ送信

期待される結果:
- ✅ エラーメッセージが表示される
- ✅ アプリがクラッシュしない

#### Test 7b: Places検索失敗

操作:
1. ネットワークを切断
2. Places検索を実行

期待される結果:
- ✅ エラーメッセージが表示される
- ✅ 「I'm having trouble searching...」的なメッセージ
- ✅ チャットは継続可能

---

## 🎨 視覚的チェックリスト

### デザイン確認:

- [ ] ✅ 緑色がブランドカラー（ボタン、リンク、ピン）
- [ ] ✅ 絵文字が使われていない
- [ ] ✅ 全てのテキストが英語
- [ ] ✅ ヘッダーとフッターが統一されている
- [ ] ✅ タイポグラフィが読みやすい
- [ ] ✅ ホバーエフェクトが滑らか
- [ ] ✅ アニメーションが自然

### レイアウト確認:

- [ ] ✅ デスクトップ: 2カラム（チャット50% + マップ50%）
- [ ] ✅ タブレット: 2カラム維持
- [ ] ✅ モバイル: タブ切り替え
- [ ] ✅ ヘッダー固定（スクロールしても見える）
- [ ] ✅ フッターが最下部

---

## 📊 パフォーマンスチェック

### 速度:

- [ ] ページロード < 3秒
- [ ] チャット応答 < 5秒（OpenAI API）
- [ ] Places検索 < 3秒（Function Calling含む）
- [ ] マップ表示 < 2秒

### 確認方法:

```javascript
// DevTools > Network タブ
// Throttling を "Fast 3G" に設定してテスト
```

---

## 🐛 既知の制限事項

### 現在実装されていない機能:

1. **ピンのInfoWindow**
   - ピンをクリックしても詳細ポップアップは表示されない
   - Phase 7で実装予定

2. **マップ移動での自動検索**
   - マップをドラッグしても新しい場所は検索されない
   - `onMapMove` は呼ばれるが、検索はトリガーされない

3. **会話のDB保存**
   - 会話履歴はクライアント側メモリのみ
   - Supabase `chatbot_conversations` テーブルへの保存は未実装

4. **PlaceCardからアクティビティ生成**
   - Phase 7で実装予定

---

## 🔧 トラブルシューティング

### 問題: マップが灰色のまま

**原因**: Google Maps API Key未設定 or 制限エラー

**解決策**:
1. `.env.local` に `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` が設定されているか確認
2. Google Cloud Console > APIs & Services > Credentials でキーを確認
3. HTTP referrer 制限を確認（開発中は制限解除推奨）
4. 請求先アカウントが設定されているか確認

### 問題: Places検索が実行されない

**原因**: Function Calling が動作していない

**解決策**:
1. DevTools Console を開く
2. 以下のログが出ているか確認:
   ```
   Function call detected: {"query":"..."}
   Places API returned X results
   ```
3. 出ていない場合:
   - OpenAI API Keyが正しいか確認
   - モデルが `gpt-4o-mini` か確認（`gpt-3.5-turbo` はFunction Calling非対応）
   - メッセージが明確な場所検索クエリか確認

### 問題: PlaceCardが表示されない

**原因**: レスポンスに `places` が含まれていない

**解決策**:
1. DevTools > Network > `send-message` のレスポンスを確認
2. `places` フィールドがあるか確認
3. ない場合、Places API検索が失敗している可能性
4. `/api/places/search` を直接叩いてテスト:
   ```bash
   curl "http://localhost:3000/api/places/search?query=cafes+shibuya"
   ```

### 問題: オンボーディングが表示されない

**原因**: LocalStorageに完了フラグがある

**解決策**:
```javascript
// DevTools Console
localStorage.clear();
location.reload();
```

---

## ✅ 成功基準

以下が全て動作すれば、Phase 6完了です：

### 必須項目:

- [x] ✅ チャットが動作する
- [x] ✅ 「cafes in Shibuya」でPlaces検索が実行される
- [x] ✅ PlaceCardが表示される
- [x] ✅ マップにピンが表示される
- [x] ✅ オンボーディングが動作する
- [x] ✅ レスポンシブデザイン（タブ切り替え）
- [x] ✅ エラーハンドリングが適切

### 推奨項目:

- [ ] Console にエラーがない
- [ ] パフォーマンスが良好
- [ ] モバイルで快適に操作できる
- [ ] 全てのテストケースをクリア

---

## 🚀 次のステップ

Phase 6が完了したら、**Phase 7: アクティビティ自動生成** に進みます。

Phase 7では：
- PlaceCardに "Create Activity" ボタン追加
- ChatGPTで動詞始まりのタイトル生成
- MDX形式でアクティビティ作成
- Cloudinaryへ画像アップロード

---

## 📝 テスト結果の報告

テストを実行したら、以下の形式で報告してください：

```
## テスト結果

### 成功したテスト:
- ✅ Test 1: 基本チャット動作
- ✅ Test 2: Places検索

### 失敗したテスト:
- ❌ Test 3: マップ連携
  - エラー: "ApiNotActivatedMapError"
  - 原因: Maps JavaScript API未有効化
  - 対応: Google Cloud Consoleで有効化

### スクリーンショット:
（任意）チャット画面、マップ表示、PlaceCardなど
```

---

**Phase 6のテストを楽しんでください！** 🎉

問題があればいつでも質問してください！

