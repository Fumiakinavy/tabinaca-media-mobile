export interface ExperienceConfig {
  slug: string;
  isActive: boolean;
  displayName: string;
  description?: string;
  showUnifiedForm?: boolean; // 新規追加：統一フォームの表示制御
  showMap?: boolean; // 既存：Google Mapの表示/非表示を制御
  price?: number;
  discount?: string;
  activityType?: "company_affiliated" | "shibuya_pass" | "partner_store"; // アクティビティタイプ
}

/**
 * アクティビティの掲載状態を管理する設定
 * isActive: true = 掲載する, false = 掲載しない
 *
 * 新しいアクティビティを追加する際は、ここに設定を追加してください
 * すべての言語バージョン（en, ja, ko, zh, fr, es）が一括で制御されます
 */
export const experienceSettings: ExperienceConfig[] = [
  {
    slug: "kimono-dressing-experience",
    isActive: true,
    displayName: "Dress in a Traditional Kimono at TSUMUGI",
    description: "本格的な着物着付け体験",
    showUnifiedForm: true,
    showMap: true,
    price: 10000,
    discount: "45%",
    activityType: "company_affiliated",
  },
  // 新しいエクスペリエンスをすべて有効にする
  {
    slug: "avocado-fiesta-burritos-taco-rice-margaritas",
    isActive: true,
    displayName:
      "Enjoy Burritos, Taco Rice & Frozen Margaritas with Terrace Views",
    description: "アボカドを使ったメキシコ料理体験",
    showUnifiedForm: true,
    showMap: true,
  },
  {
    slug: "discover-antique-imari-ceramics-tea",
    isActive: true,
    displayName: "Discover Antique Imari Ceramics & Take a Relaxing Tea Break",
    description: "古伊万里陶器とお茶体験",
    showUnifiedForm: true,
    showMap: true,
  },
  {
    slug: "arcade-combo-claw-driving-simulator",
    isActive: true,
    displayName: "Play a 2‑Game Arcade Combo: Claw Machine & Driving Simulator",
    description: "アーケードゲーム体験",
    showUnifiedForm: true,
    showMap: true,
  },
  {
    slug: "drink-combo",
    isActive: true,
    displayName: "Play Arcade Games & Pair Them with a Snack or Drink",
    description: "ドリンクコンボ体験",
    showUnifiedForm: true,
    showMap: true,
  },
  {
    slug: "custom-salad-bowl-hot-soup",
    isActive: true,
    displayName: "Build a Custom Salad Bowl & Pair It with Hot Soup",
    description: "カスタムサラダボウルとスープ体験",
    showUnifiedForm: true,
    showMap: true,
  },
  {
    slug: "ramen-gyoza-meal-set",
    isActive: true,
    displayName: "Feast on Ramen & Gyoza with Draft Beer & Fried Rice",
    description: "ラーメンと餃子セット体験",
    showUnifiedForm: true,
    showMap: true,
  },
  {
    slug: "fresh-zesty-pickles-or-acai-berry-yogurt-snack-for-600-at-shibuya-tokyu-food-show",
    isActive: true,
    displayName:
      "Choose Fresh Pickles or an Acai Berry Yogurt Snack in Shibuya",
    description: "ピクルスまたはアサイーヨーグルト体験",
    showUnifiedForm: true,
    showMap: true,
  },
  {
    slug: "city-winery-tasting-snack",
    isActive: true,
    displayName: "Discover Urban Winemaking with a Tasting & Snack",
    description: "シティワイナリー試飲体験",
    showUnifiedForm: true,
    showMap: true,
  },
  {
    slug: "church-themed-dj-bar-experience-free-premium-tequila-shot",
    isActive: true,
    displayName:
      "Enter a Church‑Themed DJ Bar & Enjoy a Free Premium Tequila Shot",
    description: "教会テーマDJバー体験",
    showUnifiedForm: true,
    showMap: true,
  },
  {
    slug: "sky-high-city-view-sake-tasting",
    isActive: true,
    displayName: "Take in Sky‑High City Views with a Sake Tasting Set",
    description: "高層ビューと日本酒試飲体験",
    showUnifiedForm: true,
    showMap: true,
  },
  {
    slug: "taste-hokkaido-s-tokachi-obanyaki-5-pancakes-for-600-at-shibuya-tokyu-food-show",
    isActive: true,
    displayName: "Taste Hokkaido's Tokachi Obanyaki — Five Pancakes",
    description: "北海道十勝おばんやき体験",
    showUnifiedForm: true,
    showMap: true,
  },
  {
    slug: "taste-regional-flavors-ecru-s-szechuan-pickle-green-onion-steamed-chicken-salad",
    isActive: true,
    displayName:
      "Savor Regional Flavors with Ecru's Szechuan Pickle & Chicken Salad",
    description: "地域の味覚体験",
    showUnifiedForm: true,
    showMap: true,
  },
  {
    slug: "try-150-years-of-tradition-kinako-mochi-inari-inari-zushi-2-pcs-at-tokyo-s-historic-300-tasting",
    isActive: true,
    displayName:
      "Try 150 Years of Tradition with Kinako Mochi Inari or Inari‑zushi",
    description: "150年の伝統きなこもち体験",
    showUnifiedForm: true,
    showMap: true,
  },
  {
    slug: "guided-shibuya-city-walking-tour",
    isActive: true,
    displayName: "Explore Shibuya on a Guided Walking Tour",
    description: "渋谷市街地ガイドツアー",
    showUnifiedForm: true,
    showMap: true,
  },
  {
    slug: "premium-sauna-retreat-healthy-eats",
    isActive: true,
    displayName: "Recharge with a Premium Sauna Retreat & Healthy Eats",
    description: "プレミアムサウナとヘルシー食事体験",
    showUnifiedForm: true,
    showMap: true,
  },
  {
    slug: "hands-free-shibuya-luggage-omamori",
    isActive: true,
    displayName:
      "Store Your Luggage & Choose an Omamori for Hands‑Free Shibuya",
    description: "手ぶら渋谷探索体験",
    showUnifiedForm: true,
    showMap: true,
  },
  {
    slug: "seasonal-bouquet-sandwich-juice",
    isActive: true,
    displayName: "Pair a Seasonal Sandwich with Shinshu Juice",
    description: "季節のブーケサンドイッチとジュース体験",
    showUnifiedForm: true,
    showMap: true,
  },
  {
    slug: "sesame-dumpling-tasting-goma-dango",
    isActive: true,
    displayName: "Taste Three Freshly Made Goma Dango",
    description: "ごま団子試食体験",
    showUnifiedForm: true,
    showMap: true,
  },
  {
    slug: "artisanal-french-toast-bakery-snack",
    isActive: true,
    displayName: "Indulge in Artisanal French Toast at a Cozy Bakery",
    description: "アーティザナルフレンチトースト体験",
    showUnifiedForm: true,
    showMap: true,
  },
  {
    slug: "crispy-salted-fried-chicken",
    isActive: true,
    displayName: "Crunch into Crispy Salted Fried Chicken",
    description: "サクサク塩味フライドチキン体験",
    showUnifiedForm: true,
    showMap: true,
  },
  {
    slug: "artisan-calzone-tasting-at-antonios-deli",
    isActive: true,
    displayName: "Taste an Artisan Calzone at Antonio's Deli",
    description: "アーティザンカルツォーネ体験",
    showUnifiedForm: true,
    showMap: true,
  },
  {
    slug: "premium-japanese-whisky-sake-tasting",
    isActive: true,
    displayName: "Sample Premium Japanese Whisky & Sake",
    description: "プレミアム日本酒とウイスキー体験",
    showUnifiedForm: true,
    showMap: true,
  },
  {
    slug: "japanese-style-lounge-snacks-cocktails-music",
    isActive: true,
    displayName:
      "Unwind in a Japanese‑Style Lounge with Seasonal Snacks & Drinks",
    description: "和風ラウンジ体験",
    showUnifiedForm: true,
    showMap: true,
  },
  {
    slug: "live-dj-beats-cocktail-sake",
    isActive: true,
    displayName: "Catch Live DJ Beats with a Cocktail or Sake Tasting",
    description: "ライブDJとカクテル体験",
    showUnifiedForm: true,
    showMap: true,
  },
  {
    slug: "open-top-bus-tour-shibuya",
    isActive: true,
    displayName: "Ride an Open‑Top Bus through Shibuya",
    description: "オープントップバスツアー体験",
    showUnifiedForm: true,
    showMap: true,
  },
  {
    slug: "shibuya-scramble-rooftop-mag8",
    isActive: true,
    displayName: "Sip a Drink above Shibuya Scramble at MAG8",
    description: "渋谷スクランブルルーフトップ体験",
    showUnifiedForm: true,
    showMap: true,
  },
  {
    slug: "chiku-chiku-cafe-hedgehog",
    isActive: true,
    displayName: "Meet Hedgehogs at Chiku Chiku Cafe",
    description: "チクチクカフェハリネズミ体験",
    showUnifiedForm: true,
    showMap: true,
  },
  {
    slug: "edomae-sushi-creative-rolls-cagen",
    isActive: true,
    displayName: "Savor Edomae Sushi & Creative Rolls at Cagen",
    description: "江戸前寿司とクリエイティブロール体験",
    showUnifiedForm: true,
    showMap: true,
  },
  {
    slug: "hachiko-s-akita-treasures-in-shibuya-onsen-bath-salts-exclusive-plush",
    isActive: true,
    displayName: "Build Your Hachiko Souvenir Set in Shibuya",
    description: "ハチ公の秋田宝物体験",
    showUnifiedForm: true,
    showMap: true,
  },
  {
    slug: "miso-ramen-tasting-set",
    isActive: true,
    displayName: "Compare Three Bowls in a Miso Ramen Tasting Set",
    description: "味噌ラーメン試食セット体験",
    showUnifiedForm: true,
    showMap: true,
  },
  {
    slug: "shibuya-sky",
    isActive: true,
    displayName: "See a 360° Tokyo Panorama at SHIBUYA SKY",
    description: "渋谷スカイ体験",
    showUnifiedForm: true,
    showMap: true,
  },
  {
    slug: "150th-anniversary-art-exhibition-tea",
    isActive: true,
    displayName:
      "Explore the 150th Anniversary Japanese Art Exhibition & Savor Matcha",
    description: "150周年記念美術展とお茶体験",
    showUnifiedForm: true,
    showMap: true,
    price: 1200,
    discount: "20%",
  },
  {
    slug: "fountain-pen-buffet",
    isActive: true,
    displayName: "Design Your Own Fountain Pen at STYLE OF LAB",
    description: "カスタム万年筆作成体験",
    showUnifiedForm: true,
    showMap: true,
    price: 4840,
    discount: "20%",
    activityType: "company_affiliated",
  },
  {
    slug: "1-pint-of-your-favorite-draft-beer",
    isActive: true,
    displayName: "Sip Your Favorite Draft Beer by the Pint",
    description: "クラフトビール体験",
    showUnifiedForm: true,
    showMap: true,
    price: 2400,
    discount: "20%",
    activityType: "company_affiliated",
  },
  {
    slug: "emi-authentic-sushi-making-class-in-tokyo",
    isActive: true,
    displayName: "Master Edo‑Style Sushi in a Hands‑On Class",
    description: "本格寿司作り体験",
    showUnifiedForm: true,
    showMap: true,
    price: 12000,
    activityType: "company_affiliated",
  },
  {
    slug: "taste-osaka-s-famous-dotonbori-kukuru-takoyaki-6-pcs-for-600-at-shibuya-tokyu-food-show",
    isActive: true,
    displayName: "Taste Osaka's Famous Kukuru Takoyaki (6 pcs)",
    description: "大阪の有名なたこ焼き体験",
    showUnifiedForm: true,
    showMap: true,
    price: 600,
    discount: "20%",
  },
  {
    slug: "unlimited-photo-shoot-15min",
    isActive: true,
    displayName: "Unlimited Photo Shoot – 15-Minute Plan (Up to 2 People)",
    description: "15分間無制限フォトシュート体験",
    showUnifiedForm: true,
    showMap: true,
  },
  {
    slug: "escape-impossible-real-escape-game-crossing-shibuya",
    isActive: true,
    displayName:
      "Escape the Impossible – Real Escape Game at CROSSING Shibuya (90 min)",
    description: "渋谷でReal Escape Game体験",
    showUnifiedForm: true,
    showMap: true,
  },
  {
    slug: "tea-flight-pairing-experience-smith-teamaker-shibuya",
    isActive: true,
    displayName: "Tea Flight & Pairing Experience at Smith Teamaker Shibuya",
    description: "Smith Teamakerでティーフライト体験",
    showUnifiedForm: true,
    showMap: true,
  },
  {
    slug: "cook-your-first-japanese-dish-beginners-class-shibuya",
    isActive: true,
    displayName:
      "Cook Your First Japanese Dish – Beginner's Class in Shibuya (90 min)",
    description: "初心者向け日本料理クッキングクラス",
    showUnifiedForm: true,
    showMap: true,
  },
  {
    slug: "relax-with-10-gentle-samoyeds-at-tokyos-fluffiest-cafe",
    isActive: true,
    displayName: "Relax with 10 Gentle Samoyeds at Tokyo's Fluffiest Café",
    description: "原宿サモエドカフェmoffu体験",
    showUnifiedForm: true,
    showMap: true,
  },
  {
    slug: "high-tech-sushi-train-dining-in-the-heart-of-shibuya",
    isActive: true,
    displayName: "High-Tech Sushi Train Dining in the Heart of Shibuya",
    description: "魚べい渋谷道玄坂店で高速回転寿司体験",
    showUnifiedForm: true,
    showMap: true,
  },
  {
    slug: "full-sensory-tokyo-nights-neo-chinese-food-sauna-culture-at-bunkashinka",
    isActive: true,
    displayName:
      "Full-Sensory Tokyo Nights: Neo-Chinese Food, Sauna & Culture at Bunkashinka",
    description: "渋谷Bunkashinkaでネオチャイニーズ・サウナ・文化体験",
    showUnifiedForm: true,
    showMap: true,
  },
  {
    slug: "paella-spanish-wine-pairing-at-la-bodega-shibuya",
    isActive: true,
    displayName: "Paella & Spanish Wine Pairing at La Bodega Shibuya",
    description: "La Bodega渋谷でパエリアとスペインワインペアリング",
    showUnifiedForm: true,
    showMap: true,
  },
  {
    slug: "juicy-wagyu-hamburg-sweet-french-toast-afternoon-at-shibuya-hikarie",
    isActive: true,
    displayName:
      "Juicy Wagyu Hamburg & Sweet French Toast Afternoon at Shibuya Hikarie",
    description:
      "SIZZLE GAZZLE渋谷ヒカリエでワギュウハンバーグとフレンチトースト",
    showUnifiedForm: true,
    showMap: true,
  },
  {
    slug: "luxury-shaved-ice-kakigori-tasting-at-shibuya-scramble-square",
    isActive: true,
    displayName:
      "Luxury Shaved Ice (Kakigori) Tasting at Shibuya Scramble Square",
    description: "渋谷スクランブルスクエアで高級かき氷体験",
    showUnifiedForm: true,
    showMap: true,
  },
  {
    slug: "design-your-own-sweet-gift-mellowhich-cube-cakes-in-shibuya",
    isActive: true,
    displayName: "Design-Your-Own Sweet Gift: MELLOWHICH Cube Cakes in Shibuya",
    description:
      "MELLOWHICH渋谷スクランブルスクエアでカスタムキューブケーキ作り",
    showUnifiedForm: true,
    showMap: true,
  },
  {
    slug: "factory-view-chocolate-tasting-at-le-chocolat-alain-ducasse-tokyo",
    isActive: true,
    displayName:
      "Factory-View Chocolate Tasting at Le Chocolat Alain Ducasse, Tokyo (45–90 min)",
    description:
      "ルショコラアラン・デュカス東京マニュファクチュールでファクトリービューショコラ体験",
    showUnifiedForm: true,
    showMap: true,
  },
  {
    slug: "pop-art-treasure-hunt-nara-kusama-gift-curation-at-lammfromm",
    isActive: true,
    displayName:
      "Pop-Art Treasure Hunt: Nara & Kusama Gift Curation at LAMMFROMM (15–40 min)",
    description: "LAMMFROMMで奈良美智・草間彌生アートグッズキュレーション体験",
    showUnifiedForm: true,
    showMap: true,
  },
  {
    slug: "eat-japan-north-to-south-in-one-alley-shibuya-yokocho-food-fest",
    isActive: true,
    displayName:
      "Eat Japan North-to-South in One Alley – Shibuya Yokocho Food & Fest (60–90 min)",
    description:
      "渋谷横丁で北海道から沖縄まで日本全国のご当地グルメ食べ歩き体験",
    showUnifiedForm: true,
    showMap: true,
  },
  {
    slug: "japanese-whisky-spirits-tasting-kaku-uchi-base",
    isActive: true,
    displayName:
      "Japanese Whisky & Spirits Tasting – KAKU-UCHI BASE (30–60 min)",
    description:
      "渋谷ストリームのKAKU-UCHI BASEで日本のウイスキー＆スピリッツ体験",
    showUnifiedForm: true,
    showMap: true,
  },
  {
    slug: "new-style-sushi-bar-crawl-sushibuya-under-the-tracks",
    isActive: true,
    displayName:
      "New-Style Sushi Bar Crawl – SUSHIBUYA Under the Tracks (60–90 min)",
    description: "渋谷ストリームのSUSHIBUYAでニュースタイルスシバー体験",
    showUnifiedForm: true,
    showMap: true,
  },
  {
    slug: "find-feel-and-take-home-tokyo-art-oil-by-bijutsu-techo",
    isActive: true,
    displayName:
      "Find, Feel, and Take Home Tokyo Art – OIL by Bijutsu Techo (30–60 min)",
    description: "渋谷PARCOのOIL by Bijutsu Techoで東京アート発見体験",
    showUnifiedForm: true,
    showMap: true,
  },
  {
    slug: "stargaze-in-shibuya-planetarium-show-at-cosmo-planetarium",
    isActive: true,
    displayName:
      "Stargaze in Shibuya: Planetarium Show at Cosmo Planetarium (Self-Guided)",
    description: "渋谷文化センター大和田のコスモプラネタリウムで星空体験",
    showUnifiedForm: true,
    showMap: true,
  },
  {
    slug: "artful-nerikiri-tea-pairing-in-a-pink-hideaway",
    isActive: true,
    displayName: "Artful Nerikiri & Tea Pairing in a Pink Hideaway (30–60 min)",
    description:
      "代々木のKantan-na Yumeでアートフル練り切りとお茶ペアリング体験",
    showUnifiedForm: true,
    showMap: true,
  },
  {
    slug: "60-90-minute-edomae-omakase-at-sushi-tokyo-ten-shibuya",
    isActive: true,
    displayName: "60–90 Minute Edomae Omakase at SUSHI TOKYO TEN (Shibuya)",
    description: "渋谷ストリームのSUSHI TOKYO TENで江戸前おまかせ寿司体験",
    showUnifiedForm: true,
    showMap: true,
  },
  {
    slug: "samurai-armor-photoshoot-studio-90min-street-120min",
    isActive: true,
    displayName: "Samurai Armor Photoshoot (Studio 90 min / Street 120 min)",
    description: "渋谷のサムライアーマーフォトスタジオで戦国武将体験",
    showUnifiedForm: true,
    showMap: true,
  },
  {
    slug: "spin-snap-collect-2000-capsule-toys-in-the-heart-of-shibuya",
    isActive: true,
    displayName:
      "Spin, Snap & Collect: 2,000+ Capsule Toys in the Heart of Shibuya (15–45 min)",
    description: "渋谷センター街のC-plaで2000台以上のガチャポン体験",
    showUnifiedForm: true,
    showMap: true,
  },
  {
    slug: "stationery-souvenir-safari-7-floor-treasure-hunt-at-shibuya-loft",
    isActive: true,
    displayName:
      "Stationery & Souvenir Safari: 7-Floor Treasure Hunt at Shibuya LOFT (30–60 min)",
    description: "渋谷LOFTで7階建て文房具・お土産サファリ体験",
    showUnifiedForm: true,
    showMap: true,
  },
  {
    slug: "indie-bookshop-scavenger-spbs-flagship-or-scramble-square-gift-stop",
    isActive: true,
    displayName:
      "Indie Bookshop Scavenger: SPBS Flagship or Scramble-Square Gift Stop (20–60 min)",
    description: "SPBSインディーズブックショップで本とギフト発見体験",
    showUnifiedForm: true,
    showMap: true,
  },
  {
    slug: "shibuya-meat-alley-crawl",
    isActive: true,
    displayName:
      "Shibuya Meat-Alley Crawl (45–90 min) — DIY Tasting Across 2 Floors",
    description: "渋谷肉横丁で28店舗以上の肉料理食べ歩き体験",
    showUnifiedForm: true,
    showMap: true,
  },
  {
    slug: "whisper-and-words-at-mori-no-toshoshitsu",
    isActive: true,
    displayName:
      "Whisper & Words: A Self-Guided Reading Break at Mori no Toshoshitsu",
    description: "森の図書室で静かな読書とカフェ体験",
    showUnifiedForm: true,
    showMap: true,
  },
  {
    slug: "shoto-museum-architecture-exhibit-dash",
    isActive: true,
    displayName:
      'Shoto Museum "Architecture & Exhibit Dash" (30–60 min, self-guided)',
    description: "松濤美術館で建築と現代アート体験",
    showUnifiedForm: true,
    showMap: true,
  },
  {
    slug: "inclusion-art-sprint-tokyo-shibuya-koen-dori-gallery",
    isActive: true,
    displayName:
      "Inclusion Art Sprint at Tokyo Shibuya Koen-dori Gallery (30–60 min, self-guided)",
    description: "渋谷公園通りギャラリーでインクルージョンアート体験",
    showUnifiedForm: true,
    showMap: true,
  },
  {
    slug: "plate-and-taste-at-meals-are-delightful",
    isActive: true,
    displayName:
      "Plate & Taste at MEALS ARE DELIGHTFUL — Design-Forward Lunch & Tableware Hunt (Okushibuya)",
    description: "MEALSでデザイン性の高い食事と食器探し体験",
    showUnifiedForm: true,
    showMap: true,
  },
  {
    slug: "euro-vintage-treasure-hunt-at-amici",
    isActive: true,
    displayName:
      "Euro Vintage Treasure Hunt @ AMICI (Yoyogi Park / Okushibu) — 30–60 min, self-guided",
    description: "AMICIでヨーロッパヴィンテージ服探し体験",
    showUnifiedForm: true,
    showMap: true,
  },
  {
    slug: "undefeated-shibuya-drop-day-drill",
    isActive: true,
    displayName:
      'UNDEFEATED Shibuya "Drop-Day Drill" — 30–90 min self-guided sneaker mission (Cat Street)',
    description: "UNDEFEATED渋谷でスニーカー体験",
    showUnifiedForm: true,
    showMap: true,
  },
  {
    slug: "archive-hunt-at-archive-store",
    isActive: true,
    displayName:
      "ARCHIVE HUNT @ ARCHIVE STORE (Shibuya–Jinnan) — 30–90 min, self-guided",
    description: "Archive Storeでアーカイブファッション体験",
    showUnifiedForm: true,
    showMap: true,
  },
  {
    slug: "self-guided-darts-challenge-at-bane-bagus",
    isActive: true,
    displayName:
      "Self-Guided Darts Challenge @ Bane BAGUS Shibuya Miyamasuzaka (30–90 min)",
    description: "バネバグース渋谷でダーツ体験",
    showUnifiedForm: true,
    showMap: true,
  },
  {
    slug: "design-your-relaxation-at-arona-spa",
    isActive: true,
    displayName:
      "Design-Your-Relaxation: Self-Selected Massage at ARONA SPA (Shibuya)",
    description: "ARONA SPAでカスタムマッサージ体験",
    showUnifiedForm: true,
    showMap: true,
  },
  {
    slug: "express-gel-manicure-at-fastnail-shibuya",
    isActive: true,
    displayName:
      "Express Gel Manicure in Shibuya (30–75 min, design-pick & go)",
    description: "FASTNAIL渋谷で速攻ジェルネイル体験",
    showUnifiedForm: true,
    showMap: true,
  },
  {
    slug: "shibuya-ride-and-bite-micro-adventure-ebike",
    isActive: true,
    displayName:
      'Shibuya "Ride & Bite" Micro-Adventure (15–90 min) — E-Bike Self-Guided',
    description: "HELLO CYCLING電動アシスト自転車で渋谷探索体験",
    showUnifiedForm: true,
    showMap: true,
  },
  {
    slug: "private-mini-cinema-at-gran-cyber-cafe-bagus",
    isActive: true,
    displayName:
      "Private Mini-Cinema & Recharge Pod at BAGUS Shibuya (30–90 min)",
    description: "グランサイバーカフェバグースでプライベートシネマ体験",
    showUnifiedForm: true,
    showMap: true,
  },
  {
    slug: "self-guided-junmai-sake-flight-at-yata-shibuya",
    isActive: true,
    displayName:
      "Self-Guided Junmai Sake Flight at YATA Shibuya (Standing Bar, 45–60 min)",
    description: "純米酒専門YATA渋谷で日本酒飲み比べ体験",
    showUnifiedForm: true,
    showMap: true,
  },
  {
    slug: "find-the-hidden-bar-lost-shibuya",
    isActive: true,
    displayName:
      "Find-the-Hidden Bar: Signature Cocktail (or Mocktail) Sprint at LOST Shibuya",
    description: "LOST Shibuya隠れ家バーでカクテル体験",
    showUnifiedForm: true,
    showMap: true,
  },
  {
    slug: "diy-herbarium-bottle-in-shibuya",
    isActive: true,
    displayName:
      "DIY Herbarium Bottle (Flower-in-Oil) in Shibuya — 45–60 min Self-Guided Craft",
    description: "渋谷でハーバリウムボトル作り体験",
    showUnifiedForm: true,
    showMap: true,
  },
  {
    slug: "mikkeller-tokyo-craft-beer-flight",
    isActive: true,
    displayName: "Mikkeller Tokyo Craft-Beer Flight (Self-Guided, 30–60 min)",
    description: "Mikkeller Tokyoでクラフトビール飲み比べ体験",
    showUnifiedForm: true,
    showMap: true,
  },
  {
    slug: "purr-and-chill-cat-cafe-mocha-shibuya",
    isActive: true,
    displayName: "Purr & Chill: Self-Guided Cat Café Time in Shibuya (MOCHA)",
    description: "猫カフェMOCHA渋谷でネコと触れ合い体験",
    showUnifiedForm: true,
    showMap: true,
  },
  {
    slug: "harajuku-owl-time-at-owl-village",
    isActive: true,
    displayName: "Harajuku Owl Time: 60-Minute Hands-On Session at Owl Village",
    description: "Owl Village原宿でフクロウ体験",
    showUnifiedForm: true,
    showMap: true,
  },
  {
    slug: "hedgehog-hangout-at-harry-harajuku",
    isActive: true,
    displayName: "Hedgehog Hangout in Harajuku (30–60 min)",
    description: "HARRY原宿でハリネズミカフェ体験",
    showUnifiedForm: true,
    showMap: true,
  },
  {
    slug: "cuddle-a-micro-pig-in-harajuku",
    isActive: true,
    displayName: "Cuddle a Micro Pig in Harajuku (25-55 min)",
    description: "mipig cafeでマイクロブタとの触れ合い体験",
    showUnifiedForm: true,
    showMap: true,
  },
  {
    slug: "make-your-own-ring-on-cat-street",
    isActive: true,
    displayName: "Make-Your-Own Ring on Cat Street (70 min)",
    description: "nane tokyoでシルバー・ゴールドリング作り体験",
    showUnifiedForm: true,
    showMap: true,
  },
  {
    slug: "shibuya-dagashi-snack-bar-challenge",
    isActive: true,
    displayName: "Shibuya Dagashi Snack Bar Challenge (45-60 min)",
    description: "渋谷だがしバーでレトロな駄菓子体験",
    showUnifiedForm: true,
    showMap: true,
  },
  {
    slug: "vinyl-listening-bar-experience-at-jbs",
    isActive: true,
    displayName: "Vinyl-Listening Bar Experience at JBS (45-90 min)",
    description: "JBSでジャズ・ブルース・ソウルのアナログレコード体験",
    showUnifiedForm: true,
    showMap: true,
  },
  {
    slug: "silent-classical-coffee-session-at-meikyoku-kissa-lion",
    isActive: true,
    displayName:
      "Silent Classical Coffee Session at Meikyoku Kissa Lion (30-60 min)",
    description: "名曲喫茶ライオンでクラシック音楽鑑賞体験",
    showUnifiedForm: true,
    showMap: true,
  },
  {
    slug: "kairyou-yu-sento-reset",
    isActive: true,
    displayName: "Kairyou-yu Sento Reset (45-75 min)",
    description: "改良湯で銭湯・サウナ体験",
    showUnifiedForm: true,
    showMap: true,
  },
  {
    slug: "self-guided-craft-beer-flight-at-spring-valley-brewery-tokyo",
    isActive: true,
    displayName:
      "Self-Guided Craft Beer Flight at Spring Valley Brewery Tokyo (30-90 min)",
    description: "Spring Valley Brewery代官山でクラフトビールテイスティング",
    showUnifiedForm: true,
    showMap: true,
  },
  {
    slug: "purr-and-chill-cat-cafe-mocha-shinjuku",
    isActive: true,
    displayName: "Purr & Chill Cat Cafe MOCHA Shinjuku (30-90 min)",
    description: "猫カフェMOCHA新宿店で猫との触れ合い体験",
    showUnifiedForm: true,
    showMap: true,
  },
  {
    slug: "tokyo-cocktail-quest-at-the-sg-club",
    isActive: true,
    displayName: "Tokyo Cocktail Quest at The SG Club (45-90 min)",
    description: "The SG Clubでアワード受賞カクテルバー体験",
    showUnifiedForm: true,
    showMap: true,
  },
  {
    slug: "unlimited-photo-shoot-at-picmii-shinjuku",
    isActive: true,
    displayName: "Unlimited Photo Shoot at PICmii Shinjuku (15-30 min)",
    description: "PICmii新宿でセルフ写真撮影体験",
    showUnifiedForm: true,
    showMap: true,
  },
  {
    slug: "throw-shuriken-and-ninja-tricks-at-samurai-museum",
    isActive: true,
    displayName: "Throw Shuriken & Ninja Tricks (40 min)",
    description: "サムライミュージアムで忍者体験",
    showUnifiedForm: true,
    showMap: true,
  },
  {
    slug: "tokyo-rickshaw-quick-asakusa-loop",
    isActive: true,
    displayName: "Tokyo Rickshaw Asakusa Loop (15-90 min)",
    description: "浅草で人力車体験",
    showUnifiedForm: true,
    showMap: true,
  },
  {
    slug: "express-kimono-or-samurai-studio-shoot-asakusa",
    isActive: true,
    displayName: "Express Kimono or Samurai Studio Shoot (30-45 min)",
    description: "浅草右近屋で着物・侍撮影体験",
    showUnifiedForm: true,
    showMap: true,
  },
  {
    slug: "hands-on-owl-encounter-at-owl-cafe-oz-asakusa",
    isActive: true,
    displayName: "Hands-On Owl Encounter at Owl Café OZ (45-60 min)",
    description: "フクロウカフェOZ浅草店でフクロウ体験",
    showUnifiedForm: true,
    showMap: true,
  },
  {
    slug: "whisk-your-own-matcha-at-asakusa-chazen",
    isActive: true,
    displayName: "Whisk-Your-Own Matcha at Asakusa Chazen (45 min)",
    description: "浅草茶禅で茶道体験",
    showUnifiedForm: true,
    showMap: true,
  },
  {
    slug: "kimono-mini-stroll-at-asakusa-yae",
    isActive: true,
    displayName: "Kimono Mini-Stroll at Asakusa YAE (45-90 min)",
    description: "着物レンタル八重で着物体験",
    showUnifiedForm: true,
    showMap: true,
  },
  {
    slug: "pound-your-own-mochi-at-hanbei-asakusa",
    isActive: true,
    displayName: "Pound-Your-Own Mochi at HANBEI (30-45 min)",
    description: "半兵衛で餅つき体験",
    showUnifiedForm: true,
    showMap: true,
  },
  {
    slug: "asakusa-rickshaw-photo-ride-ebisuya",
    isActive: true,
    displayName: "Asakusa Rickshaw Photo Ride (30-60 min)",
    description: "えびす屋で人力車体験",
    showUnifiedForm: true,
    showMap: true,
  },
  {
    slug: "edo-kiriko-cut-glass-workshop-asakusa-ojima",
    isActive: true,
    displayName: "Edo Kiriko Cut-Glass Workshop (60-90 min)",
    description: "江戸切子おじまで江戸切子体験",
    showUnifiedForm: true,
    showMap: true,
  },
  {
    slug: "choose-your-own-asakusa-escape-game",
    isActive: true,
    displayName: "Asakusa Escape Game (60-90 min)",
    description: "リアル脱出ゲーム浅草で謎解き体験",
    showUnifiedForm: true,
    showMap: true,
  },
  {
    slug: "hedgehog-night-safari-ikebukuro",
    isActive: true,
    displayName: "Hedgehog Night Safari Ikebukuro (30-60 min)",
    description: "池袋で小動物カフェ体験",
    showUnifiedForm: true,
    showMap: true,
  },
  {
    slug: "meet-and-feed-friendly-owls-at-owlpark-ikebukuro",
    isActive: true,
    displayName: "Meet & Feed Owls at Owlpark (30-60 min)",
    description: "池袋でフクロウカフェ体験",
    showUnifiedForm: true,
    showMap: true,
  },
  {
    slug: "play-like-a-local-board-game-session-at-one-ikebukuro",
    isActive: true,
    displayName: "Board Game Session at ONE (60-90 min)",
    description: "池袋でボードゲームカフェ体験",
    showUnifiedForm: true,
    showMap: true,
  },
  {
    slug: "butlered-afternoon-tea-at-swallowtail-ikebukuro",
    isActive: true,
    displayName: "Butlered Tea at Swallowtail (100 min)",
    description: "池袋で執事喫茶体験",
    showUnifiedForm: true,
    showMap: true,
  },
  {
    slug: "rabbit-time-at-usa-cafe-mimi-ikebukuro",
    isActive: true,
    displayName: "Rabbit Time at Usa Café mimi (30-60 min)",
    description: "池袋でうさぎカフェ体験",
    showUnifiedForm: true,
    showMap: true,
  },
  {
    slug: "studio-sunseed-express-headshot",
    isActive: true,
    displayName: "Studio SUNSEED Express Headshot (30-60 min)",
    description: "池袋でプロ撮影体験",
    showUnifiedForm: true,
    showMap: true,
  },
  {
    slug: "maid-cafe-at-home-akihabara",
    isActive: true,
    displayName: "Maid Café at-home cafe (60 min)",
    description: "秋葉原でメイドカフェ体験",
    showUnifiedForm: true,
    showMap: true,
  },
  {
    slug: "owl-encounter-at-akiba-fukurou",
    isActive: true,
    displayName: "Owl Encounter at Akiba Fukurou (60 min)",
    description: "秋葉原でフクロウカフェ体験",
    showUnifiedForm: true,
    showMap: true,
  },
  {
    slug: "akihabara-board-game-speed-session-at-jelly-jelly-cafe",
    isActive: true,
    displayName: "Board-Game Session @ JELLY JELLY (60-90 min)",
    description: "秋葉原でボードゲームカフェ体験",
    showUnifiedForm: true,
    showMap: true,
  },
  {
    slug: "vr-escape-room-challenge-at-reality-edge-vr",
    isActive: true,
    displayName: "VR Escape Room Challenge (75 min)",
    description: "秋葉原でVR脱出ゲーム体験",
    showUnifiedForm: true,
    showMap: true,
  },
  {
    slug: "kiuchi-whisky-micro-flight-at-tokyo-distillery",
    isActive: true,
    displayName: "KIUCHI Whisky Micro-Flight (45-60 min)",
    description: "秋葉原でウイスキーテイスティング体験",
    showUnifiedForm: true,
    showMap: true,
  },
  {
    slug: "make-your-own-silver-pair-ring-in-daikanyama",
    isActive: true,
    displayName: "Make Silver Pair Ring in Daikanyama (60 min)",
    description: "代官山でシルバーリング作り体験",
    showUnifiedForm: true,
    showMap: true,
  },
  {
    slug: "ninja-crash-course-in-harajuku",
    isActive: true,
    displayName: "Ninja Crash-Course in Harajuku (45-60 min)",
    description: "原宿で忍者体験",
    showUnifiedForm: true,
    showMap: true,
  },
  {
    slug: "make-japanese-food-samples-in-asakusa",
    isActive: true,
    displayName: "Make Japanese Food Samples (60 min)",
    description: "浅草で食品サンプル作り体験",
    showUnifiedForm: true,
    showMap: true,
  },
  {
    slug: "cut-your-own-edo-kiriko-glass-at-sokichi-asakusa",
    isActive: true,
    displayName: "Cut Edo Kiriko Glass at Sokichi (90 min)",
    description: "浅草創吉で江戸切子体験",
    showUnifiedForm: true,
    showMap: true,
  },
  {
    slug: "shinjuku-urban-onsen-reset-at-thermae-yu",
    isActive: true,
    displayName: "Shinjuku Urban Onsen at Thermae-yu (60-90 min)",
    description: "新宿テルマー湯で温泉・サウナ体験",
    showUnifiedForm: true,
    showMap: true,
  },
  {
    slug: "all-you-can-play-bar-sprint-at-zino-shibuya",
    isActive: true,
    displayName: "All-You-Can-Play Bar at ZINO (30-90 min)",
    description: "渋谷ZINOでダーツ・カラオケ体験",
    showUnifiedForm: true,
    showMap: true,
  },
  {
    slug: "paint-your-own-japanese-teacup-and-matcha-tasting",
    isActive: true,
    displayName: "Paint Teacup + Matcha Tasting (45-75 min)",
    description: "渋谷で茶器絵付け&抹茶体験",
    showUnifiedForm: true,
    showMap: true,
  },
  {
    slug: "tenq-space-museum-mini-mission-at-tokyo-dome-city",
    isActive: true,
    displayName: "TenQ Space Museum Mini-Mission (60-90 min)",
    description: "東京ドームシティで宇宙ミュージアム体験",
    showUnifiedForm: true,
    showMap: true,
  },
];

