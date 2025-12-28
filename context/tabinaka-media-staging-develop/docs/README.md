# 📚 Gappy Tabinaka Media ドキュメント

このディレクトリには、Gappy Tabinaka Mediaプロジェクトの全てのドキュメントが整理されています。

---

## 📁 ドキュメント構造

### 🚀 [vision-AIver/](./vision-AIver/) - Gappy 2.0 ビジョン ⭐ NEW
次世代体験発見プラットフォームの包括的なビジョンと技術仕様

- [README.md](./vision-AIver/README.md) - ビジョンドキュメント総合ガイド
- [00_PROJECT_OVERVIEW.md](./vision-AIver/00_PROJECT_OVERVIEW.md) - プロジェクト全体像
- [01_AI_SYSTEM.md](./vision-AIver/01_AI_SYSTEM.md) - AIチャットボット & 自動生成システム
- [02_MAP_INTEGRATION.md](./vision-AIver/02_MAP_INTEGRATION.md) - インタラクティブマップ × チャット統合
- [03_MICRO_EXPERIENCES.md](./vision-AIver/03_MICRO_EXPERIENCES.md) - マイクロエクスペリエンス（体験の民主化）
- [04_VERB_BASED_NAMING.md](./vision-AIver/04_VERB_BASED_NAMING.md) - 動詞主導命名規則（こと消費）
- [05_LEARNING_RECOMMENDATION_ENGINE.md](./vision-AIver/05_LEARNING_RECOMMENDATION_ENGINE.md) - 学習型レコメンデーションエンジン ⭐ NEW

---

### 🔧 [setup/](./setup/) - 環境設定
プロジェクトのセットアップと環境構築に関するドキュメント

- [ENV_SETUP.md](./setup/ENV_SETUP.md) - 環境変数の設定ガイド
- [README_ENVIRONMENT_SETUP.md](./setup/README_ENVIRONMENT_SETUP.md) - Supabaseブランチ機能用環境設定
- [SUPABASE_OAUTH_FIX.md](./setup/SUPABASE_OAUTH_FIX.md) - Supabase OAuth設定の修正方法
- [SUPABASE_REDIRECT_SETUP.md](./setup/SUPABASE_REDIRECT_SETUP.md) - Supabaseリダイレクト設定
- [AUTO_REDIRECT_SETUP.md](./setup/AUTO_REDIRECT_SETUP.md) - 自動リダイレクトの設定

---

### ⚡ [features/](./features/) - 機能説明
各機能の使い方と実装詳細

- [README_LIKE_FEATURE.md](./features/README_LIKE_FEATURE.md) - いいね機能の説明
- [README_QR_CODE_SYSTEM.md](./features/README_QR_CODE_SYSTEM.md) - QRコードシステムの説明
- [README_GOOGLE_MAPS_REVIEWS.md](./features/README_GOOGLE_MAPS_REVIEWS.md) - Google Mapsレビュー機能
- [README_EXPERIENCE_MANAGEMENT.md](./features/README_EXPERIENCE_MANAGEMENT.md) - 体験管理システム
- [README_NGROK.md](./features/README_NGROK.md) - ngrokを使った開発環境

---

### 🚀 [development/](./development/) - 開発ガイド
開発・デプロイ・最適化に関するドキュメント

- [DEPLOYMENT_CHECKLIST.md](./development/DEPLOYMENT_CHECKLIST.md) - デプロイチェックリスト
- [SEO_CHECKLIST.md](./development/SEO_CHECKLIST.md) - SEO最適化チェックリスト
- [OPTIMIZATION_RECOMMENDATIONS.md](./development/OPTIMIZATION_RECOMMENDATIONS.md) - パフォーマンス最適化の推奨事項
- [OPTIMIZATION_REPORT.md](./development/OPTIMIZATION_REPORT.md) - 最適化レポート

---

### 📝 [implementation/](./implementation/) - 実装レポート
機能実装の詳細レポートとガイド

- [IMPLEMENTATION_SUMMARY.md](./implementation/IMPLEMENTATION_SUMMARY.md) - メール送信システム実装サマリー
- [README_ACTIVITIES_GENERATOR.md](./implementation/README_ACTIVITIES_GENERATOR.md) - アクティビティSQL生成ツール
- [README_LIKE_SYSTEM_FIX.md](./implementation/README_LIKE_SYSTEM_FIX.md) - いいねシステムの修正レポート

---

### 🏗️ [architecture/](./architecture/) - アーキテクチャ・設計
システム設計とアーキテクチャに関するドキュメント

