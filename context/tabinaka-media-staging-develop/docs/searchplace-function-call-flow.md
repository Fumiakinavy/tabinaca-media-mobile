# searchplace実行時の関数呼び出しフロー（時系列）

ユーザーがメッセージを送信してsearchplaceを実行し、カードがレスポンスされるまでの全ての関数呼び出しを時系列で記載します。

## フロー概要

1. **フロントエンド（ChatInterface）**: メッセージ送信処理
2. **API（send-message.ts）**: リクエスト受信と処理
3. **プロンプト構築**: コンテキスト生成
4. **OpenAI API**: 関数呼び出し判定
5. **FunctionExecutor**: 関数実行
6. **searchPlaces**: Google Places API呼び出し
7. **レスポンス処理**: 結果の整形と返却
8. **フロントエンド**: カード表示

---

## 詳細な関数呼び出しフロー

### 1. フロントエンド: メッセージ送信開始

#### 1.1 `ChatInterface.handleSendMessage` (components/ChatInterface.tsx:876)
- **呼び出し元**: ユーザーがメッセージを入力して送信
- **処理内容**:
  - ユーザーメッセージをstateに追加
  - プレースホルダーメッセージを作成
  - `displayedCards`を収集・マージ

#### 1.2 `ChatInterface.buildInitialStatusUpdates` (components/ChatInterface.tsx:907)
- **呼び出し元**: `handleSendMessage`内
- **処理内容**: ステータス更新の初期化

#### 1.3 `fetch("/api/chat/send-message?stream=true")` (components/ChatInterface.tsx:983)
- **呼び出し元**: `handleSendMessage`内
- **処理内容**: APIエンドポイントへのリクエスト送信
- **リクエストボディ**:
  - `message`: ユーザーメッセージ
  - `conversationHistory`: 会話履歴
  - `currentLocation`: 現在位置
  - `displayedCards`: 表示済みカード
  - `quizResults`: クイズ結果

---

### 2. API: リクエスト受信と検証

#### 2.1 `handler` (pages/api/chat/send-message.ts:214)
- **呼び出し元**: Next.js API Route Handler
- **処理内容**: POSTリクエストの受信

#### 2.2 `verifyAccountToken` (lib/accountToken.ts)
- **呼び出し元**: `handler`内 (line 245)
- **処理内容**: アカウントトークンの検証

#### 2.3 `supabaseServer.auth.getUser` (lib/supabaseServer.ts)
- **呼び出し元**: `handler`内 (line 270-271)
- **処理内容**: Supabase認証トークンの検証

#### 2.4 `chatLogger.getOrCreateSession` (lib/chatLogger.ts)
- **呼び出し元**: `handler`内 (line 318)
- **処理内容**: チャットセッションの取得または作成

#### 2.5 `chatLogger.logUserMessage` (lib/chatLogger.ts)
- **呼び出し元**: `handler`内 (line 330)
- **処理内容**: ユーザーメッセージのログ記録

---

### 3. プロンプトコンテキスト構築

#### 3.1 `buildPromptContext` (lib/promptContext.ts:98)
- **呼び出し元**: `handler`内 (line 356)
- **処理内容**: プロンプトコンテキストの構築開始

#### 3.2 `sanitizeConversationHistory` (lib/promptContext.ts:71)
- **呼び出し元**: `buildPromptContext`内 (line 106)
- **処理内容**: 会話履歴のサニタイズ

#### 3.3 `buildConversationContext` (lib/conversationMemory.ts)
- **呼び出し元**: `buildPromptContext`内 (line 107-108)
- **処理内容**: 会話コンテキストの構築（要約と最近のメッセージ）

#### 3.4 `classifyIntent` (lib/promptContext.ts:44)
- **呼び出し元**: `buildPromptContext`内 (line 110)
- **処理内容**: ユーザー意図の分類（inspiration/specific/details/clarify）