/**
 * スラッグによって統一フォームの表示状態を取得
 */
export const getExperienceUnifiedFormStatus = (
  slug: string,
  meta?: any,
): boolean => {
  // まずMDXファイルの設定を確認
  if (meta?.showUnifiedForm !== undefined) {
    return meta.showUnifiedForm;
  }

  // 次に設定ファイルを確認
  const config = experienceSettings.find((exp) => exp.slug === slug);
  const result = config ? (config.showUnifiedForm ?? false) : false;

  return result;
};

/**
 * スラッグによってアクティビティの掲載状態を取得
 */
export const getExperienceStatus = (slug: string): boolean => {
  const config = experienceSettings.find((exp) => exp.slug === slug);
  // 設定ファイルにないエクスペリエンスはデフォルトで表示する
  return config ? config.isActive : true;
};

/**
 * スラッグによってShibuya Passセクションの表示状態を取得
 */
export const getExperienceShibuyaPassStatus = (
  slug: string,
  meta?: any,
): boolean => {
  // まずMDXファイルの設定を確認
  if (meta?.showShibuyaPass !== undefined) {
    return meta.showShibuyaPass;
  }

  // 統一フォームでは、着付け体験、Fountain Pen Buffet、1 Pint Draft Beer以外はすべてShibuya Passセクションを表示
  return ![
    "kimono-dressing-experience",
    "fountain-pen-buffet",
    "1-pint-of-your-favorite-draft-beer",
  ].includes(slug);
};

