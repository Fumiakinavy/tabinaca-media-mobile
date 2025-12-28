/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,

  // App Runner用: standaloneモードでビルド
  output: "standalone",

  // i18n configuration
  i18n: {
    defaultLocale: "en",
    locales: ["en"],
    localeDetection: false, // ブラウザの自動言語検出を無効化
  },

  // Environment variables
  env: {
    USE_MOCK_MAPS_DATA: process.env.USE_MOCK_MAPS_DATA || "false",
  },

  // Image configuration for Cloudinary and Google
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "res.cloudinary.com",
        port: "",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "lh3.googleusercontent.com",
        port: "",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "images.unsplash.com",
        port: "",
        pathname: "/**",
      },
    ],
  },

  // リダイレクト設定
  async redirects() {
    const redirects = [
      {
        source: "/:path*",
        has: [
          {
            type: "host",
            value: "tabinaka-media-staging.vercel.app",
          },
        ],
        destination: "https://gappytravel.com/:path*",
        permanent: true, // 301リダイレクト
      },
    ];

    // WWW → non-WWW リダイレクト（middleware.tsのバックアップとして）
    // 本番環境のみ適用（環境変数で判定）
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;
    if (siteUrl) {
      try {
        const url = new URL(siteUrl);
        const canonicalHost = url.hostname;
        if (canonicalHost && !canonicalHost.startsWith("localhost")) {
          redirects.push({
            source: "/:path*",
            has: [
              {
                type: "host",
                value: `www.${canonicalHost}`,
              },
            ],
            destination: `https://${canonicalHost}/:path*`,
            permanent: true, // 301リダイレクト
          });
        }
      } catch (e) {
        // URL解析に失敗した場合はスキップ
        console.warn("[next.config.js] Failed to parse NEXT_PUBLIC_SITE_URL:", e);
      }
    } else {
      // 環境変数が未設定の場合はデフォルトでgappytravel.comを設定
      redirects.push({
        source: "/:path*",
        has: [
          {
            type: "host",
            value: "www.gappytravel.com",
          },
        ],
        destination: "https://gappytravel.com/:path*",
        permanent: true, // 301リダイレクト
      });
    }

    return redirects;
  },

  // CORS設定: ミドルウェアで動的に処理するため、ここでは最小限の設定のみ
  // 実際のCORSヘッダーはmiddleware.tsで設定される
  async headers() {
    return [
      {
        // プリフライトリクエスト用：基本的なCORSヘッダーのみ設定
        source: "/api/:path*",
        headers: [
          {
            key: "Access-Control-Allow-Methods",
            value: "GET, POST, PUT, DELETE, OPTIONS",
          },
          {
            key: "Access-Control-Allow-Headers",
            value:
              "Content-Type, Authorization, X-Gappy-Account-Id, X-Gappy-Account-Token, X-Requested-With",
          },
          {
            key: "Access-Control-Allow-Credentials",
            value: "true",
          },
          {
            key: "Access-Control-Max-Age",
            value: "86400", // 24時間キャッシュ
          },
        ],
      },
    ];
  },
};

module.exports = nextConfig;