#### 3.5 `resolveBaseSystemPrompt` (lib/promptContext.ts:91)
- **呼び出し元**: `buildPromptContext`内 (line 123)
- **処理内容**: ベースシステムプロンプトの解決

#### 3.6 `getSystemPromptForTravelType` (lib/travelTypeMapping.ts)
- **呼び出し元**: `resolveBaseSystemPrompt`内 (line 95)
- **処理内容**: トラベルタイプに応じたシステムプロンプト取得

#### 3.7 `generateDynamicContextInfo` (lib/flexibleSystemPrompt.ts:122)
- **呼び出し元**: `buildPromptContext`内 (line 126)
- **処理内容**: 動的コンテキスト情報の生成
  - 表示済みカード情報
  - 位置情報コンテキスト
  - クイズ結果情報
  - ホーム期間設定

---

### 4. キャッシュチェック

#### 4.1 `generateCacheKey.chatResponse` (lib/cache.ts:90)
- **呼び出し元**: `handler`内 (line 378)
- **処理内容**: チャットレスポンス用キャッシュキーの生成

#### 4.2 `apiCache.get` (lib/cache.ts:28)
- **呼び出し元**: `handler`内 (line 390)
- **処理内容**: キャッシュからのレスポンス取得（推奨クエリ以外の場合）

---

### 5. OpenAI API呼び出し準備

#### 5.1 `FUNCTION_DEFINITIONS.map` (pages/api/chat/send-message.ts:413)
- **呼び出し元**: `handler`内
- **処理内容**: 関数定義をOpenAI形式に変換

#### 5.2 `FunctionExecutor.getInstance` (lib/functionRegistry.ts:603)
- **呼び出し元**: `handler`内 (line 428)
- **処理内容**: FunctionExecutorのシングルトンインスタンス取得

#### 5.3 `functionExecutor.setCurrentLocation` (lib/functionRegistry.ts:610)
- **呼び出し元**: `handler`内 (line 442)
- **処理内容**: 現在位置の設定（検索用）

---

### 6. OpenAI API呼び出し（ツール呼び出し判定）

#### 6.1 `openai.chat.completions.create` (pages/api/chat/send-message.ts:492)
- **呼び出し元**: `handler`内（whileループ内）
- **処理内容**: OpenAI APIへのリクエスト送信
  - `model`: "gpt-4o-mini"
  - `messages`: プロンプトメッセージ
  - `tools`: 関数定義
  - `tool_choice`: "auto"
  - `stream`: false（ツール呼び出し時）

#### 6.2 OpenAI API内部処理
- **処理内容**: 
  - メッセージ解析
  - 関数呼び出しの必要性判定
  - `search_places`関数の呼び出し決定

---

### 7. ツールコール処理

#### 7.1 `response.tool_calls.map` (pages/api/chat/send-message.ts:517)
- **呼び出し元**: `handler`内（ツールコールがある場合）
- **処理内容**: 各ツールコールを並列処理

#### 7.2 `JSON.parse(rawArgs)` (pages/api/chat/send-message.ts:527)
- **呼び出し元**: ツールコール処理内
- **処理内容**: 関数引数のパース

#### 7.3 `functionExecutor.executeFunction` (lib/functionRegistry.ts:614)
- **呼び出し元**: `handler`内 (line 549)
- **引数**: 
  - `functionName`: "search_places"
  - `parameters`: 検索パラメータ

---

### 8. search_places関数実行

#### 8.1 `FunctionExecutor.handleSearchPlaces` (lib/functionRegistry.ts:628)
- **呼び出し元**: `executeFunction`内 (line 620)
- **処理内容**: 
  - パラメータの検証と正規化
  - 位置情報の取得（パラメータまたはcurrentLocationから）
  - 半径の決定（デフォルト500m）

#### 8.2 `searchPlaces` (lib/functionRegistry.ts:292)
- **呼び出し元**: `handleSearchPlaces`内 (line 671)
- **処理内容**: 場所検索の実行開始

