# iOS向け仕様書（Gappy Tabinaka Media）

## 1. 目的・スコープ
- Web版（`context/tabinaka-media-staging-develop`）を基準に、iOS版アプリを実装する。
- WebのUI/UX・情報設計・主要フローを可能な限り忠実に再現する。
- 本仕様書はiOS実装の要件を定義し、実装前提の合意を形成する。

## 2. 対象OS・デバイス
- 対象OS: iOS 16 以上
- 対象デバイス: iPhone（主要）、iPad（基本対応）
- 画面サイズ: 6.1インチ基準で設計、動的タイプに対応

## 3. 技術方針（想定）
- UI: SwiftUI（基本）
- アーキテクチャ: MVVM + Repository
- ネットワーク: URLSession + async/await
- 画像: AsyncImage + キャッシュ（SDWebImageSwiftUI等は検討）
- 状態管理: ObservableObject / @State / @EnvironmentObject
- i18n: Localizable.strings

## 4. 画面構成・ナビゲーション

### 4.1 タブ構成（グローバル）
- Home
- Chat
- Experiences
- Likes

### 4.2 スタック遷移（例）
- Home → Quiz
- Home → Chat（検索クエリ付き）
- Experiences → Experience Detail
- Articles → Article Detail
- Likes → Experience Detail / AI保存カード
- Chat → Share Link表示

## 5. 画面別仕様

### 5.1 Home
- Hero検索（自然文入力）
- 記事画像スライダー（自動切替）
- Quiz CTA
- AI Chat CTA
- SEO要素はネイティブ側では不要（Web共有時に利用）

### 5.2 Articles
- 記事一覧（Top/New/All）
- 記事詳細（MDX相当の本文表示）
- 画像、タグ、著者、読了時間表示

### 5.3 Experiences
- 一覧（検索/フィルタ/位置情報連動）
- 体験詳細
  - 画像スライダー
  - 価格/時間/難易度/割引/クーポン
  - Likeボタン
  - Google評価・距離表示
  - 地図表示 + Google Maps外部遷移
  - 予約/申込フォーム

### 5.4 Chat
- 会話UI（ユーザー/AI）
- Placeカード（評価・距離）
- Map/Chat/Splitビュー切替
- セッション履歴（New Page / 切替 / リネーム / 削除）
- 共有リンク生成

### 5.5 Quiz
- 多段階質問フロー
- 結果表示（モーダル）
- 結果保存・再利用
- 共有カード生成（画像保存/共有）

### 5.6 Likes
- 保存済み体験一覧
- AI生成カードの保存一覧

### 5.7 QR / Review / Business
- QR表示（/qr/[bookingId]）
- 予約完了トラッキング（/track/[bookingId]）
- レビュー投稿（/review/[bookingId]）
- 事業者レビューQR表示
- 完了済みアクティビティ一覧
- 店舗来店履歴

## 6. データ・API

### 6.1 データソース
- MDXコンテンツ（Articles / Experiences）
- Supabase（Auth / Like / Chat / 保存 / レビュー）
- Google Places / Maps
- OpenAI（AIチャット）
- SendGrid（メール送信）

### 6.2 API方針
- 既存Web APIと同等のエンドポイントを叩く想定
- レスポンス形式に合わせてモデルを定義
- エラーハンドリング／リトライ設計

## 7. 認証・アカウント
- Supabase OAuth（Google）
- ゲスト状態とログイン状態を明確に区別
- Chat / Likes / Save は認証必須

## 8. 位置情報
- 位置情報許可フロー
- 取得状態の表示（許可/拒否/未対応）
- 位置情報を使った検索・距離計算
- 許可プロンプトの再表示抑制

## 9. 共有・ディープリンク
- Chat共有リンクの表示／コピー
- Quiz結果共有カード
- 共有リンクから該当画面へ遷移（ディープリンク対応）

## 10. 計測・ログ
- 主要イベント（検索/体験閲覧/いいね/チャット送信）
- エラー・クラッシュログ

## 11. i18n
- en/ja/zh/ko/es/fr の6言語
- 端末言語に応じた初期言語設定
- 文言不足時のフォールバック

## 12. 非機能要件
- 起動時間: 3秒以内
- スクロール/アニメーション60fps目標
- ネットワーク不安定時のフォールバックUI
- アクセシビリティ（Dynamic Type, VoiceOver）

## 13. 既知の不確定事項 / 確認事項
- iOSでのChat共有ビューの表示形式（WebView or Native）
- MDXコンテンツのネイティブレンダリング方針
- 既存Web APIの利用可能性（CORSや認証方式）
- QR/レビュー/業務画面のiOS対応範囲（MVPに含めるか）
