# プロジェクト全体構造図

## ディレクトリ構造

```mermaid
graph TB
    Root[tabinaka-media-copy] --> Pages[pages/]
    Root --> Components[components/]
    Root --> Lib[lib/]
    Root --> Config[config/]
    Root --> Content[content/]
    Root --> Context[context/]
    Root --> Hooks[hooks/]
    Root --> Types[types/]
    Root --> Public[public/]
    Root --> Docs[docs/]
    Root --> Scripts[scripts/]
    Root --> Supabase[supabase/]
    Root --> Tests[tests/]
    Root --> Tools[tools/]
    Root --> Styles[styles/]

    Pages --> PagesAPI[api/]
    Pages --> PagesAuth[auth/]
    Pages --> PagesArticles[articles/]
    Pages --> PagesBusiness[business/]
    Pages --> PagesChat[chat/]
    Pages --> PagesExperiences[experiences/]
    Pages --> PagesMotivation[motivation/]
    Pages --> PagesQuiz[quiz/]
    Pages --> PagesReview[review/]
    Pages --> PagesShare[share/]
    Pages --> PagesTrack[track/]
    Pages --> PagesQR[qr/]
    Pages --> PagesApp[_app.tsx]
    Pages --> PagesDoc[_document.tsx]
    Pages --> PagesIndex[index.tsx]

    Components --> CompCards[Card Components]
    Components --> CompChat[Chat Components]
    Components --> CompExperience[Experience Components]
    Components --> CompForms[Form Components]
    Components --> CompMaps[Map Components]
    Components --> CompUI[UI Components]

    Lib --> LibServer[server/]
    Lib --> LibScoring[scoring/]
    Lib --> LibMaps[maps/]
    Lib --> LibEmail[emailTemplates/]
    Lib --> LibUtils[Utility Files]

    Content --> ContentArticles[articles/]
    Content --> ContentExperiences[experiences/]
    Content --> ContentResults[travelTypeResults.ts]

    Config --> ConfigCategories[categories.ts]
    Config --> ConfigAI[aiDiscoveryCategories.ts]
    Config --> ConfigExp[experienceSettings.ts]

    Public --> PublicLocales[locales/]
    Public --> PublicImages[images/]
    Public --> PublicJSON[json/]

    Supabase --> SupabaseMigrations[migrations/]
```

## システムアーキテクチャ

```mermaid
graph LR
    User[ユーザー] --> Frontend[フロントエンド]
    
    Frontend --> Pages[Pages Layer]
    Frontend --> Components[Components Layer]
    Frontend --> Context[Context Layer]
    Frontend --> Hooks[Hooks Layer]
    
    Pages --> API[API Routes]
    Components --> API
    
    API --> ServerLib[Server Libraries]
    API --> SupabaseClient[Supabase Client]
    
    ServerLib --> SupabaseServer[Supabase Server]
    ServerLib --> ExternalAPIs[外部API]
    
    SupabaseServer --> Database[(Supabase Database)]
    SupabaseClient --> Database
    
    ExternalAPIs --> GooglePlaces[Google Places API]
    ExternalAPIs --> OpenAI[OpenAI API]
    ExternalAPIs --> SendGrid[SendGrid API]
    
    Content --> MDXFiles[MDX Content Files]
    MDXFiles --> Frontend
    
    style Frontend fill:#86efac
    style API fill:#22c55e
    style Database fill:#16a34a
    style ExternalAPIs fill:#fbbf24
```

## 主要機能フロー

```mermaid
graph TD
    Start[ユーザーアクセス] --> Home[ホームページ]
    
    Home --> Search[体験検索]
    Home --> Quiz[クイズ機能]
    Home --> Chat[チャット機能]
    Home --> Articles[記事閲覧]
    
    Search --> ExpList[体験一覧]
    ExpList --> ExpDetail[体験詳細]
    ExpDetail --> Booking[予約フォーム]
    ExpDetail --> Like[いいね機能]
    
    Quiz --> QuizResult[クイズ結果]
    QuizResult --> Recommendations[おすすめ体験]
    
    Chat --> ChatSession[チャットセッション]
    ChatSession --> AIDiscovery[AI発見機能]
    AIDiscovery --> PlaceSave[場所保存]
    
    Articles --> ArticleDetail[記事詳細]
    
    Booking --> QR[QRコード生成]
    QR --> Review[レビュー機能]
    
    style Home fill:#86efac
    style Quiz fill:#22c55e
    style Chat fill:#22c55e
    style Booking fill:#fbbf24
```

