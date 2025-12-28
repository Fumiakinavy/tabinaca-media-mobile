# Phase 1-6 Implementation Checklist ✅

このドキュメントは、Phase 1-6の実装が正しく動作するかを確認するためのチェックリストです。

---

## 🎯 Phase 1-6 の実装内容

```
✅ Phase 1: データベース構築
✅ Phase 2: チャットUI  
✅ Phase 3: OpenAI API統合
✅ Phase 4: 会話型オンボーディング
✅ Phase 5: Google Places API統合
✅ Phase 6: インタラクティブマップ
```

---

## 📋 動作確認チェックリスト

### **準備: API Keys設定**

- [ ] `.env.local` ファイル作成
- [ ] `NEXT_PUBLIC_SUPABASE_URL` 設定
- [ ] `NEXT_PUBLIC_SUPABASE_ANON_KEY` 設定
- [ ] `OPENAI_API_KEY` 設定（新規）
- [ ] `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` 設定（新規）
- [ ] 開発サーバー再起動 (`npm run dev`)

参考: `docs/vision-AIver/API_KEYS_SETUP_GUIDE.md`

---

### **Phase 1: データベース構築** ✅

#### Supabaseでの確認:

- [ ] Supabase Dashboard にログイン
- [ ] SQL Editor で以下を実行:
  ```sql
  -- テーブル存在確認
  SELECT table_name FROM information_schema.tables 
  WHERE table_schema = 'public' 
  AND table_name IN (
    'user_attributes',
    'activity_feedback',
    'ai_suggestions',
    'user_preferences',
    'chatbot_conversations',
    'chatbot_messages',
    'conversation_context'
  );
  ```
- [ ] 7つのテーブルが全て表示される
- [ ] Table Editor で `user_attributes` を開く
- [ ] テストデータ（3件）が入っている

#### エラーがある場合:

```bash
# 再度マイグレーション実行
cd supabase/migrations
# 001と002のSQLを Supabase Dashboard > SQL Editor で実行
```

---

### **Phase 2: チャットUI** ✅

#### ブラウザでの確認:

- [ ] http://localhost:3000/chat にアクセス
- [ ] ✅ ヘッダーが表示される（緑色、"AI Chat" リンクあり）
- [ ] ✅ 2カラムレイアウト（デスクトップ）
  - 左: チャットエリア
  - 右: マップエリア
- [ ] ✅ モバイル表示（ブラウザ幅を狭める）
  - タブ切り替え（Chat / Map）が表示
- [ ] ✅ ウェルカムメッセージが英語で表示
- [ ] ✅ 入力欄に "Type your message..." プレースホルダー
- [ ] ✅ フッターが表示される

#### スタイリング確認:

- [ ] ✅ 緑色がブランドカラー（ボタン、リンクなど）
- [ ] ✅ 絵文字が使われていない
- [ ] ✅ 全て英語表記

---

### **Phase 3: OpenAI API統合** ✅

#### 動作確認:

1. [ ] チャットに「Hello」と入力して送信
2. [ ] ✅ ローディングインジケーター表示
3. [ ] ✅ AIからの返信が表示される
4. [ ] ✅ 会話履歴が保持される（続けて質問できる）

#### エラーがある場合:

**エラー**: `OpenAI API key not configured`
- → `.env.local` に `OPENAI_API_KEY` が設定されているか確認
- → サーバーを再起動 (`npm run dev`)

**エラー**: `Failed to fetch` or `Network error`
- → DevTools Console でエラー詳細を確認
- → `/pages/api/chat/send-message.ts` のログを確認

#### APIレスポンステスト:

```bash
# ターミナルで直接APIを叩く
curl -X POST http://localhost:3000/api/chat/send-message \
  -H "Content-Type: application/json" \
  -d '{
    "message": "Hello",
    "conversationHistory": []
  }'

# 期待される結果: {"response":"Hello! Welcome..."}
```

---

### **Phase 4: 会話型オンボーディング** ✅

#### 初回訪問時:

1. [ ] `/chat` に初めてアクセス
2. [ ] ✅ 1秒後にオンボーディングモーダルが表示
3. [ ] ✅ イントロ画面が表示
   - "Welcome to Gappy AI"
   - "Get Started" ボタン
   - "Skip for now" リンク