/**
 * スラッグによってGoogle Mapの表示状態を取得
 */
export const getExperienceMapStatus = (slug: string): boolean => {
  const config = experienceSettings.find((exp) => exp.slug === slug);
  // 設定ファイルにないエクスペリエンスはデフォルトでGoogle Mapを表示する
  return config ? (config.showMap ?? true) : true;
};

/**
 * アクティブなアクティビティのスラッグ一覧を取得
 */
export const getActiveExperienceSlugs = (): string[] => {
  return experienceSettings
    .filter((exp) => exp.isActive)
    .map((exp) => exp.slug);
};

/**
 * すべてのアクティビティ設定を取得
 */
export const getAllExperienceSettings = (): ExperienceConfig[] => {
  return experienceSettings;
};

/**
 * 自社連携アクティビティのリスト
 */
const COMPANY_AFFILIATED_ACTIVITIES = [
  "kimono-dressing-experience",
  "fountain-pen-buffet",
  "1-pint-of-your-favorite-draft-beer",
  "emi-authentic-sushi-making-class-in-tokyo",
];

/**
 * Shibuya Passアクティビティのリスト（既存の32個）
 */
const SHIBUYA_PASS_ACTIVITIES = [
  "miso-ramen-tasting-set",
  "shibuya-sky",
  "150th-anniversary-art-exhibition-tea",
  "arcade-combo-claw-driving-simulator",
  "artisan-calzone-tasting-at-antonios-deli",
  "artisanal-french-toast-bakery-snack",
  "avocado-fiesta-burritos-taco-rice-margaritas",
  "chiku-chiku-cafe-hedgehog",
  "church-themed-dj-bar-experience-free-premium-tequila-shot",
  "city-winery-tasting-snack",
  "crispy-salted-fried-chicken",
  "custom-salad-bowl-hot-soup",
  "discover-antique-imari-ceramics-tea",
  "drink-combo",
  "fresh-zesty-pickles-or-acai-berry-yogurt-snack-for-600-at-shibuya-tokyu-food-show",
  "guided-shibuya-city-walking-tour",
  "hachikos-akita-treasures-in-shibuya-onsen-bath-salts-exclusive-plush",
  "hands-free-shibuya-luggage-omamori",
  "japanese-style-lounge-snacks-cocktails-music",
  "live-dj-beats-cocktail-sake",
  "open-top-bus-tour-shibuya",
  "premium-japanese-whisky-sake-tasting",
  "premium-sauna-retreat-healthy-eats",
  "ramen-gyoza-meal-set",
  "seasonal-bouquet-sandwich-juice",
  "sesame-dumpling-tasting-goma-dango",
  "shibuya-scramble-rooftop-mag8",
  "sky-high-city-view-sake-tasting",
  "taste-hokkaidos-tokachi-obanyaki-5-pancakes-for-600-at-shibuya-tokyu-food-show",
  "taste-osakas-famous-dotonbori-kukuru-takoyaki-6-pcs-for-600-at-shibuya-tokyu-food-show",
  "taste-regional-flavors-ecrus-szechuan-pickle-green-onion-steamed-chicken-salad",
  "try-150-years-of-tradition-kinako-mochi-inari-inari-zushi-2-pcs-at-tokyos-historic-300-tasting",
];

