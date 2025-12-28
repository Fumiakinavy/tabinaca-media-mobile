---
title: Database Documentation Change History
description: "ER/UML/データ辞書を含むドキュメント変更履歴"
last_updated: 2025-11-12
---

# Database Documentation Change History

データベース設計ドキュメント（ER図・UML図・データ辞書・命名規約）の更新履歴を記録します。更新時はこのページと該当ドキュメント双方を必ず修正してください。

| Date | Version | Summary | Author | References |
| --- | --- | --- | --- | --- |
| 2025-11-12 | v0.1.0 | 初版作成。ER図/UML図/データ辞書/命名規約を `docs/database/` に追加。 | GPT-5 Codex | `docs/database_design.md` |

## 更新フロー
1. 変更提案 (IssueまたはPR) に背景・影響範囲を記載。
2. 影響するドキュメント (`er_diagram.md`, `uml_diagram.md`, `data_dictionary.md`, `naming_and_design_principles.md`) を更新。
3. テーブル/ENUM追加時は `docs/database_design.md` とマイグレーションSQLを同期。
4. 本履歴にエントリを追記し、関連Issue/PR番号を References 欄へ添付。

## バージョニング指針
- `MAJOR`: 互換性を破壊するスキーマ再設計 (例: テーブル再構成)。
- `MINOR`: テーブルや列の追加・ENUM拡張。
- `PATCH`: ドキュメント記載のみの微修正や誤記訂正。






