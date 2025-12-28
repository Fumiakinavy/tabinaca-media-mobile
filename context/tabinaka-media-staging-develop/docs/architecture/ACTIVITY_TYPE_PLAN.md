# 🎯 アクティビティタイプの再設計計画

## 📋 3つのタイプ定義

### 1️⃣ **company_affiliated（自社連携）**
- **メール内容**: QRコード + クーポンコード + 予約詳細
- **対象**: Gappyが直接連携している店舗
- **現在の該当**: 3個
  - kimono-dressing-experience
  - fountain-pen-buffet
  - 1-pint-of-your-favorite-draft-beer

### 2️⃣ **shibuya_pass（渋谷パス）**
- **メール内容**: 渋谷パスのリンク + 登録完了通知
- **対象**: 渋谷パスで購入できる体験
- **現在の該当**: （これから指定）

### 3️⃣ **partner_store（提携店舗・未連携）** ← 新規追加
- **メール内容**: 店舗情報 + アクセス + 利用方法 + （QRコードは任意）
- **対象**: 提携店舗だが、QRコード完全連携ではない
- **現在の該当**: 新規追加した117個のほとんど

---

## 🔧 必要な変更

### 1. TypeScriptの型定義を更新

```typescript
// config/experienceSettings.ts
export interface ExperienceConfig {
  slug: string;
  isActive: boolean;
  displayName: string;
  description?: string;
  showUnifiedForm?: boolean;
  showMap?: boolean;
  price?: number;
  discount?: string;
  activityType?: "company_affiliated" | "shibuya_pass" | "partner_store"; // ← 追加
}
```

### 2. 新しいメールテンプレートを作成

```
lib/emailTemplates/experiences/partner-store.ts
```

内容:
- 店舗名・住所・電話番号
- アクセス方法
- 営業時間
- 利用方法の説明
- Google Mapsリンク
- （オプション）簡易QRコード

### 3. APIロジックを更新

```typescript
// pages/api/form-submissions.ts

if (activityType === 'company_affiliated') {
  // QRコード + 詳細情報
  templateKey = activityData.slug || 'generic-experience';
} else if (activityType === 'shibuya_pass') {
  // 渋谷パスのリンク
  templateKey = 'shibuya-pass';
} else if (activityType === 'partner_store') {
  // 店舗情報
  templateKey = 'partner-store';
}
```

### 4. getExperienceActivityType関数を更新

```typescript
export const getExperienceActivityType = (
  slug: string,
): "company_affiliated" | "shibuya_pass" | "partner_store" => {
  const config = experienceSettings.find((exp) => exp.slug === slug);
  return config?.activityType || "partner_store"; // ← デフォルトを変更
};
```

---

## 📊 アクティビティの分類案

### **company_affiliated（3個）**
```
- kimono-dressing-experience
- fountain-pen-buffet
- 1-pint-of-your-favorite-draft-beer
```

### **shibuya_pass（渋谷パス連携予定）**
```
（将来的に渋谷パスと連携する体験をここに追加）
```

### **partner_store（117個）**
```
新規追加した全てのアクティビティ:
- ninja-crash-course-in-harajuku
- make-japanese-food-samples-in-asakusa
- cut-your-own-edo-kiriko-glass-at-sokichi-asakusa
- shinjuku-urban-onsen-reset-at-thermae-yu
- all-you-can-play-bar-sprint-at-zino-shibuya
- paint-your-own-japanese-teacup-and-matcha-tasting
- tenq-space-museum-mini-mission-at-tokyo-dome-city
... など117個
```

---

## 📧 メールテンプレートのイメージ

### **partner_store テンプレート**

```
件名: [Gappy] Booking Confirmation - [Activity Name]

本文:
━━━━━━━━━━━━━━━━━━━━
🎌 予約確認
━━━━━━━━━━━━━━━━━━━━

[ユーザー名] 様

[Activity Name] のご予約を受け付けました。
以下の店舗情報をご確認の上、直接ご来店ください。

━━━━━━━━━━━━━━━━━━━━
📍 店舗情報
━━━━━━━━━━━━━━━━━━━━

店舗名: [Store Name]
住所: [Address]
電話番号: [Phone]
営業時間: [Hours]

🗺️ アクセス:
[Google Maps Link]

━━━━━━━━━━━━━━━━━━━━
ℹ️ ご利用方法
━━━━━━━━━━━━━━━━━━━━

1. 店舗に直接お越しください
2. スタッフに「Gappyで予約しました」とお伝えください
3. 本メールをご提示ください

━━━━━━━━━━━━━━━━━━━━
📝 重要事項
━━━━━━━━━━━━━━━━━━━━

- 予約確認番号: [Booking ID]
- 所要時間: [Duration]
- 持ち物: [Items to bring]
- キャンセル: [Cancellation policy]
```

---

## ✅ 実装ステップ

1. [ ] TypeScript型定義を更新（`partner_store`追加）
2. [ ] `partner-store.ts`メールテンプレート作成
3. [ ] `getExperienceActivityType`のデフォルト値を`partner_store`に変更
4. [ ] `pages/api/form-submissions.ts`のロジック更新
5. [ ] `experienceSettings.ts`で明示的に分類
6. [ ] テストメール送信で確認

---

## 🤔 検討事項

### **partner_storeでもQRコードを生成する？**
- ✅ **生成する**: 店舗での確認が簡単
- ❌ **生成しない**: シンプルなメール

→ **推奨**: 簡易的なQRコード（予約IDのみ）を生成して添付

### **店舗情報はどこから取得？**
- `activities`テーブルの`location`カラム
- MDXファイルのフロントマター
- 別途データベースに保存

---

実装を進めますか？