## API構造

```mermaid
graph TB
    API[API Routes] --> AccountAPI[account/]
    API --> ChatAPI[chat/]
    API --> ExperienceAPI[experiences/]
    API --> PlacesAPI[places/]
    API --> ReviewAPI[review/]
    API --> QRAPI[qr/]
    API --> LikesAPI[likes/]
    API --> TrackAPI[track/]
    API --> VendorAPI[vendor/]
    API --> UserAPI[user/]
    
    AccountAPI --> AccountSession[session.ts]
    AccountAPI --> AccountQuizState[quiz-state.ts]
    AccountAPI --> AccountStateSync[state-sync.ts]
    AccountAPI --> AccountLink[link.ts]
    AccountAPI --> AccountLocation[location-permission.ts]
    
    ChatAPI --> ChatSendMessage[send-message.ts]
    ChatAPI --> ChatSessions[sessions/]
    ChatSessions --> ChatSessionIndex[index.ts]
    ChatSessions --> ChatSessionDetail[sessionId.ts]
    ChatSessions --> ChatSessionMessages[messages.ts]
    ChatSessions --> ChatSessionShare[share.ts]
    ChatAPI --> ChatPlaces[places/]
    
    ExperienceAPI --> ExpIndex[index.ts]
    ExperienceAPI --> ExpDetail[slug.ts]
    ExperienceAPI --> ExpAICards[ai-cards.ts]
    ExperienceAPI --> ExpCategories[categories/]
    
    PlacesAPI --> PlacesSearch[search.ts]
    PlacesAPI --> PlacesDetails[details.ts]
    PlacesAPI --> PlacesGeocode[geocode.ts]
    PlacesAPI --> PlacesPhoto[photo.ts]
    
    ReviewAPI --> ReviewSubmit[submit.ts]
    ReviewAPI --> ReviewGenerateQR[generate-qr.ts]
    
    QRAPI --> QRGenerate[generate.ts]
    QRAPI --> QRVerify[verify.ts]
    
    LikesAPI --> LikesSlug[slug.ts]
    LikesAPI --> LikesUser[user.ts]
    
    TrackAPI --> TrackIngest[ingest.ts]
    TrackAPI --> TrackSearch[search.ts]
    TrackAPI --> TrackComplete[complete.ts]
    
    VendorAPI --> VendorLogin[login.ts]
    VendorAPI --> VendorLogout[logout.ts]
    VendorAPI --> VendorSetPassword[set-password.ts]
    VendorAPI --> VendorCompletions[completions.ts]
    
    style API fill:#22c55e
    style ChatAPI fill:#86efac
    style ExperienceAPI fill:#86efac
    style PlacesAPI fill:#86efac
```

## データフロー

```mermaid
sequenceDiagram
    participant U as ユーザー
    participant C as コンポーネント
    participant API as API Route
    participant Lib as Server Library
    participant DB as Supabase DB
    participant Ext as 外部API
    
    U->>C: アクション実行
    C->>API: API呼び出し
    API->>Lib: ビジネスロジック処理
    Lib->>DB: データ取得/保存
    DB-->>Lib: データ返却
    Lib->>Ext: 外部API呼び出し（必要時）
    Ext-->>Lib: レスポンス
    Lib-->>API: 処理結果
    API-->>C: JSONレスポンス
    C-->>U: UI更新
```

## コンポーネント階層

