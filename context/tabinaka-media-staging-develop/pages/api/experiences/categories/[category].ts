import { NextApiRequest, NextApiResponse } from "next";
import { getAllItems } from "@/lib/mdx";
import {
  sortExperiencesByCategory,
  getCategoryConfig,
} from "@/config/categories";
import { PaginatedExperiences, ApiResponse } from "@/types";

// Edge Runtimeはgray-matterと互換性がないため削除
// export const runtime = 'edge';

/**
 * カテゴリ別体験取得API（ページネーション対応）
 *
 * GET /api/experiences/categories/[category]?page=1&limit=6
 *
 * クエリパラメータ:
 * - page: ページ番号（デフォルト: 1）
 * - limit: 1ページあたりの件数（デフォルト: 6）
 */
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ApiResponse<PaginatedExperiences>>,
) {
  if (req.method !== "GET") {
    return res.status(405).json({
      success: false,
      message: "Method Not Allowed",
      data: {
        experiences: [],
        totalCount: 0,
        hasMore: false,
        nextPage: 1,
      },
    });
  }

  try {
    const { category } = req.query;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 12;

    // カテゴリ設定の確認
    const categoryConfig = getCategoryConfig(category as string);
    if (!categoryConfig) {
      return res.status(404).json({
        success: false,
        message: "Category not found",
        data: {
          experiences: [],
          totalCount: 0,
          hasMore: false,
          nextPage: 1,
        },
      });
    }

    // 全体験データを取得
    const allExperiences = await getAllItems("experiences");

    // motivationTagsに基づくフィルタリング
    const categoryExperiences = allExperiences.filter((experience: any) => {
      // motivationTagsが存在し、指定されたカテゴリIDが含まれているかチェック
      if (
        experience.motivationTags &&
        Array.isArray(experience.motivationTags)
      ) {
        return experience.motivationTags.includes(category as string);
      }
      // 後方互換性: 古いtagsシステムもサポート
      if (experience.tags && Array.isArray(experience.tags)) {
        return experience.tags.includes(category as string);
      }
      return false;
    });

    // 手動ソート適用
    const sortedExperiences = sortExperiencesByCategory(
      categoryExperiences,
      category as string,
    );

    // ページネーション計算
    const totalCount = sortedExperiences.length;
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const paginatedExperiences = sortedExperiences.slice(startIndex, endIndex);
    const hasMore = endIndex < totalCount;

    // 体験データの正規化（MVP要件に合わせて）
    const normalizedExperiences = paginatedExperiences.map(
      (experience: any) => ({
        id: experience.slug,
        slug: experience.slug,
        title: experience.title,
        summary: experience.summary,
        coverImage:
          experience.coverImage || "/images/placeholder-experience.jpg",
        price: experience.price || 0,
        duration: experience.duration || "60 min",
        walkingTimeFromStation:
          experience.locationFromStation ||
          "5 min walk from shibuya station hachiko exit",
        couponCode: experience.couponCode || null,
        discount: experience.discount || null,
        createdAt: experience.date || new Date().toISOString(),
        categoryIds: [category as string],
        tags: experience.tags || [],
        motivationTags: experience.motivationTags || [],
        isActive: true,
        location: experience.location || null,
        address: experience.address || null,
      }),
    );

    const response: PaginatedExperiences = {
      experiences: normalizedExperiences,
      totalCount,
      hasMore,
      nextPage: hasMore ? page + 1 : page,
    };

    res.status(200).json({
      success: true,
      data: response,
    });
  } catch (error) {
    console.error("Error fetching experiences:", error);
    res.status(500).json({
      success: false,
      message: "Internal Server Error",
      data: {
        experiences: [],
        totalCount: 0,
        hasMore: false,
        nextPage: 1,
      },
    });
  }
}