#### 8.3 `generateCacheKey.placesSearch` (lib/cache.ts:72)
- **呼び出し元**: `searchPlaces`内 (line 301)
- **処理内容**: 場所検索用キャッシュキーの生成

#### 8.4 `apiCache.get<SearchPlaceResult>` (lib/cache.ts:28)
- **呼び出し元**: `searchPlaces`内 (line 311)
- **処理内容**: キャッシュからの検索結果取得

#### 8.5 `assertApiKey` (lib/functionRegistry.ts:182)
- **呼び出し元**: `searchPlaces`内 (line 317)
- **処理内容**: Google Places APIキーの検証

#### 8.6 `buildSearchParams` (lib/functionRegistry.ts:190)
- **呼び出し元**: `searchPlaces`内 (line 318)
- **処理内容**: Google Places APIリクエストパラメータの構築
  - APIキー
  - クエリ文字列
  - 位置情報（lat, lng）
  - 半径（radiusMeters）
  - 言語・地域設定

#### 8.7 `fetch(GOOGLE_PLACES_TEXT_SEARCH_ENDPOINT)` (lib/functionRegistry.ts:327)
- **呼び出し元**: `searchPlaces`内
- **処理内容**: Google Places Text Search APIへのHTTPリクエスト
  - タイムアウト: 10秒（AbortController使用）
  - エンドポイント: `https://maps.googleapis.com/maps/api/place/textsearch/json`

#### 8.8 Google Places API内部処理
- **処理内容**: 
  - テキスト検索の実行
  - 位置情報と半径に基づくフィルタリング
  - 結果の返却

#### 8.9 `response.json()` (lib/functionRegistry.ts:343)
- **呼び出し元**: `searchPlaces`内
- **処理内容**: APIレスポンスのJSONパース

#### 8.10 `rawResults.slice(0, 20).map(mapPlace)` (lib/functionRegistry.ts:377-379)
- **呼び出し元**: `searchPlaces`内
- **処理内容**: 
  - 結果を最大20件に制限
  - 各結果を`PlaceSummary`形式にマッピング

#### 8.11 `mapPlace` (lib/functionRegistry.ts:245)
- **呼び出し元**: `searchPlaces`内（map関数内）
- **処理内容**: 
  - 写真情報の抽出（最初の1枚のみ）
  - 距離計算（`calculateDistance`呼び出し）

#### 8.12 `calculateDistance` (lib/functionRegistry.ts:225)
- **呼び出し元**: `mapPlace`内 (line 268)
- **処理内容**: ユーザー位置と場所の距離計算（Haversine formula）

#### 8.13 `apiCache.set` (lib/cache.ts:12)
- **呼び出し元**: `searchPlaces`内 (line 391)
- **処理内容**: 検索結果をキャッシュに保存

#### 8.14 `handleSearchPlaces`の戻り値 (lib/functionRegistry.ts:685)
- **処理内容**: `{ success: true, data: result }`を返却

---

### 9. ツールコール結果の処理

#### 9.1 `chatLogger.logToolCall` (lib/chatLogger.ts)
- **呼び出し元**: `handler`内 (line 557)
- **処理内容**: ツールコールのログ記録

#### 9.2 `functionName === "search_places"` 分岐 (pages/api/chat/send-message.ts:602)
- **呼び出し元**: `handler`内（ツールコール結果処理）
- **処理内容**: 
  - 検索結果の取得
  - `places`配列へのマージ（重複排除）

#### 9.3 `messages.push({ role: "tool", ... })` (pages/api/chat/send-message.ts:666)
- **呼び出し元**: `handler`内
- **処理内容**: ツールコール結果をメッセージ履歴に追加

---

### 10. 最終レスポンス生成

#### 10.1 `openai.chat.completions.create` (streaming) (pages/api/chat/send-message.ts:683)
- **呼び出し元**: `handler`内（ツールコールなしの場合、または最終レスポンス生成時）
- **処理内容**: 
  - ストリーミング有効でOpenAI API呼び出し
  - レスポンスをチャンクごとに受信