```mermaid
graph TB
    App[_app.tsx] --> Header[Header]
    App --> Footer[Footer]
    App --> Pages[Pages]
    
    Pages --> HomePage[index.tsx]
    Pages --> ExpPage[experiences/]
    Pages --> ChatPage[chat/]
    Pages --> QuizPage[quiz/]
    
    HomePage --> HeroSection[HeroSection]
    HomePage --> ExpGrid[ExperienceGrid]
    HomePage --> ArticlesCarousel[ArticlesCarousel]
    
    ExpPage --> ExpTemplate[ExperienceTemplate]
    ExpPage --> ExpCard[ExperienceCard]
    ExpPage --> PlaceCard[PlaceCard]
    ExpPage --> ReviewList[ReviewList]
    
    ChatPage --> ChatInterface[ChatInterface]
    ChatInterface --> ChatMessage[ChatMessage]
    ChatInterface --> ChatInput[ChatInput]
    ChatInterface --> EnhancedChatMessage[EnhancedChatMessage]
    
    QuizPage --> SmartQuiz[SmartQuiz]
    QuizPage --> TravelTypeQuiz[TravelTypeQuiz]
    QuizPage --> QuizResultModal[QuizResultModal]
    
    ExpTemplate --> GoogleMapsRating[GoogleMapsRating]
    ExpTemplate --> GoogleMapsReviews[GoogleMapsReviews]
    ExpTemplate --> InteractiveMap[InteractiveMap]
    
    style App fill:#22c55e
    style Pages fill:#86efac
    style ChatPage fill:#fbbf24
    style QuizPage fill:#fbbf24
```

## 認証・セッション管理

```mermaid
graph LR
    User[ユーザー] --> Auth[認証フロー]
    
    Auth --> AccountContext[AccountContext]
    Auth --> SupabaseAuth[Supabase Auth]
    
    AccountContext --> AccountStorage[AccountStorage]
    AccountContext --> AccountSync[AccountSync]
    AccountContext --> AccountToken[AccountToken]
    
    SupabaseAuth --> SupabaseServer[Supabase Server]
    SupabaseServer --> Database[(Database)]
    
    AccountStorage --> LocalStorage[LocalStorage]
    AccountStorage --> Cookies[Cookies]
    
    AccountSync --> StateSync[State Sync API]
    StateSync --> Database
    
    style Auth fill:#22c55e
    style AccountContext fill:#86efac
    style Database fill:#16a34a
```

## コンテンツ管理

```mermaid
graph TB
    Content[Content Layer] --> Articles[articles/]
    Content --> Experiences[experiences/]
    Content --> Results[travelTypeResults.ts]
    
    Articles --> ArticlesEN[en/]
    Articles --> ArticlesES[es/]
    Articles --> ArticlesFR[fr/]
    Articles --> ArticlesKO[ko/]
    Articles --> ArticlesZH[zh/]
    
    Experiences --> ExperiencesEN[en/]
    
    ArticlesEN --> MDXFiles[MDX Files]
    ExperiencesEN --> MDXFiles
    
    MDXFiles --> MDXLoader[MDX Loader]
    MDXLoader --> Components[Components]
    
    Results --> QuizResults[Quiz Results]
    QuizResults --> Recommendations[Recommendations]
    
    style Content fill:#22c55e
    style MDXFiles fill:#86efac
    style Components fill:#fbbf24
```

## ライブラリ構造

```mermaid
graph TB
    Lib[lib/] --> Server[server/]
    Lib --> Scoring[scoring/]
    Lib --> Maps[maps/]
    Lib --> Email[emailTemplates/]
    Lib --> Utils[Utilities]
    
    Server --> AccountResolver[accountResolver.ts]
    Server --> ActivityResolver[activityResolver.ts]
    Server --> ApiAuth[apiAuth.ts]
    Server --> ChatSessions[chatSessions.ts]
    Server --> QuizState[quizState.ts]
    Server --> LikeStorage[likeStorage.ts]
    Server --> SupabaseCookies[supabaseCookies.ts]
    
    Scoring --> UserVector[userVector.ts]
    Scoring --> Rank[rank.ts]
    Scoring --> Category[category.ts]
    
    Maps --> Photos[photos.ts]
    
    Email --> Components[components.ts]
    Email --> DesignSystem[designSystem.ts]
    Email --> Experiences[experiences/]
    
    Utils --> SupabaseServer[supabaseServer.ts]
    Utils --> SupabaseAuth[supabaseAuth.ts]
    Utils --> ApiClient[apiClient.ts]
    Utils --> Cache[cache.ts]
    Utils --> RecommendationOrchestrator[recommendationOrchestrator.ts]
    Utils --> ChatSessionsClient[chatSessionsClient.ts]
    Utils --> QuizClientState[quizClientState.ts]
    
    style Lib fill:#22c55e
    style Server fill:#86efac
    style Utils fill:#fbbf24
```

## 外部サービス統合

