# Mini Quiz → AI Recommend → Chat Refine System

## Overview
This system provides personalized Tokyo activity recommendations through a 3-stage flow:
1. **Mini Quiz**: 8 quick questions (< 1 minute)
2. **AI Recommendation**: Smart scoring algorithm + Google Places API
3. **Chat Refinement**: Natural language preference updates

## Setup

### Environment Variables
Add to `.env.local`:
```bash
GOOGLE_MAPS_API_KEY="your_google_maps_api_key_here"
```

**Important**: Never expose this key to the client. All Google API calls are made server-side.

### Google Maps APIs Required
Enable these APIs in Google Cloud Console:
- Places API (New)
- Places API
- Geocoding API

### Installation
```bash
npm install
npm run dev
```

Visit: http://localhost:3000/quiz

## File Structure

### Core Logic
- `lib/scoring/userVector.ts` - Quiz answer → user vector computation
- `lib/scoring/category.ts` - Category inference & type mapping
- `lib/scoring/rank.ts` - Place ranking algorithm
- `lib/maps/photos.ts` - Photo URL & helper functions

### API
- `pages/api/recommend.ts` - Main recommendation endpoint

### Components
- `components/QuizForm.tsx` - 8-question quiz UI
- `components/ResultCard.tsx` - Place display cards
- `components/ChatRefiner.tsx` - NL refinement interface

### Pages
- `app/(quiz)/quiz/page.tsx` - Main quiz page

## Quiz Questions

1. **Category** (今の気分は？)
   - 食べる / 感じる / 作る / 学ぶ / 遊ぶ

2. **Plan** (旅行のスタイルは？)
   - 計画派 (1.0) / どちらでも (0.5) / 自由派 (0.0)

3. **Social** (にぎやかさは？)
   - 静か (0.0) / ほどほど (0.5) / ワイワイ (1.0)

4. **Immersion** (没入感を優先する？)
   - 体験重視 (1.0) / どちらでも (0.5) / 写真重視 (0.0)

5. **Nature** (都市 or 自然？)
   - 自然寄り (1.0) / どちらでも (0.5) / 都市寄り (0.0)

6. **Duration** (所要時間は？)
   - 1時間以内 (60) / 3時間以内 (180) / 半日 (300) / 1日 (480)

7. **Budget** (予算感は？)
   - 〜2000円 / 〜5000円 / 〜1万円

8. **Indoor** (雨でもOK？)
   - はい（屋内希望） / いいえ（屋外OK）

## Scoring Algorithm

### User Vector (0-1 normalized)
- `plan`: 計画性 (0=自由派, 1=計画派)
- `social`: 社交性 (0=静か, 1=賑やか)
- `immersion`: 没入感 (0=写真, 1=体験)
- `nature`: 自然度 (0=都市, 1=自然)
- `urban`: 都市度 (1 - nature)

### Constraints
- **Duration → Radius**:
  - ≤60min → 1200m
  - ≤180min → 3000m
  - ≤300min → 6000m
  - else → 10000m

- **Budget → Price Level**:
  - ~2000円 → [0,1]
  - ~5000円 → [0,2]
  - ~10000円 → [0,3]

### Category Mapping

| Category | Google Places Types |
|----------|-------------------|
| eat | restaurant, food, cafe, bakery |
| feel | tourist_attraction, park, natural_feature |
| make | art_gallery, museum, tourist_attraction |
| learn | museum, art_gallery, library |
| play | bowling_alley, amusement_park, night_club, bar, aquarium |

### Final Score Calculation
```
score = 0.35 * categoryMatch 
      + 0.20 * distanceScore 
      + 0.15 * priceFit 
      + 0.15 * ratingNorm 
      + 0.15 * openNow
```

- **categoryMatch**: Type + keyword partial matching
- **distanceScore**: Closer = higher (linear within radius)
- **priceFit**: Within budget range = 1.0
- **ratingNorm**: rating/5 * log(1+reviews)/log(1001)
- **openNow**: open_now=true → 1, else 0

## Chat Refinement

Natural language keywords that update user vector:

| Keywords | Updates |
|----------|---------|
| 静か/落ち着いた | social -= 0.4 |
| 賑やか/活気 | social += 0.4 |
| 自然/緑/公園 | nature += 0.3, indoorPreferred=false |
| 都市/街 | nature -= 0.3 |
| 屋内/雨 | indoorPreferred=true |
| 食べ物/グルメ/カフェ | category='eat' |
| 写真映え/夜景 | category='feel', immersion -= 0.3 |
| 体験/ワークショップ | category='make', immersion += 0.3 |
| 学ぶ/博物館 | category='learn' |
| 遊ぶ/エンタメ | category='play' |
| 安い/リーズナブル | budgetJPY=2000 |
| 高級/贅沢 | budgetJPY=10000 |
| 短時間/サクッと | durationMinutes=60 |
| ゆっくり/たっぷり | durationMinutes=480 |

## Testing

### Default Location
Shibuya Station: `lat=35.659, lng=139.700`

### Test Scenarios
1. **Adventure Seeker**: nature=1.0, social=1.0, category='play'
2. **Quiet Explorer**: nature=0.8, social=0.2, category='feel'
3. **Foodie**: category='eat', budgetJPY=5000
4. **Cultural Learner**: category='learn', immersion=1.0

### Expected Results
- Top 5 places within 3 seconds
- Sorted by relevance score
- All with photo_url, rating, distance
- Google Maps links functional

## Edge Cases

### No Results
1. Expand radius by 50%
2. Broaden category types
3. Show helpful message

### API Errors
- Retry button
- User-friendly error messages
- Console logging for debugging

## Performance

- Quiz completion: < 1 minute
- Recommendation fetch: < 3 seconds
- Mobile-first responsive design
- Lazy image loading

## Accessibility

- Keyboard navigation (Tab/Enter)
- ARIA labels on all interactive elements
- Focus visible indicators
- Screen reader friendly

## Future Enhancements

- [ ] Save user preferences
- [ ] Favorite places
- [ ] Share recommendations
- [ ] Route planning between places
- [ ] Real-time crowd data
- [ ] Weather integration
- [ ] Multi-language support

