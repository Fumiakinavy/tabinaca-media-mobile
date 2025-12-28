// 共通型定義

export interface Article {
  id: string;
  title: string;
  content: string;
  excerpt: string;
  imageUrl: string;
  slug: string;
  category: string;
  tags: string[];
  publishedAt: string;
  author: {
    name: string;
    avatar: string;
  };
  readTime: number;
}

// Experience型は types/experiences.ts に移動
export type { Experience, ExperienceFrontMatter } from "./experiences";
import type { Experience } from "./experiences";

// カテゴリ設定型
export interface CategoryConfig {
  id: string;
  name: string;
  displayName: string;
  bannerImage: string;
  catchCopy: string;
  handSortedIds: string[]; // 手動ソート用
}

// ページネーション用型
export interface PaginatedExperiences {
  experiences: Experience[];
  totalCount: number;
  hasMore: boolean;
  nextPage: number;
}

// API レスポンス型
export interface ApiResponse<T> {
  data: T;
  success: boolean;
  message?: string;
}

// GTMトラッキング用
export interface TrackingEvent {
  event: string;
  category: string;
  action: string;
  label?: string;
  value?: number;
}
