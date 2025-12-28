# 🚀 実装ロードマップ（タスク分割版）

## Phase 1: データベース基盤構築 🗄️

### 1.1 ユーザー属性テーブル
- [ ] `user_attributes` テーブル作成（SQL実行）
- [ ] インデックス作成（country, age, travel_style）
- [ ] RLSポリシー設定
- [ ] テスト用データ挿入

### 1.2 フィードバックシステム
- [ ] `activity_feedback` テーブル作成
- [ ] `ai_suggestions` テーブル作成
- [ ] `user_preferences` テーブル作成
- [ ] Supabase Realtime有効化（activity_feedback）
- [ ] テスト用データ挿入

### 1.3 チャット関連テーブル
- [ ] `chatbot_conversations` テーブル作成
- [ ] `chatbot_messages` テーブル作成
- [ ] `conversation_context` テーブル作成

**完了条件**: Supabase Studioで全テーブルが確認できる

---

## Phase 2: 基本チャットUI構築 💬

### 2.1 チャットコンポーネント作成
- [ ] `/components/ChatInterface.tsx` 作成
- [ ] `/components/ChatMessage.tsx` 作成
- [ ] `/components/ChatInput.tsx` 作成
- [ ] 基本的なスタイリング（Tailwind）

### 2.2 チャットページ作成
- [ ] `/pages/chat/index.tsx` 作成
- [ ] ルーティング設定
- [ ] レスポンシブデザイン確認

**完了条件**: 見た目だけのチャットUIが表示される

---

## Phase 3: OpenAI API統合 🤖

### 3.1 環境変数設定
- [ ] `.env.local` に `OPENAI_API_KEY` 追加
- [ ] OpenAI SDKインストール: `npm install openai`
- [ ] API接続テスト

### 3.2 チャットAPI作成
- [ ] `/pages/api/chat/send-message.ts` 作成
- [ ] OpenAI Chat Completions API統合
- [ ] 会話履歴管理
- [ ] エラーハンドリング

### 3.3 フロントエンド接続
- [ ] ChatInputからAPI呼び出し
- [ ] レスポンス表示
- [ ] ローディング状態表示

**完了条件**: ChatGPTと基本的な会話ができる

---

## Phase 4: 会話型オンボーディング 🎭

### 4.1 オンボーディングフロー作成
- [ ] `/lib/onboarding.ts` に質問リスト定義
- [ ] 質問タイプ別UI（select, text）
- [ ] 国籍自動判定（ChatGPT）
- [ ] 回答検証

### 4.2 データ保存
- [ ] `/pages/api/user/save-attributes.ts` 作成
- [ ] user_attributesテーブルへ保存
- [ ] オンボーディング完了フラグ設定

### 4.3 オンボーディング画面
- [ ] 初回訪問検出
- [ ] プログレスバー表示
- [ ] スキップ機能

**完了条件**: 会話で属性を収集しDBに保存される

---

## Phase 5: Google Places API統合 🗺️

### 5.1 環境変数とAPI設定
- [ ] `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` 確認
- [ ] Places API有効化（Google Cloud Console）
- [ ] Text Search API有効化

### 5.2 Places検索API
- [ ] `/pages/api/google-places/search.ts` 作成
- [ ] Text Search実装
- [ ] Nearby Search実装
- [ ] Place Details取得

### 5.3 フロントエンド統合
- [ ] チャットからPlaces検索
- [ ] 検索結果カード表示
- [ ] 写真表示（Cloudinary経由）

**完了条件**: チャットで「渋谷のカフェ」と検索すると結果が表示される

---

## Phase 6: インタラクティブマップ 🌍

### 6.1 マップコンポーネント
- [ ] `/components/InteractiveMap.tsx` 作成
- [ ] Google Maps JavaScript API統合
- [ ] カスタムマーカー設定

### 6.2 マップとチャット連携
- [ ] 検索結果をマップにピン表示
- [ ] ピンクリックで詳細表示
- [ ] マップ移動で周辺検索

### 6.3 マップ付きチャット画面
- [ ] 2カラムレイアウト（チャット + マップ）
- [ ] モバイル対応（タブ切り替え）

**完了条件**: 検索結果が地図上にピンで表示される

---

## Phase 7: アクティビティ自動生成 ✨

### 7.1 MDX自動生成
- [ ] `/lib/activityGenerator.ts` 作成
- [ ] ChatGPTでタイトル生成（動詞始まり）
- [ ] 説明文生成
- [ ] frontmatter構造化

### 7.2 画像自動アップロード
- [ ] Cloudinary SDK設定
- [ ] Google Places写真をCloudinaryへ
- [ ] URLパス生成

### 7.3 アクティビティプレビュー
- [ ] `/components/ActivityPreview.tsx` 作成
- [ ] 生成されたMDXをプレビュー
- [ ] 編集機能

**完了条件**: Places検索結果からMDXが自動生成される

---

## Phase 8: SQL自動生成と承認フロー 📝

### 8.1 SQL生成
- [ ] `/lib/sqlGenerator.ts` 作成
- [ ] INSERT文自動生成
- [ ] スラッグ自動生成（重複チェック）

### 8.2 承認UI
- [ ] `/pages/admin/approve-activities.tsx` 作成
- [ ] 生成されたアクティビティ一覧
- [ ] 承認/却下ボタン
- [ ] 編集機能

### 8.3 DB登録
- [ ] `/pages/api/activities/create.ts` 作成
- [ ] activitiesテーブルへINSERT
- [ ] MDXファイル保存

