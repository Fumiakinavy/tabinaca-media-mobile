# QRコードシステム - Gappy

ユーザー情報とアクティビティ情報を含んだ安全なQRコード生成・検証システムです。

## 🚀 機能概要

### 主要機能
- **QRコード生成**: ユーザー情報・アクティビティ情報・予約詳細を含む
- **デジタル署名**: データ改ざん防止のためのHMAC-SHA256署名
- **有効期限管理**: 予約日ベースの自動有効期限設定
- **スキャン制限**: 最大スキャン回数の制御（デフォルト3回）
- **スキャン履歴**: 全スキャン操作の詳細ログ
- **メール統合**: SendGridメールテンプレートとの連携

### セキュリティ機能
- データ改ざん検知（HMAC署名）
- 有効期限チェック
- スキャン回数制限
- IP・位置情報記録

## 📋 QRコードデータ構造

```typescript
interface QRCodeData {
  // 予約情報
  bookingId: string;
  couponCode: string;
  
  // ユーザー情報
  user: {
    name: string;
    email: string;
    phone?: string;
    partySize: number;
  };
  
  // アクティビティ情報
  activity: {
    slug: string;
    title: string;
    duration: number; // 分単位
    location: string;
  };
  
  // 予約詳細
  booking: {
    date: string; // ISO 8601
    status: 'confirmed' | 'pending' | 'cancelled';
    maxScans: number;
    scansUsed: number;
  };
  
  // セキュリティ
  signature: string; // HMAC-SHA256
  expiresAt: string; // ISO 8601
  createdAt: string; // ISO 8601
}
```

## 🛠 API エンドポイント

### 1. QRコード生成
```
POST /api/qr/generate
```

**リクエスト例:**
```json
{
  "bookingId": "booking_123456",
  "couponCode": "GAPPY2024",
  "user": {
    "name": "田中太郎",
    "email": "tanaka@example.com",
    "phone": "090-1234-5678",
    "partySize": 2
  },
  "activity": {
    "slug": "kimono-dressing-experience",
    "title": "Kimono Dressing Experience",
    "duration": 60,
    "location": "Shibuya, Tokyo"
  },
  "bookingDate": "2024-03-15T10:00:00Z",
  "options": {
    "size": 300,
    "errorCorrectionLevel": "M",
    "maxScans": 3
  }
}
```

**レスポンス例:**
```json
{
  "success": true,
  "data": {
    "bookingId": "booking_123456",
    "qrUrl": "https://gappy.app/qr/booking_123456",
    "qrDataUrl": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAA...",
    "hasQRBuffer": true,
    "createdAt": "2024-03-14T12:00:00Z"
  }
}
```

### 2. QRコード検証・スキャン
```
POST /api/qr/verify
```

**リクエスト例:**
```json
{
  "qrContent": "{\"bookingId\":\"booking_123456\",...}",
  "scanLocation": {
    "lat": 35.6605,
    "lng": 139.6986,
    "address": "店舗名"
  },
  "scannedBy": {
    "vendorId": "vendor_001",
    "vendorName": "体験店舗",
    "staffName": "スタッフ名"
  }
}
```

**レスポンス例:**
```json
{
  "success": true,
  "message": "QRコードが正常にスキャンされました",
  "data": {
    "bookingId": "booking_123456",
    "couponCode": "GAPPY2024",
    "user": {
      "name": "田中太郎",
      "email": "tanaka@example.com",
      "partySize": 2
    },
    "activity": {
      "title": "Kimono Dressing Experience",
      "duration": 60,
      "location": "Shibuya, Tokyo"
    },
    "booking": {
      "date": "2024-03-15T10:00:00Z",
      "status": "confirmed",
      "scansUsed": 1,
      "maxScans": 3,
      "remainingScans": 2
    },
    "scannedAt": "2024-03-15T10:15:00Z"
  }
}
```

## 🎨 フロントエンド

### QRコード表示ページ
```
/qr/[bookingId]
```

ユーザー向けのQRコード表示ページ。以下の情報を含む：
- 予約詳細
- QRコード画像
- 使用状況（スキャン回数）
- 有効期限
- 使用方法

### 開発者テストページ
```
/dev/qr-test
```

QRコード生成・検証機能のテスト用ページ。以下の機能を含む：
- QRコード生成テスト
- QRコード検証テスト
- リアルタイムログ表示
- サンプルデータ入力

## 🗄 データベース設計

### 必要なテーブル

