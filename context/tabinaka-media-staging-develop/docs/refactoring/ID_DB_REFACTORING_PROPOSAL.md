# ID・DB周りのリファクタリング案

## 現状の問題点

### 1. ユーザーIDの不整合

#### 問題
- **`user_id` (Supabase auth.users)** と **`account_id` (カスタムアカウントシステム)** が混在
- 一部のテーブルは `user_id` のみ、一部は `account_id` のみ、一部は両方を持つ
- マイグレーション途中で両方のカラムが存在し、どちらを使うべきか不明確

#### 影響範囲
```sql
-- user_id を使用しているテーブル
- user_attributes (user_id + account_id の両方)
- activity_feedback (user_id のみ)
- ai_suggestions (user_id のみ)
- chatbot_conversations (user_id のみ)
- chatbot_messages (conversation_id経由でuser_idに依存)

-- account_id を使用しているテーブル
- account_metadata (account_id のみ)
- offline_likes (account_id のみ)
- quiz_results (account_id 追加済み)
- recommendation_cache (account_id 追加済み)
- activity_likes (account_id 追加済み、user_idも存在する可能性)
```

#### コード上の不整合
- `pages/api/likes/[slug].ts`: `user_id` を直接使用（RLS経由）
- `pages/api/account/quiz-state.ts`: `account_id` を使用
- `pages/api/account/state-sync.ts`: `account_id` を使用
- `lib/server/quizState.ts`: `account_id` を使用

### 2. アクティビティIDの不整合

#### 問題
- **`activity_id` (UUID)** と **`activity_slug` (TEXT)** が混在
- 外部キー制約が不統一
- クエリパフォーマンスに影響（UUID vs TEXT インデックス）

#### 影響範囲
```sql
-- activity_id (UUID) を使用
- activity_feedback.activity_id → activities.id (FK)
- ai_suggestions.suggested_activities (UUID[])

-- activity_slug (TEXT) を使用
- activity_likes.activity_slug
- offline_likes.activity_slug
- form_submissions.experience_slug
```

#### コード上の不整合
- `pages/api/experiences/[slug].ts`: slugで検索
- `pages/api/likes/[slug].ts`: slugで検索・保存
- `pages/api/form-submissions.ts`: slugで保存
- `supabase/migrations/001_ai_recommendation_system.sql`: activity_idを使用

### 3. 外部キー制約の不整合

#### 問題
- `activity_feedback` は `activity_id` (UUID) でFK制約あり
- `activity_likes` は `activity_slug` (TEXT) でFK制約なし
- データ整合性が保証されない

### 4. 型定義とDBスキーマの不一致

#### 問題
- TypeScript型定義 (`types/experiences-db.ts`) は `id: string` を想定
- DBスキーマは UUID を使用
- 一部のAPIは slug を返し、一部は id を返す

## リファクタリング提案

### Phase 1: ユーザーIDの統一（優先度: 高）

#### 1.1 統一戦略
**`account_id` を主要な識別子として使用し、`user_id` は `account_linkages` 経由で解決**

#### 1.2 マイグレーション手順

