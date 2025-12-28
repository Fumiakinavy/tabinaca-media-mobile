# 画面遷移図（Phase 1）

## タブ構成
- Home
- Chat
- Experiences
- Likes

## 主要遷移

### Home
- Home → Quiz
- Home → Chat（検索クエリ付き）
- Home → Articles（一覧）

### Articles
- Articles List → Article Detail
- Article Detail → Experiences（関連CTA）

### Experiences
- Experiences List → Experience Detail
- Experience Detail → Google Maps（外部）
- Experience Detail → Like（保存）

### Chat
- Chat → Mapビュー切替
- Chat → Session切替（履歴）
- Chat → Share Link（コピー）

### Quiz
- Quiz → Result（モーダル/画面）
- Quiz → Share Card（画像生成）
- Quiz → Home/Chat

### Likes
- Likes → Experience Detail

## 認証依存
- Chat / Likes はログイン必須
- 未ログイン時はログイン誘導

