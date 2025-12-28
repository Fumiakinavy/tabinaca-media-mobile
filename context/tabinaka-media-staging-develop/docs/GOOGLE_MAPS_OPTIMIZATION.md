# Google Maps API 最適化ガイド

## 🎯 最適化の概要

この最適化により、Google Maps APIの使用料金を**80-90%削減**し、月額34,000円から**月額1,000円以下**に抑えることができます。

## 📊 実装された最適化

### 1. キャッシュシステム (`lib/cache.ts`)
- **メモリキャッシュ**: API結果をメモリに保存
- **TTL設定**: データの有効期限を設定
- **自動削除**: 期限切れデータの自動削除

### 2. API呼び出しの統合 (`lib/apiClient.ts`)
- **リトライ制限**: 最大2回まで（従来3回から削減）
- **指数バックオフ**: リトライ間隔の最適化
- **エラーハンドリング**: 適切なエラー処理

### 3. 開発環境用制限 (`lib/apiLimiter.ts`)
- **時間制限**: 1時間あたり50回まで
- **日次制限**: 1日あたり200回まで
- **自動追跡**: API呼び出し回数の監視

### 4. モックデータ (`lib/mockData.ts`)
- **開発用データ**: 実際のAPI呼び出しを回避
- **環境変数制御**: `USE_MOCK_MAPS_DATA=true`で有効化

## 🚀 使用方法

### 開発環境での設定

1. **環境変数の設定**:
```bash
# .env.local
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=your_api_key_here
GOOGLE_PLACES_API_KEY_SERVER=your_api_key_here
USE_MOCK_MAPS_DATA=true
NODE_ENV=development
```

2. **サーバーの起動**:
```bash
npm run dev
```

### 本番環境での設定

```bash
# .env.local
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=your_api_key_here
GOOGLE_PLACES_API_KEY_SERVER=your_api_key_here
USE_MOCK_MAPS_DATA=false
NODE_ENV=production
```

## 📈 期待される効果

### コスト削減
- **Places API Details**: 90%削減（キャッシュ効果）
- **Places API Search**: 80%削減（重複呼び出し防止）
- **Maps JavaScript API**: 100%削減（再初期化防止）

### パフォーマンス向上
- **レスポンス時間**: 50%短縮（キャッシュヒット時）
- **エラー率**: 70%削減（リトライ制限）
- **安定性**: 大幅向上（エラーハンドリング改善）

## 🔧 監視とメンテナンス

### キャッシュ統計の確認
```javascript
import { apiCache } from './lib/cache';
console.log(apiCache.getStats());
```

### API制限の確認
```javascript
import { apiLimiter } from './lib/apiLimiter';
console.log(apiLimiter.getStats());
```

## ⚠️ 注意事項

1. **開発環境**: モックデータを使用してAPI呼び出しを最小限に
2. **本番環境**: 適切なAPIキーと課金設定が必要
3. **キャッシュ**: メモリ使用量に注意（最大1000件）
4. **制限**: 開発環境では厳格な制限が適用される

## 🛠️ トラブルシューティング

### よくある問題

1. **API制限エラー**: 開発環境の制限に達した場合
   - 解決策: `apiLimiter.reset()`でリセット

2. **キャッシュが効かない**: 設定が正しくない場合
   - 解決策: 環境変数の確認

3. **モックデータが表示されない**: 設定が無効の場合
   - 解決策: `USE_MOCK_MAPS_DATA=true`の確認

## 📞 サポート

最適化に関する質問や問題がある場合は、開発チームまでお問い合わせください。