```sql
-- Step 1: 既存のuser_idベースのデータをaccount_idに移行
-- activity_feedback テーブルの移行
UPDATE activity_feedback af
SET account_id = al.account_id
FROM account_linkages al
WHERE af.user_id = al.supabase_user_id
  AND af.account_id IS NULL;

-- user_attributes テーブルの移行
UPDATE user_attributes ua
SET account_id = al.account_id
FROM account_linkages al
WHERE ua.user_id = al.supabase_user_id
  AND ua.account_id IS NULL;

-- ai_suggestions テーブルに account_id カラムを追加
ALTER TABLE ai_suggestions
ADD COLUMN IF NOT EXISTS account_id UUID;

-- ai_suggestions の移行
UPDATE ai_suggestions ai
SET account_id = al.account_id
FROM account_linkages al
WHERE ai.user_id = al.supabase_user_id
  AND ai.account_id IS NULL;

-- chatbot_conversations テーブルに account_id カラムを追加
ALTER TABLE chatbot_conversations
ADD COLUMN IF NOT EXISTS account_id UUID;

-- chatbot_conversations の移行
UPDATE chatbot_conversations cc
SET account_id = al.account_id
FROM account_linkages al
WHERE cc.user_id = al.supabase_user_id
  AND cc.account_id IS NULL;

-- Step 2: インデックス追加
CREATE INDEX IF NOT EXISTS idx_activity_feedback_account_id 
  ON activity_feedback(account_id);

CREATE INDEX IF NOT EXISTS idx_ai_suggestions_account_id 
  ON ai_suggestions(account_id);

CREATE INDEX IF NOT EXISTS idx_chatbot_conversations_account_id 
  ON chatbot_conversations(account_id);

-- Step 3: トリガー更新（account_id自動設定）
CREATE OR REPLACE FUNCTION set_account_id_from_linkage()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  linked UUID;
BEGIN
  -- 既にaccount_idが設定されている場合はスキップ
  IF NEW.account_id IS NOT NULL THEN
    RETURN NEW;
  END IF;
  
  -- auth.uid()が存在する場合、account_linkagesから取得
  IF auth.uid() IS NOT NULL THEN
    SELECT account_id INTO linked
    FROM public.account_linkages
    WHERE supabase_user_id = auth.uid()
    LIMIT 1;
    
    IF linked IS NOT NULL THEN
      NEW.account_id := linked;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- 各テーブルにトリガーを追加
CREATE TRIGGER set_account_id_activity_feedback
  BEFORE INSERT ON activity_feedback
  FOR EACH ROW EXECUTE FUNCTION set_account_id_from_linkage();

CREATE TRIGGER set_account_id_ai_suggestions
  BEFORE INSERT ON ai_suggestions
  FOR EACH ROW EXECUTE FUNCTION set_account_id_from_linkage();

CREATE TRIGGER set_account_id_chatbot_conversations
  BEFORE INSERT ON chatbot_conversations
  FOR EACH ROW EXECUTE FUNCTION set_account_id_from_linkage();
```

#### 1.3 APIコードの更新

**統一されたヘルパー関数の作成:**

```typescript
// lib/server/accountResolver.ts (新規作成)
import { supabaseServer } from '@/lib/supabaseServer';
import { verifyAccountToken, ACCOUNT_ID_COOKIE, ACCOUNT_TOKEN_COOKIE } from '@/lib/accountToken';
import type { NextApiRequest } from 'next';

export type ResolvedAccount = {
  accountId: string;
  supabaseUserId: string | null;
};

/**
 * リクエストからaccount_idを解決する統一関数
 * 1. Cookieから取得を試みる
 * 2. AuthorizationヘッダーからSupabaseユーザーを取得し、account_linkagesから解決
 */
export async function resolveAccountId(
  req: NextApiRequest
): Promise<ResolvedAccount | null> {
  // Cookieから取得
  const accountIdCookie = req.cookies[ACCOUNT_ID_COOKIE];
  const accountTokenCookie = req.cookies[ACCOUNT_TOKEN_COOKIE];
  
  if (accountIdCookie && accountTokenCookie) {
    const session = verifyAccountToken(accountTokenCookie);
    if (session && session.accountId === accountIdCookie) {
      // SupabaseユーザーIDも取得を試みる
      const linkage = await supabaseServer
        .from('account_linkages')
        .select('supabase_user_id')
        .eq('account_id', accountIdCookie)
        .maybeSingle();
      
      return {
        accountId: accountIdCookie,
        supabaseUserId: linkage?.supabase_user_id ?? null,
      };
    }
  }
  
  // Authorizationヘッダーから解決
  const authHeader = req.headers.authorization || req.headers.Authorization;
  if (typeof authHeader === 'string' && authHeader.toLowerCase().startsWith('bearer ')) {
    const accessToken = authHeader.slice(7).trim();
    if (accessToken) {
      const { data, error } = await supabaseServer.auth.getUser(accessToken);
      if (!error && data?.user) {
        const linkage = await supabaseServer
          .from('account_linkages')
          .select('account_id')
          .eq('supabase_user_id', data.user.id)
          .order('linked_at', { ascending: false })
          .limit(1)
          .maybeSingle();
        
        if (linkage?.account_id) {
          return {
            accountId: linkage.account_id,
            supabaseUserId: data.user.id,
          };
        }
      }
    }
  }
  
  return null;
}
```

