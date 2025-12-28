# インタラクティブマップ × チャット統合

## コンセプト

チャットで検索したアクティビティを、リアルタイムで地図上にピン表示。
ユーザーは地図を見ながら、どこに何があるのか直感的に把握できる。

---

## UI/UXデザイン

### レイアウト案：2パネルデザイン

```
┌────────────────────────────────────────────────────────────┐
│  Header                                                     │
├──────────────────────────┬─────────────────────────────────┤
│                          │                                 │
│   チャットパネル           │      地図パネル                  │
│   (左側 40%)              │      (右側 60%)                 │
│                          │                                 │
│  ┌─────────────────────┐ │  ┌───────────────────────────┐ │
│  │ Bot: 何をお探しですか？│ │  │                           │ │
│  └─────────────────────┘ │  │                           │ │
│                          │  │         🗺️                 │ │
│  ┌─────────────────────┐ │  │                           │ │
│  │ User: 渋谷のカフェ     │ │  │        📍 📍 📍           │ │
│  └─────────────────────┘ │  │         📍                │ │
│                          │  │                           │ │
│  ┌─────────────────────┐ │  │                           │ │
│  │ Bot: 見つけました！   │ │  │                           │ │
│  │                      │ │  │                           │ │
│  │ [Card] Blue Bottle  │ │  │                           │ │
│  │ [Card] Onibus       │ │  │                           │ │
│  │ [Card] About Life   │ │  │                           │ │
│  └─────────────────────┘ │  └───────────────────────────┘ │
│                          │                                 │
│  [メッセージ入力欄]       │   [地図コントロール]              │
└──────────────────────────┴─────────────────────────────────┘
```

### モバイル対応：スタックデザイン

```
┌─────────────────────┐
│  Header             │
├─────────────────────┤
│                     │
│   チャットエリア      │
│                     │
│  Bot: 見つけました！ │
│                     │
│  [Tab: リスト表示]   │
│  [Tab: 地図表示] ✓  │
│                     │
├─────────────────────┤
│                     │
│      🗺️ 地図         │
│                     │
│    📍 📍 📍         │
│      📍             │
│                     │
│                     │
└─────────────────────┘
```

---

## インタラクティブ機能

### 1. リアルタイム連動

```typescript
// チャット結果が返ってきたら、即座に地図にピン表示
onChatResponse(activities: Activity[]) => {
  // 地図にマーカー追加
  activities.forEach(activity => {
    addMarkerToMap(activity);
  });
  
  // 全マーカーが見えるように地図を調整
  fitBoundsToMarkers(activities);
}
```

### 2. ピンのインタラクション

```typescript
// ピンをクリック → 詳細ポップアップ表示
marker.onClick(() => {
  showInfoWindow({
    title: activity.title,
    image: activity.coverImage,
    rating: activity.rating,
    price: activity.price,
    distance: calculateDistance(userLocation, activity.location),
    button: "詳細を見る",
    onButtonClick: () => router.push(`/experiences/${activity.slug}`)
  });
});

// ピンにホバー → カードをハイライト
marker.onHover(() => {
  highlightChatCard(activity.id);
});
```

### 3. チャットカードとの双方向連動

```typescript
// カードをホバー → 地図のピンをバウンス
chatCard.onHover(() => {
  bounceMarker(activity.id);
  panToMarker(activity.id);
});

// カードをクリック → 地図をズーム
chatCard.onClick(() => {
  zoomToMarker(activity.id, zoomLevel: 16);
  openInfoWindow(activity.id);
});
```

### 4. フィルタリング連動

```typescript
// チャットで「1000円以内で絞って」
onFilterChange(filters: Filters) => {
  // 該当しないピンをグレーアウト
  markers.forEach(marker => {
    if (!matchesFilter(marker.activity, filters)) {
      marker.setOpacity(0.3);
      marker.setClickable(false);
    }
  });
}
```

---

## 地図上のピン表示仕様

### カスタムマーカーデザイン

```typescript
// アクティビティタイプ別のピンアイコン
const markerIcons = {
  'food': '🍽️',
  'cafe': '☕',
  'culture': '🎭',
  'shopping': '🛍️',
  'nature': '🌳',
  'nightlife': '🍺',
  'micro-experience': '✨', // 新しいカテゴリ！
};

// カスタムマーカー作成
function createCustomMarker(activity: Activity) {
  return {
    position: { lat: activity.lat, lng: activity.lng },
    icon: {
      url: createMarkerSVG({
        emoji: markerIcons[activity.category],
        color: activity.price < 1000 ? '#22c55e' : '#3b82f6',
        selected: activity.selected,
      }),
      scaledSize: new google.maps.Size(40, 50),
    },
    animation: google.maps.Animation.DROP,
  };
}
```

