---
title: DB運用最適化提案
description: 現行スキーマを踏まえた性能・コスト・ガバナンス最適化の実行案
last_updated: 2025-11-28
owner: data-team
---

# 背景
- Supabase (PostgreSQL 15) 上で、行動トラッキング・チャット履歴・クイズ/レコメンド・バウチャーを一元管理。
- 2025-01 にスキーマ刷新（`activity_interactions` への統合、`quiz_*`/`chat_*`/`recommendation_*` 追加）、2025-11 にチャット強化とクイズ嗜好拡張を実施。
- 現行課題: 行動ログの増大によるクエリ性能劣化、マテビュー刷新の運用負荷、ガバナンス（削除・同意）の実効性、ベンダー向け権限制御の粒度不足。

# 方針
- **性能**: 曜日・時間別スパイクに耐える読み取り経路を優先最適化。
- **コスト**: 長期保管コストを抑えるため、階層的ストレージとパーティションを導入。
- **ガバナンス**: 同意・削除リクエストの運用をDBレベルで完結できる仕組みに拡張。
- **運用性**: マテビュー/統計のリフレッシュと監視を自動化し、失敗時にアラートできる形に。

# 直近 0-2 週間で着手すべき項目
1. **イベントテーブルの月次パーティション化**  
   - 対象: `user_behavior_events`, `business_metrics_events`, `session_replay_events`.  
   - 例: `CREATE TABLE ... PARTITION BY RANGE (event_timestamp);` + `CREATE TABLE ... FOR VALUES FROM ('2025-11-01') TO ('2025-12-01');`  
   - ローテーション: 月初に新パーティション作成・保持期間超えを `DROP TABLE`。`run_daily_maintenance` とは別に `rotate_event_partitions()` を追加。
2. **高頻度クエリ向けインデックス拡充**  
   - `activity_interactions(account_id, interaction_type, created_at DESC)` で履歴/重複チェックを高速化。  
   - `search_queries` CTR 集計向けに `CREATE INDEX ... ON search_queries (clicked_result_id) WHERE clicked_result_id IS NOT NULL;` と `search_query text_pattern_ops`。  
   - `chat_sessions` タイトル検索用に `gin_trgm_ops` (拡張 `pg_trgm`) を追加。  
   - `voucher_redemptions(voucher_id, vendor_member_id)` 部分インデックスで店舗別照会を最適化。
3. **マテビューの定期 REFRESH と監視**  
   - 対象: `account_function_usage`, `top_search_keywords`。  
   - Supabase スケジュール関数 `refresh_analytics_hourly()` を作成し、成功/失敗を `audit_events` に記録。失敗は Slack 通知（既存 `lib/slack.ts`）で検知。
4. **ベンダー権限に合わせた RLS 追加**  
   - `voucher_redemptions` に vendor 側参照ポリシー: `vendor_member_id IN (SELECT id FROM vendor_members WHERE account_id = auth_account_id())` を追加。  
   - `vendors`/`vendor_members` にも閲覧専用ポリシーを追加し、ベンダー管理画面のクエリを安全化。

# 中期 1-2 ヶ月で進める項目
- **チャット履歴のアーカイブ分離**  
  - `chat_messages` の90日超を `chat_messages_archive` へ移送（圧縮格納 `content_gzip bytea`）。ビュー `chat_messages_recent` で直近のみ既存 API に供給。
- **派生統計のテーブル化**  
  - `data_quality_metrics`, `chat_performance_metrics` 等の重い集計を 1h バッチで専用テーブルに永続化し、ダッシュボードはテーブル参照に変更。
- **個人データ削除の実効性向上**  
  - `data_deletion_requests` 受領時に `deletion_jobs` キューへ投入し、バッチで対象行を匿名化/削除（対象: chat_* / quiz_* / tracking / interactions / vouchers）。
- **パーソナライズ特徴のキャッシュ**  
  - クイズ嗜好(`dietary_preferences` 等)と `activity_tags` を突合し、`account_profiles.preferences->'segments'` に非正規化キャッシュする関数を追加し、レコメンドAPIをクエリ1回に短縮。

# 推奨 DDL スケッチ（抜粋）
```sql
-- 1) activity_interactions 用インデックス
CREATE INDEX CONCURRENTLY IF NOT EXISTS activity_interactions_account_type_created_idx
  ON activity_interactions (account_id, interaction_type, created_at DESC);

-- 2) search CTR 集計
CREATE INDEX CONCURRENTLY IF NOT EXISTS search_queries_clicked_idx
  ON search_queries (clicked_result_id)
  WHERE clicked_result_id IS NOT NULL;
CREATE INDEX CONCURRENTLY IF NOT EXISTS search_queries_query_pattern_idx
  ON search_queries (search_query text_pattern_ops);

-- 3) chat タイトル検索
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE INDEX CONCURRENTLY IF NOT EXISTS chat_sessions_title_trgm_idx
  ON chat_sessions USING gin (title gin_trgm_ops);

-- 4) voucher redemption のベンダー参照
CREATE INDEX CONCURRENTLY IF NOT EXISTS voucher_redemptions_vendor_member_idx
  ON voucher_redemptions (vendor_member_id);

-- 5) 月次パーティション例（user_behavior_events）
CREATE TABLE IF NOT EXISTS user_behavior_events
  PARTITION BY RANGE (event_timestamp);
CREATE TABLE IF NOT EXISTS user_behavior_events_2025_11
  PARTITION OF user_behavior_events
  FOR VALUES FROM ('2025-11-01') TO ('2025-12-01');
-- 月次ローテーション関数 rotate_event_partitions() を作成し、
-- 次月パーティション作成＋保持期間超の DROP を自動化。
```

# 運用フロー案
- **スケジューラ**: Supabase Scheduled Functions で `refresh_analytics_hourly()`（マテビュー）、`rotate_event_partitions()`（月次）、`run_daily_maintenance()`（既存）を実行。
- **監視**: 失敗時は `audit_events` に `event_type='job_failure'` を書き、Slack 通知。成功/失敗回数を週次でレビュー。
- **権限**: service_role 以外に ops ロール（JWT クレーム `role=ops`）を導入し、監査/統計参照のみ許可。RLS ポリシーに `is_ops_role()` を追加して分岐。
- **データ保持ポリシー**: イベント系 24ヶ月、セッションリプレイ 90日、チャット本文 90日（アーカイブへ移送）、バウチャー 36ヶ月 を目安に運用し、変更時はこのドキュメントを更新。

# リスクと留意点
- パーティション導入時は既存テーブルを ATTACH する必要があるため、一時的なメンテナンス時間が必要。
- pg_trgm 有効化は拡張追加のため、権限チェックが必要（Supabase プロジェクト設定で許可）。
- マテビュー CONCURRENTLY は同時実行不可。スケジュール間隔をずらし、ロック競合を避ける。
- アーカイブ分離後は API/ビューが直近データに限定されるため、管理画面で「過去データ参照」機能が必要か事前に合意する。

# 次のアクション（提案）
1. 週内に: パーティション導入 PoC（`user_behavior_events` のみ）とインデックス追加。
2. 来週: マテビュー刷新関数＋スケジュール作成、`voucher_redemptions` RLS 追加。
3. 12月中: アーカイブ設計と deletion_jobs キューの DDL をまとめ、実装スプリントに組み込む。
```