**使用例:**

```typescript
// pages/api/likes/[slug].ts の更新例
import { resolveAccountId } from '@/lib/server/accountResolver';

async function handlePost(req: NextApiRequest, res: NextApiResponse) {
  const resolved = await resolveAccountId(req);
  if (!resolved) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  
  // account_idを使用してクエリ
  const { data, error } = await supabaseServer
    .from('activity_likes')
    .select('id')
    .eq('account_id', resolved.accountId)
    .eq('activity_slug', normalizedSlug)
    .maybeSingle();
  
  // ...
}
```

### Phase 2: アクティビティIDの統一（優先度: 中）

#### 2.1 統一戦略
**`activity_slug` を主要な識別子として使用（URLフレンドリー、SEOに有利）**

#### 2.2 マイグレーション手順

```sql
-- Step 1: activity_feedback を activity_slug ベースに変更
-- 一時カラムを追加
ALTER TABLE activity_feedback
ADD COLUMN IF NOT EXISTS activity_slug TEXT;

-- activity_id から activity_slug を取得して設定
UPDATE activity_feedback af
SET activity_slug = a.slug
FROM activities a
WHERE af.activity_id = a.id
  AND af.activity_slug IS NULL;

-- インデックス追加
CREATE INDEX IF NOT EXISTS idx_activity_feedback_activity_slug 
  ON activity_feedback(activity_slug);

-- UNIQUE制約を更新（user_id → account_id, activity_id → activity_slug）
ALTER TABLE activity_feedback
DROP CONSTRAINT IF EXISTS activity_feedback_user_id_activity_id_action_type_key;

ALTER TABLE activity_feedback
ADD CONSTRAINT activity_feedback_account_id_activity_slug_action_type_key
UNIQUE(account_id, activity_slug, action_type);

-- Step 2: ai_suggestions を activity_slug ベースに変更
-- UUID[] から TEXT[] に変更
ALTER TABLE ai_suggestions
ADD COLUMN IF NOT EXISTS suggested_activity_slugs TEXT[];

-- UUID配列からslug配列に変換（関数を使用）
UPDATE ai_suggestions ai
SET suggested_activity_slugs = (
  SELECT ARRAY_AGG(a.slug)
  FROM activities a
  WHERE a.id = ANY(ai.suggested_activities)
)
WHERE ai.suggested_activity_slugs IS NULL
  AND ai.suggested_activities IS NOT NULL;

-- Step 3: 古いカラムを非推奨としてマーク（後で削除）
-- 注意: 完全に削除する前に、すべてのコードが移行されていることを確認
```

#### 2.3 コードの更新

**統一されたアクティビティ識別子ヘルパー:**

```typescript
// lib/server/activityResolver.ts (新規作成)
import { supabaseServer } from '@/lib/supabaseServer';

/**
 * activity_slugからactivity_idを取得（必要に応じて）
 */
export async function getActivityIdBySlug(slug: string): Promise<string | null> {
  const { data, error } = await supabaseServer
    .from('activities')
    .select('id')
    .eq('slug', slug)
    .eq('is_active', true)
    .maybeSingle();
  
  if (error || !data) {
    return null;
  }
  
  return data.id;
}

/**
 * activity_idからactivity_slugを取得（必要に応じて）
 */
export async function getActivitySlugById(id: string): Promise<string | null> {
  const { data, error } = await supabaseServer
    .from('activities')
    .select('slug')
    .eq('id', id)
    .eq('is_active', true)
    .maybeSingle();
  
  if (error || !data) {
    return null;
  }
  
  return data.slug;
}
```

### Phase 3: 型定義の統一（優先度: 中）

#### 3.1 統一された型定義

