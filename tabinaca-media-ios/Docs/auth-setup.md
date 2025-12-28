# iOS Supabase認証セットアップ

## 1. Swift Package追加
- Xcode: File > Add Package Dependencies...
- URL: https://github.com/supabase-community/supabase-swift
- 追加モジュール: Supabase

## 2. URL Scheme 設定
- Xcode: TARGETS > Info > URL Types で以下を追加
  - Identifier: `supabase`
  - URL Schemes: `tabinaca-media-ios`

## 3. 環境変数
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_REDIRECT_URL` (例: tabinaca-media-ios://auth-callback)
- `SUPABASE_CALLBACK_SCHEME` (例: tabinaca-media-ios)

## 4. Supabase OAuth設定
- Supabase Dashboard > Auth > URL Configuration
  - Redirect URLs に `tabinaca-media-ios://auth-callback` を登録