### マーカーのカスタムSVG

```svg
<!-- 価格帯で色分け -->
<svg width="40" height="50">
  <path d="M20,0 C9,0 0,9 0,20 C0,35 20,50 20,50 C20,50 40,35 40,20 C40,9 31,0 20,0 Z" 
        fill="${color}" 
        stroke="white" 
        stroke-width="2"/>
  <text x="20" y="25" text-anchor="middle" font-size="20">
    ${emoji}
  </text>
  <!-- 価格バッジ -->
  <circle cx="32" cy="10" r="8" fill="white"/>
  <text x="32" y="14" text-anchor="middle" font-size="10" fill="black">
    ¥${price}
  </text>
</svg>
```

### マーカークラスタリング

```typescript
// 多数のピンを自動でクラスタリング
import { MarkerClusterer } from '@googlemaps/markerclusterer';

const markerCluster = new MarkerClusterer({
  map,
  markers,
  renderer: {
    render: ({ count, position }) => {
      return new google.maps.Marker({
        position,
        icon: {
          url: createClusterSVG(count),
          scaledSize: new google.maps.Size(50, 50),
        },
        label: {
          text: String(count),
          color: 'white',
          fontSize: '14px',
        },
      });
    },
  },
});
```

---

## ポップアップ情報ウィンドウ

### デザイン

```html
<!-- ピンをクリックしたときのポップアップ -->
<div class="info-window" style="width: 300px; padding: 0;">
  <img src="${activity.coverImage}" 
       style="width: 100%; height: 150px; object-fit: cover;"/>
  
  <div style="padding: 12px;">
    <h3 style="margin: 0 0 8px 0; font-size: 16px; font-weight: 600;">
      ${activity.title}
    </h3>
    
    <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px;">
      <div style="display: flex; align-items: center;">
        ⭐ ${activity.rating}
      </div>
      <span style="color: #666;">•</span>
      <div style="color: #10b981; font-weight: 600;">
        ¥${activity.price}
      </div>
      <span style="color: #666;">•</span>
      <div style="color: #666;">
        ⏱️ ${activity.duration}
      </div>
    </div>
    
    <p style="color: #666; font-size: 14px; margin: 0 0 12px 0;">
      📍 ${activity.locationFromStation}
    </p>
    
    <button onclick="viewDetails('${activity.slug}')"
            style="width: 100%; padding: 8px; background: #3b82f6; color: white; 
                   border: none; border-radius: 6px; cursor: pointer;">
      詳細を見る →
    </button>
  </div>
</div>
```

---

## 高度な地図機能

### 1. ルート表示

```typescript
// 現在地から選択したアクティビティまでのルート表示
function showRoute(from: Location, to: Activity) {
  const directionsService = new google.maps.DirectionsService();
  const directionsRenderer = new google.maps.DirectionsRenderer({
    map,
    suppressMarkers: false,
    polylineOptions: {
      strokeColor: '#3b82f6',
      strokeWeight: 4,
    },
  });

  directionsService.route({
    origin: from,
    destination: { lat: to.lat, lng: to.lng },
    travelMode: google.maps.TravelMode.WALKING,
  }, (result, status) => {
    if (status === 'OK') {
      directionsRenderer.setDirections(result);
      
      // チャットに経路情報を表示
      const route = result.routes[0].legs[0];
      sendBotMessage(
        `徒歩${route.duration.text}（${route.distance.text}）で到着します！`
      );
    }
  });
}
```

### 2. エリアハイライト

```typescript
// チャットで「渋谷エリア」と言われたらエリアをハイライト
function highlightArea(areaName: string) {
  const polygon = new google.maps.Polygon({
    paths: getAreaBoundary(areaName), // 渋谷の境界座標
    strokeColor: '#3b82f6',
    strokeOpacity: 0.8,
    strokeWeight: 2,
    fillColor: '#3b82f6',
    fillOpacity: 0.15,
  });
  
  polygon.setMap(map);
}
```

### 3. ヒートマップ表示

```typescript
// 人気エリアをヒートマップで表示
import { HeatmapLayer } from '@googlemaps/js-api-loader';

const heatmapData = activities.map(activity => ({
  location: new google.maps.LatLng(activity.lat, activity.lng),
  weight: activity.popularityScore,
}));

const heatmap = new google.maps.visualization.HeatmapLayer({
  data: heatmapData,
  radius: 20,
  opacity: 0.6,
});

heatmap.setMap(map);
```

### 4. レイヤー切り替え

