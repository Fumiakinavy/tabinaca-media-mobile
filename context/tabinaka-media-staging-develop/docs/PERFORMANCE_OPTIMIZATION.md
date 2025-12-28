# サイト軽量化プラン (2025-12-03)

## 背景・目標
- 体感のもたつきとビルド後 JS 増加が顕在化。モバイルで LCP 2.5s 未満、INP 200ms 未満、初回 JS(gzip) 250kB 以内を 2026Q1 の目安にする。
- 現状は Next.js 16 (pages ルーター) でチャット、マップ、カルーセル等のクライアント負荷が大きい構成。サードパーティ読み込みと大きな静的 JSON が主なリスク。

## 計測フロー（継続運用）
- Core Web Vitals: PageSpeed Insights / WebPageTest を週次実行し、LCP・CLS・INP を記録。回線はモバイル 4G、端末はミッドレンジ相当を基準にする。
- バンドル可視化: `@next/bundle-analyzer` を devDependencies に追加し、`ANALYZE=true npm run build` でルート別 JS を確認。共有 JS の増減を PR でレビュー対象にする。
- `next build` の "First Load JS shared by all" をスナップショットとして残し、±50kB 以上の変化で原因をメモする。
- ランタイム計測: `/api/*` のレスポンス時間とキャッシュ HIT 率をログ出力し、Sentry/Datadog 等に集約。INP で悪化した操作（クリック、入力）のメトリクスを計測する。

## 直近で実施したい軽量化（優先順）
1) JS/サードパーティの遅延読み込み
- `EnhancedInteractiveMap` と Google Maps API は `next/dynamic` + `ssr:false` に切り替え、`IntersectionObserver` でビューポート侵入時だけ読み込む。マップスクリプトは `next/script` の `strategy="lazyOnload"` に変更し、`libraries=places&language=ja` の最小セットに限定。
- Swiper: グローバルの `@import 'swiper/css' ...` をカルーセルを使うページ専用の遅延ロードへ移動し、未使用ページへの配信を止める。必要なモジュール（navigation/pagination）のみに絞る。
- 動的パーツ（チャット履歴サイドバー、QuizResultModal など）はタブを開いた時に `next/dynamic` で読み込む。フローティングボタンなど常駐 UI はプレーン HTML/CSS で実装する。

2) データ転送量の削減
- `pages/experiences` の `getStaticProps` で全件をクライアントに渡さず、カード表示に必要な最小フィールド＋最初の 12 件だけを返却。残りは `/api/experiences?offset=...` を SSG+ISR（例: `revalidate: 600`）でページネーション取得する。
- `/api/experiences/ai-cards` を 10〜30 分キャッシュ（`Cache-Control: s-maxage=600, stale-while-revalidate=3600` 目安）し、クライアントでは SWR で再利用。エラー時は前回キャッシュを即時表示。

3) 画像最適化
- カード画像は必ず `next/image` を使用し、`sizes` をブレークポイントごとに指定。`priority` はヒーロー画像のみ、他はレイジーロード。`blurDataURL` をプリコンピュートして CLS を抑制。
- アップロード済みの JPEG/PNG は WebP/AVIF へ再エンコード（品質 70 前後）し、600〜800px 幅の派生を生成。背景用の大画像は 1–2 段階の LQIP を追加。

4) 体感レスポンス改善
- チャット画面の初期マウントで実行している API（セッション一覧、推薦、マップデータ）をシリアルではなく優先度順に並べ、最初の 1–2 呼び出し以外はユーザー操作後に発火するよう分離。
- 無限スクロール/横スクロール部分は「次のページをプリフェッチする最小限の JSON」に絞り、カードは 8〜12 件単位で追加。リストが長い箇所はリスト仮想化（`react-virtualized` 相当）を検討。

5) CSS/フォント
- Google Fonts を使う場合は `next/font` に統一し、必要な subset のみにする。アイコンは `lucide-react` の個別 import を徹底し、未使用アイコンを削除。

## 中期施策（1–3 週間）
- Pages ルーターの静的ページ（記事/体験紹介など）から優先して App Router + React Server Components へ段階移行し、Hydration コストを削減する。
- CI にバンドルガード（`size-limit` など）と Lighthouse CI を追加し、閾値超えをブロック。
- マップや OpenAI 連携など重い機能は「機能フラグ + コード分割」で段階的に配信。A/B テストで収益影響を確認しながら削減する。
- 画像パイプラインを自動化（Sharp など）し、アップロード時に複数解像度/フォーマットを生成する。

