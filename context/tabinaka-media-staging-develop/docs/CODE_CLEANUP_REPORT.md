# コードクリーンアップ報告書

**作成日**: 2025年1月  
**対象**: Tabinaka Media Staging コードベース  
**目的**: 不要なファイルと場当たり的な処理の特定

---

## 概要

本報告書は、コードベース全体を分析し、以下の2つの観点から問題点を特定したものです：

1. **不要なファイル**: 削除またはアーカイブすべきファイル
2. **場当たり的な処理**: リファクタリングが必要な箇所

---

## 1. 不要なファイル

### 1.1 テスト・開発用ファイル（ルートディレクトリ）

以下のファイルは開発時の一時的なテスト用と思われ、本番コードから削除すべきです：

| ファイル | 説明 | 推奨対応 |
|---------|------|---------|
| `test-search.ts` | 開発時の検索テスト用スクリプト | **削除** |
| `test-search-exp.ts` | 開発時の検索テスト用スクリプト | **削除** |
| `test-search-zero.ts` | 開発時の検索テスト用スクリプト | **削除** |

**理由**: 
- これらのファイルは`lib/functionRegistry`を直接実行するだけの一時的なテストコード
- プロジェクト内で参照されていない
- 本番コードベースに存在する必要がない

**検証コマンド**:
```bash
grep -r "test-search" --exclude-dir=node_modules .
# 結果: これらのファイルへの参照なし
```

---

### 1.2 無効化されたコード

#### `pages/api/chat/send-message.ts` 内の無効化された関数

以下の関数はコメントで無効化されているにもかかわらず、コードが残っています：

```typescript:204-224:pages/api/chat/send-message.ts
// 旧カード用フック生成機能は一時停止中（生成コスト削減）
const placeHookCache = new Map<string, string>();

// eslint-disable-next-line @typescript-eslint/no-unused-vars
async function ensurePlaceHooks(places: any[]): Promise<any[]> {
  // フック生成を無効化したため、そのまま返す
  return places;
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
async function generatePlaceHook(_place: {
  place_id?: string;
  name?: string;
  formatted_address?: string;
  types?: string[];
  rating?: number;
  user_ratings_total?: number;
}): Promise<string | null> {
  // 無効化中：呼び出しを想定しない
  return null;
}
```

**問題点**:
- これらの関数は呼び出されていない
- `eslint-disable`で警告を無視している
- 無効化された機能のコードが残っている

**推奨対応**: 
- 削除するか、Git履歴に残すために別ブランチにアーカイブ
- 将来必要になった場合は履歴から復元可能

---

### 1.3 重複コンポーネント

#### `InteractiveMap.tsx` と `EnhancedInteractiveMap.tsx`

2つの類似したマップコンポーネントが存在します：

| コンポーネント | 行数 | 使用箇所 | 推奨対応 |
|---------------|------|---------|---------|
| `InteractiveMap.tsx` | 241行 | ドキュメントのみ（未使用？） | **調査後削除** |
| `EnhancedInteractiveMap.tsx` | 567行 | `pages/chat/index.tsx` | **継続使用** |

**問題点**:
- `InteractiveMap.tsx`は実際のコードで使用されていない可能性が高い
- `EnhancedInteractiveMap.tsx`の方が機能的に充実している（ユーザー位置、徒歩時間計算など）

**検証結果**:
```bash
grep -r "InteractiveMap[^E]" --exclude-dir=node_modules .
# 結果: docs/vision-AIver/PHASE_6_COMPLETION.md のみ（ドキュメント）
```

**推奨対応**:
1. `InteractiveMap.tsx`が実際に使用されているか確認
2. 使用されていない場合は削除
3. ドキュメントを更新

---

### 1.4 使用されていない可能性のあるAPIエンドポイント

以下のAPIエンドポイントは、参照が少ない、または限定的な用途のみの可能性があります：

| エンドポイント | 参照箇所 | 状態 | 推奨対応 |
|--------------|---------|------|---------|
| `/api/cloudinary/delete.ts` | なし | **未使用の可能性** | 使用状況確認後削除 |
| `/api/setup-activities.ts` | なし | **開発/セットアップ用** | スクリプトに移動または削除 |
| `/api/completed-activities/index.ts` | `pages/completed-activities/index.tsx`のみ | **使用中** | 保持 |

**詳細**:

1. **`/api/cloudinary/delete.ts`**
   - コードベース内で参照なし
   - Cloudinary画像削除用のAPIだが、使用実績なし
   - 推奨: 使用状況をログで確認し、6ヶ月以上未使用なら削除

2. **`/api/setup-activities.ts`**
   - SQLファイルを解析してアクティビティを投入する開発用API
   - 本番環境では使用すべきでない
   - 推奨: 開発用スクリプトに移動または削除

