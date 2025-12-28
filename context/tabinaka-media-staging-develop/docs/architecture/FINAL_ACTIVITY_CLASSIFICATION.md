# 🎯 アクティビティ分類の最終確定

## 📊 全120個のアクティビティ分類

| タイプ | 件数 | メール内容 | 自動判定 |
|--------|------|------------|----------|
| **company_affiliated** | 4 | QRコード + 詳細情報 + Instagram | ✅ |
| **shibuya_pass** | 32 | 渋谷パスのリンク（QRコードなし） | ✅ |
| **partner_store** | 84 | QRコード + 店舗情報 + Google Maps | ✅ |
| **合計** | **120** | | |

---

## 🔍 自動判定ロジック

### **実装場所:** `config/experienceSettings.ts`

```typescript
export const getExperienceActivityType = (
  slug: string,
): "company_affiliated" | "shibuya_pass" | "partner_store" => {
  // 1. 明示的な設定が存在する場合は優先
  if (config?.activityType) {
    return config.activityType;
  }
  
  // 2. 自社連携アクティビティ（4個）
  if (COMPANY_AFFILIATED_ACTIVITIES.includes(slug)) {
    return "company_affiliated";
  }
  
  // 3. Shibuya Passアクティビティ（32個）
  if (SHIBUYA_PASS_ACTIVITIES.includes(slug)) {
    return "shibuya_pass";
  }
  
  // 4. それ以外は未連携（84個）
  return "partner_store";
}
```

---

## 1️⃣ company_affiliated（自社連携）- 4個

### **特徴:**
- Gappyが直接連携している店舗・サービス
- 最も詳細なメール内容
- 個別カスタマイズされたテンプレート

### **リスト:**
```
1. kimono-dressing-experience
2. fountain-pen-buffet
3. 1-pint-of-your-favorite-draft-beer
4. emi-authentic-sushi-making-class-in-tokyo
```

### **メール内容:**
- ✅ QRコード付き
- ✅ 詳細な会場情報
- ✅ クーポンコード
- ✅ 予約ID
- ✅ Instagram等のSNSリンク
- ✅ アクセス情報・営業時間

---

## 2️⃣ shibuya_pass（渋谷パス）- 32個

### **特徴:**
- 既存のアクティビティ（2025-10-08以前に作成）
- Shibuya Passウェブサイトで購入可能
- UI上でShibuya Passセクションが表示される

### **リスト（32個）:**
```
1.  miso-ramen-tasting-set
2.  shibuya-sky
3.  150th-anniversary-art-exhibition-tea
4.  arcade-combo-claw-driving-simulator
5.  artisan-calzone-tasting-at-antonios-deli
6.  artisanal-french-toast-bakery-snack
7.  avocado-fiesta-burritos-taco-rice-margaritas
8.  chiku-chiku-cafe-hedgehog
9.  church-themed-dj-bar-experience-free-premium-tequila-shot
10. city-winery-tasting-snack
11. crispy-salted-fried-chicken
12. custom-salad-bowl-hot-soup
13. discover-antique-imari-ceramics-tea
14. drink-combo
15. fresh-zesty-pickles-or-acai-berry-yogurt-snack-for-600-at-shibuya-tokyu-food-show
16. guided-shibuya-city-walking-tour
17. hachikos-akita-treasures-in-shibuya-onsen-bath-salts-exclusive-plush
18. hands-free-shibuya-luggage-omamori
19. japanese-style-lounge-snacks-cocktails-music
20. live-dj-beats-cocktail-sake
21. open-top-bus-tour-shibuya
22. premium-japanese-whisky-sake-tasting
23. premium-sauna-retreat-healthy-eats
24. ramen-gyoza-meal-set
25. seasonal-bouquet-sandwich-juice
26. sesame-dumpling-tasting-goma-dango
27. shibuya-scramble-rooftop-mag8
28. sky-high-city-view-sake-tasting
29. taste-hokkaidos-tokachi-obanyaki-5-pancakes-for-600-at-shibuya-tokyu-food-show
30. taste-osakas-famous-dotonbori-kukuru-takoyaki-6-pcs-for-600-at-shibuya-tokyu-food-show
31. taste-regional-flavors-ecrus-szechuan-pickle-green-onion-steamed-chicken-salad
32. try-150-years-of-tradition-kinako-mochi-inari-inari-zushi-2-pcs-at-tokyos-historic-300-tasting
```

