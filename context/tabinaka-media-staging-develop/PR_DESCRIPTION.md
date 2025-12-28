# PR Description

## Type
`feat(globalization): improve location-agnostic search and UI refinements`

## 概要
位置情報に依存しない汎用的な検索クエリへの変更、アフィリエイト表示ロジックの改善、ヒーローセクションのUI調整を行いました。これにより、日本国外（例：ドイツ）でも適切な検索結果が表示されるようになりました。

## 主な変更内容

### 1. 位置情報に依存しない検索クエリへの変更

#### `config/aiDiscoveryCategories.ts`
- すべてのカテゴリの`searchQuery`から「Shibuya」を削除
- 汎用的な検索クエリに変更（例：`"hidden gems, curated experiences, and unexpected local favorites"`）
- Google Places APIの位置情報パラメータ（`userLat`, `userLng`）に基づいて適切な検索結果を返すように改善
- これにより、ユーザーの現在地（ドイツなど）に基づいた適切な検索結果が表示されるように

**変更例：**
```typescript
// 変更前
searchQuery: "Shibuya hidden gems, curated experiences, and unexpected local favorites"

// 変更後
searchQuery: "hidden gems, curated experiences, and unexpected local favorites"
```

### 2. アフィリエイト表示ロジックの改善

#### `pages/api/chat/send-message.ts`
- 関連するアフィリエイトが見つからない場合に、Shibuyaのアフィリエイトをフォールバックで追加するロジックを削除
- これにより、日本国外（例：ドイツ）で検索した際に、不適切な渋谷関連のアフィリエイトが表示されないように改善

**変更前：**
```typescript
// 関連アフィリエイトが見つからない場合はデフォルトで渋谷の体験を1つ追加
if (relevantAffiliates.length === 0) {
  relevantAffiliates = getAffiliateExperiencesByLocation('渋谷');
}
```

**変更後：**
```typescript
// 関連するアフィリエイトがない場合は追加しない
if (relevantAffiliates.length === 0) {
  return result;
}
```

### 3. ヒーローセクションのUI改善

#### `components/HeroSection.tsx`

##### タイトル変更
- タイトルを「DISCOVER 15-90 min EXPERIENCES」から「Explore & start your journey」に変更
- より汎用的で親しみやすいメッセージに改善

##### テキストの垂直位置調整
- セクションの`items-center`を`items-start`に変更してテキストを上部に配置
- コンテンツdivに`pt-16 sm:pt-20 md:pt-24`を追加して、適切な上部パディングを設定

##### Personalize Modalの表示位置修正
- モーダルをセクションの外に移動（フラグメントを使用）
- セクションの`overflow-hidden`の影響を受けずに、画面中央に確実に表示されるように改善
- `fixed inset-0`と`flex items-center justify-center`を使用して、ビューポート全体に対して中央配置を実現

**変更前：**
```typescript
<section className="...">
  {/* Modal inside section */}
  {isPersonalizeModalOpen && (
    <div className="fixed inset-0 z-[100] flex items-center justify-center">
      {/* Modal content */}
    </div>
  )}
</section>
```

**変更後：**
```typescript
<>
  <section className="...">
    {/* Section content */}
  </section>
  {/* Modal outside section */}
  {isPersonalizeModalOpen && (
    <div className="fixed inset-0 z-[100] flex items-center justify-center">
      {/* Modal content */}
    </div>
  )}
</>
```

## 技術的な詳細

### 位置情報ベースの検索
Google Places APIの位置情報パラメータ（`userLat`, `userLng`）を活用することで、検索クエリに特定の地名を含めなくても、ユーザーの現在地に基づいた適切な検索結果を取得できます。

### モーダルの表示位置
`fixed`ポジショニングの要素は、親要素の`overflow-hidden`の影響を受ける可能性があります。モーダルをセクション外に移動することで、確実にビューポート全体に対して中央配置できます。

## 期待される効果

1. **グローバル対応の改善**
   - 日本国外のユーザーでも適切な検索結果が表示される
   - 検索クエリに特定の地名を含めないことで、より汎用的な検索が可能に

2. **ユーザー体験の向上**
   - 不適切なアフィリエイトが表示されなくなり、より関連性の高い結果が表示される
   - ヒーローセクションのメッセージがより親しみやすく、汎用的に

3. **UI/UXの改善**
   - モーダルが画面中央に確実に表示され、視認性が向上
   - ヒーローセクションのテキスト位置が適切に調整され、見やすさが向上

## テスト項目

- [ ] 日本国外（例：ドイツ）で検索した際に、適切な検索結果が表示されるか
- [ ] 日本国外で検索した際に、渋谷関連のアフィリエイトが表示されないか
- [ ] ヒーローセクションのタイトルが正しく表示されるか
- [ ] Personalize Modalが画面中央に表示されるか
- [ ] ヒーローセクションのテキスト位置が適切か
- [ ] AI Chatボタンをクリックした際に、モーダルが正しく表示されるか

## 注意事項

- アフィリエイトは現在、渋谷・原宿関連のもののみが設定されています
- 将来的に他の地域のアフィリエイトを追加する場合、`getAffiliateExperiencesByLocation`関数のロジックを拡張する必要があります
- 検索結果はユーザーの位置情報に基づいて表示されるため、位置情報の取得ができない場合はデフォルト座標が使用されます
