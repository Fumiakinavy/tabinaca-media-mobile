---
title: Naming Conventions & Design Principles
description: "tabinaka-media データベースの命名規約と設計指針"
last_updated: 2025-11-12
---

# Naming Conventions & Design Principles

## 命名規約
- **スキーマ**: Supabase標準の `public` を基本とし、将来的な分離が必要になった場合でも `snake_case` を維持する。
- **テーブル名**: すべて小文字の複数形 (`accounts`, `activity_interactions`)。ブリッジテーブルは `<entity>_<entity>_map` を採用。
- **カラム名**: `snake_case`。UUID主キーは `id`、FKは `<参照先>_id` を徹底。
- **ENUM名**: `<domain>_<concept>` 形式 (`account_status`, `quiz_session_status`)。値は英小文字+アンダースコアで表現。
- **ビュー/マテリアライズドビュー**: 互換用途は `legacy_*`、集計用途は `mv_*` を接頭辞に持つ。
- **インデックス**: 自動生成以外は `<table>_<columns>_<purpose>_idx`。部分インデックスは `_partial` を末尾に付与。
- **トリガー/関数**: 動詞+対象名 (`set_updated_at`, `enforce_voucher_scan_limit`)。
- **ファイル配置**: マイグレーションSQLは `supabase/migrations/<seq>_<description>.sql`。ドキュメントは `docs/database/` 以下に整理。

## データモデリング指針
- **`account_id` の一貫活用**: クライアント識別を `accounts.id` に集約し、SupabaseユーザーIDや外部IDは `account_linkages` で管理する。
- **`activity_id` × `activity_slug` の冗長管理**: 内部処理はUUID、外部公開・解析はスラッグを使用。履歴テーブルでは両方保持。
- **JSONB最小主義**: 頻繁に検索・集計するフィールドは正規化カラムを追加。JSONBは補助データや将来拡張の緩衝に留める。
- **ENUMによるビジネスルール明示**: ステータスやタイプの分岐はENUMで表現し、アプリ・DB双方で整合性を取る。
- **トレーサビリティの担保**: 重要操作は `audit_events` に記録し、`performed_by` を通じて操作者を特定できるようにする。
- **段階的移行 (Phase 0→2)**: 既存テーブルとの互換性を保ちながらDual writeで移行。旧テーブルは最終的にビュー化して段階的に廃止。
- **RLSファースト設計**: 各テーブルに対してユーザー/ベンダー/サービスロールのアクセス境界を定義し、テーブル構造で責務を切る。
- **監査と可観測性**: ENUM追加時はマイグレーションとRunbookを必ず更新。定期的な差分チェックで`legacy`系との整合性を監視。
- **拡張性の確保**: 高頻度テーブル (`activity_interactions`, `chat_messages`) は将来のパーティショニングを念頭に主キー/インデックスを設計。
- **ドキュメントドリブン**: データ辞書、ER図、UML図を最新状態に保ち、Issueベースで変更提案→ドキュメント更新→マイグレーション実装の順に進める。

## 非機能要件の考慮
- **パフォーマンス**: `created_at` DESCのアクセスが多いテーブルには複合インデックスを配置。素材テーブルはキャッシュやMVで補完。
- **セキュリティ**: Supabase RLSを活用し、JWTクレームから `account_id` を解決する関数を整備。
- **可用性**: Supabase PITRと週次 `pg_dump` によるバックアップ体制を維持。クリティカル操作前に手動スナップショットを取得。
- **監視**: レコメンドの失敗率、フォームINSERT失敗、バウチャースキャン制限突破のメトリクスをアラート化。

## 今後の運用指針
- ENUM追加・削除、JSONBキー追加は本ドキュメントと `docs/database/change_history.md` を同時更新。
- マテリアライズドビューは `supabase` スケジューラで更新し、更新ジョブの失敗はSlack通知で検知。
- 四半期ごとにER図とUML図を再生成し、Notionデータ辞書と差分を確認する。






