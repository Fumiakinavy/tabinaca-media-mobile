# ID・DBリファクタリング実装進捗

## 完了した作業

### Phase 1: 統一ヘルパー関数の実装 ✅

1. **`lib/server/accountResolver.ts`** - 統一されたaccount_id解決ヘルパー
   - CookieとAuthorizationヘッダーの両方からaccount_idを解決
   - オプショナルなCookie設定機能を追加
   - エラーハンドリングと後方互換性を考慮

2. **`lib/server/activityResolver.ts`** - 統一されたactivity識別子解決ヘルパー
   - activity_slugとactivity_idの相互変換
   - 複数IDの一括変換機能
   - slug正規化関数

### Phase 2: APIエンドポイントの更新 ✅

1. **`pages/api/account/quiz-state.ts`**
   - ローカルの`resolveAccountId`関数を統一ヘルパーに置き換え
   - コードの重複を削減（約60行削減）

2. **`pages/api/likes/[slug].ts`**
   - user_idベースからaccount_idベースに移行
   - RPC関数の代わりに直接クエリを使用
   - `normalizeActivitySlug`を使用してslug正規化を統一

3. **`pages/api/likes/user.ts`**
   - user_idベースからaccount_idベースに移行
   - RPC関数の代わりに直接クエリを使用

## 次のステップ

### 優先度: 高

1. **マイグレーションファイルの適用**
   - `supabase/migrations/004_unify_account_id.sql` を実行
   - 既存データの移行を確認
   - RLSポリシーの動作確認

2. **残りのAPIエンドポイントの更新**
   - `pages/api/recommend.ts` - account_idベースに更新
   - `pages/api/chat/send-message.ts` - account_idベースに更新
   - `pages/api/user/save-attributes.ts` - account_idベースに更新

3. **RLSポリシーの更新**
   - `activity_likes`テーブルのRLSポリシーをaccount_idベースに更新
   - テスト環境で動作確認

### 優先度: 中

4. **Phase 2: アクティビティID統一**
   - `supabase/migrations/005_unify_activity_slug.sql` を実行
   - `activity_feedback`テーブルの移行
   - `ai_suggestions`テーブルの移行

5. **型定義の統一**
   - `types/database.ts` の作成（提案済み）
   - 既存の型定義を更新

## 注意事項

### 後方互換性

- 現在の実装は後方互換性を維持しています
- `user_id`カラムは残しており、段階的な移行が可能
- マイグレーション後も既存のデータは動作します

### テストが必要な項目

1. **認証フロー**
   - Cookieベースの認証
   - Authorizationヘッダーベースの認証
   - 認証なしのゲストアクセス

2. **いいね機能**
   - いいねの追加・削除
   - いいね状態の取得
   - いいね数の取得

3. **クイズ状態**
   - クイズ状態の保存・取得
   - 状態の同期

## 変更されたファイル

### 新規作成
- `lib/server/accountResolver.ts`
- `lib/server/activityResolver.ts`
- `supabase/migrations/004_unify_account_id.sql`
- `supabase/migrations/005_unify_activity_slug.sql`
- `docs/refactoring/ID_DB_REFACTORING_PROPOSAL.md`
- `docs/refactoring/IMPLEMENTATION_PROGRESS.md`

### 更新
- `pages/api/account/quiz-state.ts`
- `pages/api/likes/[slug].ts`
- `pages/api/likes/user.ts`

## パフォーマンスへの影響

### 改善点
- RPC関数の代わりに直接クエリを使用することで、クエリの可読性とデバッグ性が向上
- 統一されたヘルパー関数により、コードの重複が削減

### 注意点
- account_idベースのクエリは、適切なインデックスが存在することを前提としています
- マイグレーション004でインデックスが追加されることを確認してください

## ロールバック計画

問題が発生した場合のロールバック手順:

1. **APIエンドポイントのロールバック**
   - Gitで以前のバージョンに戻す
   - デプロイ

2. **データベースのロールバック**
   - マイグレーション004をロールバック（`DROP COLUMN`は実行しない）
   - 既存のuser_idベースのクエリが動作することを確認

## 参考資料

- [リファクタリング提案](./ID_DB_REFACTORING_PROPOSAL.md)
- [アカウントIDマイグレーション](../account-identity-migration.md)

