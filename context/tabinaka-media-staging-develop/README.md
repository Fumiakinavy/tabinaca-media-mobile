# Gappy Tabinaka Media

A Next.js web application for discovering authentic Japanese experiences in Shibuya with exclusive coupons and deals.

## 📚 Documentation

**完全なドキュメントは [docs/](./docs/) フォルダにあります。**

- 🔧 [環境設定](./docs/setup/) - プロジェクトのセットアップガイド
- ⚡ [機能説明](./docs/features/) - 各機能の使い方
- 🚀 [開発ガイド](./docs/development/) - デプロイ・最適化
- 📝 [実装レポート](./docs/implementation/) - 機能実装の詳細
- 🏗️ [アーキテクチャ](./docs/architecture/) - システム設計

---

## 🚀 Features

- **Responsive Design**: Beautiful green-themed UI that works on all devices
- **Internationalization**: Support for English and Japanese languages
- **Search & Filter**: Find experiences by category, location, and keywords
- **SEO Optimized**: Server-side rendering with proper meta tags
- **Modern Stack**: Built with Next.js 14, TypeScript, and Tailwind CSS
- **Testing**: Unit tests with Jest and E2E tests with Cypress
- **Supabase Integration**: Ready for database and authentication

## 🛠 Tech Stack

- **Framework**: Next.js 14 with TypeScript
- **Styling**: Tailwind CSS with custom green theme
- **Backend**: Supabase (PostgreSQL + Auth)
- **Internationalization**: next-i18next
- **Testing**: Jest + Testing Library (unit) + Cypress (E2E)
- **Linting**: ESLint + Prettier
- **Deployment**: Vercel

## 📁 Project Structure

```
services/tabinaka-media/
├── components/          # Reusable UI components
│   ├── Header.tsx      # Navigation header with language switcher
│   ├── HeroSection.tsx # Main hero section with CTA
│   ├── ExperienceCard.tsx # Experience listing cards
│   └── Footer.tsx      # Site footer with links
├── pages/              # Next.js pages
│   ├── _app.tsx       # App wrapper with i18n
│   ├── _document.tsx  # HTML document structure
│   ├── index.tsx      # Home page with search and listings
│   └── [slug].tsx     # Dynamic article pages
├── lib/               # Utilities (Supabase auth, recommendation orchestration, etc.)
├── styles/            # Global styles and Tailwind config
├── public/            # Static assets and localization files
├── types/             # TypeScript type definitions
└── tests/             # Unit and E2E tests
```

## 🚀 Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn package manager

### Installation

1. Clone the repository and navigate to the project:

```bash
cd services/tabinaka-media
```

2. Install dependencies:

```bash
npm install
```

3. Create environment variables file:

```bash
# .env.local ファイルを作成し、以下の内容を追加してください
```

4. Add your Supabase credentials to `.env.local`:

```bash
# Supabase Configuration
# これらの値をSupabaseプロジェクトの設定から取得して設定してください

# Supabase Project URL
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co

# Supabase Anon Key (フロントエンド用)
SUPABASE_ANON_KEY=your_supabase_anon_key_here

# Supabase Service Role Key (サーバーサイド用) - 重要！
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key_here

# SendGrid Configuration (オプション)
SENDGRID_API_KEY=your_sendgrid_api_key_here
SENDGRID_FROM_EMAIL=your_from_email_here
SENDGRID_TO_EMAIL=your_to_email_here
```

**重要**: `SUPABASE_SERVICE_ROLE_KEY` の設定が必須です。この値がないと、サーバーサイドAPIでエラーが発生します。

5. Run the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the application.

## 🧪 Testing

### Unit Tests

```bash
npm run test          # Run unit tests
npm run test:watch    # Run tests in watch mode
npm run test:coverage # Generate coverage report
```

### E2E Tests

```bash
npm run test:e2e           # Open Cypress UI
npm run test:e2e:headless  # Run tests headlessly
```

### Linting & Formatting

