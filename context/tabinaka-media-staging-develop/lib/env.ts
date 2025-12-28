/**
 * 環境変数の統一管理システム
 * セキュリティと型安全性を確保
 */

// .env / .env.local をサーバー側で読み込み、.env.local を優先する
if (typeof window === "undefined") {
  try {
    const fs = require("fs");
    const path = require("path");
    const dotenv = require("dotenv");
    const cwd = process.cwd();

    const envFiles = [path.join(cwd, ".env"), path.join(cwd, ".env.local")];

    envFiles.forEach((envPath) => {
      if (fs.existsSync(envPath)) {
        // .env → .env.local の順に読み込み、後者で上書きできるよう override を有効化
        dotenv.config({
          path: envPath,
          override: true,
        });
      }
    });
  } catch (e) {
    console.warn("[env] Failed to load environment files:", e);
  }
}

// 環境変数の型定義
interface EnvironmentVariables {
  // Supabase設定
  SUPABASE_ANON_KEY: string;
  SUPABASE_SERVICE_ROLE_KEY: string;
  ACCOUNT_TOKEN_SECRET: string;

  // SendGrid設定
  // 外部サービス設定（クライアントサイド）
  NEXT_PUBLIC_SUPABASE_URL: string;
  NEXT_PUBLIC_SUPABASE_ANON_KEY: string;
  NEXT_PUBLIC_GTM_ID: string;
  NEXT_PUBLIC_GOOGLE_MAPS_API_KEY?: string; // オプション化
  NEXT_PUBLIC_BASE_URL?: string; // オプション化
  NEXT_PUBLIC_SITE_URL?: string; // サイトURL（リダイレクト用）

  // アプリケーション設定
  NODE_ENV: string;

  // CORS設定（App Runner用）
  CORS_ORIGIN?: string; // 単一オリジン
  ALLOWED_ORIGINS?: string; // 複数オリジン（カンマ区切り）

  // Slack通知（任意）
  SLACK_WEBHOOK_URL?: string;
  SLACK_USER_SIGNUP_WEBHOOK_URL?: string;
  SLACK_BOOKING_LEADS_WEBHOOK_URL?: string;
  SLACK_BOT_USERNAME?: string;
  SLACK_ICON_EMOJI?: string;

  // Google Sheets (server-side)
  GOOGLE_SERVICE_ACCOUNT_EMAIL?: string;
  GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY?: string;
  GOOGLE_SHEETS_SPREADSHEET_ID?: string;
  GOOGLE_SHEETS_WORKSHEET_NAME?: string;

  // Google Places API (server-side)
  GOOGLE_PLACES_API_KEY_SERVER?: string;
  GOOGLE_GEOCODING_API_KEY_SERVER?: string;

  // Weather API (server-side)
  OPENWEATHERMAP_API_KEY?: string;

  // AWS Bedrock (chat)
  AWS_BEDROCK_ACCESS_KEY_ID?: string;
  AWS_BEDROCK_SECRET_ACCESS_KEY?: string;
  AWS_BEDROCK_REGION?: string;
}

