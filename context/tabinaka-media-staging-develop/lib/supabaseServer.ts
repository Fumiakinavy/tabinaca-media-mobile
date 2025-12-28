import { createClient } from "@supabase/supabase-js";
import {
  getEnvVar,
  isDevelopment,
  validateServerEnvironmentVariables,
} from "./env";

// サーバーサイド環境変数のバリデーション
const validation = validateServerEnvironmentVariables();
let supabaseServerInstance: ReturnType<typeof createClient> | null = null;

function getSupabaseServer() {
  if (supabaseServerInstance) {
    return supabaseServerInstance;
  }

  // 開発環境では環境変数がなくてもダミークライアントを返す
  if (isDevelopment() && !validation.isValid) {
    console.warn(
      "⚠️  Supabase server client initialized with missing variables in development mode. Using dummy client.",
    );
    supabaseServerInstance = createClient(
      "https://dummy.supabase.co",
      "dummy-key",
    );
    return supabaseServerInstance;
  }

  // CI 環境では既存の挙動を維持
  if (process.env.CI === "true" && !validation.isValid) {
    console.warn(
      "⚠️  Supabase server client initialized with missing variables in CI mode",
      validation.errors,
    );
    supabaseServerInstance = createClient(
      "https://dummy.supabase.co",
      "dummy-key",
    );
    return supabaseServerInstance;
  }

  // 本番環境では環境変数が必須
  if (!validation.isValid) {
    const errorMessages = [
      ...validation.missing.map(
        (m) => `Missing required server environment variable: ${m}`,
      ),
      ...validation.errors,
    ];
    const message = errorMessages.join("\n");
    throw new Error(message);
  }

  // サーバーサイド用のSupabase設定（service_role キー使用）
  const supabaseUrl = getEnvVar("NEXT_PUBLIC_SUPABASE_URL");
  const supabaseKey = getEnvVar("SUPABASE_SERVICE_ROLE_KEY");

  supabaseServerInstance = createClient(supabaseUrl, supabaseKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  return supabaseServerInstance;
}

// 遅延初期化されたSupabaseクライアント
export const supabaseServer = new Proxy({} as ReturnType<typeof createClient>, {
  get(_target, prop) {
    const client = getSupabaseServer();
    const value = client[prop as keyof typeof client];
    if (typeof value === "function") {
      return value.bind(client);
    }
    return value;
  },
});

// CI環境用のダミークライアント
export const createDummySupabaseClient = () => {
  return createClient("https://dummy.supabase.co", "dummy-key");
};

// サーバーサイド専用の型定義
export interface ServerCouponRecord {
  id?: string;
  coupon_code: string;
  first_name: string;
  last_name: string;
  email: string;
  experience_slug: string;
  experience_title: string;
  agree_to_terms: boolean;
  nationality?: string;
  age_group?: string;
  visit_purposes?: string[];
  stay_duration?: string;
  travel_issues?: string;
  how_found?: string;
  how_found_other?: string;
  requested_at: string;
  ip_address?: string;
  user_agent?: string;
  referrer?: string;
  created_at?: string;
}
