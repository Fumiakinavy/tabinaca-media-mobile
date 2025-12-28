# アフィリエイト関連アクティビティ一覧

## GetYourGuideアフィリエイト体験（全9件）

### 場所別分類

#### 渋谷エリア（7件）

1. **Tokyo: Shibuya Sky walking tour with night Access**
   - ID: `shibuya-sky-night-access`
   - 価格: ¥13,387
   - 時間: 2時間
   - カテゴリ: walking-tour
   - 場所: 渋谷
   - 集合場所: ハチ公広場（ハチ公像の隣、抽選会会場の横）

2. **Tokyo: Shibuya Highlights Walking Tour & Secret Backstreets**
   - ID: `shibuya-highlights-secret-backstreets`
   - 価格: ¥4,000
   - 時間: 1.5時間
   - カテゴリ: walking-tour
   - 場所: 渋谷
   - 集合場所: SHIBU HACHI BOX前（JR渋谷駅ハチ公口、東京メトロA8出口すぐそば）

3. **Tokyo: Shibuya Crossing & Hidden Streets Walking Tour**
   - ID: `shibuya-crossing-hidden-streets`
   - 価格: ¥3,500
   - 時間: 2時間
   - カテゴリ: walking-tour
   - 場所: 渋谷
   - 集合場所: サボン渋谷マークシティ店（マークシティ3階）

4. **Tokyo: Shibuya Highlights Walking Tour**
   - ID: `shibuya-highlights-tour`
   - 価格: 記載なし
   - 時間: 1.5時間
   - カテゴリ: walking-tour
   - 場所: 渋谷
   - 集合場所: SHIBU HACHI BOX（ハチ公像前の観光案内所）

5. **【NEW】Shibuya Tea Ceremony Tokyo-Chaan**
   - ID: `shibuya-tea-ceremony`
   - 価格: ¥3,900
   - 時間: 50分
   - カテゴリ: cultural-experience
   - 場所: 渋谷
   - 集合場所: 万字ビル2階（東京都渋谷区道玄坂1-15-9）

6. **Shibuya : Ramen Dojo Tokyo| Make All 3 (Tonkotsu/Shoyu/Miso)**
   - ID: `shibuya-ramen-dojo`
   - 価格: ¥8,000
   - 時間: 1.5時間
   - カテゴリ: food-experience
   - 場所: 渋谷
   - 集合場所: うめきたビル2階（1階に焼肉店が入っているビル）

7. **Stand-Up Comedy in Shibuya (English)**
   - ID: `stand-up-comedy-shibuya`
   - 価格: ¥3,000
   - 時間: 1.5時間
   - カテゴリ: entertainment
   - 場所: 渋谷
   - 集合場所: 東京コメディバーの3階

#### 原宿エリア（2件）

8. **Tokyo: Meiji Shrine Walking Tour — Shinto & Imperial System**
   - ID: `meiji-shrine-shinto-tour`
   - 価格: ¥4,000
   - 時間: 2時間
   - カテゴリ: cultural-tour
   - 場所: 原宿
   - 集合場所: JR原宿駅東口（副都心線・千代田線「明治神宮前駅」からも徒歩5分）

9. **Tokyo: Meiji Jingu Shrine and Shinto Culture Walking Tour**
   - ID: `meiji-jingu-shinto-culture`
   - 価格: ¥4,000
   - 時間: 2時間
   - カテゴリ: cultural-tour
   - 場所: 原宿
   - 集合場所: 明治神宮に一番近いスターバックスの前

---

## カテゴリ別分類

### walking-tour（5件）
- Tokyo: Shibuya Sky walking tour with night Access
- Tokyo: Shibuya Highlights Walking Tour & Secret Backstreets
- Tokyo: Shibuya Crossing & Hidden Streets Walking Tour
- Tokyo: Shibuya Highlights Walking Tour
- （※文化ツアーも含めると合計7件）

### cultural-tour（2件）
- Tokyo: Meiji Shrine Walking Tour — Shinto & Imperial System
- Tokyo: Meiji Jingu Shrine and Shinto Culture Walking Tour

### cultural-experience（1件）
- 【NEW】Shibuya Tea Ceremony Tokyo-Chaan

### food-experience（1件）
- Shibuya : Ramen Dojo Tokyo| Make All 3 (Tonkotsu/Shoyu/Miso)

### entertainment（1件）
- Stand-Up Comedy in Shibuya (English)

---

## 使用箇所

### 1. チャット機能（`pages/api/chat/send-message.ts`）
- 場所に基づいて関連するアフィリエイト体験を自動追加
- 渋谷関連の場所が見つかった場合: 渋谷のアフィリエイト体験を追加
- 原宿関連の場所が見つかった場合: 原宿のアフィリエイト体験を追加
- 最低1個（最大3個）のアフィリエイト体験を必ず含める

### 2. 取得関数
- `getAffiliateExperience(id)`: IDで個別取得
- `getAffiliateExperiencesByLocation(location)`: 場所でフィルタリング
- `getAffiliateExperiencesByCategory(category)`: カテゴリでフィルタリング

---

## データ構造

```typescript
{
  id: string;              // 一意のID
  title: string;           // タイトル
  duration: string;        // 時間（"2", "1.5", "50min"など）
  price: string;           // 価格（JPY、空文字列の場合は価格なし）
  imageUrl: string;        // 画像URL（/images/affi/{番号}.avif）
  affiliateUrl: string;    // GetYourGuideアフィリエイトリンク
  meetingPoint: string;    // 集合場所（英語）
  meetingPointJa: string;  // 集合場所（日本語）
  location: string;        // 場所（"渋谷", "原宿"など）
  category: string;        // カテゴリ（"walking-tour", "cultural-tour"など）
}
```

---

## 更新日
2025年1月時点