// 必須環境変数の定義
const REQUIRED_ENV_VARS = {
  // サーバーサイド必須
  server: [
    "ACCOUNT_TOKEN_SECRET",
    "SUPABASE_SERVICE_ROLE_KEY",
    // Google Sheets は任意（設定があれば使う）
  ] as const,

  // クライアントサイド必須
  client: [
    "NEXT_PUBLIC_SUPABASE_URL",
    "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  ] as const,
} as const;

// 環境変数名の型定義
type ServerEnvVar = (typeof REQUIRED_ENV_VARS.server)[number];
type ClientEnvVar = (typeof REQUIRED_ENV_VARS.client)[number];

// プレースホルダー値のパターン（検出用）
const PLACEHOLDER_PATTERNS = [
  /^replace-this-with/i,
  /^your-/i,
  /^example-/i,
  /^placeholder/i,
  /^change-this/i,
  /^TODO/i,
  /^FIXME/i,
];

/**
 * プレースホルダー値かどうかをチェック
 */
function isPlaceholderValue(value: string): boolean {
  return PLACEHOLDER_PATTERNS.some((pattern) => pattern.test(value));
}

/**
 * サーバーサイド環境変数のバリデーション関数
 */
export function validateServerEnvironmentVariables(): {
  isValid: boolean;
  missing: string[];
  errors: string[];
} {
  const missing: string[] = [];
  const errors: string[] = [];

  // CI環境では環境変数チェックをスキップ
  if (process.env.CI === "true") {
    return {
      isValid: true,
      missing: [],
      errors: [],
    };
  }

  // サーバーサイド環境変数のチェック
  REQUIRED_ENV_VARS.server.forEach((envVar) => {
    const value = process.env[envVar];
    if (!value) {
      missing.push(envVar);
      errors.push(`Missing required server environment variable: ${envVar}`);
    } else if (isPlaceholderValue(value)) {
      errors.push(
        `Environment variable ${envVar} contains a placeholder value. Please set an actual value.`,
      );
    }
  });

  return {
    isValid: missing.length === 0 && errors.length === 0,
    missing,
    errors,
  };
}

/**
 * クライアントサイド環境変数のバリデーション関数
 */
export function validateClientEnvironmentVariables(): {
  isValid: boolean;
  missing: string[];
  errors: string[];
} {
  const missing: string[] = [];
  const errors: string[] = [];

  // CI環境では環境変数チェックをスキップ
  if (process.env.CI === "true") {
    return {
      isValid: true,
      missing: [],
      errors: [],
    };
  }

  // クライアントサイド環境変数のチェック
  REQUIRED_ENV_VARS.client.forEach((envVar) => {
    if (!process.env[envVar]) {
      missing.push(envVar);
      errors.push(`Missing required client environment variable: ${envVar}`);
    }
  });

  return {
    isValid: missing.length === 0,
    missing,
    errors,
  };
}

/**
 * 環境変数のバリデーション関数（統合）
 */
export function validateEnvironmentVariables(): {
  isValid: boolean;
  missing: string[];
  errors: string[];
} {
  const missing: string[] = [];
  const errors: string[] = [];

  // CI環境では環境変数チェックをスキップ
  if (process.env.CI === "true") {
    return {
      isValid: true,
      missing: [],
      errors: [],
    };
  }

  // サーバーサイド環境変数のチェック
  if (typeof window === "undefined") {
    REQUIRED_ENV_VARS.server.forEach((envVar) => {
      if (!process.env[envVar]) {
        missing.push(envVar);
        errors.push(`Missing required server environment variable: ${envVar}`);
      }
    });
  }

  // クライアントサイド環境変数のチェック
  REQUIRED_ENV_VARS.client.forEach((envVar) => {
    if (!process.env[envVar]) {
      missing.push(envVar);
      errors.push(`Missing required client environment variable: ${envVar}`);
    }
  });

  return {
    isValid: missing.length === 0,
    missing,
    errors,
  };
}

/**
 * 環境変数の取得（型安全）
 */
export function getEnvVar(key: keyof EnvironmentVariables): string {
  const value = process.env[key];

  // CI環境ではダミー値を返す
  if (process.env.CI === "true") {
    if (key === "NEXT_PUBLIC_SUPABASE_URL") {
      return "https://dummy.supabase.co";
    }
    return `dummy-${key.toLowerCase()}`;
  }

  if (!value) {
    throw new Error(`Environment variable ${key} is not set`);
  }

  return value;
}

/**
 * サーバーサイド環境変数の取得（型安全）
 */
export function getServerEnvVar(key: ServerEnvVar): string {
  const value = process.env[key];

  // CI環境ではダミー値を返す
  if (process.env.CI === "true") {
    return `dummy-${key.toLowerCase()}`;
  }

  if (!value) {
    throw new Error(`Server environment variable ${key} is not set`);
  }

  return value;
}

/**
 * クライアントサイド環境変数の取得（型安全）
 */
export function getClientEnvVar(key: ClientEnvVar): string {
  const value = process.env[key];

  // CI環境ではダミー値を返す
  if (process.env.CI === "true") {
    if (key === "NEXT_PUBLIC_SUPABASE_URL") {
      return "https://dummy.supabase.co";
    }
    return `dummy-${key.toLowerCase()}`;
  }

  if (!value) {
    throw new Error(`Client environment variable ${key} is not set`);
  }

  return value;
}

/**
 * 環境変数の安全な取得（デフォルト値付き）
 */
export function getEnvVarSafe(
  key: keyof EnvironmentVariables,
  defaultValue: string = "",
): string {
  return process.env[key] || defaultValue;
}

/**
 * 開発環境かどうかの判定
 */
export function isDevelopment(): boolean {
  return process.env.NODE_ENV === "development";
}

/**
 * 本番環境かどうかの判定
 */
export function isProduction(): boolean {
  return process.env.NODE_ENV === "production";
}

/**
 * 環境変数の状態をログ出力（開発環境のみ）
 */
export function logEnvironmentStatus(): void {
  if (!isDevelopment()) return;

  console.log("🔍 Environment Variables Status:");

  const validation = validateEnvironmentVariables();

  if (validation.isValid) {
    console.log("✅ All required environment variables are set");
  } else {
    console.error("❌ Missing environment variables:", validation.missing);
    validation.errors.forEach((error) => console.error(`  - ${error}`));
  }

  console.log("📋 Environment Summary:");
  console.log(`  - NODE_ENV: ${process.env.NODE_ENV || "undefined"}`);
  console.log(
    `  - NEXT_PUBLIC_SUPABASE_URL: ${process.env.NEXT_PUBLIC_SUPABASE_URL ? "SET" : "MISSING"}`,
  );
}

/**
 * 本番環境用の環境変数状態チェック（機密情報なし）
 */
export function logProductionEnvironmentStatus(): void {
  if (!isProduction()) return;

  console.log("🔍 Production Environment Status:");

  const serverValidation = validateServerEnvironmentVariables();
  const clientValidation = validateClientEnvironmentVariables();

  if (serverValidation.isValid && clientValidation.isValid) {
    console.log("✅ All required environment variables are set");
  } else {
    console.error("❌ Missing environment variables:", [
      ...serverValidation.missing,
      ...clientValidation.missing,
    ]);
  }

  console.log("📋 Environment Summary:");
  console.log(`  - NODE_ENV: ${process.env.NODE_ENV || "undefined"}`);
  console.log(
    `  - Server variables: ${serverValidation.isValid ? "OK" : "MISSING"}`,
  );
  console.log(
    `  - Client variables: ${clientValidation.isValid ? "OK" : "MISSING"}`,
  );

  // CORS設定の確認
  console.log("🌐 CORS Configuration:");
  console.log(`  - CORS_ORIGIN: ${process.env.CORS_ORIGIN || "NOT SET"}`);
  console.log(
    `  - ALLOWED_ORIGINS: ${process.env.ALLOWED_ORIGINS || "NOT SET"}`,
  );

  // Google Places API設定の確認
  console.log("🗺️ Google Places API:");
  console.log(
    `  - GOOGLE_PLACES_API_KEY_SERVER: ${process.env.GOOGLE_PLACES_API_KEY_SERVER ? "SET" : "NOT SET"}`,
  );
}

/**
 * スラック通知の環境変数状態をチェック
 */
export function logSlackEnvironmentStatus(): void {
  console.log("🔔 Slack Notification Environment Status:");

  const webhookUrl = process.env.SLACK_WEBHOOK_URL;
  const signupWebhookUrl = process.env.SLACK_USER_SIGNUP_WEBHOOK_URL;
  const bookingLeadsWebhookUrl = process.env.SLACK_BOOKING_LEADS_WEBHOOK_URL;
  const botUsername = process.env.SLACK_BOT_USERNAME;
  const botIconEmoji = process.env.SLACK_ICON_EMOJI;

  console.log(`  - SLACK_WEBHOOK_URL: ${webhookUrl ? "SET" : "MISSING"}`);
  console.log(
    `  - SLACK_USER_SIGNUP_WEBHOOK_URL: ${signupWebhookUrl ? "SET" : "MISSING"}`,
  );
  console.log(
    `  - SLACK_BOOKING_LEADS_WEBHOOK_URL: ${bookingLeadsWebhookUrl ? "SET" : "MISSING"}`,
  );
  console.log(`  - SLACK_BOT_USERNAME: ${botUsername || "DEFAULT"}`);
  console.log(`  - SLACK_ICON_EMOJI: ${botIconEmoji || "DEFAULT"}`);
  if (!webhookUrl) {
    console.warn(
      "  ⚠️  SLACK_WEBHOOK_URL is not set. Slack notifications will be disabled.",
    );
  }
  if (!signupWebhookUrl) {
    console.warn(
      "  ⚠️  SLACK_USER_SIGNUP_WEBHOOK_URL is not set. Signup notifications will be disabled.",
    );
  }
  if (!bookingLeadsWebhookUrl) {
    console.warn(
      "  ⚠️  SLACK_BOOKING_LEADS_WEBHOOK_URL is not set. Booking lead notifications will be disabled.",
    );
  }

  console.log(`  - Environment: ${process.env.NODE_ENV || "undefined"}`);
}

/**
 * サイトURLを取得（環境変数または自動判定）
 */
export function getSiteUrl(): string {
  // 環境変数が設定されている場合はそれを使用
  if (process.env.NEXT_PUBLIC_SITE_URL) {
    return process.env.NEXT_PUBLIC_SITE_URL;
  }

  // 開発環境の場合
  if (isDevelopment()) {
    return "http://localhost:2098";
  }

  // 本番環境の場合（デフォルト）
  return "https://gappytravel.com";
}

/**
 * 本番環境でのコンソールログを抑制
 * 開発環境では有効、本番環境ではconsole.log/warnを無効化
 */
export function setupConsoleLogging(): void {
  if (isProduction()) {
    // 本番環境ではconsole.logとconsole.warnを無効化
    // console.errorは残してエラートラッキングを維持
    const noop = () => {};
    console.log = noop;
    console.warn = noop;
    console.info = noop;
    console.debug = noop;
  }
}

/**
 * 認証用リダイレクトURLを生成
 */
export function getAuthRedirectUrl(returnTo?: string): string {
  const siteUrl = getSiteUrl();
  const returnToParam = returnTo
    ? `?returnTo=${encodeURIComponent(returnTo)}`
    : "";
  return `${siteUrl}/auth/callback${returnToParam}`;
}

// 初期化時に環境変数をチェック
if (typeof window === "undefined") {
  if (isDevelopment()) {
    logEnvironmentStatus();
    logSlackEnvironmentStatus();
  } else if (isProduction()) {
    logProductionEnvironmentStatus();
    logSlackEnvironmentStatus();
  }

  // コンソールログの設定
  setupConsoleLogging();
}
