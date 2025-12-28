# メールUIUX改善 - 5セクション構成テンプレート

## 概要
メールテンプレートを5セクション構成に統合し、地図画像を削除してURLボタンのみに変更。画像をヒーロー1枚＋QRのみに制限し、CTAを最上部に配置。

## 改善点

### 1. セクション統合（4セクション構成）
- **ヘッダー（ブランド）**: ロゴ＋小さなサブコピーのみ、高さを詰める
- **予約サマリー（1枚のカード）**: 最重要セクション、CTA2つ（カレンダー追加＋マップ）
- **QRコード（チェックイン）**: 大きめのQR＋有効回数＋当日の提示方法
- **体験の内容 & 注意事項**: 2カラム風（モバイルで縦積み）+ 場所・連絡先情報を統合

### 2. 画像の最適化
- 地図画像を削除、URLボタンのみ
- 画像はヒーロー1枚＋QRのみ（任意で体験写真1枚）
- 背景画像や装飾的画像は削減

### 3. CTAの配置
- カレンダー追加とマップを最上部に配置
- 目的の操作をすぐ選べるように

### 4. 余白と見出し階層の整理
- コンポーネント間は16–24px
- 角丸は8–12pxに統一
- Title Caseで統一、強調は太字のみ

## ファイル構成

### 更新されたコンポーネント
- `components.ts`: `generateImprovedEmailTemplate`関数を追加
- `experiences/generic-experience.ts`: 新しいテンプレートを使用

## 使用方法

### コンポーネントシステム
```typescript
import { generateImprovedEmailTemplate } from '../components';

const { subject, html } = generateImprovedEmailTemplate(
  userName,
  couponCode,
  experienceData,
  qrCodeData
);
```

## デザインの要点

### セクションの重複排除
- 現在の「Experience Details」「Location & Contact」「What you'll experience」「Important...」を統合
- Location & Contactセクションを削除し、Experience Details内に統合
- 見出しの密度を下げ、情報を整理

### 画像の役割明確化
- 装飾的カード背景は削除
- ヒーロー1枚（任意）とQRのみ
- 壊れた画像対策：https絶対URL/アクセス権/サイズ（<2MB）

### CTAの最適化
- カレンダー追加とマップを最初に配置
- ボタン数を絞る（1画面内に最大2つ）
- Instagramは「場所カード」内に1つだけ

## 実装チェックリスト

### 壊れ画像/表示崩れ対策
- [ ] 画像は`<img src>`のみ（background-imageやSVGの外部参照は避ける）
- [ ] すべてhttpsの絶対URL、認証不要のCDN（Cloudinary）を使用
- [ ] **QRコード**: 120x120px（最適化済み）
- [ ] **体験画像**: max-width: 300px, height: 180px（最適化済み）
- [ ] width属性とstyle="max-width:100%;height:auto"を両方付与
- [ ] QRはCIDインライン＋ブラウザ用フォールバックURLを必ず用意
- [ ] 文字列は短く（各箇条書きは1行以内）
- [ ] Preheaderを毎回セット
- [ ] ICS（text/calendar）を添付してNo-show率を下げる

## コピー改善

### Subject
```
[Gappy] Your Kimono Experience on {{date}} — QR Code Inside
```

### Preheader
```
Show this QR at check-in. Venue: {{venue}} ({{area}}).
```

この構成で「情報量は落とさず、迷わず動ける」メールになります。