/**
 * スラッグによってアクティビティタイプを取得
 *
 * @param slug - アクティビティのスラッグ
 * @returns "company_affiliated" | "shibuya_pass" | "partner_store"
 *
 * 判定ロジック:
 * 1. 自社連携アクティビティ（4個）→ company_affiliated
 * 2. Shibuya Passアクティビティ（32個）→ shibuya_pass
 * 3. それ以外の未連携アクティビティ（85個）→ partner_store
 */
export const getExperienceActivityType = (
  slug: string,
): "company_affiliated" | "shibuya_pass" | "partner_store" => {
  // 明示的な設定が存在する場合は優先
  const config = experienceSettings.find((exp) => exp.slug === slug);
  if (config?.activityType) {
    return config.activityType;
  }

  // 自社連携アクティビティ
  if (COMPANY_AFFILIATED_ACTIVITIES.includes(slug)) {
    return "company_affiliated";
  }

  // Shibuya Passアクティビティ
  if (SHIBUYA_PASS_ACTIVITIES.includes(slug)) {
    return "shibuya_pass";
  }

  // それ以外は未連携（partner_store）
  return "partner_store";
};

/**
 * アクティビティの掲載状態を変更（開発用）
 * 本番では直接このファイルを編集してください
 */
export const updateExperienceStatus = (
  slug: string,
  isActive: boolean,
): void => {
  const config = experienceSettings.find((exp) => exp.slug === slug);
  if (config) {
    config.isActive = isActive;
    console.log(
      `Experience "${slug}" status updated to: ${isActive ? "ACTIVE" : "INACTIVE"}`,
    );
  } else {
    console.warn(`Experience with slug "${slug}" not found in settings`);
  }
};

