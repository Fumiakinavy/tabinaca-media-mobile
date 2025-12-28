# 主要API一覧（Phase 1）

## 認証 / アカウント
- Supabase Auth (OAuth Google)
- `/api/account/session` (セッション確認)

## Experiences
- `/api/experiences`（一覧取得 ※Web側の実装確認要）
- `/api/experiences/[slug]`（詳細取得 ※Web側の実装確認要）
- `/api/likes/[slug]`（Like状態取得）
- `/api/likes/toggle`（Like切替）

## Articles
- `/api/articles`（一覧取得 ※Web側の実装確認要）
- `/api/articles/[slug]`（詳細取得 ※Web側の実装確認要）

## Chat
- `/api/chat/send-message`
- `/api/chat/sessions`（一覧）
- `/api/chat/sessions/[id]`（更新・削除）
- `/api/chat/sessions/[id]/messages`
- `/api/chat/sessions/[id]/share`

## Quiz
- `/api/account/quiz-state`

## 補足
- Web側のAPIルート確認が必要（Next.js APIとして存在するか）
- MDXベースの場合はAPIではなく静的取得になるため、iOS側はJSONエクスポートが必要になる可能性あり
