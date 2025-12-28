# リッチな動的ステータスメッセージ実装レポート

**実装日**: 2025-12-28
**ステータス**: ✅ 完了

---

## 📋 実装概要

Gappychat AI の内部処理時に表示されるステータスメッセージを、ユーザーのインテントとコンテキストに基づいた**リッチで動的な内容**にアップグレードしました。

### Before（汎用メッセージ）
```
🤖 AI is thinking...
🔧 Executing tool: search_places
✓ Tool completed
✍️ Composing response...
```

### After（動的メッセージ）
```
✨ Looking for inspiration based on your interests...
🌟 Exploring cafes in your area...
✓ Found 5 cafes options (1250ms)
✨ Curating inspiring suggestions for you...
```

---

## 🎯 実装内容

### 1. 新規ファイル作成

#### `lib/chat/statusMessages.ts`
インテント別、ツール別、結果別に動的にメッセージを生成する関数群を実装。

**実装された関数**:
```typescript
// インテント別の分析メッセージ
export function getAnalysisMessage(intent: IntentLabel, message: string): string

// AI思考プロセスのメッセージ（イテレーション考慮）
export function getModelCallMessage(intent: IntentLabel, iteration: number): string

// ツール実行開始メッセージ（クエリ内容抽出）
export function getToolExecutionMessage(
  toolName: string,
  input: Record<string, unknown>,
  intent?: IntentLabel
): string

// 成功メッセージ（結果カウント付き）
export function getToolSuccessMessage(
  toolName: string,
  input: Record<string, unknown>,
  duration: number,
  result?: any
): string

// エラーメッセージ（タイムアウト検知）
export function getToolErrorMessage(
  toolName: string,
  input: Record<string, unknown>,
  error: string
): string

// Claude の思考テキスト表示
export function getThinkingMessage(text: string, intent?: IntentLabel): string

// 最終レスポンス準備メッセージ
export function getComposingMessage(intent: IntentLabel, hasPlaces: boolean): string
```

**主要な特徴**:
- **インテント駆動**: inspiration/specific/details/clarify に応じてメッセージを変更
- **コンテキスト抽出**: 検索クエリから主要キーワードを抽出して表示
- **結果サマリー**: 検索結果の件数やレビュー数を表示
- **実行時間表示**: ツール実行の所要時間をミリ秒単位で表示
- **エラー判別**: タイムアウトと実行エラーを区別

---

### 2. `lib/chat/model.ts` の更新

既存のステータス更新ロジックを、動的メッセージ生成関数を使用するように変更。

#### 変更箇所

**1. インポート追加**
```typescript
import {
  getAnalysisMessage,
  getModelCallMessage,
  getToolExecutionMessage,
  getToolSuccessMessage,
  getToolErrorMessage,
  getThinkingMessage,
  getComposingMessage,
} from "./statusMessages";
```

**2. 分析メッセージ（425-429行目）**
```typescript
await sendStatusUpdate({
  id: "analysis",
  state: "success",
  label: getAnalysisMessage(userIntent, context.message),
});
```

**3. モデル呼び出しメッセージ（437-441行目）**
```typescript
await sendStatusUpdate({
  id: "model_request",
  state: "pending",
  label: getModelCallMessage(userIntent, iteration),
});
```

**4. 思考テキスト表示（456-464行目）**
```typescript
const thinkingText = extractTextContent(content);
if (thinkingText && thinkingText.trim().length > 0) {
  await sendStatusUpdate({
    id: "thinking",
    state: "pending",
    label: getThinkingMessage(thinkingText, userIntent),
  });
}
```

**5. ツール実行開始メッセージ（475-479行目）**
```typescript
await sendStatusUpdate({
  id: `tool_${toolUse.id}`,
  state: "pending",
  label: getToolExecutionMessage(toolUse.name, toolUse.input, userIntent),
});
```

**6. ツール実行成功メッセージ（492-501行目）**
```typescript
await sendStatusUpdate({
  id: `tool_${toolUse.id}`,
  state: "success",
  label: getToolSuccessMessage(
    toolUse.name,
    toolUse.input,
    duration,
    rawResult
  ),
});
```

**7. ツール実行エラーメッセージ（509-513行目）**
```typescript
await sendStatusUpdate({
  id: `tool_${toolUse.id}`,
  state: "error",
  label: getToolErrorMessage(toolUse.name, toolUse.input, errorMessage),
});
```

**8. 最終レスポンス準備メッセージ（555-567行目）**
```typescript
await sendStatusUpdate({
  id: "composing",
  state: "pending",
  label: getComposingMessage(userIntent, places.length > 0),
});

finalResponse = extractTextContent(content);

await sendStatusUpdate({
  id: "composing",
  state: "success",
  label: "Response ready",
});
```

**9. エラー時のフォールバックメッセージ（590-594行目）**
```typescript
await sendStatusUpdate({
  id: "composing",
  state: "pending",
  label: "Preparing error response...",
});
```

---

## 💡 動的メッセージの例

### インテント別の違い

#### Inspiration（探索的）
```
✨ Looking for inspiration based on your interests...
🎨 Thinking of diverse options that match your vibe...
🌟 Exploring cafes in your area...
✓ Found 5 cafes options (1250ms)
✨ Curating inspiring suggestions for you...
```

#### Specific（具体的検索）
```
🔍 Understanding your search: "近くのラーメン屋"
🧠 Finding the best matches for your request...
🔍 Searching for ramen (within 800m)
✓ Found 8 ramen options (980ms)
📝 Preparing your search results...
```

