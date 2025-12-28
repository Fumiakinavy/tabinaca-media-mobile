# 📧 メール送信システムの仕組み（3タイプ対応）

## 🎯 概要

新しく追加した120個のアクティビティは、**3つのタイプ**に分類され、それぞれに最適化されたメールが自動送信されます。

---

## 🔄 メール送信フロー

```
ユーザーがフォーム送信
    ↓
データベースに保存（form_submissions テーブル）
    ↓
QRコード生成
    ↓
アクティビティタイプ判定
    ↓
├─ company_affiliated → QRコード + 詳細情報メール
├─ shibuya_pass → 渋谷パスのリンク付きメール
└─ partner_store → 店舗情報 + QRコードメール
    ↓
メール送信（SendGrid）
```

---

## 🏷️ 3つのアクティビティタイプ

### **タイプ1: company_affiliated（自社連携）**

現在、以下の3つ：

```typescript
{
  slug: "kimono-dressing-experience",
  activityType: "company_affiliated"
}
{
  slug: "fountain-pen-buffet",
  activityType: "company_affiliated"
}
{
  slug: "1-pint-of-your-favorite-draft-beer",
  activityType: "company_affiliated"
}
```

**📧 メール内容:**
- ✅ QRコード付き
- ✅ 詳細な会場情報
- ✅ クーポンコード
- ✅ 予約ID
- ✅ 個別カスタマイズされたデザイン
- ✅ アクセス情報・Instagram等のリンク

**🎯 用途:** Gappyが直接連携している店舗・サービス

---

### **タイプ2: shibuya_pass（渋谷パス）**

```typescript
{
  slug: "example-activity",
  activityType: "shibuya_pass"
}
```

**📧 メール内容:**
- ⚠️ QRコードなし
- ✅ Shibuya Pass登録完了通知
- ✅ Shibuya Passウェブサイトへのリンク
- ✅ 渋谷記事・ガイドへのリンク

**🎯 用途:** 渋谷パスで購入できる体験

---

### **タイプ3: partner_store（提携店舗）** ⭐ NEW!

**新しく追加した117個のアクティビティはデフォルトでこのタイプ！**

```typescript
{
  slug: "ninja-crash-course-in-harajuku",
  // activityType指定なし = "partner_store"（デフォルト）
}
```

**📧 メール内容:**
- ✅ QRコード付き
- ✅ 店舗情報（名前・住所・電話番号・営業時間）
- ✅ Google Mapsリンク
- ✅ 予約確認コード
- ✅ ご利用方法の説明
- ✅ 重要事項・注意点

**🎯 用途:** 提携店舗だが完全連携ではない体験

---

## 📋 メールテンプレート選択ロジック

```typescript
// pages/api/form-submissions.ts (Line 286-390)

if (activityType === 'company_affiliated') {
  // 1. 自社連携: QRコード + 詳細情報
  const templateKey = activityData.slug || 'generic-experience';
  const emailTemplate = experienceEmailTemplates[templateKey] 
                        || experienceEmailTemplates['generic-experience'];
  // QRコード付きメール送信
  
} else if (activityType === 'shibuya_pass') {
  // 2. Shibuya Pass: 渋谷パスのリンク
  const emailTemplate = experienceEmailTemplates['shibuya-pass'];
  // QRコードなしメール送信
  
} else if (activityType === 'partner_store') {
  // 3. 提携店舗: 店舗情報 + QRコード
  const emailTemplate = experienceEmailTemplates['partner-store'];
  // 店舗情報とQRコード付きメール送信
}
```

---

## 📝 メールテンプレート一覧

### **現在利用可能なテンプレート** (`lib/emailTemplates/experiences/index.ts`)

```typescript
{
  "kimono-dressing-experience": kimonoDressingExperienceTemplate,
  "shibuya-pass": shibuyaPassRegistrationTemplate,
  "fountain-pen-buffet": fountainPenBuffetTemplate,
  "1-pint-of-your-favorite-draft-beer": onePintDraftBeerTemplate,
  "emi-authentic-sushi-making-class-in-tokyo": emiAuthenticSushiMakingClassTemplate,
  "generic-experience": genericExperienceTemplate,
  "partner-store": partnerStoreTemplate, // ⭐ NEW!
}
```

---

## 🆕 新しいアクティビティのメール送信

### **現在の動作（117個の新規アクティビティ）**

1. **activityType = "shibuya_pass"**（デフォルト）
2. **テンプレート = "shibuya-pass"**
3. **メール内容:**
   ```
   件名: [Gappy] Thank you for registering! Enjoy your Shibuya experience
   
   内容:
   - 登録完了メッセージ
   - Shibuya Passの説明
   - Shibuya Passウェブサイトへのリンク
   - 渋谷記事へのリンク
   - QRコードなし
   ```