```typescript
// types/database.ts (新規作成)
/**
 * 統一されたデータベース型定義
 */

// アカウント識別子
export type AccountId = string; // UUID形式
export type SupabaseUserId = string; // UUID形式

// アクティビティ識別子
export type ActivitySlug = string; // URLフレンドリーな文字列
export type ActivityId = string; // UUID形式（内部使用のみ）

// 統一されたエンティティ型
export interface ActivityReference {
  slug: ActivitySlug;
  id?: ActivityId; // オプショナル（必要に応じて）
}

export interface AccountReference {
  accountId: AccountId;
  supabaseUserId?: SupabaseUserId; // オプショナル（認証済みの場合のみ）
}

// データベースエンティティ型
export interface ActivityFeedbackRecord {
  id: string;
  account_id: AccountId;
  activity_slug: ActivitySlug;
  action_type: 'like' | 'skip' | 'view' | 'book' | 'share';
  suggestion_id?: string;
  search_query?: string;
  position_in_list?: number;
  created_at: string;
}

export interface ActivityLikeRecord {
  id: string;
  account_id: AccountId;
  activity_slug: ActivitySlug;
  created_at: string;
}
```

### Phase 4: RLSポリシーの更新（優先度: 高）

#### 4.1 account_idベースのRLSポリシー

```sql
-- activity_feedback のRLS更新
DROP POLICY IF EXISTS "Users can view own feedback" ON activity_feedback;
DROP POLICY IF EXISTS "Users can insert own feedback" ON activity_feedback;

CREATE POLICY "Accounts can view own feedback"
  ON activity_feedback FOR SELECT
  USING (
    account_id IN (
      SELECT account_id FROM account_linkages
      WHERE supabase_user_id = auth.uid()
    )
  );

CREATE POLICY "Accounts can insert own feedback"
  ON activity_feedback FOR INSERT
  WITH CHECK (
    account_id IN (
      SELECT account_id FROM account_linkages
      WHERE supabase_user_id = auth.uid()
    )
  );

-- activity_likes のRLS更新（既存のuser_idベースから移行）
DROP POLICY IF EXISTS "Users can view own likes" ON activity_likes;
DROP POLICY IF EXISTS "Users can insert own likes" ON activity_likes;

CREATE POLICY "Accounts can view own likes"
  ON activity_likes FOR SELECT
  USING (
    account_id IN (
      SELECT account_id FROM account_linkages
      WHERE supabase_user_id = auth.uid()
    )
  );

CREATE POLICY "Accounts can insert own likes"
  ON activity_likes FOR INSERT
  WITH CHECK (
    account_id IN (
      SELECT account_id FROM account_linkages
      WHERE supabase_user_id = auth.uid()
    )
  );
```

## 実装優先順位

### 即座に対応すべき（Critical）
1. ✅ **Phase 1.1-1.2**: ユーザーID統一のマイグレーション
2. ✅ **Phase 1.3**: 統一されたaccount_id解決ヘルパーの実装
3. ✅ **Phase 4**: RLSポリシーの更新

### 短期対応（High Priority）
4. ✅ **Phase 2.1-2.2**: アクティビティID統一のマイグレーション
5. ✅ **Phase 2.3**: アクティビティ識別子ヘルパーの実装
6. ✅ **Phase 3**: 型定義の統一

### 中期対応（Medium Priority）
7. 古いカラム（user_id, activity_id）の削除（完全移行後）
8. パフォーマンス最適化（インデックス調整）
9. ドキュメント更新

## リスクと注意事項

### リスク
1. **データ移行中のダウンタイム**: 大規模なUPDATEクエリは時間がかかる可能性
2. **既存コードとの互換性**: 段階的な移行が必要
3. **RLSポリシーの影響**: ポリシー変更により既存のアクセスがブロックされる可能性

### 推奨アプローチ
1. **段階的移行**: 各Phaseを独立して実装・テスト
2. **後方互換性の維持**: 古いカラムを残しつつ、新しいカラムを使用
3. **ロールバック計画**: 各Phaseでロールバック手順を準備
4. **テスト**: 各Phaseで十分なテストを実施

## 参考資料

- `supabase/migrations/001_ai_recommendation_system.sql`
- `supabase/migrations/003_account_identity.sql`
- `docs/account-identity-migration.md`
- `lib/server/accountResolver.ts` (作成予定)
- `lib/server/activityResolver.ts` (作成予定)

