# 🏗️ アーキテクチャ・設計ドキュメント

システム設計とアーキテクチャに関するドキュメント集です。

---

## 📋 ドキュメント一覧

### 📧 [EMAIL_SYSTEM_REPORT.md](./EMAIL_SYSTEM_REPORT.md)
**概要**: メール送信システムの仕組み（3タイプ対応）  
**重要度**: ★★★★★

**主な内容**:
- メール送信フローの全体像
- 3つのアクティビティタイプ
  - company_affiliated（自社連携）
  - shibuya_pass（渋谷パス）
  - partner_store（提携店舗）
- メールテンプレートの選択ロジック
- 送信設定とデバッグ情報

**こんな時に読む**:
- メール送信の仕組みを理解したい
- 新しいメールテンプレートを追加したい
- メール送信エラーのデバッグ

---

### 🎯 [FINAL_ACTIVITY_CLASSIFICATION.md](./FINAL_ACTIVITY_CLASSIFICATION.md)
**概要**: アクティビティ分類の最終確定  
**重要度**: ★★★★★

**主な内容**:
- 120個のアクティビティの完全分類
  - company_affiliated: 4個
  - shibuya_pass: 32個
  - partner_store: 84個
- 自動判定ロジックの実装
- 各タイプの詳細リスト
- 判定フローチャート

**こんな時に読む**:
- アクティビティがどのタイプに属するか知りたい
- 新しいアクティビティを追加する時
- メール送信ロジックを理解したい

---

### 📐 [ACTIVITY_TYPE_PLAN.md](./ACTIVITY_TYPE_PLAN.md)
**概要**: アクティビティタイプの再設計計画  
**重要度**: ★★★★☆

**主な内容**:
- 3つのタイプ定義
- 必要な変更の詳細
- 実装ステップ
- 検討事項

**こんな時に読む**:
- アクティビティタイプの設計背景を知りたい
- システムの変更履歴を確認したい
- 今後の拡張を計画している

---

## 🏗️ システムアーキテクチャ概要

### メール送信システム

```
ユーザーがフォーム送信
    ↓
データベースに保存
    ↓
QRコード生成
    ↓
アクティビティタイプ判定
    ├─ company_affiliated → QRコード + 詳細情報メール
    ├─ shibuya_pass → 渋谷パスのリンク付きメール
    └─ partner_store → 店舗情報 + QRコードメール
    ↓
メール送信（SendGrid）
```

詳細: [EMAIL_SYSTEM_REPORT.md](./EMAIL_SYSTEM_REPORT.md)

---

### アクティビティ分類システム

```typescript
function getExperienceActivityType(slug: string) {
  // 1. 明示的な設定を確認
  if (config?.activityType) {
    return config.activityType;
  }
  
  // 2. 自社連携リストをチェック
  if (COMPANY_AFFILIATED_ACTIVITIES.includes(slug)) {
    return "company_affiliated";
  }
  
  // 3. Shibuya Passリストをチェック
  if (SHIBUYA_PASS_ACTIVITIES.includes(slug)) {
    return "shibuya_pass";
  }
  
  // 4. デフォルトはpartner_store
  return "partner_store";
}
```

詳細: [FINAL_ACTIVITY_CLASSIFICATION.md](./FINAL_ACTIVITY_CLASSIFICATION.md)

---

## 📊 統計情報

### アクティビティ分類

| タイプ | 件数 | メール内容 | QRコード |
|--------|------|------------|----------|
| **company_affiliated** | 4 | 詳細情報 + Instagram | ✅ |
| **shibuya_pass** | 32 | 渋谷パスのリンク | ❌ |
| **partner_store** | 84 | 店舗情報 + Google Maps | ✅ |
| **合計** | **120** | | |

### メールテンプレート

| テンプレート | 対象タイプ | 件数 |
|------------|-----------|------|
| 個別テンプレート | company_affiliated | 5種類 |
| shibuya-pass | shibuya_pass | 1種類 |
| partner-store | partner_store | 1種類 |
| generic-experience | フォールバック | 1種類 |

---

## 🎯 設計原則

### 1. 拡張性
- 新しいアクティビティタイプを簡単に追加できる
- メールテンプレートを柔軟にカスタマイズできる

### 2. 保守性
- 設定を一箇所で管理
- 自動判定ロジックでヒューマンエラーを削減

### 3. パフォーマンス
- 定数配列による高速な判定
- キャッシュ可能な設定

---

## 🔄 データフロー

### アクティビティ追加時

```
1. MDXファイル作成
    ↓
2. experienceSettings.tsに登録
    ↓
3. seed_activities.sqlに登録
    ↓
4. データベースに挿入
    ↓
5. 自動的にタイプが判定される
    ↓
6. 適切なメールテンプレートが選択される
```

---

## 📖 推奨読書順序

### 初めての方
1. [FINAL_ACTIVITY_CLASSIFICATION.md](./FINAL_ACTIVITY_CLASSIFICATION.md) - 全体像を把握
2. [EMAIL_SYSTEM_REPORT.md](./EMAIL_SYSTEM_REPORT.md) - メールシステムを理解
3. [ACTIVITY_TYPE_PLAN.md](./ACTIVITY_TYPE_PLAN.md) - 設計背景を学ぶ

### 機能追加する方
1. [ACTIVITY_TYPE_PLAN.md](./ACTIVITY_TYPE_PLAN.md) - 設計方針を確認
2. [FINAL_ACTIVITY_CLASSIFICATION.md](./FINAL_ACTIVITY_CLASSIFICATION.md) - 分類ルールを確認
3. コードを実装

### トラブルシューティング
1. [EMAIL_SYSTEM_REPORT.md](./EMAIL_SYSTEM_REPORT.md) - エラーの原因を特定
2. [FINAL_ACTIVITY_CLASSIFICATION.md](./FINAL_ACTIVITY_CLASSIFICATION.md) - 分類を確認

---

## 📞 サポート

アーキテクチャに関する質問:
- 📧 Email: mitsuki@gappy.jp
- 💬 Slack: #tabinaka-media-architecture

---

[← メインドキュメントに戻る](../README.md)