```mermaid
graph LR
    App[アプリケーション] --> GooglePlaces[Google Places API]
    App --> OpenAI[OpenAI API]
    App --> SendGrid[SendGrid API]
    App --> Supabase[Supabase]
    
    GooglePlaces --> PlacesSearch[場所検索]
    GooglePlaces --> PlacesDetails[詳細情報]
    GooglePlaces --> PlacesPhotos[写真取得]
    GooglePlaces --> PlacesReviews[レビュー取得]
    
    OpenAI --> ChatCompletion[チャット補完]
    OpenAI --> AIDiscovery[AI発見機能]
    
    SendGrid --> EmailTemplates[メール送信]
    EmailTemplates --> BookingConfirm[予約確認]
    EmailTemplates --> ExperienceEmails[体験メール]
    
    Supabase --> Database[(PostgreSQL)]
    Supabase --> Auth[認証]
    Supabase --> Storage[ストレージ]
    
    style App fill:#22c55e
    style GooglePlaces fill:#4285f4
    style OpenAI fill:#10a37f
    style SendGrid fill:#1a82e2
    style Supabase fill:#3ecf8e
```

## コンポーネント依存関係詳細図

```mermaid
graph TB
    App[_app.tsx] --> AccountProvider[AccountContext Provider]
    App --> QuizStatusProvider[QuizStatusContext Provider]
    App --> MDXProvider[MDXProvider]
    App --> CookieConsent[CookieConsent]
    App --> QuizResultModal[QuizResultModal]
    
    IndexPage[index.tsx] --> Header[Header]
    IndexPage --> HeroSection[HeroSection]
    IndexPage --> CardGrid[CardGrid]
    IndexPage --> Footer[Footer]
    IndexPage --> LazyExperiencesCarousel[LazyExperiencesCarousel]
    IndexPage --> LazyArticlesCarousel[LazyArticlesCarousel]
    IndexPage --> LazyMotivationCarousel[LazyMotivationCarousel]
    
    ChatPage[chat/index.tsx] --> ChatInterface[ChatInterface]
    ChatInterface --> ChatMessage[ChatMessage]
    ChatInterface --> ChatInput[ChatInput]
    ChatInterface --> EnhancedChatMessage[EnhancedChatMessage]
    
    ExpPage[experiences/index.tsx] --> Header
    ExpPage --> PlaceCard[PlaceCard]
    ExpPage --> Footer
    
    ExpDetailPage[experiences/[slug].tsx] --> ExperienceTemplate[ExperienceTemplate]
    ExperienceTemplate --> ExperienceCard[ExperienceCard]
    ExperienceTemplate --> GoogleMapsRating[GoogleMapsRating]
    ExperienceTemplate --> GoogleMapsReviews[GoogleMapsReviews]
    ExperienceTemplate --> InteractiveMap[InteractiveMap]
    ExperienceTemplate --> ReviewList[ReviewList]
    ExperienceTemplate --> SmartBookingForm[SmartBookingForm]
    
    QuizPage[quiz/index.tsx] --> SmartQuiz[SmartQuiz]
    SmartQuiz --> TravelTypeQuiz[TravelTypeQuiz]
    SmartQuiz --> QuizResultModal
    
    AccountProvider --> AccountStorage[AccountStorage]
    AccountProvider --> AccountSync[AccountSync]
    AccountProvider --> SupabaseAuth[Supabase Auth]
    
    QuizStatusProvider --> QuizClientState[QuizClientState]
    
    style App fill:#22c55e
    style AccountProvider fill:#86efac
    style ChatInterface fill:#fbbf24
    style ExperienceTemplate fill:#fbbf24
```

## 状態管理フロー

```mermaid
graph LR
    UserAction[ユーザーアクション] --> Component[コンポーネント]
    
    Component --> Context[Context API]
    Component --> LocalState[Local State]
    Component --> API[API Call]
    
    Context --> AccountContext[AccountContext]
    Context --> QuizStatusContext[QuizStatusContext]
    
    AccountContext --> AccountStorage[AccountStorage<br/>LocalStorage/Cookies]
    AccountContext --> AccountSync[AccountSync<br/>Server Sync]
    
    QuizStatusContext --> QuizClientState[QuizClientState<br/>LocalStorage]
    
    API --> ServerLib[Server Libraries]
    ServerLib --> SupabaseDB[(Supabase DB)]
    
    AccountSync --> SupabaseDB
    QuizClientState --> SupabaseDB
    
    LocalState --> ComponentUpdate[UI更新]
    Context --> ComponentUpdate
    API --> ComponentUpdate
    
    style UserAction fill:#22c55e
    style Context fill:#86efac
    style API fill:#fbbf24
    style SupabaseDB fill:#16a34a
```