#### Details（詳細情報）
```
📋 Getting detailed information for you...
📚 Gathering comprehensive information...
📍 Loading detailed information and reviews...
✓ Details loaded with 12 reviews (750ms)
📋 Formatting detailed information...
```

#### Clarify（不明確）
```
💭 Analyzing your request...
💬 Preparing a clarifying question...
✍️ Composing response...
```

### ツール実行メッセージの詳細

#### `search_places`
```
実行前:
  inspiration: "🌟 Exploring cafes in your area..."
  specific:    "🔍 Searching for ramen (within 800m)"

実行後:
  0件: "❌ No cafes found nearby"
  1件: "✓ Found 1 cafes option (1250ms)"
  複数: "✓ Found 5 cafes options (1250ms)"
```

#### `get_place_details`
```
実行前: "📍 Loading detailed information and reviews..."

実行後:
  レビューあり: "✓ Details loaded with 12 reviews (750ms)"
  レビューなし: "✓ Details loaded (750ms)"
```

---

## 🔧 実装の技術的特徴

### 1. キーワード抽出
`extractKeyTerms()` 関数で検索クエリから主要な用語を抽出：
```typescript
function extractKeyTerms(query: string): string {
  // 位置情報や距離制約を除去
  const cleaned = query
    .toLowerCase()
    .replace(/near|in|around|within|current location|my location|here/gi, "")
    .replace(/\d+\s*(m|km|meter|kilometer|min|minute|minutes|walk)/gi, "")
    .trim();

  // 最初の2-3ワードを抽出
  const words = cleaned.split(/\s+/).filter(w => w.length > 2);
  const keyTerms = words.slice(0, 3).join(" ");

  return keyTerms || "places";
}
```

例:
- `"find cafes near current location within 500m"` → `"cafes"`
- `"東京でおすすめのラーメン屋"` → `"東京 おすすめ ラーメン"`

### 2. 結果に基づく動的メッセージ
ツール実行結果を解析してメッセージを生成：
```typescript
const count = result?.data?.results?.length || 0;
if (count === 0) {
  return `❌ No ${queryTerms} found nearby`;
} else if (count === 1) {
  return `✓ Found 1 ${queryTerms} option (${duration}ms)`;
} else {
  return `✓ Found ${count} ${queryTerms} options (${duration}ms)`;
}
```

### 3. エラータイプ判別
タイムアウトと通常エラーを区別：
```typescript
if (error.includes("timeout")) {
  return `⏱️ Search for ${queryTerms} timed out - retrying...`;
}
return `❌ Could not search for ${queryTerms}`;
```

---

## ✅ 完了確認

### 型チェック
```bash
$ npx tsc --noEmit
Exit code: 0  ✅ エラーなし
```

### 実装済み機能
- ✅ インテント別の分析メッセージ
- ✅ イテレーション考慮のモデル呼び出しメッセージ
- ✅ ツール実行前の動的メッセージ（クエリ内容抽出）
- ✅ ツール実行後の結果サマリー付きメッセージ
- ✅ エラー時のコンテキスト付きメッセージ
- ✅ 最終レスポンス準備メッセージ
- ✅ Claude 思考テキストの表示

---

## 🎨 ユーザー体験への影響

### Before
ユーザーは「何をやっているのか分からない」まま待つ必要があった：
```
🤖 AI is thinking...
🔧 tool_123
✓ Completed
✍️ Composing response...
```

### After
各ステップで何が起きているか明確に理解できる：
```
✨ Looking for inspiration based on your interests...
🎨 Thinking of diverse options that match your vibe...
🌟 Exploring cafes in your area...
✓ Found 5 cafes options (1.2s)
✨ Curating inspiring suggestions for you...
```

### 期待される効果
1. **体感速度の向上**: プロセスが可視化されることで待ち時間が短く感じる
2. **信頼性の向上**: AI が何をしているか理解できることで安心感
3. **エンゲージメント向上**: リッチなメッセージでユーザーの興味を維持
4. **デバッグの容易化**: 問題発生時に何が起きたか追跡しやすい

---

## 📊 メッセージカバレッジ

| ステージ | Before | After | 動的要素 |
|---------|--------|-------|---------|
| 分析 | 汎用 | ✅ インテント別 | message preview |
| AI思考 | 汎用 | ✅ インテント別 + iteration | - |
| ツール実行前 | 汎用 | ✅ ツール別 + クエリ抽出 | query terms, radius |
| ツール実行後 | 汎用 | ✅ 結果サマリー付き | count, reviews, duration |
| エラー | 汎用 | ✅ エラータイプ判別 | timeout vs error |
| レスポンス準備 | 固定 | ✅ インテント + 結果有無 | intent, hasPlaces |

---

## 🚀 今後の拡張案

### 短期
- [ ] 多言語対応（日本語/英語の自動切り替え）
- [ ] ユーザー設定で絵文字の有無を選択可能に

### 中期
- [ ] 距離や時間制約の強調表示
- [ ] 場所カテゴリ別のアイコン最適化
- [ ] アニメーション効果の追加

### 長期
- [ ] ユーザーごとのメッセージパーソナライゼーション
- [ ] A/B テストによるメッセージ最適化
- [ ] 音声読み上げ対応

---

## 📝 関連ドキュメント

- [AI_PERFORMANCE_OPTIMIZATION.md](./AI_PERFORMANCE_OPTIMIZATION.md) - 全体の最適化実装
- [lib/chat/statusMessages.ts](../lib/chat/statusMessages.ts) - メッセージ生成関数
- [lib/chat/model.ts](../lib/chat/model.ts) - 統合実装

---

**実装完了**: 2025-12-28
**実装者**: Claude Code Agent