```typescript
// 地図上のレイヤー切り替え
const layers = {
  restaurants: new google.maps.Data(),
  cafes: new google.maps.Data(),
  culture: new google.maps.Data(),
  microExperiences: new google.maps.Data(), // 新しいレイヤー
};

// チャットで「カフェだけ表示」
function toggleLayer(layerName: string, visible: boolean) {
  layers[layerName].setMap(visible ? map : null);
}
```

---

## チャット × 地図の統合シナリオ

### シナリオ1: 基本検索

```
User: 「渋谷でカフェ探してる」
  ↓
Bot: 「渋谷のカフェを検索しています...」
  ↓ [地図が渋谷に移動、ローディングアニメーション]
  ↓
Bot: 「5つのカフェが見つかりました！」
  ↓ [地図に5つのピンがドロップアニメーションで表示]
  ↓ [チャットに5つのカード表示]
  ↓
User: [2番目のカードにホバー]
  ↓ [地図の該当ピンがバウンス]
  ↓
User: [2番目のカードをクリック]
  ↓ [地図がズーム、ポップアップ表示]
```

### シナリオ2: フィルタリング

```
User: 「1000円以内に絞って」
  ↓
Bot: 「1000円以内のカフェは3つあります」
  ↓ [地図上で該当しない2つのピンがグレーアウト]
  ↓ [該当する3つのピンが強調表示]
  ↓ [チャットに3つのカード表示]
```

### シナリオ3: 位置ベース検索

```
User: 「今いる場所から近い順で」
  ↓
Bot: 「現在地を取得しています...」
  ↓ [現在地に青いドットマーカー表示]
  ↓
Bot: 「一番近いのは200m先のBlue Bottleです」
  ↓ [地図に現在地からのラインが表示]
  ↓ [最寄りのピンがハイライト]
```

### シナリオ4: エリア探索

```
User: 「代々木公園周辺も見せて」
  ↓
Bot: 「代々木公園エリアを表示します」
  ↓ [地図がスムーズに移動]
  ↓ [代々木公園エリアがハイライト]
  ↓ [新しいピンが追加表示]
  ↓
Bot: 「代々木公園周辺に7つのアクティビティがあります」
```

---

## 実装コンポーネント

### メインコンポーネント

```typescript
// components/ChatWithMap.tsx

import React, { useState, useRef } from 'react';
import ChatPanel from './ChatPanel';
import MapPanel from './MapPanel';

export default function ChatWithMap() {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [selectedActivity, setSelectedActivity] = useState<Activity | null>(null);
  const mapRef = useRef<GoogleMap>(null);

  const handleChatResponse = (newActivities: Activity[]) => {
    setActivities(newActivities);
    
    // 地図にマーカー追加
    if (mapRef.current) {
      mapRef.current.addMarkers(newActivities);
      mapRef.current.fitBounds(newActivities);
    }
  };

  const handleActivityHover = (activity: Activity) => {
    setSelectedActivity(activity);
    mapRef.current?.highlightMarker(activity.id);
  };

  const handleMarkerClick = (activity: Activity) => {
    setSelectedActivity(activity);
    // チャットパネルにスクロール
    scrollToChatCard(activity.id);
  };

  return (
    <div className="flex h-screen">
      <ChatPanel 
        onResponse={handleChatResponse}
        activities={activities}
        onActivityHover={handleActivityHover}
        selectedActivity={selectedActivity}
      />
      
      <MapPanel
        ref={mapRef}
        activities={activities}
        onMarkerClick={handleMarkerClick}
        selectedActivity={selectedActivity}
      />
    </div>
  );
}
```

### 地図コンポーネント

