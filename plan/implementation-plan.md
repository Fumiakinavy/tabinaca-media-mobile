# iOS実装計画（Gappy Tabinaka Media）

## 0. 前提
- 参照元: `context/tabinaka-media-staging-develop`（読み取り専用）
- 仕様: `plan/ios-spec.md`
- iOS実装先: `tabinaca-media-ios/`

---

## フェーズ1: 調査・設計確定
**目的**: iOSで再現すべき機能範囲と技術方針を確定する

- Web構成の再確認（画面/機能/API）
- MVP範囲の確定（QR/Businessを含めるか）
- API利用方針の決定（Web APIをそのまま利用）
- iOSアーキテクチャ決定（SwiftUI + MVVM）
- データモデル一覧を確定

成果物:
- MVPスコープ合意
- 画面遷移図（簡易）
- 主要API一覧

---

## フェーズ2: 基盤構築
**目的**: アプリの骨格と共通機能を先に整える

- プロジェクト初期化（SwiftUI）
- App構成（TabView + NavigationStack）
- デザイン基盤（Color/Font/Spacing/Components）
- Networkレイヤー（APIClient, Endpoint, Error）
- 画像キャッシュ方針
- i18n基盤（Localizable.strings + 言語切替）
- Feature Flag / Env設定

成果物:
- 起動可能なアプリ骨格
- 共通UIコンポーネント

---

## フェーズ3: 認証・アカウント基盤
**目的**: Supabase認証 + ログイン状態管理

- Supabase Auth連携（OAuth/セッション）
- アカウント状態管理（ゲスト/ログイン）
- 認証必須画面の制御

成果物:
- ログイン/ログアウト動作
- 認証状態でUI切替

---

## フェーズ4: Home実装
**目的**: ホーム画面とCTAを完成させる

- Hero検索入力
- 画像スライダー
- Quiz / Chat CTA
- i18nテキスト

成果物:
- Home画面完成

---

## フェーズ5: Experiences
**目的**: 体験一覧/詳細/フォームを実装

- 体験一覧（検索/フィルタ/ページング）
- 体験詳細（画像/メタ/Like/距離/地図）
- 予約フォーム（入力/バリデーション）
- Google Maps外部遷移

成果物:
- Experience一覧 + 詳細 + 申込フロー

---

## フェーズ6: Chat
**目的**: AIチャット体験の実装

- チャットUI（メッセージ/入力/ローディング）
- Placeカード表示
- Map/Chat/Split切替
- セッション管理（新規/履歴/削除/共有）
- 位置情報許可フロー

成果物:
- チャット体験完了

---

## フェーズ7: Quiz
**目的**: 旅行タイプ診断を再現

- 多段階質問UI
- スコアリング/結果表示
- 結果保存・再利用
- 共有カード生成

成果物:
- Quizフロー完成

---

## フェーズ8: Articles
**目的**: 記事一覧/詳細を実装

- 記事一覧（Top/New/All）
- 記事詳細（本文/画像/タグ）

成果物:
- Articles画面完成

---

## フェーズ9: Likes
**目的**: 保存機能の再現

- Likeボタン連携
- 保存済み一覧
- AI生成保存カード対応

成果物:
- Likes画面完成

---

## フェーズ10: QR / Business（MVP外の場合は後回し）
**目的**: QRや業務系ページのiOS対応

- QR表示
- トラッキング/レビュー
- 事業者向け画面

成果物:
- 業務系画面対応

---

## フェーズ11: 仕上げ・品質
**目的**: 品質とUXの最終調整

- i18n整備
- アクセシビリティ（Dynamic Type, VoiceOver）
- パフォーマンス最適化
- エラーハンドリング
- ログ/計測

成果物:
- リリース候補ビルド

---

## 優先度（MVP案）
1. 基盤 + 認証
2. Home + Experiences
3. Chat
4. Quiz
5. Articles
6. Likes
7. QR/Business

---

## リスク・未確定事項
- MDXのネイティブ描画方法
- Web APIの認証/利用制限
- QR/Business画面のiOS対応範囲
- 共有リンク/ディープリンク仕様

---

## 進め方
- 各フェーズ開始時に `plan/` の計画更新
- 各フェーズ終了時に簡易レポート作成
- 要件変更が出た場合は計画書を先に修正
