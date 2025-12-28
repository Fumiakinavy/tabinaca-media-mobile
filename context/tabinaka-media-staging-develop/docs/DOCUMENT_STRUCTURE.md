# 📁 ドキュメント構造

このファイルは、プロジェクト全体のドキュメント構造を視覚的に示します。

---

## 🌳 フォルダ構造

```
docs/
├── README.md                           # メインドキュメント索引
├── DOCUMENT_STRUCTURE.md              # このファイル（構造説明）
│
├── 🔧 setup/                          # 環境設定（5ファイル）
│   ├── README.md
│   ├── ENV_SETUP.md
│   ├── README_ENVIRONMENT_SETUP.md
│   ├── SUPABASE_OAUTH_FIX.md
│   ├── SUPABASE_REDIRECT_SETUP.md
│   └── AUTO_REDIRECT_SETUP.md
│
├── ⚡ features/                       # 機能説明（5ファイル）
│   ├── README.md
│   ├── README_LIKE_FEATURE.md
│   ├── README_QR_CODE_SYSTEM.md
│   ├── README_GOOGLE_MAPS_REVIEWS.md
│   ├── README_EXPERIENCE_MANAGEMENT.md
│   └── README_NGROK.md
│
├── 🚀 development/                    # 開発ガイド（4ファイル）
│   ├── README.md
│   ├── DEPLOYMENT_CHECKLIST.md
│   ├── SEO_CHECKLIST.md
│   ├── OPTIMIZATION_RECOMMENDATIONS.md
│   └── OPTIMIZATION_REPORT.md
│
├── 📝 implementation/                 # 実装レポート（3ファイル）
│   ├── README.md
│   ├── IMPLEMENTATION_SUMMARY.md
│   ├── README_ACTIVITIES_GENERATOR.md
│   └── README_LIKE_SYSTEM_FIX.md
│
└── 🏗️ architecture/                   # アーキテクチャ（3ファイル）
    ├── README.md
    ├── EMAIL_SYSTEM_REPORT.md
    ├── FINAL_ACTIVITY_CLASSIFICATION.md
    └── ACTIVITY_TYPE_PLAN.md
```

---

## 📊 統計情報

| カテゴリ | ファイル数 | 説明 |
|---------|-----------|------|
| **setup** | 6 | 環境設定・セットアップ |
| **features** | 6 | 機能の使い方・説明 |
| **development** | 5 | 開発・デプロイ・最適化 |
| **implementation** | 4 | 実装レポート・履歴 |
| **architecture** | 4 | システム設計・アーキテクチャ |
| **ルート** | 2 | 索引・構造説明 |
| **合計** | **27** | |

---

## 🎯 ドキュメントの種類

### README.md（6個）
各カテゴリのインデックスファイル

**場所**:
- `docs/README.md` - メインインデックス
- `docs/setup/README.md` - 環境設定インデックス
- `docs/features/README.md` - 機能説明インデックス
- `docs/development/README.md` - 開発ガイドインデックス
- `docs/implementation/README.md` - 実装レポートインデックス
- `docs/architecture/README.md` - アーキテクチャインデックス

---

### セットアップガイド（5個）
環境構築と設定方法

**ファイル**:
1. `ENV_SETUP.md` - 環境変数設定
2. `README_ENVIRONMENT_SETUP.md` - Supabaseブランチ環境設定
3. `SUPABASE_OAUTH_FIX.md` - OAuth設定修正
4. `SUPABASE_REDIRECT_SETUP.md` - リダイレクト設定
5. `AUTO_REDIRECT_SETUP.md` - 自動リダイレクト実装

---

### 機能説明（5個）
各機能の詳細説明

**ファイル**:
1. `README_LIKE_FEATURE.md` - いいね機能
2. `README_QR_CODE_SYSTEM.md` - QRコードシステム
3. `README_GOOGLE_MAPS_REVIEWS.md` - Google Mapsレビュー
4. `README_EXPERIENCE_MANAGEMENT.md` - 体験管理システム
5. `README_NGROK.md` - ngrok開発環境

---

### 開発ガイド（4個）
開発・デプロイ・最適化

**ファイル**:
1. `DEPLOYMENT_CHECKLIST.md` - デプロイチェックリスト
2. `SEO_CHECKLIST.md` - SEO最適化チェックリスト
3. `OPTIMIZATION_RECOMMENDATIONS.md` - パフォーマンス最適化推奨
4. `OPTIMIZATION_REPORT.md` - 最適化レポート

---

### 実装レポート（3個）
機能実装の詳細記録

**ファイル**:
1. `IMPLEMENTATION_SUMMARY.md` - メール送信システム実装
2. `README_ACTIVITIES_GENERATOR.md` - アクティビティSQL生成ツール
3. `README_LIKE_SYSTEM_FIX.md` - いいねシステム修正

---

