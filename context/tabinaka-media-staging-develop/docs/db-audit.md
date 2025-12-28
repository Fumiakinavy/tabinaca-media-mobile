# DBまわりの懸念点とリファクター案

## 調査範囲
- `lib/supabaseServer.ts`, `lib/supabaseAuth.ts`
- `pages/business/review-qr/[bookingId].tsx`
- 主要な Supabase 利用 API (`pages/api/account/quiz-state.ts` など)

## 懸念点
- **サービスロールキーの無認証利用（PII漏えいの危険）**  
  `pages/business/review-qr/[bookingId].tsx` で `getServerSideProps` が URL だけを鍵に `form_submissions` から `user_email` などの個人情報をサービスロールキーで取得している。認証なしで誰でも予約 ID を推測すれば生データにアクセス可能。
- **クライアント SDK がダミー接続を黙認**  
  `lib/supabaseAuth.ts` は環境変数が欠けてもプレースホルダー URL/anon キーで初期化する。設定ミスを検知できず「別プロジェクト（placeholder）」に書き込みに行く、あるいは 401 を量産して障害に気付きにくい。
- **サーバー SDK もダミー接続を返す**  
  `lib/supabaseServer.ts` は開発/CI で必須環境変数が無くても `dummy.supabase.co` を返す。失敗を握りつぶして本番相当のテストができず、移行時に気付きにくい。
- **サービスロールキー常用による RLS バイパス範囲が広い**  
  多くの API (`account/quiz-state`, `chat/*`, `track/search` など) が `supabaseServer`（= service_role）で実行され、リクエスト元のユーザー JWT を付けない。RLS を前提としたスキーマであれば想定より広い権限で実行される。

## リファクター案
- **事業者用 QR ページを認可付きエンドポイントに移行**  
  - `/business/review-qr` のデータ取得を API 経由にし、管理者/事業者セッション（例: Supabase Admin JWT か社内用 Basic Auth）でのみ発行。  
  - レコード取得は `eq('booking_id', bookingId)` に加え、「事業者が担当する予約か」を確認する追加条件を付与。  
  - サービスロールキーは API ルートのサーバー側でのみ使用し、クライアントに渡さない。
- **クライアント SDK 初期化を fail-fast に変更**  
  - `lib/supabaseAuth.ts` を `getClientEnvVar` などバリデーション関数経由に変更し、必須変数が無い場合は初期化前に明示的に throw。  
  - プレースホルダー鍵は削除し、`NEXT_PUBLIC_SUPABASE_URL/ANON_KEY` が無いビルドは即座に落とす。
- **サーバー SDK も必須変数が無ければ例外を投げる**  
  - `lib/supabaseServer.ts` の「開発時ダミークライアント」分岐を廃止し、CI だけ明示的に `DANGEROUS_ALLOW_DUMMY_SUPABASE` フラグ付きで許可するなど、意図的な opt-in にする。  
  - バリデーション結果を `console.warn` で終わらせず、初期化時に `Error` を投げる。
- **ユーザー権限付きクライアントを用意して RLS を活かす**  
  - サーバー側で `createClient(supabaseUrl, supabaseAnonKey, { global: { headers: { Authorization: \`Bearer ${userJwt}\` }}})` を返す `getUserScopedSupabase(token)` ヘルパーを追加。  
  - ユーザー固有データを扱う API (`account/quiz-state`, `chat/*` 更新系など) は service_role ではなくユーザー JWT 付きクライアントを使う。  
  - service_role が必要なバッチ系処理と、ユーザースコープ API を明確に分離する。
- **監視とテストの補強**  
  - 起動時に環境変数チェックを 1 箇所にまとめ、Missing を検知したら `process.exit(1)` する仕組みを追加。  
  - CI では dummy 接続を使う場合でも、明示的に `SUPABASE_DUMMY_MODE=true` を要求し、ログに「本番 DB には繋がっていない」ことを出力。  
  - PII を返すクエリには必ず遮断テスト（認証無しで 200 が返らないか）を追加。