#### 10.2 `addAffiliateExperiencesToPlaces` (pages/api/chat/send-message.ts:33)
- **呼び出し元**: `handler`内 (line 877)
- **処理内容**: 
  - 場所に基づいてGetYourGuideアフィリエイト体験を追加
  - 最低1個のアフィリエイトを必ず含める

#### 10.3 `getAffiliateExperiencesByLocation` (config/experienceSettings.ts)
- **呼び出し元**: `addAffiliateExperiencesToPlaces`内 (line 46, 50, 56)
- **処理内容**: 場所に基づくアフィリエイト体験の取得

#### 10.4 SSEストリーミング送信 (pages/api/chat/send-message.ts:699-756)
- **呼び出し元**: `handler`内
- **処理内容**: 
  - `res.write`でコンテンツチャンクを送信
  - メタデータ（places, functionResults, updatedCards）を送信
  - `res.end()`でストリーム終了

#### 10.5 `chatLogger.logAssistantMessage` (lib/chatLogger.ts)
- **呼び出し元**: `handler`内 (line 787)
- **処理内容**: アシスタントメッセージのログ記録

#### 10.6 `chatLogger.updateSessionMetrics` (lib/chatLogger.ts)
- **呼び出し元**: `handler`内 (line 802)
- **処理内容**: セッションメトリクスの更新

#### 10.7 `chatLogger.setTitleIfEmpty` (lib/chatLogger.ts)
- **呼び出し元**: `handler`内 (line 825)
- **処理内容**: セッションタイトルの設定（未設定の場合）

---

### 11. フロントエンド: レスポンス受信と処理

#### 11.1 `response.body.getReader()` (components/ChatInterface.tsx:1076)
- **呼び出し元**: `handleSendMessage`内（ストリーミングレスポンスの場合）
- **処理内容**: ストリームリーダーの取得

#### 11.2 `reader.read()` (components/ChatInterface.tsx:1081)
- **呼び出し元**: `handleSendMessage`内（whileループ内）
- **処理内容**: ストリームチャンクの読み取り

#### 11.3 `JSON.parse(jsonStr)` (components/ChatInterface.tsx:1092)
- **呼び出し元**: `handleSendMessage`内
- **処理内容**: SSEイベントのJSONパース

#### 11.4 `event.type === "content"` 処理 (components/ChatInterface.tsx:1094)
- **呼び出し元**: `handleSendMessage`内
- **処理内容**: 
  - コンテンツチャンクの蓄積
  - メッセージのリアルタイム更新

#### 11.5 `event.type === "metadata"` 処理 (components/ChatInterface.tsx:1110)
- **呼び出し元**: `handleSendMessage`内
- **処理内容**: 
  - places, functionResults, updatedCardsの取得
  - データオブジェクトへの保存

#### 11.6 `setMessages` (components/ChatInterface.tsx:1192)
- **呼び出し元**: `handleSendMessage`内
- **処理内容**: 
  - 最終メッセージの更新
  - places配列の設定
  - isLoading: falseに設定

#### 11.7 `setDisplayedCards` (components/ChatInterface.tsx:1222)
- **呼び出し元**: `handleSendMessage`内（updatedCardsがある場合）
- **処理内容**: 
  - updatedCardsと既存カードのマージ
  - 新しいカードの追加

#### 11.8 `onPlacesUpdate` (components/ChatInterface.tsx:1270)
- **呼び出し元**: `handleSendMessage`内
- **処理内容**: 親コンポーネントへのplaces更新通知

---

### 12. カード表示

#### 12.1 `ChatMessage` コンポーネントのレンダリング (components/ChatMessage.tsx)
- **呼び出し元**: Reactのレンダリングサイクル
- **処理内容**: メッセージとplacesの表示

#### 12.2 `places.map((place, index) => ...)` (components/ChatMessage.tsx:302)
- **呼び出し元**: `ChatMessage`コンポーネント内
- **処理内容**: 各場所をカードとしてレンダリング