```typescript
// components/MapPanel.tsx

import React, { useEffect, useRef, forwardRef, useImperativeHandle } from 'react';
import { GoogleMap, useJsApiLoader, Marker, InfoWindow } from '@react-google-maps/api';

interface MapPanelProps {
  activities: Activity[];
  onMarkerClick: (activity: Activity) => void;
  selectedActivity: Activity | null;
}

const MapPanel = forwardRef((props: MapPanelProps, ref) => {
  const { activities, onMarkerClick, selectedActivity } = props;
  const [map, setMap] = useState<google.maps.Map | null>(null);
  const [markers, setMarkers] = useState<Map<string, google.maps.Marker>>(new Map());

  const { isLoaded } = useJsApiLoader({
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY!,
    libraries: ['places', 'visualization'],
  });

  // 外部から呼び出せるメソッドを公開
  useImperativeHandle(ref, () => ({
    addMarkers: (newActivities: Activity[]) => {
      // マーカー追加ロジック
    },
    fitBounds: (activities: Activity[]) => {
      // 範囲調整ロジック
    },
    highlightMarker: (activityId: string) => {
      // マーカーハイライトロジック
    },
  }));

  useEffect(() => {
    if (!map || !activities.length) return;

    // マーカー追加
    activities.forEach(activity => {
      const marker = new google.maps.Marker({
        position: { lat: activity.lat, lng: activity.lng },
        map,
        icon: createCustomIcon(activity),
        animation: google.maps.Animation.DROP,
      });

      marker.addListener('click', () => {
        onMarkerClick(activity);
      });

      markers.set(activity.id, marker);
    });

    // 全マーカーが見えるように調整
    const bounds = new google.maps.LatLngBounds();
    activities.forEach(activity => {
      bounds.extend({ lat: activity.lat, lng: activity.lng });
    });
    map.fitBounds(bounds);

  }, [activities, map]);

  if (!isLoaded) return <div>Loading map...</div>;

  return (
    <div className="w-full h-full">
      <GoogleMap
        mapContainerStyle={{ width: '100%', height: '100%' }}
        center={{ lat: 35.6580, lng: 139.7016 }} // 渋谷
        zoom={14}
        onLoad={setMap}
        options={{
          styles: customMapStyles, // カスタムスタイル
          disableDefaultUI: false,
          zoomControl: true,
          streetViewControl: true,
        }}
      >
        {selectedActivity && (
          <InfoWindow
            position={{ lat: selectedActivity.lat, lng: selectedActivity.lng }}
            onCloseClick={() => onMarkerClick(null)}
          >
            <ActivityInfoWindow activity={selectedActivity} />
          </InfoWindow>
        )}
      </GoogleMap>
    </div>
  );
});
```

---

## パフォーマンス最適化

### 1. マーカー仮想化

```typescript
// 大量のマーカーがある場合は、表示範囲内のみレンダリング
function getVisibleMarkers(map: google.maps.Map, allActivities: Activity[]) {
  const bounds = map.getBounds();
  if (!bounds) return allActivities;

  return allActivities.filter(activity => {
    return bounds.contains({ lat: activity.lat, lng: activity.lng });
  });
}
```

### 2. マーカーキャッシング

```typescript
// マーカーアイコンをキャッシュ
const iconCache = new Map<string, string>();

function getCachedIcon(activity: Activity): string {
  const cacheKey = `${activity.category}-${activity.price}`;
  
  if (!iconCache.has(cacheKey)) {
    iconCache.set(cacheKey, createMarkerSVG(activity));
  }
  
  return iconCache.get(cacheKey)!;
}
```

### 3. デバウンス処理

```typescript
// 地図の移動イベントをデバウンス
const debouncedMapMove = debounce(() => {
  // 新しいエリアのアクティビティを読み込み
  loadActivitiesInBounds(map.getBounds());
}, 300);

map.addListener('bounds_changed', debouncedMapMove);
```

---

## モバイル対応

### スワイプジェスチャー

```typescript
// モバイルでは地図とチャットをスワイプで切り替え
import { useSwipeable } from 'react-swipeable';

const handlers = useSwipeable({
  onSwipedLeft: () => setActivePanel('map'),
  onSwipedRight: () => setActivePanel('chat'),
});

<div {...handlers}>
  {activePanel === 'chat' ? <ChatPanel /> : <MapPanel />}
</div>
```

### レスポンシブレイアウト

```css
/* デスクトップ: 横並び */
@media (min-width: 768px) {
  .chat-map-container {
    display: flex;
  }
  .chat-panel {
    width: 40%;
  }
  .map-panel {
    width: 60%;
  }
}

/* モバイル: タブ切り替え */
@media (max-width: 767px) {
  .chat-map-container {
    display: block;
  }
  .chat-panel,
  .map-panel {
    width: 100%;
    height: 50vh;
  }
}
```

---

## コスト影響

### Google Maps JavaScript API

| 機能 | 無料枠 | 超過時料金 |
|------|--------|-----------|
| Dynamic Maps | 28,000回/月 | $7/1000回 |
| Static Maps | 28,000回/月 | $2/1000回 |
| Places Details | 制限なし | 既存料金 |

**想定**: 月間5,000セッション → **無料枠内で収まる**

---

## まとめ

地図統合により：

✅ **ユーザー体験が劇的に向上**
- 視覚的に場所を把握
- 距離感が直感的に分かる
- 探索が楽しくなる

✅ **コンバージョン向上**
- 「近い」という理由で選ばれやすい
- 複数アクティビティの組み合わせが容易
- 「ついでに寄れる」発見

✅ **差別化**
- 他のOTAにはない体験
- チャット × 地図の融合
- インタラクティブな探索

次に「マイクロエクスペリエンス」コンセプトについて詳しく書きます！