```bash
npm run lint        # Check for linting errors
npm run lint:fix    # Fix linting errors
npm run format      # Format code with Prettier
npm run type-check  # TypeScript type checking
```

## 🔄 CI/CD

このプロジェクトでは GitHub Actions を使用して自動化された品質チェックとデプロイメントを行っています。

### ワークフロー

1. **基本 CI** (`.github/workflows/ci.yml`)
   - ESLint + Prettier チェック
   - TypeScript 型チェック
   - Next.js ビルド検証
   - ビルド成果物の保存

2. **高度 CI** (`.github/workflows/ci-advanced.yml`)
   - 品質チェック（並列実行）
   - セキュリティ脆弱性スキャン
   - 依存関係チェック
   - 統合テスト

3. **PR チェック** (`.github/workflows/pr-check.yml`)
   - 高速な基本チェック
   - バンドルサイズ測定
   - PR サマリー生成

### トリガー条件

- `main`, `develop`, `feature/*` ブランチへのプッシュ
- `main`, `develop` ブランチへのプルリクエスト

### 必要な条件

- すべてのテストが通過
- ESLint エラーなし
- TypeScript エラーなし
- ビルド成功

## 🌍 Internationalization

The app supports English (default) and Japanese languages:

- English: `http://localhost:3000` or `http://localhost:3000/en`
- Japanese: `http://localhost:3000/ja`

Translation files are located in `public/locales/[locale]/common.json`.

## 🎨 Design System

### Colors

- **Primary Green**: `#22c55e` (primary-500)
- **Light Green**: `#86efac` (primary-300)
- **Dark Green**: `#16a34a` (primary-600)

### Typography

- **Headings**: Poppins font family
- **Body**: Inter font family

### Components

All components follow Tailwind CSS patterns with consistent spacing, colors, and responsive design.

## 📱 Responsive Design

The application is fully responsive with breakpoints:

- **Mobile**: < 768px
- **Tablet**: 768px - 1024px
- **Desktop**: > 1024px

## 🔧 トラブルシューティング

### TypeError: fetch failed エラー

このエラーは通常、環境変数が正しく設定されていない場合に発生します。

**解決方法：**

1. `.env.local` ファイルが存在することを確認
2. 以下の環境変数が設定されていることを確認：
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY`

**PowerShellで一時的に環境変数を設定する場合：**

```powershell
$env:NEXT_PUBLIC_SUPABASE_URL = "https://your-project.supabase.co"
$env:SUPABASE_SERVICE_ROLE_KEY = "your_service_role_key_here"
```

**環境変数の確認：**

```powershell
echo $env:NEXT_PUBLIC_SUPABASE_URL
echo $env:SUPABASE_SERVICE_ROLE_KEY
```

### Supabaseの設定値の取得方法

1. [Supabaseダッシュボード](https://app.supabase.io/)にログイン
2. プロジェクトを選択
3. Settings > API に移動
4. 以下の値をコピー：
   - **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
   - **anon public** → `SUPABASE_ANON_KEY`
   - **service_role** → `SUPABASE_SERVICE_ROLE_KEY`

## 🚀 Deployment

### Vercel (Recommended)

1. Connect your repository to Vercel
2. Add environment variables in Vercel dashboard
3. Deploy automatically on git push

### Manual Deployment

```bash
npm run build    # Build the application
npm run start    # Start production server
```

## 🔧 Configuration

### Next.js Config

- Configured for i18n with English/Japanese support
- Image optimization for external domains
- Environment variables setup

### Tailwind Config

- Custom green color palette
- Custom fonts (Inter, Poppins)
- Custom animations and utilities

### TypeScript Config

- Strict mode enabled
- Path aliases configured (@/ for root)
- Next.js optimized settings

## 📝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/new-feature`
3. Commit changes: `git commit -am 'Add new feature'`
4. Push to branch: `git push origin feature/new-feature`
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License.

## 🆘 Support

For support and questions, please contact the development team or create an issue in the repository.