#### 12.3 `PlaceCard` コンポーネントのレンダリング (components/PlaceCard.tsx:236)
- **呼び出し元**: `ChatMessage`内
- **処理内容**: 個別の場所カードの表示

#### 12.4 `useEffect` (components/PlaceCard.tsx:248)
- **呼び出し元**: `PlaceCard`コンポーネント内
- **処理内容**: 写真幅の計算とリサイズイベントリスナーの設定

#### 12.5 `useMemo` (components/PlaceCard.tsx:272)
- **呼び出し元**: `PlaceCard`コンポーネント内
- **処理内容**: 写真URLの生成
  - アフィリエイト画像の優先使用
  - Google Places Photo API URLの生成

#### 12.6 `getPlacePhotoUrl` (lib/placesHelpers.ts)
- **呼び出し元**: `PlaceCard`内（useMemo内）
- **処理内容**: Google Places Photo API URLの生成

#### 12.7 `getCategoryFromTypes` (lib/placesHelpers.ts)
- **呼び出し元**: `PlaceCard`内 (line 285)
- **処理内容**: 場所タイプからカテゴリを取得

#### 12.8 `getActivityTags` (lib/placesHelpers.ts)
- **呼び出し元**: `PlaceCard`内 (line 288)
- **処理内容**: アクティビティタグの生成

#### 12.9 `buildActivityTitle` (lib/placesHelpers.ts)
- **呼び出し元**: `PlaceCard`内 (line 290)
- **処理内容**: アクティビティタイトルの構築

#### 12.10 `isOpen` (lib/placesHelpers.ts)
- **呼び出し元**: `PlaceCard`内 (line 291)
- **処理内容**: 営業状態の判定

#### 12.11 `formatDistance` (lib/placesHelpers.ts)
- **呼び出し元**: `PlaceCard`内 (line 292)
- **処理内容**: 距離のフォーマット

#### 12.12 `motion.div` アニメーション (components/ChatMessage.tsx:303)
- **呼び出し元**: `ChatMessage`内
- **処理内容**: カードのフェードインアニメーション

---

## 補足: エラーハンドリング

### エラー発生時の処理

#### `handleChatError` (lib/enhancedErrorHandler.ts)
- **呼び出し元**: `handler`のcatchブロック内 (line 1060)
- **処理内容**: エラーの分類と適切なエラーレスポンス生成

#### `FallbackStrategies.getFallbackChatResponse` (lib/enhancedErrorHandler.ts)
- **呼び出し元**: `handler`のcatchブロック内 (line 1070)
- **処理内容**: フォールバックレスポンスの生成

---

## 主要なデータフロー

1. **ユーザーメッセージ** → `ChatInterface` → `/api/chat/send-message`
2. **プロンプト構築** → `buildPromptContext` → `generateDynamicContextInfo`
3. **OpenAI判定** → ツールコール決定 → `search_places`
4. **検索実行** → `searchPlaces` → Google Places API → 結果取得
5. **結果処理** → `places`配列にマージ → アフィリエイト追加
6. **レスポンス送信** → SSEストリーミング → フロントエンド受信
7. **カード表示** → `setMessages` → `PlaceCard`レンダリング

---

## キャッシュポイント

1. **チャットレスポンス**: `apiCache.get(cacheKey)` (line 390)
2. **場所検索結果**: `apiCache.get<SearchPlaceResult>(cacheKey)` (line 311)
3. **場所詳細**: `apiCache.get<PlaceDetailsResult>(cacheKey)` (getPlaceDetails内)

---

## 並列処理

- **ツールコール**: `Promise.all(toolCallPromises)` (line 580) - 複数のツールコールを並列実行
- **ストリーミング**: レスポンス生成と送信を並列処理

---

## タイムアウト設定

- **Google Places API**: 10秒（AbortController使用）
- **OpenAI API**: デフォルトタイムアウト（明示的な設定なし）