## チャット機能の詳細フロー

```mermaid
sequenceDiagram
    participant U as ユーザー
    participant CI as ChatInterface
    participant CM as ChatMessage
    participant CI2 as ChatInput
    participant API as /api/chat/send-message
    participant OpenAI as OpenAI API
    participant GP as Google Places API
    participant DB as Supabase DB
    
    U->>CI2: メッセージ入力
    CI2->>CI: メッセージ送信
    CI->>CM: メッセージ表示
    CI->>API: POST /api/chat/send-message
    
    API->>OpenAI: Chat Completion
    OpenAI-->>API: AI応答
    
    API->>GP: 場所検索（必要時）
    GP-->>API: 場所情報
    
    API->>DB: セッション保存
    DB-->>API: 保存完了
    
    API-->>CI: JSONレスポンス
    CI->>CM: メッセージ追加表示
    CM-->>U: UI更新
```

## 体験予約フロー

```mermaid
graph TD
    Start[体験詳細ページ] --> ViewExp[体験閲覧]
    ViewExp --> BookingForm[予約フォーム表示]
    
    BookingForm --> FillForm[フォーム入力]
    FillForm --> SubmitForm[フォーム送信]
    
    SubmitForm --> API[POST /api/form-submissions]
    API --> Validate[バリデーション]
    Validate --> GenerateQR[QRコード生成]
    GenerateQR --> SendEmail[SendGrid メール送信]
    SendEmail --> SaveDB[(データベース保存)]
    
    SaveDB --> QRPage[QRコードページ表示]
    QRPage --> VendorScan[店舗でQRスキャン]
    VendorScan --> VerifyQR[QR検証 API]
    VerifyQR --> CompleteBooking[予約完了]
    
    CompleteBooking --> ReviewRequest[レビュー依頼]
    ReviewRequest --> ReviewForm[レビューフォーム]
    ReviewForm --> SaveReview[レビュー保存]
    
    style Start fill:#22c55e
    style BookingForm fill:#86efac
    style GenerateQR fill:#fbbf24
    style CompleteBooking fill:#16a34a
```

## クイズ・レコメンデーションシステム

```mermaid
graph TB
    Start[クイズ開始] --> QuizQuestions[質問表示]
    QuizQuestions --> UserAnswer[ユーザー回答]
    UserAnswer --> CalculateScore[スコア計算]
    
    CalculateScore --> DetermineType[旅行タイプ判定]
    DetermineType --> SaveResult[結果保存]
    
    SaveResult --> LocalStorage[LocalStorage保存]
    SaveResult --> ServerSync[サーバー同期]
    
    ServerSync --> AccountMetadata[(Account Metadata)]
    
    LocalStorage --> ShowResult[結果表示]
    ShowResult --> Recommendations[レコメンデーション生成]
    
    Recommendations --> RecommendAPI[/api/recommend]
    RecommendAPI --> ScoringSystem[スコアリングシステム]
    
    ScoringSystem --> UserVector[User Vector計算]
    ScoringSystem --> CategoryScore[カテゴリスコア]
    ScoringSystem --> RankScore[ランクスコア]
    
    ScoringSystem --> GooglePlaces[Google Places検索]
    GooglePlaces --> FilterResults[結果フィルタリング]
    FilterResults --> ReturnResults[結果返却]
    
    ReturnResults --> DisplayRec[レコメンデーション表示]
    
    style Start fill:#22c55e
    style DetermineType fill:#86efac
    style ScoringSystem fill:#fbbf24
    style DisplayRec fill:#16a34a
```

## データベースエンティティ関係図