**完了条件**: 承認するとDBとMDXファイルが作成される

---

## Phase 9: いいね機能とフィードバック収集 ❤️

### 9.1 いいねボタン
- [ ] `/components/LikeButton.tsx` 改修
- [ ] activity_feedbackテーブルへ保存
- [ ] いいね状態の永続化

### 9.2 フィードバック収集
- [ ] スキップボタン追加
- [ ] 閲覧時間トラッキング
- [ ] カテゴリ別フィードバック

**完了条件**: いいねするとactivity_feedbackに記録される

---

## Phase 10: ユーザープリファレンス学習 🧠

### 10.1 Embedding生成
- [ ] OpenAI Embeddings API統合
- [ ] アクティビティのEmbedding生成
- [ ] user_preferencesテーブルへ保存

### 10.2 インクリメンタル更新
- [ ] `/lib/incrementalLearning.ts` 作成
- [ ] いいね時にEmbedding更新（EMA方式）
- [ ] 学習率の動的調整

### 10.3 リアルタイム学習
- [ ] Supabase Realtime購読
- [ ] activity_feedback INSERT時に自動学習
- [ ] バックグラウンド処理

**完了条件**: いいねするとuser_embeddingが自動更新される

---

## Phase 11: コホートベースレコメンド 👥

### 11.1 コホート分析SQL
- [ ] `cohort_activity_preferences` ビュー作成
- [ ] コホート別集計クエリ
- [ ] パフォーマンステスト

### 11.2 コールドスタートAPI
- [ ] `/pages/api/recommendations/cold-start.ts` 作成
- [ ] 同コホートの人気TOP10取得
- [ ] 属性ベースのフィルタリング

### 11.3 フロントエンド統合
- [ ] 初回訪問時にコホートレコメンド表示
- [ ] 「同じ属性の人に人気」ラベル

**完了条件**: 新規ユーザーに同コホートの人気アクティビティが表示される

---

## Phase 12: パーソナライズ検索 🎯

### 12.1 ベクトル検索
- [ ] pgvector拡張機能有効化
- [ ] activities.embedding カラム追加
- [ ] ベクトル類似度検索クエリ

### 12.2 スマート検索API
- [ ] `/pages/api/search/personalized.ts` 作成
- [ ] コホートスコア（30%）
- [ ] パーソナライズスコア（40%）
- [ ] 人気度スコア（30%）

### 12.3 探索と活用のバランス
- [ ] ε-greedy戦略実装
- [ ] アダプティブε調整
- [ ] 多様性確保ロジック

**完了条件**: 検索結果がユーザーに最適化される

---

## Phase 13: 分析ダッシュボード 📊

### 13.1 コホート分析画面
- [ ] `/pages/analytics/cohorts.tsx` 作成
- [ ] コホート別人気アクティビティ表示
- [ ] 国籍別比較グラフ

### 13.2 学習状況モニタリング
- [ ] リアルタイム学習ログ表示
- [ ] いいね率トレンド
- [ ] Embedding更新回数

### 13.3 A/Bテスト可視化
- [ ] 探索vs活用の比率グラフ
- [ ] ε値の推移
- [ ] コンバージョン率比較

**完了条件**: 管理画面でユーザー行動が可視化される

---

## Phase 14: プライバシー対応 🔒

### 14.1 GDPR対応
- [ ] プライバシーポリシー更新
- [ ] データ収集同意UI
- [ ] オプトアウト機能

### 14.2 データ削除機能
- [ ] `/pages/api/user/delete-data.ts` 作成
- [ ] 個人データ完全削除
- [ ] フィードバックの匿名化

**完了条件**: ユーザーがデータ削除をリクエストできる

---

## Phase 15: パフォーマンス最適化 ⚡

### 15.1 キャッシング
- [ ] Redis導入検討
- [ ] Embeddingのキャッシュ
- [ ] コホート分析結果のキャッシュ

### 15.2 バッチ処理
- [ ] Embedding一括生成スクリプト
- [ ] 深夜バッチでの統計更新

### 15.3 モニタリング
- [ ] Vercel Analyticsセットアップ
- [ ] エラートラッキング（Sentry）
- [ ] パフォーマンス計測

**完了条件**: ページロード3秒以内、API応答500ms以内

---

## 📋 推奨実装順序

```
Week 1: Phase 1-3   (DB + 基本チャット)
Week 2: Phase 4-6   (オンボーディング + マップ)
Week 3: Phase 7-9   (自動生成 + フィードバック)
Week 4: Phase 10-12 (学習 + レコメンド)
Week 5: Phase 13-15 (分析 + 最適化)
```

## 🎯 各フェーズの完了基準

各フェーズは**独立してテスト可能**で、完了条件が明確に定義されています。

## 🚨 リスクと対策

| リスク | 対策 |
|--------|------|
| OpenAI API コスト | 開発時はgpt-3.5-turbo使用 |
| Google Places API上限 | キャッシング + Cloudinary経由 |
| Embedding計算負荷 | バックグラウンドジョブ化 |
| データ量増加 | 定期的なアーカイブ |

## ✅ 最優先タスク（MVP）

まず最初に実装すべき最小機能：

1. ✅ Phase 1: DB構築
2. ✅ Phase 2: 基本チャット
3. ✅ Phase 3: OpenAI統合
4. ✅ Phase 5: Places検索
6. ✅ Phase 7: 自動生成（簡易版）

**これだけで動くプロトタイプができます！** 🎉