/**
 * GetYourGuideアフィリエイトリンクデータ
 */
/**
 * GetYourGuideアフィリエイトリンクデータ
 * 送られた順番通りに並んでいます
 */
export const GETYOURGUIDE_AFFILIATES = [
  // 1. Tokyo: Shibuya Sky walking tour with night Access
  {
    id: "shibuya-sky-night-access",
    title: "Tokyo: Shibuya Sky walking tour with night Access",
    duration: "2",
    price: "13387",
    imageUrl: "/images/affi/1.avif",
    affiliateUrl:
      "https://www.getyourguide.com/tokyo-l193/tokyo-shibuya-sky-walking-tour-with-night-access-t1062023/?partner_id=YIYTT3Q&currency=JPY&travel_agent=1&cmp=share_to_earn",
    meetingPoint:
      "Meet your guide at Hachiko Square, next to the Hachiko statue, beside a lottery booth to begin the walking tour. Please make sure to arrive 15 minutes before the tour start time to ensure a smooth departure.",
    meetingPointJa:
      "ハチ公広場（ハチ公像の隣、抽選会会場の横）でガイドと待ち合わせ、ウォーキングツアーに出発します。スムーズな出発のため、ツアー開始時間の15分前には必ずお越しください。",
    location: "渋谷",
    category: "walking-tour",
  },
  // 2. Tokyo: Shibuya Highlights Walking Tour & Secret Backstreets
  {
    id: "shibuya-highlights-secret-backstreets",
    title: "Tokyo: Shibuya Highlights Walking Tour & Secret Backstreets",
    duration: "1.5",
    price: "4000",
    imageUrl: "/images/affi/2.avif",
    affiliateUrl:
      "https://www.getyourguide.com/tokyo-l193/tokyo-shibuya-highlights-walking-tour-secret-backstreets-t870938/?partner_id=YIYTT3Q&currency=JPY&travel_agent=1&cmp=share_to_earn",
    meetingPoint:
      "In front of SHIBU HACHI BOX, near JR Shibuya Station Hachiko Gate and Tokyo Metro Exit A8. A guide will be waiting with a [Local Guide Stars] sign.",
    meetingPointJa:
      "JR渋谷駅ハチ公口、東京メトロA8出口すぐそば、SHIBU HACHI BOX前。「Local Guide Stars」の看板を持ったガイドがお待ちしております。",
    location: "渋谷",
    category: "walking-tour",
  },
  // 3. Tokyo: Shibuya Crossing & Hidden Streets Walking Tour
  {
    id: "shibuya-crossing-hidden-streets",
    title: "Tokyo: Shibuya Crossing & Hidden Streets Walking Tour",
    duration: "2",
    price: "3500",
    imageUrl: "/images/affi/3.avif",
    affiliateUrl:
      "https://www.getyourguide.com/tokyo-l193/tokyo-shibuya-crossing-hidden-streets-walking-tour-t678988/?partner_id=YIYTT3Q&currency=JPY&travel_agent=1&cmp=share_to_earn",
    meetingPoint:
      "Meeting point is Sabon Shibuya Mark City. It is inside the building called Mark City 3rd floor. It is difficult to find if you are first day in Tokyo. Guide will be holding a sign.",
    meetingPointJa:
      "集合場所はサボン渋谷マークシティ店です。マークシティ3階というビルの中にあります。東京初日の方は見つけにくいかもしれません。ガイドが看板を持ってご案内いたしますので、集合場所に遅れないようご注意ください。",
    location: "渋谷",
    category: "walking-tour",
  },
  // 4. Tokyo: Meiji Shrine Walking Tour — Shinto & Imperial System
  {
    id: "meiji-shrine-shinto-tour",
    title: "Tokyo: Meiji Shrine Walking Tour — Shinto & Imperial System",
    duration: "2",
    price: "4000",
    imageUrl: "/images/affi/4.avif",
    affiliateUrl:
      "https://www.getyourguide.com/tokyo-l193/tokyo-meiji-shrine-walking-tour-shinto-imperial-system-t855090/?partner_id=YIYTT3Q&currency=JPY&travel_agent=1&cmp=share_to_earn",
    meetingPoint:
      "Please meet at JR Harajuku Station East Exit. It's also a 5-minute walk from Meiji-Jingumae Station on the Fukutoshin and Chiyoda lines. Our guide holding a [Local Guide Stars] sign will be there to greet you.",
    meetingPointJa:
      "JR原宿駅東口に集合してください。副都心線・千代田線「明治神宮前駅」からも徒歩5分です。「Local Guide Stars」の看板を持ったガイドがお迎えいたします。",
    location: "原宿",
    category: "cultural-tour",
  },
  // 5. Tokyo: Shibuya Highlights Walking Tour
  {
    id: "shibuya-highlights-tour",
    title: "Tokyo: Shibuya Highlights Walking Tour",
    duration: "1.5",
    price: "",
    imageUrl: "/images/affi/5.avif",
    affiliateUrl:
      "https://www.getyourguide.com/tokyo-l193/tokyo-shibuya-highlights-walking-tour-t407279/?partner_id=YIYTT3Q&currency=JPY&travel_agent=1&cmp=share_to_earn",
    meetingPoint:
      'We will meet at "SHIBU HACHI BOX" (Tourist Information Center in front of the Hachi Statue). Please come out from the Hachiko exit of JR Shibuya station.',
    meetingPointJa:
      "集合場所は「SHIBU HACHI BOX」（ハチ公像前の観光案内所）です。JR渋谷駅ハチ公口から出てください。",
    location: "渋谷",
    category: "walking-tour",
  },
  // 6. 【NEW】Shibuya Tea Ceremony Tokyo-Chaan
  {
    id: "shibuya-tea-ceremony",
    title: "【NEW】Shibuya Tea Ceremony Tokyo-Chaan",
    duration: "50min",
    price: "3900",
    imageUrl: "/images/affi/6.avif",
    affiliateUrl:
      "https://www.getyourguide.com/tokyo-l193/new-shibuya-tea-ceremony-tokyo-chaan-t1024712/?partner_id=YIYTT3Q&currency=JPY&travel_agent=1&cmp=share_to_earn",
    meetingPoint:
      "2nd Floor, Manji Building, 1-15-9 Dogenzaka, Shibuya-ku, Tokyo 150-0043, Japan",
    meetingPointJa: "〒150-0043 東京都渋谷区道玄坂1-15-9 万字ビル2階",
    location: "渋谷",
    category: "cultural-experience",
  },
  // 7. Shibuya : Ramen Dojo Tokyo| Make All 3 (Tonkotsu/Shoyu/Miso)
  {
    id: "shibuya-ramen-dojo",
    title: "Shibuya : Ramen Dojo Tokyo| Make All 3 (Tonkotsu/Shoyu/Miso)",
    duration: "1.5",
    price: "8000",
    imageUrl: "/images/affi/7.avif",
    affiliateUrl:
      "https://www.getyourguide.com/tokyo-l193/shibuya-ramen-dojo-tokyo-make-all-3-tonkotsushoyumiso-t1081054/?partner_id=YIYTT3Q&currency=JPY&travel_agent=1&cmp=share_to_earn",
    meetingPoint:
      "It is a building with a yakiniku restaurant on the 1st floor. Please come to the 2nd floor of the Umekita Building.",
    meetingPointJa:
      "1階に焼肉店が入っているビルです。うめきたビルの2階にお越しください。",
    location: "渋谷",
    category: "food-experience",
  },
  // 8. Tokyo: Meiji Jingu Shrine and Shinto Culture Walking Tour
  {
    id: "meiji-jingu-shinto-culture",
    title: "Tokyo: Meiji Jingu Shrine and Shinto Culture Walking Tour",
    duration: "2",
    price: "4000",
    imageUrl: "/images/affi/8.avif",
    affiliateUrl:
      "https://www.getyourguide.com/tokyo-l193/tokyo-meiji-jingu-shrine-and-shinto-culture-walking-tour-t753864/?partner_id=YIYTT3Q&currency=JPY&travel_agent=1&cmp=share_to_earn",
    meetingPoint:
      "We will meet in front of the Starbucks that is closest to Meiji Shrine",
    meetingPointJa: "明治神宮に一番近いスターバックスの前で待ち合わせます",
    location: "原宿",
    category: "cultural-tour",
  },
  // 9. Stand-Up Comedy in Shibuya (English)
  {
    id: "stand-up-comedy-shibuya",
    title: "Stand-Up Comedy in Shibuya (English)",
    duration: "1,5",
    price: "3000",
    imageUrl: "/images/affi/9.avif",
    affiliateUrl:
      "https://www.getyourguide.com/tokyo-l193/stand-up-comedy-in-shibuya-english-t921233/?partner_id=YIYTT3Q&currency=JPY&travel_agent=1&cmp=share_to_earn",
    meetingPoint: "Meet at the 3rd Floor of Tokyo Comedy Bar.",
    meetingPointJa: "東京コメディバーの3階で会いましょう。",
    location: "渋谷",
    category: "entertainment",
  },
];

/**
 * GetYourGuideアフィリエイトデータを取得する関数
 */
export const getAffiliateExperience = (id: string) => {
  return GETYOURGUIDE_AFFILIATES.find((affiliate) => affiliate.id === id);
};

/**
 * 場所に基づいてアフィリエイト体験を取得
 */
export const getAffiliateExperiencesByLocation = (location: string) => {
  return GETYOURGUIDE_AFFILIATES.filter((affiliate) =>
    affiliate.location.toLowerCase().includes(location.toLowerCase()),
  );
};

/**
 * カテゴリに基づいてアフィリエイト体験を取得
 */
export const getAffiliateExperiencesByCategory = (category: string) => {
  return GETYOURGUIDE_AFFILIATES.filter((affiliate) =>
    affiliate.category.toLowerCase().includes(category.toLowerCase()),
  );
};