---

## ⚙️ 送信設定

### **SendGrid設定**

```bash
# .env
SENDGRID_API_KEY=your_api_key_here
SENDGRID_FROM_EMAIL=yuta@gappy.jp  # 検証済みアドレス
```

### **送信される情報**

```typescript
// メール本文に含まれる情報
{
  to: email,                      // ユーザーのメールアドレス
  from: "yuta@gappy.jp",          // 送信元（検証済み）
  subject: "件名",
  html: "HTMLメール本文",
  attachments: [                   // company_affiliatedのみ
    {
      content: qrCodeBuffer,       // QRコード画像（Base64）
      filename: "qrcode.png",
      type: "image/png",
      disposition: "inline",
      content_id: "qrcode"
    }
  ]
}
```

---

## 🔍 デバッグ情報

### **コンソールログ出力**

```bash
🔍 Form Submission Debug Info
📧 SendGrid configuration
📧 Using email template: shibuya-pass
📧 Sending email with attachments
✅ Email sent successfully
```

---

## ⚠️ 重要な注意点

### **新規アクティビティ（117個）の現状**

❌ **QRコードが生成されません**
   - `shibuya-pass`テンプレートはQRコードを使用しないため

❌ **クーポンコードが含まれません**
   - Shibuya Passウェブサイトでの購入を前提としているため

ℹ️ **登録完了通知のみ**
   - 実際の予約情報は含まれない
   - Shibuya Passへの誘導が主目的

---

## 🚀 改善案（オプション）

### **案1: 全アクティビティでQRコードを有効にする**

```typescript
// experienceSettings.ts
{
  slug: "ninja-crash-course-in-harajuku",
  activityType: "company_affiliated",  // ← 変更
  // これにより generic-experience テンプレートが使用される
}
```

### **案2: Shibuya Pass専用のQRコード付きテンプレートを作成**

新しいテンプレート `shibuya-pass-with-qr.ts` を作成し、QRコードも含める。

---

## 📊 統計情報

| 項目 | 数 | 備考 |
|------|-----|------|
| **総アクティビティ数** | 120 | 全て自動メール送信対応 |
| **company_affiliated** | 4 | QRコード + 詳細情報 |
| **shibuya_pass** | 32 | 渋谷パスのリンク（QRコードなし） |
| **partner_store** | 84 | QRコード + 店舗情報 |
| **個別テンプレート** | 5個 | company_affiliated用 |
| **汎用テンプレート** | 3個 | shibuya-pass, generic, partner-store |

### **詳細内訳**

#### **company_affiliated（4個）**
1. kimono-dressing-experience
2. fountain-pen-buffet
3. 1-pint-of-your-favorite-draft-beer
4. emi-authentic-sushi-making-class-in-tokyo

#### **shibuya_pass（32個）**
既存のアクティビティ（2025-10-08以前に作成）から自社連携を除いたもの
- miso-ramen-tasting-set
- shibuya-sky
- 150th-anniversary-art-exhibition-tea
- arcade-combo-claw-driving-simulator
- その他28個

#### **partner_store（84個）**
2025-10-09以降に新規追加されたアクティビティ（85個）から1個（emi-authentic-sushi）を除いたもの

---

## ✅ 結論

### **新しく追加した117個のアクティビティは:**

✅ **メール送信機能が動作しています**
   - フォーム送信後、自動的にメールが送信されます

⚠️ **QRコードは含まれません**
   - `shibuya_pass`タイプのため、Shibuya Pass登録完了通知が送信されます
   - Shibuya Passウェブサイトへの誘導リンクが含まれます

ℹ️ **Shibuya Passセクションの判定**
   - kimono-dressing-experience以外の117個は自動的に`shibuya_pass`タイプになります
   - フロントエンドでもShibuya Passセクションが表示されます

ℹ️ **必要に応じてactivityTypeを変更可能**
   - `experienceSettings.ts`で各アクティビティの`activityType`を変更できます
   - `company_affiliated`: QRコード + 詳細情報（Instagram等）
   - `shibuya_pass`: 渋谷パスのリンク（デフォルト）
   - `partner_store`: 店舗情報 + QRコード（今後使用予定）

---

## 📞 サポート

メール送信に関する問題が発生した場合：

1. **SendGrid設定を確認**
   ```bash
   # .envファイル
   SENDGRID_API_KEY=...
   SENDGRID_FROM_EMAIL=yuta@gappy.jp
   ```

2. **コンソールログを確認**
   ```bash
   npm run dev
   # フォーム送信後、ターミナルのログを確認
   ```

3. **テンプレートファイルを確認**
   ```bash
   lib/emailTemplates/experiences/
   ```

---

**生成日時:** ${new Date().toISOString()}