## ページ別メモ
- Experiences: 静的 JSON が肥大化しがち。カードフィールドの最小化とページネーション API 化が最優先。AI セクションは 200〜300ms 以内でスケルトン表示し、データはキャッシュ再利用。
- Chat: `EnhancedInteractiveMap` と履歴サイドバーが初期バンドルを押し上げる。マップはタブ選択時にのみ読み込む。履歴は初期 5 件だけを SSR し、残りは遅延フェッチ。LLM 呼び出しはストリーミング表示を維持しつつ、完了後にログ送信する。

## 運用チェックリスト
- PR 前に `npm run lint` と `npm run build` を実行し、ビルド出力の JS サイズと警告を記録。
- 主要ページ（/chat, /experiences）は Lighthouse のスコアをキャプチャし、前回との差分を残す。
- 体感遅延の報告があった箇所では、Chrome Performance プロファイラで 3 秒以内にメインスレッドの長タスク(<50ms)を 90% 以上に抑えることを確認する。

## 具体アクション（実装・削除・リファクタ）
### 1. JS/サードパーティ遅延読み込み
- `components/EnhancedInteractiveMap.tsx` と `components/InteractiveMap.tsx` を `next/dynamic({ ssr: false, loading: ... })` で読み込み、`pages/chat/index.tsx` ではタブ選択時に初回レンダーするよう分岐を入れる。
- Google Maps の `<Script>` を `strategy="lazyOnload"` に変更し、`libraries=places` のみに制限（`components/EnhancedInteractiveMap.tsx` or `pages/chat/index.tsx`）。
- `styles/globals.css` から `@import 'swiper/css' ...` を削除し、Swiper を使うコンポーネント（例: `components/InspirationCarousel.tsx` など該当箇所）内で `import 'swiper/css'; import 'swiper/css/navigation';` を動的ロードまたはページ限定ロードへ移動。

### 2. データ転送量削減
- `pages/experiences/index.tsx` の `getStaticProps` で返す件数を 12 件に絞り、必要フィールドのみにシリアライズ。残りを返す `pages/api/experiences/index.ts` (新規) を追加し、`offset/limit` でページネーションし `revalidate: 600` を設定。
- `pages/experiences/index.tsx` のフロント側を API ベースの無限スクロールに変更（初期 12 件 + 追加フェッチ）。既存の `shuffledExperiences` ロジックを API 取得結果に合わせて更新。
- `/api/experiences/ai-cards` のレスポンスに `Cache-Control: s-maxage=600, stale-while-revalidate=3600` を追加。クライアント fetch を SWR に差し替え、前回データを即時再利用。

### 3. 画像最適化
- 体験カード画像をすべて `next/image` に統一（`components/PlaceCard.tsx`, `components/InspirationCard.tsx` を確認）。`sizes` をブレークポイントごとに指定し、`priority` はヒーローのみ。
- 既存画像のビルド前変換スクリプトを追加（例: `scripts/optimize-images.ts` + Sharp）。`public/` 配下の大きな JPEG/PNG を WebP/AVIF で 600/800px の派生を生成する。

### 4. 体感レスポンス改善
- `pages/chat/index.tsx` の初期ロード API を優先度順に分離：1) セッション一覧の最初の 5 件のみ取得、2) 推薦・マップはユーザー操作（タブ開く）時に遅延フェッチ。`useEffect` を分割し、依存関係を最小化。
- 横スクロール/無限リストでは 8–12 件単位で追加し、表示リストが長い箇所はリスト仮想化ライブラリ導入を検証（候補: `react-virtualized`）。

### 5. CSS/フォント・アイコン
- `lucide-react` を個別 import に統一し、共通インデックス import を削除（`pages/chat/index.tsx`, `components/ChatInterface.tsx` など）。
- フォントは `next/font` に移行し、使用する subset のみに限定。`pages/_app.tsx` またはレイアウトで設定。

### 6. バンドル監視とガード
- devDependencies に `@next/bundle-analyzer` と `size-limit` を追加。`package.json` に `analyze` スクリプト、`size-limit` 設定（初回は shared JS 300kB 目安）を記述。
- CI で `ANALYZE=true npm run build` を週次実行し、出力レポートをアーティファクト化。閾値超過時にブロックするワークフローを追加。