```mermaid
erDiagram
    ACCOUNTS ||--o{ ACCOUNT_USER_LINKS : has
    ACCOUNTS ||--|| ACCOUNT_PROFILES : has
    ACCOUNTS ||--|| ACCOUNT_METADATA : has
    ACCOUNTS ||--o{ QUIZ_SESSIONS : starts
    ACCOUNTS ||--o{ CHAT_SESSIONS : initiates
    ACCOUNTS ||--o{ ACTIVITY_INTERACTIONS : engages
    ACCOUNTS ||--o{ FORM_SUBMISSIONS : books
    
    QUIZ_SESSIONS ||--o{ QUIZ_ANSWERS : contains
    QUIZ_SESSIONS ||--|| QUIZ_RESULTS : produces
    
    QUIZ_RESULTS ||--o{ RECOMMENDATION_RUNS : triggers
    RECOMMENDATION_RUNS ||--o{ RECOMMENDATION_ITEMS : aggregates
    
    ACTIVITIES ||--o{ ACTIVITY_INTERACTIONS : referenced_by
    ACTIVITIES ||--o{ ACTIVITY_ASSETS : has
    ACTIVITIES ||--o{ FORM_SUBMISSIONS : booked_for
    
    FORM_SUBMISSIONS ||--|| VOUCHERS : issues
    VOUCHERS ||--o{ VOUCHER_REDEMPTIONS : redeemed
    
    CHAT_SESSIONS ||--o{ CHAT_MESSAGES : includes
    CHAT_SESSIONS ||--o{ GENERATED_ACTIVITIES : drafts
    
    ACCOUNTS {
        uuid id PK
        string status
        jsonb onboarding_state
        timestamp created_at
    }
    
    ACTIVITIES {
        uuid id PK
        string slug
        string title
        jsonb content
        string google_place_id
    }
    
    QUIZ_SESSIONS {
        uuid id PK
        uuid account_id FK
        jsonb answers
        timestamp created_at
    }
    
    CHAT_SESSIONS {
        uuid id PK
        uuid account_id FK
        jsonb metadata
        timestamp created_at
    }
```

## ページルーティング構造

```mermaid
graph TB
    Root[/] --> Home[index.tsx]
    Root --> Experiences[/experiences]
    Root --> Articles[/articles]
    Root --> Chat[/chat]
    Root --> Quiz[/quiz]
    Root --> Auth[/auth]
    
    Experiences --> ExpList[/experiences/index.tsx]
    Experiences --> ExpDetail[/experiences/[slug].tsx]
    
    Articles --> ArticleList[/articles/index.tsx]
    Articles --> ArticleDetail[/articles/[slug].tsx]
    
    Chat --> ChatPage[/chat/index.tsx]
    
    Quiz --> QuizPage[/quiz/index.tsx]
    Quiz --> QuizShare[/quiz/share-card.tsx]
    
    Auth --> AuthCallback[/auth/callback.tsx]
    
    Root --> Business[/business]
    Business --> BusinessVisits[/business/visits.tsx]
    Business --> ReviewQR[/business/review-qr/[bookingId].tsx]
    
    Root --> Review[/review/[bookingId].tsx]
    Root --> Track[/track/[bookingId].tsx]
    Root --> QR[/qr/[bookingId].tsx]
    Root --> Share[/share/[token].tsx]
    
    Root --> StaticPages[静的ページ]
    StaticPages --> AboutUs[/about-us.tsx]
    StaticPages --> ContactUs[/contact-us.tsx]
    StaticPages --> PrivacyPolicy[/privacy-policy.tsx]
    StaticPages --> TermsOfUse[/terms-of-use.tsx]
    
    style Root fill:#22c55e
    style Home fill:#86efac
    style Chat fill:#fbbf24
    style Quiz fill:#fbbf24
    style Business fill:#16a34a
```

## 認証・セッション管理詳細フロー

```mermaid
sequenceDiagram
    participant U as ユーザー
    participant AC as AccountContext
    participant AS as AccountStorage
    participant API as /api/account/*
    participant SB as Supabase Auth
    participant DB as Database
    
    U->>AC: ページアクセス
    AC->>AS: LocalStorage確認
    AS-->>AC: accountId取得
    
    alt accountId存在
        AC->>API: セッション検証
        API->>DB: セッション確認
        DB-->>API: セッション有効
        API-->>AC: セッションOK
    else accountId不存在
        AC->>AS: 新規accountId生成
        AS-->>AC: accountId返却
        AC->>API: アカウント作成
        API->>DB: アカウント保存
        DB-->>API: 作成完了
    end
    
    alt ログイン要求
        AC->>SB: Google認証
        SB-->>AC: 認証成功
        AC->>API: アカウント紐付け
        API->>DB: account_user_links保存
        DB-->>API: 紐付け完了
        API-->>AC: 認証完了
    end
    
    AC->>AS: 状態保存
    AC-->>U: UI更新
```