3. **`/api/completed-activities/index.ts`**
   - レガシーテーブル`activity_completions`を参照
   - 新スキーマでは`activity_interactions`に移行済み
   - 推奨: 新スキーマに対応するか、廃止を検討

---

### 1.5 一時的なスクリプトファイル

以下のスクリプトは一時的な作業用と思われます：

| ファイル | 説明 | 推奨対応 |
|---------|------|---------|
| `scripts/delete_two_accounts.sql` | 特定の2アカウント削除用 | **削除またはアーカイブ** |

**問題点**:
- 特定のメールアドレスがハードコードされている
- 一度実行すれば不要なスクリプト
- 個人情報が含まれている

**推奨対応**:
- Git履歴に残すため、削除するか別ブランチにアーカイブ
- 個人情報を含むため、公開リポジトリからは削除推奨

---

### 1.6 無効化されたCIワークフロー

`.github/workflows/ci-tabinaka-media.yml`は無効化されています：

```yaml:1-20:.github/workflows/ci-tabinaka-media.yml
# .github/workflows/ci-tabinaka-media.yml
name: CI – Tabinaka Media (Disabled)
...
```

**推奨対応**: 削除（代替として`ci-advanced.yml`が使用されている）

---

## 2. 場当たり的な処理

### 2.1 過剰なconsole.log

プロジェクト全体で354件の`console.log`/`console.error`/`console.warn`が存在します：

| ファイル | console使用数 | 状態 |
|---------|--------------|------|
| `pages/chat/index.tsx` | 25 | **要整理** |
| `pages/api/chat/send-message.ts` | 42 | **要整理** |
| `pages/api/user/save-attributes.ts` | 3 | 問題なし |

**問題点**:
- 本番環境で不要なログが出力される可能性
- デバッグ用のログが残っている
- エラーログとデバッグログが混在

**推奨対応**:
1. ログレベルを統一（`console.log` → デバッグ用、`console.error` → エラー用）
2. 本番環境では適切なログライブラリ（例: Winston, Pino）を使用
3. 開発環境でのみ有効なログは条件付きに

**例**:
```typescript
// ❌ 現在
console.log("Using cached data for:", cacheKey);

// ✅ 推奨
if (process.env.NODE_ENV === 'development') {
  console.log("Using cached data for:", cacheKey);
}
// またはログライブラリを使用
logger.debug("Using cached data", { cacheKey });
```

---

### 2.2 型安全性の問題

APIエンドポイントで`any`型や型アサーションが多用されています：

| ファイル | 問題箇所 | 状態 |
|---------|---------|------|
| `pages/api/chat/send-message.ts` | `places: any[]`など | **要改善** |
| `pages/api/setup-activities.ts` | `from("activities" as any)` | **要改善** |
| `pages/api/vendor/set-password.ts` | `from("activities" as any)` | **要改善** |

**問題点**:
- TypeScriptの型チェックを回避している
- 実行時エラーのリスクが高い
- リファクタリング時に問題を発見しづらい

**推奨対応**:
1. 適切な型定義を作成
2. `any`型の使用を最小限に
3. 型アサーション（`as`）の使用を避ける

---

### 2.3 大きなファイル

以下のファイルが非常に大きく、保守性が低下しています：

| ファイル | 行数 | 問題点 | 推奨対応 |
|---------|------|--------|---------|
| `pages/api/chat/send-message.ts` | 1,494行 | **過大** | **分割** |
| `pages/chat/index.tsx` | 1,868行 | **過大** | **分割** |

**`send-message.ts`の主な問題**:
- 認証、ストリーミング、エラーハンドリング、キャッシュなど複数の責務が混在
- 無効化された関数が残っている
- 複雑な条件分岐が多い

**推奨対応**:
1. 機能ごとにモジュールに分割
   - `lib/chat/auth.ts` - 認証関連
   - `lib/chat/streaming.ts` - ストリーミング処理
   - `lib/chat/placeHooks.ts` - 場所フック（削除または復元）
   - `lib/chat/affiliateIntegration.ts` - アフィリエイト統合
2. ハンドラーは薄い層にして、ロジックを別ファイルに移動

---

### 2.4 ハードコードされた値

#### モックデータの混在

開発用のモックデータが本番コードに残っています：

```typescript:88-112:lib/apiClient.ts
private getMockData<T>(url: string): ApiResponse<T> {
  // Return appropriate mock data based on URL
  if (url.includes("textsearch")) {
    return {
      data: { results: MOCK_PLACES } as T,
      fromCache: false,
      fromMock: true,
    };
  }
  // ...
}
```

