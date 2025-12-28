# パフォーマンス最適化計画

## 概要
ビルド時の警告を解消し、ページデータサイズを最適化するための変更計画。

## 問題点

### 1. react-i18nextの初期化警告
**現状**: `appWithTranslation`を使用しているが、`initReactI18next`を明示的に呼び出していない
**影響**: 警告のみ（動作には影響なし）
**場所**: `pages/_app.tsx`

### 2. 大きなページデータの警告
以下のページで全データを取得しているため、データサイズが128KBを超えている：

- `/articles/[slug]`: 229 kB - `getAllItems("experiences", locale)`で全体験データを取得
- `/experiences`: 209 kB - `getAllItems("experiences", locale)`で全体験データを取得
- `/liked-activities`: 214 kB - `getAllItems('experiences', locale)`で全体験データを取得
- `/`: 218 kB - `getAllItems("articles", locale)`と`getAllItems("experiences", locale)`で全データを取得

**原因**: `getAllItems`が全フィールドを返しているため、不要なデータも含まれている

## 変更計画

### Phase 1: react-i18nextの初期化修正

#### 1.1 `pages/_app.tsx`の修正
- `initReactI18next`を明示的に呼び出す
- または、`appWithTranslation`の設定を確認して適切に初期化する

**実装方針**:
```typescript
// オプション1: initReactI18nextを明示的に呼び出す
import { initReactI18next } from 'react-i18next';
initReactI18next.use(/* i18next instance */);

// オプション2: appWithTranslationの設定を確認
// next-i18nextが自動的に初期化するはずだが、設定を確認
```

### Phase 2: ページデータサイズの最適化

#### 2.1 `lib/mdx.ts`の拡張
`getAllItems`関数にオプションを追加して、必要なフィールドのみを返すようにする。

**実装方針**:
```typescript
export async function getAllItems(
  dir: string, 
  locale: string = "en",
  options?: {
    fields?: string[]; // 必要なフィールドのみを指定
    limit?: number; // 取得件数の制限
  }
) {
  // 実装
}
```

#### 2.2 各ページの最適化

##### `/articles/[slug]` (`pages/articles/[slug].tsx`)
**現状**: 全体験データを取得（157行目）
**使用箇所**: `ArticleTemplate`コンポーネントに`allExperiences`を渡している
**最適化**: 
- `ArticleTemplate`で実際に使用されているフィールドを確認
- 最小限のフィールドのみ取得: `slug`, `title`, `coverImage`, `price`, `duration`, `googlePlaceId`等

##### `/` (`pages/index.tsx`)
**現状**: 全記事・全体験データを取得（602-603行目）
**使用箇所**: 
- `ExperiencesCarousel`: `title`, `slug`, `coverImage`, `price`, `duration`, `googlePlaceId`
- `ArticlesCarousel`: 記事の一覧表示
**最適化**:
- 体験データ: `slug`, `title`, `coverImage`, `price`, `duration`, `googlePlaceId`のみ
- 記事データ: `slug`, `title`, `coverImage`, `summary`, `date`のみ

##### `/liked-activities` (`pages/liked-activities.tsx`)
**現状**: 全体験データを取得（343行目）
**使用箇所**: 
- `slug`でフィルタリング（146行目）
- `ExperienceCard`で表示: `slug`, `title`, `coverImage`, `price`, `duration`, `summary`, `tags`, `motivationTags`, `level`等
**最適化**:
- 必要なフィールドのみ取得: `slug`, `title`, `coverImage`, `price`, `duration`, `summary`, `tags`, `motivationTags`, `level`等

##### `/experiences` (`pages/experiences/index.tsx`)
**現状**: 全体験データを取得（229行目）
**使用箇所**: 
- `ExperienceGrid`で表示: `slug`, `title`, `coverImage`, `price`, `duration`, `googlePlaceId`
- フィルタリング・検索: `title`, `summary`, `slug`, `tags`, `motivationTags`, `duration`, `level`, `locationFromStation`, `price`
**最適化**:
- 必要なフィールドのみ取得: `slug`, `title`, `coverImage`, `price`, `duration`, `summary`, `tags`, `motivationTags`, `level`, `locationFromStation`, `googlePlaceId`等

## 実装手順

### Step 1: react-i18nextの初期化修正
1. `pages/_app.tsx`を確認
2. `initReactI18next`の適切な初期化方法を調査
3. 修正を実装
4. ビルドして警告が解消されることを確認

### Step 2: `getAllItems`関数の拡張
1. `lib/mdx.ts`の`getAllItems`関数にオプションパラメータを追加
2. フィールドフィルタリング機能を実装
3. 既存の呼び出しが動作することを確認（後方互換性を保つ）

### Step 3: 各ページの最適化
1. `/articles/[slug]`の最適化
2. `/`の最適化
3. `/liked-activities`の最適化
4. `/experiences`の最適化
5. 各ページでビルドしてデータサイズを確認

### Step 4: 検証
1. 全ページでビルドを実行
2. データサイズが128KB以下になることを確認
3. 機能が正常に動作することを確認

## 期待される効果

- react-i18nextの警告が解消される
- ページデータサイズが128KB以下になる
- ビルド時間の短縮
- ページロード時間の改善
- メモリ使用量の削減

## 注意事項

- 既存の機能を壊さないように注意
- 各ページで実際に使用されているフィールドを確認してから最適化
- 後方互換性を保つ（既存の`getAllItems`呼び出しが動作するように）

## 参考資料

- [Next.js Large Page Data Warning](https://nextjs.org/docs/messages/large-page-data)
- [react-i18next Documentation](https://react.i18next.com/)
- [next-i18next Documentation](https://github.com/isaachinman/next-i18next)