4. [ ] "Get Started" をクリック
5. [ ] ✅ 5つの質問が順番に表示:
   - Where are you from?
   - What's your age range?
   - What's your travel style?
   - How long is your trip?
   - What's your budget level?
6. [ ] ✅ プログレスバーが進む（1/5 → 5/5）
7. [ ] ✅ 最後に "Complete" ボタン
8. [ ] "Complete" クリック後、モーダルが閉じる

#### データ保存確認:

- [ ] Supabase Dashboard > Table Editor > `user_attributes`
- [ ] 新しいレコードが追加されている
- [ ] `country_code` が "US", "JP" などに変換されている
- [ ] `onboarding_completed_at` にタイムスタンプ

#### 2回目以降:

- [ ] `/chat` にアクセス
- [ ] ✅ オンボーディングが表示されない（localStorage に記録）

#### LocalStorageの確認:

```javascript
// DevTools Console で実行
localStorage.getItem('gappy_user_id'); // "user_xxxxx" が返る
localStorage.getItem('onboarding_completed_user_xxxxx'); // "true" が返る
```

#### オンボーディングをリセット:

```javascript
// DevTools Console で実行
localStorage.clear();
location.reload();
```

---

### **Phase 5: Google Places API統合** ✅

#### Places検索API テスト:

```bash
# ターミナルで直接APIを叩く
curl "http://localhost:3000/api/places/search?query=coffee+shibuya"

# 期待される結果: {"results": [...]} (カフェのリスト)
```

#### チャットからの検索（現状は手動トリガー必要）:

**注意**: 現在、チャットメッセージからPlaces検索を自動トリガーする機能は未実装です。
Phase 6完了後、以下の機能を追加する必要があります：

1. [ ] ChatGPTが「場所検索が必要」と判断
2. [ ] `/api/places/search` を呼び出し
3. [ ] 検索結果を `places` として返す
4. [ ] チャットにPlaceCardが表示される

#### PlaceCard表示テスト（手動）:

現状、PlaceCardを表示するには、`/pages/api/chat/send-message.ts` を一時的に修正する必要があります：

```typescript
// TEST用: 固定でPlaces結果を返す
const data = {
  response: "Here are some cafes in Shibuya:",
  places: [
    {
      place_id: "ChIJ...",
      name: "Blue Bottle Coffee",
      formatted_address: "Shibuya, Tokyo",
      rating: 4.5,
      user_ratings_total: 100,
      // ...
    }
  ]
};
```

---

### **Phase 6: インタラクティブマップ** ✅

#### マップ表示確認:

1. [ ] `/chat` にアクセス
2. [ ] ✅ 右側（デスクトップ）にGoogle Mapが表示
3. [ ] ✅ 東京（デフォルト位置）が中心
4. [ ] ✅ ズーム・パン操作が可能

#### エラーがある場合:

**エラー**: `Google Maps JavaScript API error: ApiNotActivatedMapError`
- → Google Cloud Console で **Maps JavaScript API** を有効化
- → 請求先アカウント設定を確認

**エラー**: `RefererNotAllowedMapError`
- → API Key の HTTP referrer 制限を確認
- → 開発中は制限を解除 or `http://localhost:3000/*` を追加

**エラー**: マップが灰色のまま
- → DevTools Console でエラーを確認
- → `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` が設定されているか確認
- → サーバーを再起動

#### マップ＋Places連携テスト（手動）:

現状、Places検索結果をマップに表示するには、チャットから検索を実行し、結果が `places` として返される必要があります。

**TODO**: `/api/chat/send-message.ts` に以下のロジックを追加:
1. ユーザーメッセージから場所検索クエリを抽出
2. `/api/places/search` を呼び出し
3. 結果を `places` として返す
4. マップに自動的にピンが表示される

---

## 🔧 現在の不足機能と改善点

### **Phase 3-6 の統合部分が未完成**

以下の機能が実装されていません：

#### 1. **チャット → Places検索の自動連携**
現状:
- ❌ ユーザーが「渋谷のカフェ」と入力しても、Places検索が実行されない
- ❌ ChatGPTは場所の情報を知らない（一般知識のみ）

必要な実装:
- [ ] `/api/chat/send-message.ts` でユーザーメッセージを解析
- [ ] ChatGPTに「場所検索が必要か？」を判断させる
- [ ] 必要な場合、`/api/places/search` を呼び出し
- [ ] Places結果を含めてレスポンス返す