- [EMAIL_SYSTEM_REPORT.md](./architecture/EMAIL_SYSTEM_REPORT.md) - メール送信システムの仕組み
- [FINAL_ACTIVITY_CLASSIFICATION.md](./architecture/FINAL_ACTIVITY_CLASSIFICATION.md) - アクティビティ分類の最終確定
- [ACTIVITY_TYPE_PLAN.md](./architecture/ACTIVITY_TYPE_PLAN.md) - アクティビティタイプの再設計計画

---

## 🚀 クイックスタート

### 新規メンバーの方へ

1. **環境設定**: [setup/ENV_SETUP.md](./setup/ENV_SETUP.md) を読んで環境変数を設定
2. **主要機能の理解**: [features/](./features/) ディレクトリで各機能を確認
3. **開発開始**: [development/DEPLOYMENT_CHECKLIST.md](./development/DEPLOYMENT_CHECKLIST.md) でデプロイフローを確認

### 機能を追加する場合

1. **アーキテクチャを確認**: [architecture/](./architecture/) で設計方針を確認
2. **実装**: コードを書く
3. **ドキュメント作成**: 適切なカテゴリに実装レポートを追加

---

## 📖 ドキュメント管理ルール

### 新しいドキュメントを追加する場合

1. **適切なカテゴリを選択**:
   - 環境設定 → `setup/`
   - 機能説明 → `features/`
   - 開発ガイド → `development/`
   - 実装レポート → `implementation/`
   - 設計・アーキテクチャ → `architecture/`

2. **命名規則**:
   - README形式: `README_[機能名].md`
   - レポート形式: `[機能名]_REPORT.md`
   - 計画書: `[機能名]_PLAN.md`
   - チェックリスト: `[項目名]_CHECKLIST.md`

3. **このREADMEを更新**:
   - 新しいドキュメントを追加したら、該当セクションにリンクを追加

---

## 🔍 ドキュメントを探す

### 目的別ガイド

| 目的 | ドキュメント |
|------|-------------|
| 🌟 Gappy 2.0のビジョンを知りたい | [vision-AIver/README.md](./vision-AIver/README.md) |
| 🤖 AIチャットボットの仕組みを知りたい | [vision-AIver/01_AI_SYSTEM.md](./vision-AIver/01_AI_SYSTEM.md) |
| 🗺️ 地図統合の詳細を知りたい | [vision-AIver/02_MAP_INTEGRATION.md](./vision-AIver/02_MAP_INTEGRATION.md) |
| ✨ マイクロエクスペリエンスとは？ | [vision-AIver/03_MICRO_EXPERIENCES.md](./vision-AIver/03_MICRO_EXPERIENCES.md) |
| 📝 動詞主導タイトルの書き方 | [vision-AIver/04_VERB_BASED_NAMING.md](./vision-AIver/04_VERB_BASED_NAMING.md) |
| 🧠 学習型レコメンデーションとは？ | [vision-AIver/05_LEARNING_RECOMMENDATION_ENGINE.md](./vision-AIver/05_LEARNING_RECOMMENDATION_ENGINE.md) |
| 🆕 プロジェクトをセットアップしたい | [setup/ENV_SETUP.md](./setup/ENV_SETUP.md) |
| 📧 メール送信の仕組みを知りたい | [architecture/EMAIL_SYSTEM_REPORT.md](./architecture/EMAIL_SYSTEM_REPORT.md) |
| 🎯 アクティビティの分類を知りたい | [architecture/FINAL_ACTIVITY_CLASSIFICATION.md](./architecture/FINAL_ACTIVITY_CLASSIFICATION.md) |
| 🚀 デプロイしたい | [development/DEPLOYMENT_CHECKLIST.md](./development/DEPLOYMENT_CHECKLIST.md) |
| 👍 いいね機能を実装したい | [features/README_LIKE_FEATURE.md](./features/README_LIKE_FEATURE.md) |
| 📱 QRコードシステムを理解したい | [features/README_QR_CODE_SYSTEM.md](./features/README_QR_CODE_SYSTEM.md) |
| ⚡ パフォーマンスを改善したい | [development/OPTIMIZATION_RECOMMENDATIONS.md](./development/OPTIMIZATION_RECOMMENDATIONS.md) |

---

## 📞 サポート

ドキュメントに関する質問や提案がある場合:

- 📧 Email: mitsuki@gappy.jp
- 💬 Slack: #tabinaka-media チャンネル

---

**最終更新**: ${new Date().toISOString()}