### **メール内容:**
- ⚠️ QRコードなし
- ✅ Shibuya Pass登録完了通知
- ✅ Shibuya Passウェブサイトへのリンク
- ✅ 渋谷記事・ガイドへのリンク
- ℹ️ 予約情報は含まれない

---

## 3️⃣ partner_store（提携店舗・未連携）- 84個

### **特徴:**
- 新規追加されたアクティビティ（2025-10-09以降）
- 提携店舗だが完全連携ではない
- 店舗情報とQRコードを含む標準的なメール

### **件数の内訳:**
- 新規追加アクティビティ: 85個
- うち1個（emi-authentic-sushi）は自社連携に分類
- **実質84個がpartner_store**

### **メール内容:**
- ✅ QRコード付き
- ✅ 店舗情報（名前・住所）
- ✅ Google Mapsリンク
- ✅ 予約確認コード
- ✅ ご利用方法の説明
- ✅ 重要事項・注意点
- ⚠️ Instagram等のSNSリンクはなし

---

## 📧 メールテンプレートマッピング

| activityType | メールテンプレート | QRコード | 詳細度 |
|--------------|-------------------|----------|--------|
| **company_affiliated** | 個別 or generic-experience | ✅ | 最高 |
| **shibuya_pass** | shibuya-pass-registration | ❌ | 低 |
| **partner_store** | partner-store | ✅ | 中 |

---

## 🔄 判定フローチャート

```
アクティビティスラッグを取得
    ↓
experienceSettings.tsで明示的に設定されている？
    ↓ YES → その値を返す
    ↓ NO
COMPANY_AFFILIATED_ACTIVITIESに含まれる？
    ↓ YES → "company_affiliated"
    ↓ NO
SHIBUYA_PASS_ACTIVITIESに含まれる？
    ↓ YES → "shibuya_pass"
    ↓ NO
    ↓
"partner_store"（デフォルト）
```

---

## ✅ 実装完了内容

### **1. 自動判定関数の実装**
- ファイル: `config/experienceSettings.ts`
- 関数: `getExperienceActivityType(slug)`
- 2つの定数配列で管理:
  - `COMPANY_AFFILIATED_ACTIVITIES`（4個）
  - `SHIBUYA_PASS_ACTIVITIES`（32個）

### **2. メール送信ロジックの分岐**
- ファイル: `pages/api/form-submissions.ts`
- 3つのタイプに応じた処理:
  - company_affiliated → 個別テンプレート + QRコード
  - shibuya_pass → 渋谷パス登録通知のみ
  - partner_store → 店舗情報 + QRコード

### **3. メールテンプレートの作成**
- ファイル: `lib/emailTemplates/experiences/`
  - `partner-store.ts`（新規作成）
  - `shibuya-pass-registration.ts`（既存）
  - `generic-experience.ts`（既存）
  - 個別テンプレート5個（既存）

---

## 🧪 動作確認

### **テスト用スラッグ:**

```bash
# company_affiliated
npm run dev
# http://localhost:2098/experiences/kimono-dressing-experience
# → 個別テンプレート + QRコード付きメール

# shibuya_pass
# http://localhost:2098/experiences/miso-ramen-tasting-set
# → Shibuya Pass登録完了メール（QRコードなし）

# partner_store
# http://localhost:2098/experiences/ninja-crash-course-in-harajuku
# → 店舗情報 + QRコード付きメール
```

---

## 📞 トラブルシューティング

### **Q: 新しいアクティビティを追加したらどのタイプになる？**
A: デフォルトで`partner_store`になります。

### **Q: タイプを変更したい場合は？**
A: `experienceSettings.ts`の該当エントリに`activityType`を追加するか、
   `COMPANY_AFFILIATED_ACTIVITIES`または`SHIBUYA_PASS_ACTIVITIES`配列に追加してください。

### **Q: メールが送信されない場合は？**
A: SendGrid設定（`.env`ファイル）を確認してください。

---

## 🎯 結論

**120個すべてのアクティビティが3つのタイプに正しく分類され、それぞれに最適化されたメールが自動送信されます！**

- ✅ 自動判定ロジック実装完了
- ✅ メールテンプレート3種類対応完了
- ✅ 120個全てのアクティビティ分類完了

---

**作成日:** ${new Date().toLocaleDateString('ja-JP')}  
**最終更新:** ${new Date().toISOString()}

