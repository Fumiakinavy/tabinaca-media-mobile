# ===========================================
# AWS App Runner用 Dockerfile (最適化版)
# Next.js standalone モード対応
# ===========================================

# ベースイメージ
FROM node:20-alpine AS base

# 依存関係インストール用ステージ
FROM base AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

# パッケージマネージャーのロックファイルをコピー
COPY package.json package-lock.json* ./

# 依存関係のインストール（全てインストール、ビルド時に必要）
RUN npm install

# ビルドステージ
FROM base AS builder
WORKDIR /app

# ビルド用の依存関係をインストール
COPY package.json package-lock.json* ./
RUN npm ci

# クライアントに埋め込む公開環境変数（ビルド時に必要）
ARG NEXT_PUBLIC_SUPABASE_URL
ARG NEXT_PUBLIC_SUPABASE_ANON_KEY
ARG NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
ARG NEXT_PUBLIC_BASE_URL
ARG NEXT_PUBLIC_SITE_URL
# CIモード（環境変数チェック抑制用）
ARG CI=true
ENV NEXT_PUBLIC_SUPABASE_URL=${NEXT_PUBLIC_SUPABASE_URL}
ENV NEXT_PUBLIC_SUPABASE_ANON_KEY=${NEXT_PUBLIC_SUPABASE_ANON_KEY}
ENV NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=${NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}
ENV NEXT_PUBLIC_BASE_URL=${NEXT_PUBLIC_BASE_URL}
ENV NEXT_PUBLIC_SITE_URL=${NEXT_PUBLIC_SITE_URL}
ENV CI=${CI}

# ソースコードをコピー
COPY . .

# 環境変数（ビルド時に必要なもの）
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production
ENV SKIP_ENV_VALIDATION=true

# Next.jsのビルド
RUN npm run build

# 実行ステージ
FROM base AS runner
WORKDIR /app

# 環境変数
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=8080
ENV HOSTNAME="0.0.0.0"

# セキュリティ: 非rootユーザーで実行
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# 必要な依存関係をコピー
COPY --from=deps /app/node_modules ./node_modules

# 静的ファイルをコピー（public フォルダ）
COPY --from=builder /app/public ./public

# standaloneモードのファイルをコピー
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# i18n翻訳ファイルをコピー（Next.jsアプリで必要な場合）
COPY --from=builder --chown=nextjs:nodejs /app/public/locales ./public/locales

# 非rootユーザーに切り替え
USER nextjs

# ポート公開
EXPOSE 8080

# ヘルスチェック用のエンドポイント確認
HEALTHCHECK --interval=30s --timeout=3s --start-period=40s --retries=3 \
    CMD node -e "require('http').get('http://localhost:8080/', (r) => {if (r.statusCode !== 200) throw new Error(r.statusCode)})"

# サーバー起動
CMD ["node", "server.js"]