#### 1. bookings テーブル
```sql
CREATE TABLE bookings (
  id SERIAL PRIMARY KEY,
  booking_id VARCHAR UNIQUE NOT NULL,
  coupon_code VARCHAR NOT NULL,
  activity_title VARCHAR NOT NULL,
  activity_location VARCHAR NOT NULL,
  user_name VARCHAR NOT NULL,
  user_email VARCHAR NOT NULL,
  party_size INTEGER NOT NULL,
  booking_date TIMESTAMP NOT NULL,
  status VARCHAR DEFAULT 'confirmed',
  scans_used INTEGER DEFAULT 0,
  max_scans INTEGER DEFAULT 3,
  qr_code_data TEXT, -- JSON文字列として保存
  last_scanned_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

#### 2. qr_scan_history テーブル
```sql
CREATE TABLE qr_scan_history (
  id SERIAL PRIMARY KEY,
  booking_id VARCHAR NOT NULL,
  coupon_code VARCHAR NOT NULL,
  user_email VARCHAR NOT NULL,
  activity_slug VARCHAR NOT NULL,
  scan_result VARCHAR NOT NULL, -- 'success' | 'failed'
  failure_reason TEXT,
  scan_location JSONB,
  scanned_by JSONB,
  scanned_at TIMESTAMP DEFAULT NOW()
);
```

## ⚙️ 環境設定

### 必要な環境変数

```bash
# アプリケーションベースURL
NEXT_PUBLIC_BASE_URL=https://gappy.app

# QRコード署名用秘密鍵（本番環境では強力なランダム文字列を使用）
QR_CODE_SECRET_KEY=your_secure_secret_key_here

# Supabase設定（既存）
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

## 🧪 テスト方法

### 1. 開発環境でのテスト

```bash
# 開発サーバー起動
npm run dev

# テストページにアクセス
http://localhost:3001/dev/qr-test
```

### 2. API テスト

```bash
# QRコード生成テスト
curl -X POST http://localhost:3001/api/qr/generate \
  -H "Content-Type: application/json" \
  -d '{
    "bookingId": "test_booking_123",
    "couponCode": "TEST2024",
    "user": {
      "name": "テストユーザー",
      "email": "test@example.com",
      "partySize": 1
    },
    "activity": {
      "slug": "test-activity",
      "title": "テストアクティビティ",
      "duration": 60,
      "location": "テスト場所"
    },
    "bookingDate": "2024-12-31T10:00:00Z"
  }'
```

### 3. QRコードスキャンテスト

```bash
# QRコード検証テスト
curl -X POST http://localhost:3001/api/qr/verify \
  -H "Content-Type: application/json" \
  -d '{
    "qrContent": "生成されたQRコードのJSON内容",
    "scanLocation": {
      "address": "テスト店舗"
    },
    "scannedBy": {
      "vendorName": "テストベンダー",
      "staffName": "テストスタッフ"
    }
  }'
```

## 🔧 使用ライブラリ

- **qrcode**: QRコード画像生成
- **crypto**: HMAC署名生成・検証
- **zod**: APIリクエストバリデーション
- **@supabase/supabase-js**: データベース操作

## 📱 メール統合

QRコードはSendGridメールテンプレートに自動的に統合されます：

```typescript
import { generateEmailQRCode } from '@/lib/qrCodeGenerator';

const emailQRCode = await generateEmailQRCode(
  bookingId,
  couponCode,
  user,
  activity,
  bookingDate
);

// SendGridメールで使用
const attachments = [{
  content: emailQRCode.qrBuffer.toString('base64'),
  filename: 'qrcode.png',
  type: 'image/png',
  disposition: 'inline',
  content_id: 'qrcode'
}];
```

## 🚨 セキュリティ考慮事項

1. **秘密鍵管理**: `QR_CODE_SECRET_KEY` は環境変数で管理し、本番環境では強力なランダム文字列を使用
2. **有効期限**: QRコードには自動的に有効期限が設定される
3. **スキャン制限**: 最大スキャン回数を制限して不正使用を防止
4. **署名検証**: 全てのQRコードデータにHMAC署名を付与し、改ざんを検知
5. **ログ記録**: 全スキャン操作を詳細にログ記録

## 🎯 今後の拡張予定

- QRコード一括生成機能
- スキャン統計ダッシュボード
- プッシュ通知連携
- オフライン対応
- 多言語対応

## 🆘 トラブルシューティング

### よくある問題

1. **QRコード生成失敗**
   - 環境変数 `QR_CODE_SECRET_KEY` が設定されているか確認
   - 予約日が未来の日付になっているか確認

2. **QRコード検証失敗**
   - QRコードの有効期限をチェック
   - スキャン回数上限に達していないか確認
   - データベース接続を確認

3. **メール送信エラー**
   - SendGrid設定を確認
   - QRコード画像サイズを確認（推奨: 300px以下）

---

**開発者向け**: このシステムは本格的な運用環境での使用を想定して設計されています。セキュリティ要件に応じて追加の対策を実装してください。