### アーキテクチャ（3個）
システム設計と構造

**ファイル**:
1. `EMAIL_SYSTEM_REPORT.md` - メール送信システムの仕組み
2. `FINAL_ACTIVITY_CLASSIFICATION.md` - アクティビティ分類（120個）
3. `ACTIVITY_TYPE_PLAN.md` - アクティビティタイプ再設計計画

---

## 🔍 ドキュメントの探し方

### シナリオ別ガイド

#### 🆕 新しいプロジェクトメンバーの場合
```
1. docs/README.md を読む
2. docs/setup/ で環境をセットアップ
3. docs/features/ で機能を理解
4. docs/architecture/ でシステム設計を把握
```

#### 🐛 バグを修正する場合
```
1. docs/features/ で該当機能のドキュメントを確認
2. docs/architecture/ でシステム設計を確認
3. docs/implementation/ で過去の実装レポートを参照
```

#### 🚀 新機能を追加する場合
```
1. docs/architecture/ で設計方針を確認
2. docs/implementation/ で実装パターンを参照
3. コードを実装
4. docs/implementation/ に実装レポートを追加
```

#### 📈 パフォーマンス改善の場合
```
1. docs/development/OPTIMIZATION_RECOMMENDATIONS.md を読む
2. docs/development/OPTIMIZATION_REPORT.md で過去の改善を確認
3. 改善を実施
4. レポートを更新
```

#### 🚀 デプロイする場合
```
1. docs/development/DEPLOYMENT_CHECKLIST.md を確認
2. チェックリストの項目を実行
3. デプロイ
```

---

## 📖 ドキュメント命名規則

### README形式
```
README_[機能名].md
例: README_LIKE_FEATURE.md
```
**用途**: 機能の説明・使い方

---

### レポート形式
```
[機能名]_REPORT.md
例: EMAIL_SYSTEM_REPORT.md
```
**用途**: システムの仕組み・設計

---

### サマリー形式
```
[機能名]_SUMMARY.md
例: IMPLEMENTATION_SUMMARY.md
```
**用途**: 実装の完了レポート

---

### 計画書形式
```
[機能名]_PLAN.md
例: ACTIVITY_TYPE_PLAN.md
```
**用途**: 設計計画・実装計画

---

### チェックリスト形式
```
[項目名]_CHECKLIST.md
例: DEPLOYMENT_CHECKLIST.md
```
**用途**: 確認項目リスト

---

### 分類形式
```
[内容]_CLASSIFICATION.md
例: FINAL_ACTIVITY_CLASSIFICATION.md
```
**用途**: データの分類・整理

---

## 🔄 ドキュメントのライフサイクル

### 1. 作成
```
新機能開発 → 設計書作成 → 実装 → 実装レポート作成
```

### 2. 更新
```
機能変更 → 該当ドキュメント更新 → READMEの更新
```

### 3. アーカイブ
```
機能廃止 → ドキュメントに[ARCHIVED]マークを追加
```

---

## 📝 ドキュメント管理のベストプラクティス

### ✅ やるべきこと

1. **新機能を実装したら必ずドキュメントを作成**
   - 実装レポートを`docs/implementation/`に追加
   - 該当カテゴリのREADMEを更新

2. **既存機能を変更したらドキュメントを更新**
   - 変更内容を反映
   - 更新日を記載

3. **適切なカテゴリに配置**
   - セットアップ → `setup/`
   - 機能説明 → `features/`
   - 開発ガイド → `development/`
   - 実装レポート → `implementation/`
   - アーキテクチャ → `architecture/`

4. **クロスリファレンスを活用**
   - 関連ドキュメントへのリンクを追加
   - 「詳細は〜を参照」と記載

---

### ❌ 避けるべきこと

1. **ルートディレクトリにドキュメントを置かない**
   - 必ず`docs/`配下の適切なフォルダに配置

2. **重複したドキュメントを作らない**
   - 既存のドキュメントを更新する

3. **命名規則を無視しない**
   - 統一された命名規則に従う

4. **古いドキュメントを放置しない**
   - 不要なものは削除または[ARCHIVED]マークを追加

---

## 🔧 メンテナンス

### 定期的な確認項目

- [ ] リンク切れがないか確認
- [ ] 情報が最新か確認
- [ ] 不要なドキュメントの削除
- [ ] 新しいドキュメントの追加をREADMEに反映

### 月次レビュー

1. 全ドキュメントの内容確認
2. 古い情報の更新
3. 新機能のドキュメント作成状況確認
4. ドキュメント構造の最適化

---

## 📞 サポート

ドキュメントに関する質問・提案:
- 📧 Email: mitsuki@gappy.jp
- 💬 Slack: #tabinaka-media-docs

---

**作成日**: ${new Date().toLocaleDateString('ja-JP')}  
**最終更新**: ${new Date().toISOString()}

