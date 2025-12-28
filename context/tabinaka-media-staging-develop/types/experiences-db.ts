/**
 * エクスペリエンス管理システム用の型定義
 * ハイブリッド方式: DB + MDX
 */

// エクスペリエンス基本情報（DB管理）
export interface ExperienceDB {
  id: string;
  slug: string;
  title: string;
  summary?: string;
  cover_image?: string;
  price?: number;
  duration?: string;
  location_from_station?: string;
  level?: string;
  address?: string;
  latitude?: number;
  longitude?: number;
  is_active: boolean;
  view_count: number;
  created_at: string;
  updated_at: string;
}

// カテゴリ情報
export interface ExperienceCategory {
  id: string;
  name: string;
  slug: string;
  description?: string;
  is_active: boolean;
  created_at: string;
}

// タグ情報
export interface ExperienceTag {
  id: string;
  name: string;
  slug: string;
  color: string;
  is_active: boolean;
  created_at: string;
}

// エクスペリエンス詳細（DB + カテゴリ + タグ）
export interface ExperienceWithRelations extends ExperienceDB {
  categories: ExperienceCategory[];
  tags: ExperienceTag[];
}

// フォーム送信データ
export interface FormSubmission {
  id?: string;
  activity_id?: string;
  experience_slug: string;
  experience_title: string;
  email: string;
  phone_number?: string;
  first_name?: string;
  last_name?: string;
  country?: string;
  nationality?: string;
  age_group?: string;
  visit_purposes?: string[];
  stay_duration?: string;
  travel_issues?: string;
  how_found?: string;
  how_found_other?: string;
  notes?: string;
  ip_address?: string;
  user_agent?: string;
  referrer?: string;
  mode?: string;
  agree_to_terms?: boolean;
  created_at?: string;
  updated_at?: string;
  // QRコード関連の追加プロパティ
  bookingId?: string;
  couponCode?: string;
  qrUrl?: string;
  qrDataUrl?: string;
}

// API レスポンス型
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  debug?: any;
  qrCodeGenerated?: boolean;
  emailSent?: boolean;
  emailError?: string;
  qrError?: string;
}

// ページネーション用
export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// エクスペリエンス一覧用（軽量版）
export interface ExperienceListItem {
  id: string;
  slug: string;
  title: string;
  summary?: string;
  cover_image?: string;
  price?: number;
  duration?: string;
  level?: string;
  is_active: boolean;
  view_count: number;
  categories: Pick<ExperienceCategory, "id" | "name" | "slug">[];
  tags: Pick<ExperienceTag, "id" | "name" | "slug" | "color">[];
}

// 検索・フィルタ用
export interface ExperienceFilters {
  category?: string;
  tags?: string[];
  price_min?: number;
  price_max?: number;
  level?: string;
  is_active?: boolean;
  search?: string;
}

// エクスペリエンス作成・更新用
export interface CreateExperienceData {
  slug: string;
  title: string;
  summary?: string;
  cover_image?: string;
  price?: number;
  duration?: string;
  location_from_station?: string;
  level?: string;
  address?: string;
  latitude?: number;
  longitude?: number;
  is_active?: boolean;
  category_ids?: string[];
  tag_ids?: string[];
}

export interface UpdateExperienceData extends Partial<CreateExperienceData> {
  id: string;
}