```typescript:127-171:pages/api/recommend.ts
if (!apiKey) {
  console.error("GOOGLE_PLACES_API_KEY_SERVER is not configured");
  // Return mock data for testing
  const mockData = {
    items: [
      {
        place_id: "mock_1",
        name: "Tokyo Skytree",
        // ...
      },
      // ...
    ],
  };
  return res.status(200).json(mockData);
}
```

**問題点**:
- 本番環境でモックデータが返される可能性
- APIキーが設定されていない場合のフォールバックが不適切
- エラーを隠蔽している

**推奨対応**:
1. モックデータは開発環境のみで有効化
2. 本番環境ではエラーを適切に返す
3. 環境変数で明示的に制御

---

### 2.5 コメントアウトされたコード

複数のファイルにコメントアウトされたコードが残っています：

1. **`pages/api/chat/send-message.ts`**:
   ```typescript
   // Quiz is optional - no longer require quiz completion for chat
   // import { ensureQuizCompleted } from "@/lib/server/quizState";
   ```

2. **`components/SimpleMapEmbed.tsx`**:
   ```typescript
   /*
   使用例:
   ...
   */
   ```
   148-177行に使用例がコメントとして残っている

**推奨対応**:
- 使用例はドキュメントに移動
- 不要なコメントアウトコードは削除

---

### 2.6 エラーハンドリングの不統一

エラーハンドリングのパターンが統一されていません：

```typescript
// パターン1: エラーを無視
catch (e) {
  // Connection already closed, ignore
}

// パターン2: console.errorのみ
catch (error) {
  console.error("Error:", error);
}

// パターン3: エラーを返す
catch (error) {
  return res.status(500).json({ error: error.message });
}
```

**推奨対応**:
1. 統一されたエラーハンドリング関数を作成
2. エラーログを適切に記録
3. ユーザーに適切なエラーメッセージを返す

---

### 2.7 重複したロジック

#### 価格フォーマット関数

複数箇所で価格フォーマットが実装されています：

| ファイル | 実装 |
|---------|------|
| `components/ExperienceMeta.tsx` | `formatPrice` (シンプル版) |
| `components/CardGrid.tsx` | `formatPrice` (Intl.NumberFormat版) |
| `components/ExperienceTemplate.tsx` | `toLocaleString('ja-JP')` 直接呼び出し |

**推奨対応**:
- `lib/formatters/price.ts`に統一
- 全コンポーネントで共通関数を使用

（詳細は`docs/refactoring/code-redundancy-analysis.md`を参照）

---

## 3. 優先度別アクションアイテム

### 🔴 高優先度（即座に対応）

1. **テストファイルの削除**
   - `test-search.ts`
   - `test-search-exp.ts`
   - `test-search-zero.ts`

2. **無効化された関数の削除**
   - `pages/api/chat/send-message.ts`内の`ensurePlaceHooks`、`generatePlaceHook`

3. **個人情報を含むスクリプトの削除**
   - `scripts/delete_two_accounts.sql`

---

### 🟡 中優先度（短期で対応）

4. **重複コンポーネントの整理**
   - `InteractiveMap.tsx`の使用状況確認と削除

5. **未使用APIエンドポイントの確認と削除**
   - `/api/cloudinary/delete.ts`
   - `/api/setup-activities.ts`

6. **大きなファイルの分割**
   - `pages/api/chat/send-message.ts` (1,494行)
   - `pages/chat/index.tsx` (1,868行)

7. **console.logの整理**
   - 本番環境向けのログライブラリ導入
   - デバッグログの条件付き化

---

### 🟢 低優先度（中期で改善）

8. **型安全性の向上**
   - `any`型の削減
   - 型アサーションの削減

9. **モックデータの整理**
   - 開発環境のみで有効化
   - 本番環境でのエラーハンドリング改善

10. **コメントアウトコードの削除**
    - 不要なコメントの整理
    - 使用例のドキュメント化

11. **エラーハンドリングの統一**
    - 共通エラーハンドラー関数の作成

12. **重複ロジックの共通化**
    - 価格フォーマット関数の統一
    - （`docs/refactoring/code-redundancy-analysis.md`を参照）

---

## 4. 参考資料

- [コード冗長性分析レポート](./refactoring/code-redundancy-analysis.md)
- [リファクタリング提案](./refactoring/REFACTORING_PROPOSAL_20250113.md)
- [アーキテクチャ図](./ARCHITECTURE_DIAGRAM.md)

---

## 5. 次のステップ

1. チームでこの報告書をレビュー
2. 優先度に従ってタスクを割り当て
3. 削除前にGit履歴でバックアップを確認
4. 削除後、関連ドキュメントを更新

---

**報告書作成者**: AI Code Review  
**最終更新**: 2025年1月










