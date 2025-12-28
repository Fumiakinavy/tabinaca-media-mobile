# ページ滞在時間トラッキング設計

目的: SPA（Next.js）上で **experience/vs gappychat** を含む全ページの滞在時間を正確に把握するために、**実際に画面にフォーカスを当てていた時間（active）**と**合計滞在時間**を記録し、Supabase上のダッシュボードが直接参照できるようにする。

## 計測フロー（クライアント）

1. `lib/pageDwellTracker.ts` が `router.events`／`visibilitychange`／`focus/blur`／`pagehide`／`beforeunload` を監視。
2. `startPage` で `enterAt` を記録、非アクティブ時間は `activeDurationMs` に蓄積する。
3. ルート変更・離脱時 (`flush`) に `totalDurationMs` / `activeDurationMs` 等を含む `page_dwell` イベントを `/api/track/ingest` に送信。  
4. `pageGroup` は `/experiences`→`experience`、`/chat`→`gappychat`、それ以外→`other`。将来的に `pagePath` を使って粒度を細かく拡張可。

## API受信

- `pages/api/track/ingest.ts` に `type === "page_dwell"` ブロックを追加。
- 受信 payload 例: `{ sessionId, pageUrl, pagePath, pageGroup, enterAt, leaveAt, totalDurationMs, activeDurationMs, referrer, userAgent, reason }`
- 保存先: 新テーブル `page_dwell_events`（account/session/page情報 + duration + metadata）。

## DBスキーマ

```sql
CREATE TABLE page_dwell_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID REFERENCES accounts(id) ON DELETE SET NULL,
  session_id TEXT NOT NULL,
  page_url TEXT NOT NULL,
  page_path TEXT NOT NULL,
  page_group TEXT,
  enter_at TIMESTAMPTZ NOT NULL,
  leave_at TIMESTAMPTZ NOT NULL,
  total_duration_ms BIGINT NOT NULL,
  active_duration_ms BIGINT NOT NULL,
  referrer TEXT,
  user_agent TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

主要なインデックス: `(account_id, enter_at)`, `(session_id, enter_at)`, `(page_path, enter_at)`, `(page_group, enter_at)`。これにより **日別/セッション別/ページ別** 集計が高速。

## ダッシュボード向けビュー

直近30日を対象にしたビュー `page_dwell_summary` を用意済み（`page_group` 別で滞在秒数をサマリ）。
主なカラム:

- `page_path`, `page_group`
- `views`: 該当期間内のイベント数（つまりページ訪問回数）
- `avg_active_seconds`, `median_active_seconds`, `total_active_seconds`, `max_active_seconds`

必要であれば `DATE(enter_at)` を追加した派生ビューや、`metadata->'reason'` を使った「離脱トリガー観測」も容易。

## 利用者向けヒント

1. `page_group` を使えば `experience` vs `gappychat` の滞在比較が簡単（例: `GROUP BY page_group`）。  
2. セッション継続性を追うなら `page_dwell_events` と `chat_sessions` を `account_id` でJOIN。  
3. `total_duration_ms - active_duration_ms` で「非アクティブ分」も確認できるため、バックグラウンド放置の影響度がわかる。
4. `metadata->'reason'` で「route_change_start」や「pagehide」などの離脱理由を分類可能。

## 運用

- この tracker はプロダクションのみ初期化される（`pages/_app.tsx` 内）。ステージングでも試したい場合は必要に応じて `process.env.NODE_ENV` のガードを調整する。  
- `gappy_tracking_disabled === "true"` の場合はイベント送信をスキップ。CookieConsent との整合性を保つことでユーザー選択を尊重。  
- マイグレーション `20251224000001_add_page_dwell_events.sql` を Supabase に適用すれば即座にダッシュボード利用可。後続で `page_dwell_summary` の `where` を拡張すれば任意期間に対するスライスも実現できる。

## 今後の拡張案

- `page_path` から `/experiences/[slug]` を更にグループ化し、体験単位ランキングを追加（MATERIALIZED VIEW 想定）。  
- `active_duration_ms` のパーセンタイル（90/95/99）を追加ビュー化し、「長時間滞在セッション」の検出。  
- `page_dwell_events` を `session_id` で `user_behavior_events` と結合し、同一セッション内の他イベントとの因果分析。

以上を踏まえれば、Dashboad担当者は直接 `page_dwell_summary` を参照して滞在時間KPIを可視化でき、必要に応じてカスタムSQLビューを追加すればさらに深掘りできます。必要ならこのドキュメントを `docs/tracking` に格納し、関連チームと共有してください。  
