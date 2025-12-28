import type { AppProps } from "next/app";
import { MDXProvider } from "@mdx-js/react";
import Head from "next/head";
import { appWithTranslation } from "next-i18next";
import { useRouter } from "next/router";
import Script from "next/script";

import "@/styles/globals.css";

import { AccountProvider } from "@/context/AccountContext";
import { QuizStatusProvider } from "@/context/QuizStatusContext";
import { LocationProvider } from "@/context/LocationContext";
import QuizResultModal from "@/components/QuizResultModal";
import CookieConsent from "@/components/CookieConsent";
import OpenInBrowserPrompt from "@/components/OpenInBrowserPrompt";
import StructuredDataProvider from "@/components/StructuredDataProvider";
import MDXComponents from "@/components/MDXComponents";
import { useGA4Tracking, useUserBehaviorTracking, usePerformanceAndBusinessTracking } from "@/hooks/useAnalytics";



function App({ Component, pageProps }: AppProps) {
  const router = useRouter();

  // Initialize analytics and tracking hooks
  useGA4Tracking();
  useUserBehaviorTracking();
  usePerformanceAndBusinessTracking(router);


  return (
    <AccountProvider>
      <LocationProvider>
        <QuizStatusProvider>
          <>
            <Head>
            <title>Gappy - Travel Media</title>
            <meta
              name="description"
              content="Discover extraordinary experiences and events to make the most of your free time in Japan."
            />
            <meta
              name="viewport"
              content="width=device-width, initial-scale=1"
            />
            <link rel="icon" href="/favicon.ico" />

            {/* フォントの読み込み */}
            <link rel="preconnect" href="https://fonts.googleapis.com" />
            <link
              rel="preconnect"
              href="https://fonts.gstatic.com"
              crossOrigin="anonymous"
            />

            {/* Open Graph */}
            <meta property="og:title" content="Gappy - Travel Media" />
            <meta
              property="og:description"
              content="Discover extraordinary experiences and events to make the most of your free time in Japan."
            />
            <meta property="og:type" content="website" />
            <meta property="og:site_name" content="Gappy" />

            {/* Twitter Card */}
            <meta name="twitter:card" content="summary_large_image" />
            <meta name="twitter:title" content="Gappy - Travel Media" />
            <meta
              name="twitter:description"
              content="Discover extraordinary experiences and events to make the most of your free time in Japan."
            />

            {/* 本番環境での翻訳ファイルプリロード */}
            {process.env.NODE_ENV === "production" && (
              <>
                <link
                  rel="preload"
                  href="/locales/en/common.json"
                  as="fetch"
                  crossOrigin="anonymous"
                />
                <link
                  rel="preload"
                  href="/locales/ja/common.json"
                  as="fetch"
                  crossOrigin="anonymous"
                />
              </>
            )}

            {/* 本番環境でのみ重要な画像のプリロード */}
            {process.env.NODE_ENV === "production" && (
              <>
                <link rel="preload" href="/images/hero.jpg" as="image" />
                <link rel="preload" href="/gappy_icon.png" as="image" />
                <meta name="image-optimization" content="webp,avif" />
              </>
            )}

            <StructuredDataProvider />
          </Head>

          {/* Google Analytics 4 */}
          <Script
            src="https://www.googletagmanager.com/gtag/js?id=G-C4TF6QV4G2"
            strategy="afterInteractive"
          />
          <Script id="google-analytics" strategy="afterInteractive">
            {`
          (function() {
            if (typeof window === 'undefined') return;
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', 'G-C4TF6QV4G2', {
              send_page_view: true,
              custom_map: {
                'custom_parameter_1': 'user_type',
                'custom_parameter_2': 'engagement_level'
              }
            });
            // page_titleとpage_locationは自動的に設定されるため、明示的に指定しない
          })();
        `}
          </Script>

          <MDXProvider components={MDXComponents}>
            <div className="min-h-screen bg-gray-50">
              {/* スキップリンク */}
              <a
                href="#main-content"
                className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 bg-blue-600 text-white px-4 py-2 rounded-md z-50"
              >
                Skip to main content
              </a>
              <Component {...pageProps} />
            </div>
          </MDXProvider>
          <QuizResultModal />
          <CookieConsent />
          <OpenInBrowserPrompt />
          </>
        </QuizStatusProvider>
      </LocationProvider>
    </AccountProvider>
  );
}

export default appWithTranslation(App);