#### 2. **Places検索結果のマップ表示**
現状:
- ✅ マップコンポーネントは実装済み
- ✅ Places結果があればマップに表示される
- ❌ ただし、Places結果を取得する流れが未完成

必要な実装:
- [ ] チャットでPlaces検索が実行される
- [ ] 結果が `places` として返される
- [ ] `ChatInterface` が `onPlacesUpdate` を呼び出す
- [ ] マップに緑色のピンが表示される

#### 3. **チャットでのPlaceCard表示**
現状:
- ✅ `PlaceCard` コンポーネントは実装済み
- ✅ `ChatMessage` で `places` があれば表示される
- ❌ ただし、Places結果が返されていない

必要な実装:
- 上記1の実装により自動的に動作

---

## 🎯 Phase 6完成のための追加実装

### **実装タスク: チャット→Places検索連携**

#### ファイル: `/pages/api/chat/send-message.ts`

```typescript
// 修正が必要な部分:
// 1. ユーザーメッセージから場所検索が必要か判断
// 2. 必要な場合、Places APIを呼び出し
// 3. 結果を含めてレスポンス

const chatCompletion = await openai.chat.completions.create({
  model: 'gpt-4o-mini',
  messages: conversationMessages,
  // Function Calling で Places検索をトリガー
  tools: [
    {
      type: "function",
      function: {
        name: "search_places",
        description: "Search for places using Google Places API",
        parameters: {
          type: "object",
          properties: {
            query: { type: "string", description: "Search query" },
          },
          required: ["query"],
        },
      },
    },
  ],
});

// Function Callingの結果を処理
if (chatCompletion.choices[0].message.tool_calls) {
  const toolCall = chatCompletion.choices[0].message.tool_calls[0];
  if (toolCall.function.name === "search_places") {
    const args = JSON.parse(toolCall.function.arguments);
    const placesResponse = await fetch(
      `http://localhost:3000/api/places/search?query=${encodeURIComponent(args.query)}`
    );
    const placesData = await placesResponse.json();
    
    return res.status(200).json({
      response: chatCompletion.choices[0].message.content,
      places: placesData.results,
    });
  }
}
```

---

## ✅ 完了条件（Phase 6まで完全に動作）

以下の操作が全てエラーなく動作すれば、Phase 6完了です：

### **エンドツーエンドテスト**

1. [ ] `/chat` にアクセス
2. [ ] オンボーディングを完了（初回のみ）
3. [ ] チャットに「Show me cafes in Shibuya」と入力
4. [ ] ✅ AIが「場所を検索します」と応答
5. [ ] ✅ PlaceCardがチャット内に表示（カフェのリスト）
6. [ ] ✅ マップに緑色のピンが表示される
7. [ ] ✅ ピンをクリックすると場所名が表示される
8. [ ] ✅ モバイルビュー（タブ切り替え）が動作
9. [ ] Supabaseに会話データが保存される

### **パフォーマンステスト**

- [ ] ページロード時間 < 3秒
- [ ] チャット応答時間 < 5秒
- [ ] マップ表示 < 2秒
- [ ] Console にエラーがない

---

## 🚀 次のステップ

### **今すぐやること:**

1. **APIキーを設定** (`docs/vision-AIver/API_KEYS_SETUP_GUIDE.md` を参照)
2. **開発サーバー起動**: `npm run dev`
3. **このチェックリストに沿って動作確認**
4. **エラーがあれば報告** → 一緒に修正します

### **動作確認後:**

- ✅ 全て動作 → **Phase 7** へ進む
- ❌ エラーあり → 一緒に修正・改善

---

## 📝 テスト用データ

### **チャットで試すメッセージ例:**

```
1. "Hello, I'm looking for something fun to do in Tokyo"
2. "Show me popular cafes in Shibuya"
3. "I want to experience traditional culture"
4. "What's good for nightlife?"
5. "Find restaurants near Shinjuku station"
```

### **期待される動作:**

- 一般的な質問 → ChatGPTが回答
- 場所検索が必要 → Places APIを呼び出し → カード表示 → マップにピン

---

**このチェックリストを使って、Phase 6までの実装をしっかり確認してください！** ✅

不明点やエラーがあればいつでも質問してください！

