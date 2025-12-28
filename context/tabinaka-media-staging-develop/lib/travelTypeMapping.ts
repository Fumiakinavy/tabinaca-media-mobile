// Travel Type to Google Places API Type Mapping
// Mapping of recommended actions and Google Places types for 16 types

export type TravelTypeCode =
  | "GRLP"
  | "GRLF"
  | "GRHP"
  | "GRHF"
  | "GDHP"
  | "GDHF"
  | "GDLP"
  | "GDLF"
  | "SRLP"
  | "SRLF"
  | "SRHP"
  | "SRHF"
  | "SDHP"
  | "SDHF"
  | "SDLP"
  | "SDLF";

export interface TravelTypeInfo {
  code: TravelTypeCode;
  name: string;
  emoji: string;
  description: string;
  shortDescription: string;
  recommendedTypes: string[]; // Google Places API types (deprecated, kept for compatibility)
  keywords: string[];
  personalityPrompt: string; // Base Prompt + Type-specific prompt for AI system
  systemPrompt: string; // Complete system prompt for this travel type
  searchQueryTemplate: string; // Template query for Text Search (deprecated, kept for compatibility)
  searchQueryVariants: string[]; // Multiple abstract search queries for diversity
}

/**
 * Generates type-specific system prompt
 */
function generateSystemPromptForType(
  typeInfo: Omit<TravelTypeInfo, "systemPrompt">,
): string {
  const toneKeywords =
    typeInfo.keywords.slice(0, 3).join(", ") || "calm, clear";
  const profileLine = `${typeInfo.name} ${typeInfo.emoji}`;

  return [
    "You are an AI travel partner for travelers exploring their current location.",
    `Persona: ${profileLine} — ${typeInfo.shortDescription}.`,
    `Voice: ${toneKeywords}; concise, friendly, action-first.`,
    "Always read CONVERSATION_SUMMARY and CONTEXT_JSON first and obey constraints there.",
    "Dialogue contract: answer the latest user intent, keep the thread, and avoid resetting context.",
    "Tools: search_places for new options near the user (default ~500m, extend only when the user widens it); get_place_details for specifics about a known place_id. Use tools only when they add facts; otherwise respond immediately.",
    "Format: short paragraphs; bullet list options are welcome. Include distances/times when available.",
  ].join("\n\n");
}

export const TRAVEL_TYPE_MAPPINGS: Record<TravelTypeCode, TravelTypeInfo> = {
  GRLP: {
    code: "GRLP",
    name: "The Itinerary CEO",
    emoji: "📍",
    description:
      "Travel is a spreadsheet. Zero waste, maximum city domination. Lives for optimized schedules and clever logistics, loves keeping everyone on track and happy, and prefers structured, efficient multi-stop adventures. Ideal day: Morning strategy session, curated group experiences, perfectly timed sunset viewpoint.",
    shortDescription: "Plans never falter, even with friends in tow",
    recommendedTypes: [
      "tourist_attraction",
      "point_of_interest",
      "restaurant",
      "cafe",
      "shopping_mall",
    ],
    keywords: ["efficient", "planned", "group", "social", "organized"],
    searchQueryTemplate:
      "popular tourist attractions landmarks restaurants cafes shopping malls",
    searchQueryVariants: [
      "popular landmarks attractions",
      "restaurants cafes dining",
      "shopping malls stores",
      "tourist spots viewpoints",
      "group activities experiences",
    ],
    personalityPrompt: `Type: GRLP – The Itinerary CEO.

A gender-neutral Gen Z traveler in Tokyo, early 20s, standing confidently with a tablet full of color-coded schedules and a folded map sticking out of their crossbody bag.

Outfit: neat casual streetwear, light jacket, straight pants, clean sneakers, small tech watch.

Expression: focused but calm, tiny smug smile like "of course I planned everything".

Background: simplified Tokyo train map behind them, with tidy colored lines and map pins.

Meme elements: floating doodle icons of calendar, clock, checkmarks, "loading bar" almost complete, tiny 😮‍💨 and ✅ stickers.

Color accent: cool blue and mint green border and icons.

Personality: This traveler is highly organized, enjoys planning detailed itineraries, values efficiency and punctuality. They prefer structured experiences with clear schedules. They work well in groups and like to ensure everyone has a good time through careful planning.`,
    systemPrompt: "", // Will be set below
  },
  GRLF: {
    code: "GRLF",
    name: "The Chaos Explorer",
    emoji: "⚡",
    description:
      "No plan? No problem. Alleys and intuition are the guide. Thrives on spontaneous discoveries, loves vibrant environments with social energy, and chases neon lights, street food, and last-minute adventures. Ideal day: Late start, backstreet wanderings, random pop-up events, night market crawl.",
    shortDescription: "Head out and turn into promising alleys",
    recommendedTypes: [
      "point_of_interest",
      "tourist_attraction",
      "park",
      "natural_feature",
      "cafe",
    ],
    keywords: ["spontaneous", "explore", "adventure", "unplanned", "discovery"],
    searchQueryTemplate:
      "hidden alleys local spots street food unique cafes parks",
    searchQueryVariants: [
      "hidden alleys local spots",
      "street food vendors",
      "unique cafes restaurants",
      "parks gardens nature",
      "spontaneous discoveries",
    ],
    personalityPrompt: `Type: GRLF – The Chaos Explorer.

A gender-neutral Gen Z traveler half-running through a neon Tokyo alley, one shoe slightly untied, phone in hand showing a chaotic zigzag route.

Outfit: oversized hoodie, relaxed pants or shorts, chunky sneakers, cap or beanie slightly off-center, small sling bag.

Expression: laughing, eyes wide, chaotic good energy, like they almost missed the last train.

Background: arcade signs, food stalls, glowing lanterns, motion lines.

Meme elements: doodle lightning bolts, question marks, street food icons, "last train" doodle clock at 23:59, small 💥 and 😭 stickers.

Color accent: electric purple and hot pink border and icons.

Personality: This traveler thrives on spontaneity and unexpected discoveries. They prefer unplanned adventures and are energized by the chaos of exploration. They enjoy social experiences but value flexibility and the freedom to change plans instantly.`,
    systemPrompt: "", // Will be set below
  },
  GRHP: {
    code: "GRHP",
    name: "The Memory Host",
    emoji: "🎈",
    description:
      "The goal is everyone's smiles. Photos are just a bonus. Plans around group happiness and shared memories, blends structured fun with photogenic moments, and captures core memories through thoughtful scheduling. Ideal day: Cafe meet-ups, group workshops, themed dinner, golden-hour photo walk.",
    shortDescription: "Success is when everyone says they had fun",
    recommendedTypes: [
      "tourist_attraction",
      "point_of_interest",
      "park",
      "amusement_park",
      "restaurant",
    ],
    keywords: ["memories", "social", "group", "fun", "photography"],
    searchQueryTemplate:
      "fun group activities amusement parks photo spots restaurants parks",
    searchQueryVariants: [
      "fun group activities",
      "amusement parks entertainment",
      "photo spots scenic views",
      "restaurants cafes dining",
      "parks gardens outdoor",
    ],
    personalityPrompt: `Type: GRHP – The Memory Host.

A gender-neutral Gen Z traveler holding a phone in selfie mode, arms stretched to include invisible friends around them, standing in front of a cute Tokyo café.

Outfit: cozy cardigan or sweater, jeans, tote bag with a tiny camera keychain.

Expression: big warm smile, eyes slightly closed, "everyone say cheese" energy.

Background: café façade with plants, window, cake display hinted.

Meme elements: floating doodle icons of heart, camera, polaroid frame, slice of cake, tiny "✨ core memory" sticker, small 🥹 emoji.

Color accent: warm pink and cream border and icons.

Personality: This traveler prioritizes creating shared experiences and memories with friends. They are highly social, enjoy group activities, and value emotional connections. They prefer experiences that bring people together and create lasting memories.`,
    systemPrompt: "", // Will be set below
  },
  GRHF: {
    code: "GRHF",
    name: "The Main-Character Tourist",
    emoji: "🎉",
    description:
      "Main character energy lights up the city, and nights are usually dramatic. Loves high-energy, spotlight-worthy experiences, thrives in crowds and statement moments, and makes every scene feel cinematic. Ideal day: Mid-morning glam brunch, daytime pop-ups, rooftop sunset, iconic nightlife hopping.",
    shortDescription: "High energy on location, doors open with vibes",
    recommendedTypes: [
      "night_club",
      "bar",
      "amusement_park",
      "tourist_attraction",
      "restaurant",
    ],
    keywords: ["vibrant", "social", "nightlife", "entertainment", "energy"],
    searchQueryTemplate:
      "nightlife bars clubs entertainment vibrant spots restaurants",
    searchQueryVariants: [
      "nightlife bars clubs",
      "entertainment venues",
      "vibrant restaurants",
      "rooftop bars views",
      "live music events",
    ],
    personalityPrompt: `Type: GRHF – The Main-Character Tourist.

A gender-neutral Gen Z traveler posing dramatically in the middle of a busy crossing, jacket flaring, one hand in the air like they're in a music video.

Outfit: statement jacket, graphic tee, wide pants, platform shoes, bold earrings.

Expression: huge grin or singing pose, full main-character energy.

Background: stylized Shibuya-style crossing with neon billboards and blurred crowd.

Meme elements: spotlight doodle shining on them, floating "✨ main character ✨" crown, music notes, small 📹 and 🤩 stickers.

Color accent: magenta and bright yellow border and icons.

Personality: This traveler embraces their role as the protagonist of their travel story. They are highly social, energetic, and enjoy being the center of attention. They prefer vibrant, exciting experiences and spontaneous moments that feel cinematic.`,
    systemPrompt: "", // Will be set below
  },
  GDHP: {
    code: "GDHP",
    name: "The Trip Director",
    emoji: "🎬",
    description:
      "Every trip has a theme, and even the afterglow is curated. Curates experiences like cinematic chapters, balances meaningful depth with group-friendly pacing, and creates rituals with symbolic bookends. Ideal day: Themed walking tour, show-stopping exhibit, craft cocktail night with debrief journaling.",
    shortDescription: "Edits wishes into one cohesive story",
    recommendedTypes: [
      "tourist_attraction",
      "museum",
      "art_gallery",
      "point_of_interest",
      "spa",
    ],
    keywords: ["storytelling", "themed", "cultural", "meaningful", "curated"],
    searchQueryTemplate:
      "museums art galleries cultural sites themed experiences spas",
    searchQueryVariants: [
      "museums cultural sites",
      "art galleries exhibitions",
      "themed experiences tours",
      "spas wellness centers",
      "historical landmarks",
    ],
    personalityPrompt: `Type: GDHP – The Trip Director.

A gender-neutral Gen Z traveler standing next to a big moodboard or storyboard full of mini travel scenes: shrine, café, rooftop, night walk.

Outfit: long coat or trench, turtleneck, straight pants, neat loafers, film-director vibe.

Expression: thoughtful and pleased, holding sticky notes or a marker, like they're arranging scenes.

Background: cork board with photos and yarn lines connecting them, subtle city skyline behind.

Meme elements: doodle clapperboard, "scene 1, 2, 3" bubbles, small 🎬 and 🧠 stickers, heart around one favorite scene.

Color accent: deep navy and golden yellow border and icons.

Personality: This traveler approaches trips as curated narratives with themes and emotional arcs. They value meaningful, story-driven experiences and enjoy planning trips that have deeper significance. They prefer cultural and artistic experiences that tell a story.`,
    systemPrompt: "", // Will be set below
  },
  GDHF: {
    code: "GDHF",
    name: "The Serendipity Chaser",
    emoji: "✨",
    description:
      "One reservation, then let the universe take over. Sets a poetic tone before following the vibes, collects meaningful coincidences and narrative moments, and prefers flexible flow with soulful stops. Ideal day: Gentle start, hidden cafes, street performances, twilight stroll through lantern-lit alleys.",
    shortDescription:
      "Detours are a talent. Serendipitous encounters are the reward",
    recommendedTypes: [
      "point_of_interest",
      "tourist_attraction",
      "art_gallery",
      "park",
      "cafe",
    ],
    keywords: ["serendipity", "spontaneous", "discovery", "unexpected", "flow"],
    searchQueryTemplate:
      "serendipitous discoveries art galleries cafes parks hidden gems",
    searchQueryVariants: [
      "hidden gems discoveries",
      "art galleries exhibitions",
      "cozy cafes restaurants",
      "parks gardens nature",
      "serendipitous spots",
    ],
    personalityPrompt: `Type: GDHF – The Serendipity Chaser.

A gender-neutral Gen Z traveler wandering through a narrow cozy Tokyo side street, looking up at hanging lanterns with sparkles around them.

Outfit: oversized shirt or light jacket, relaxed pants, canvas sneakers, small shoulder bag, messy hair bun.

Expression: soft smile, curious eyes, dreamy "let's see what happens" vibe.

Background: tiny café signs, plants, cat silhouette on a wall.

Meme elements: doodle stars and sparkles, floating café cup, music note, "?" bubble, small ✨ and 🤍 stickers.

Color accent: lavender and soft teal border and icons.

Personality: This traveler seeks meaningful coincidences and unexpected discoveries. They balance spontaneity with a desire for deeper experiences. They enjoy going with the flow while remaining open to the stories and meanings behind places they encounter.`,
    systemPrompt: "", // Will be set below
  },
  GDLP: {
    code: "GDLP",
    name: "The City Strategist",
    emoji: "🧠",
    description:
      "Cities are systems to understand from above and optimize along the way. Maps journeys like urban puzzles, focuses on architecture and infrastructure, and keeps time and movement elegantly tuned. Ideal day: Observation deck analysis, urban planning exhibit, multi-modal transit exploration.",
    shortDescription:
      "Designs routes that reveal the city, reverse-engineering movement",
    recommendedTypes: [
      "tourist_attraction",
      "museum",
      "library",
      "point_of_interest",
      "shopping_mall",
    ],
    keywords: ["systematic", "urban", "strategic", "efficient", "analytical"],
    searchQueryTemplate:
      "museums libraries urban planning centers shopping malls efficient routes",
    searchQueryVariants: [
      "museums libraries",
      "urban planning centers",
      "shopping malls stores",
      "observation decks viewpoints",
      "transportation hubs",
    ],
    personalityPrompt: `Type: GDLP – The City Strategist.

A gender-neutral Gen Z traveler standing in front of a semi-transparent isometric city map, with highlighted routes and nodes floating around them.

Outfit: minimal tech-core, simple jacket, slim pants, sleek sneakers, crossbody tech bag, glasses.

Expression: focused, slightly smirking like they just found the most efficient route.

Background: abstract network grid and arrows pointing around the city.

Meme elements: doodle graph, "99% optimized" loading bar, compass, little 🧠 and 📊 stickers.

Color accent: teal and cyan border and icons.

Personality: This traveler approaches cities as systems to understand and optimize. They enjoy strategic planning and finding the most efficient ways to experience a place. They value intellectual understanding and prefer structured, analytical approaches to travel.`,
    systemPrompt: "", // Will be set below
  },
  GDLF: {
    code: "GDLF",
    name: "The Glitch Hunter",
    emoji: "🧪",
    description:
      "Bugs over mainstream, always grinning at niche finds. Seeks oddities, subcultures, and fringe art, loves hidden basements, rare shops, and off-kilter cafes, and collects you-had-to-be-there stories. Ideal day: Vintage arcade raid, experimental gallery, midnight vending machine safari.",
    shortDescription: "Drawn to zones not found in guides",
    recommendedTypes: [
      "establishment",
      "store",
      "point_of_interest",
      "art_gallery",
      "tourist_attraction",
    ],
    keywords: ["niche", "hidden", "unique", "offbeat", "exploration"],
    searchQueryTemplate:
      "niche shops unique stores offbeat places hidden galleries",
    searchQueryVariants: [
      "niche shops stores",
      "unique establishments",
      "offbeat places",
      "hidden galleries",
      "vintage arcades",
    ],
    personalityPrompt: `Type: GDLF – The Glitch Hunter.

A gender-neutral Gen Z traveler in front of a weird Tokyo vending machine corner or strange shop, some elements visually glitching.

Outfit: layered streetwear, cargo pants, chunky boots, chain accessories, maybe colored hair.

Expression: wide grin, amused, pointing at something bizarre.

Background: quirky signs, odd symbols, graffiti-like textures, slight pixel-glitch effects on edges.

Meme elements: pixel squares, old TV doodle, exclamation mark, little "WTF? 😂" style face (no text), small 👀 and 💀 stickers.

Color accent: neon green and purple border and icons.

Personality: This traveler actively seeks out unusual, offbeat, and niche experiences that others miss. They enjoy finding hidden gems and quirky spots that aren't in guidebooks. They value uniqueness and authenticity over mainstream attractions.`,
    systemPrompt: "", // Will be set below
  },
  SRLP: {
    code: "SRLP",
    name: "The Ritual Traveler",
    emoji: "🗂",
    description:
      "Refine the classics and update last year's plan. Enjoys quiet refinement and repeat visits, finds calm in familiar kissaten and parks, and plans softly with room for nostalgic returns. Ideal day: Morning kissaten, curated bookstore browsing, sunset at a favorite park bench.",
    shortDescription:
      "Research quietly, move calmly. Precision increases with each visit",
    recommendedTypes: [
      "cafe",
      "park",
      "tourist_attraction",
      "library",
      "museum",
    ],
    keywords: ["routine", "refined", "quiet", "familiar", "comfortable"],
    searchQueryTemplate: "quiet cafes peaceful parks libraries refined museums",
    searchQueryVariants: [
      "quiet cafes kissaten",
      "peaceful parks gardens",
      "libraries bookstores",
      "refined museums",
      "comfortable spaces",
    ],
    personalityPrompt: `Type: SRLP – The Ritual Traveler.

A gender-neutral Gen Z traveler sitting by the window in a vintage Tokyo kissaten, notebook open, same drink they always order, map neatly folded.

Outfit: simple knit sweater, straight pants, vintage shoes, glasses.

Expression: peaceful, slightly nostalgic, tiny smile while checking a list.

Background: wooden interior, old coffee equipment, retro lamp.

Meme elements: doodle calendar with repeated checkmarks, coffee cup with "again" arrow (no text), small 🧾 and ☕ stickers, tiny loop arrow.

Color accent: coffee brown and forest green border and icons.

Personality: This traveler values familiar routines and refined experiences. They prefer quiet, well-researched places and enjoy returning to favorites. They appreciate comfort and predictability, finding joy in perfecting their approach to familiar destinations.`,
    systemPrompt: "", // Will be set below
  },
  SRLF: {
    code: "SRLF",
    name: "The Silent Pathfinder",
    emoji: "🗺",
    description:
      "Silent navigator whose crowd avoidance is instinct. Loves hushed backstreets and riverside walks, moves efficiently while observing everything quietly, and finds flow in solitude and soft light. Ideal day: Sunrise stroll, hidden garden lunches, evening tram ride with headphones.",
    shortDescription: "Quiet but sees the optimal route",
    recommendedTypes: [
      "park",
      "natural_feature",
      "point_of_interest",
      "tourist_attraction",
      "cafe",
    ],
    keywords: ["quiet", "solitary", "efficient", "peaceful", "navigation"],
    searchQueryTemplate:
      "quiet parks natural areas peaceful cafes scenic spots",
    searchQueryVariants: [
      "quiet parks nature",
      "natural areas gardens",
      "peaceful cafes",
      "scenic spots viewpoints",
      "riverside walks",
    ],
    personalityPrompt: `Type: SRLF – The Silent Pathfinder.

A gender-neutral Gen Z traveler walking alone along a quiet tree-lined backstreet or riverside path, earbuds in, hands in pockets.

Outfit: light jacket, loose pants, comfy sneakers, small backpack.

Expression: calm, content, eyes slightly down or forward, no big smile.

Background: path curving into distance, trees, small bench.

Meme elements: footprint doodles, minimal map icon, leaf, tiny 🔇 and 🌿 stickers, "…" bubble with no text.

Color accent: soft green and sky blue border and icons.

Personality: This traveler prefers solitude and quiet exploration. They have an intuitive sense of direction and enjoy finding the most efficient, peaceful routes. They value quiet time and natural settings, avoiding crowds and noise.`,
    systemPrompt: "", // Will be set below
  },
  SRHP: {
    code: "SRHP",
    name: "The Comfort Curator",
    emoji: "🫧",
    description:
      "Comfort and gentleness always come first. Designs cozy, sensory-friendly itineraries, focuses on wellness, soft textures, and human warmth, and creates calm for themselves and loved ones. Ideal day: Slow brunch, restorative spa visit, low-key evening tea ceremony.",
    shortDescription: "Small, peaceful journeys feel right",
    recommendedTypes: [
      "spa",
      "beauty_salon",
      "park",
      "cafe",
      "tourist_attraction",
    ],
    keywords: ["comfort", "gentle", "peaceful", "wellness", "relaxing"],
    searchQueryTemplate:
      "spas wellness centers peaceful cafes gentle experiences parks",
    searchQueryVariants: [
      "spas wellness centers",
      "peaceful cafes",
      "gentle experiences",
      "parks gardens",
      "relaxing spaces",
    ],
    personalityPrompt: `Type: SRHP – The Comfort Curator.

A gender-neutral Gen Z traveler handing a warm drink to a friend silhouette on a bench in a quiet Tokyo park or courtyard.

Outfit: fluffy hoodie or cardigan, comfy pants, sneakers, big soft scarf.

Expression: warm, caring eyes, gentle smile.

Background: small trees, fairy lights or soft lanterns, subtle shrine gate in distance.

Meme elements: blanket doodle, heart, band-aid, tiny 💗 and 🫧 stickers, a little "HP +50" style health bar (no numbers/text, just icon).

Color accent: pastel peach and mint border and icons.

Personality: This traveler prioritizes comfort, wellness, and gentle experiences. They value peaceful, calming environments and care about the well-being of themselves and others. They prefer low-key, cozy experiences over excitement.`,
    systemPrompt: "", // Will be set below
  },
  SRHF: {
    code: "SRHF",
    name: "The Aesthetic Nomad",
    emoji: "🎨",
    description:
      "Choose places by light and sound, falling for quiet beauty every time. Chases delicate angles, subtle design, and harmonious soundscapes, prefers curated art experiences with gentle atmospheres, and documents soft, beautiful moments. Ideal day: Gallery hop, handcrafted dessert salon, golden-hour photography walk.",
    shortDescription: 'My "good" over trending. Falling for subtle beauty',
    recommendedTypes: [
      "art_gallery",
      "museum",
      "park",
      "natural_feature",
      "tourist_attraction",
    ],
    keywords: ["aesthetic", "beauty", "visual", "artistic", "sensory"],
    searchQueryTemplate:
      "art galleries museums aesthetic spots beautiful parks scenic views",
    searchQueryVariants: [
      "art galleries exhibitions",
      "museums cultural sites",
      "aesthetic spots cafes",
      "beautiful parks gardens",
      "scenic views viewpoints",
    ],
    personalityPrompt: `Type: SRHF – The Aesthetic Nomad.

A gender-neutral Gen Z traveler taking a photo of light and shadow hitting a textured Tokyo alley wall with plants and old signs.

Outfit: artsy: loose shirt, wide pants, beanie or beret, small camera bag.

Expression: concentrated, slightly tilted head, "I found the perfect shot" look.

Background: narrow alley, potted plants, warm sunset light, typographic signs.

Meme elements: camera doodle, film frame, small flower, sunbeam lines, tiny 🎨 and 📸 stickers, "this angle tho" style vibe (no text).

Color accent: terracotta and olive green border and icons.

Personality: This traveler is highly attuned to aesthetics, beauty, and sensory details. They enjoy quiet, visually pleasing experiences and value artistic and natural beauty. They prefer peaceful environments where they can appreciate subtle details and create meaningful memories.`,
    systemPrompt: "", // Will be set below
  },
  SDHP: {
    code: "SDHP",
    name: "The Soul Search Passenger",
    emoji: "🌌",
    description:
      "Travel is a self-conference where scenery provides the answers. Reflects deeply through vistas and night skies, finds insights in observation decks and sea breezes, and enjoys solo wandering followed by journaling. Ideal day: Morning rooftop solitude, contemplative museum visit, night view over the city.",
    shortDescription: "Introspection deepens at viewpoints and beaches",
    recommendedTypes: [
      "park",
      "natural_feature",
      "tourist_attraction",
      "museum",
      "art_gallery",
    ],
    keywords: [
      "introspective",
      "reflective",
      "meaningful",
      "contemplative",
      "deep",
    ],
    searchQueryTemplate:
      "peaceful parks viewpoints museums contemplative spaces",
    searchQueryVariants: [
      "peaceful parks nature",
      "viewpoints observation decks",
      "museums galleries",
      "contemplative spaces",
      "quiet cafes",
    ],
    personalityPrompt: `Type: SDHP – The Soul Search Passenger.

A gender-neutral Gen Z traveler standing at a high viewpoint over Tokyo at dusk, hands in coat pockets, looking at the city lights with a reflective expression.

Outfit: long coat, scarf, simple boots, understated accessories.

Expression: thoughtful, gentle, a little melancholic but peaceful.

Background: gradient sky from pink to deep blue, faint constellations drawn above the skyline.

Meme elements: moon doodle, small journal icon, lantern, tiny 🌙 and 🧠 stickers, thought bubble with little stars inside.

Color accent: deep navy and soft violet border and icons.

Personality: This traveler uses travel as a form of introspection and self-discovery. They value quiet, meaningful experiences that allow for reflection and contemplation. They prefer places that inspire deep thinking and emotional connection.`,
    systemPrompt: "", // Will be set below
  },
  SDHF: {
    code: "SDHF",
    name: "The Soft Daydreamer",
    emoji: "📖",
    description:
      "Half reality, half the movie in your head. Collects narratives from bookshops and quaint cafes, loves cinematic rain scenes and whispered conversations, and moves through days like a gentle film sequence. Ideal day: Rainy cafe journaling, storytelling exhibits, twilight bookstore wandering.",
    shortDescription: "Travels collecting stories in bookshops and cafes",
    recommendedTypes: [
      "library",
      "cafe",
      "book_store",
      "art_gallery",
      "tourist_attraction",
    ],
    keywords: ["dreamy", "imaginative", "literary", "contemplative", "story"],
    searchQueryTemplate:
      "bookstores libraries cozy cafes literary spots art galleries",
    searchQueryVariants: [
      "bookstores libraries",
      "cozy cafes kissaten",
      "literary spots",
      "art galleries exhibitions",
      "storytelling spaces",
    ],
    personalityPrompt: `Type: SDHF – The Soft Daydreamer.

A gender-neutral Gen Z traveler sitting in a cozy Tokyo bookshop or kissaten, surrounded by books, one open in front of them, staring dreamily out a rainy window.

Outfit: soft cardigan, long skirt or relaxed pants, round glasses, delicate jewelry.

Expression: dreamy, slightly smiling, faraway look.

Background: shelves of books, warm lamps, rain drops suggested on the window.

Meme elements: floating book pages with doodles, cinema ticket icon, flower, tiny 💭 and 🫶 stickers, small cloud with sparkles.

Color accent: dusty rose and muted blue border and icons.

Personality: This traveler lives partially in their imagination, finding stories and meaning in everyday places. They enjoy literary and artistic experiences, preferring cozy, contemplative spaces where they can daydream and connect with narratives. They value emotional and imaginative experiences over action.`,
    systemPrompt: "", // Will be set below
  },
  SDLP: {
    code: "SDLP",
    name: "The System Architect",
    emoji: "🛰",
    description:
      "Wants to see the structure beneath the scenery. Breaks down cities into layers and flows, enjoys transport hubs, observatories, and knowledge centers, and balances analysis with contemplative pauses. Ideal day: Transit museum, guided infrastructure tour, sunset notes overlooking rail lines.",
    shortDescription:
      "Hobby: designing routes with minimal movement, maximum understanding",
    recommendedTypes: [
      "museum",
      "library",
      "tourist_attraction",
      "point_of_interest",
      "art_gallery",
    ],
    keywords: [
      "systematic",
      "analytical",
      "structured",
      "intellectual",
      "deep",
    ],
    searchQueryTemplate:
      "museums libraries architectural sites educational centers",
    searchQueryVariants: [
      "museums libraries",
      "architectural sites",
      "educational centers",
      "observation decks",
      "transportation museums",
    ],
    personalityPrompt: `Type: SDLP – The System Architect.

A gender-neutral Gen Z traveler sitting by a train window, notebook or tablet open with diagrams and arrows, looking out at Tokyo's layered infrastructure shown as schematic lines over the city.

Outfit: minimalist monochrome jacket, slim pants, sleek sneakers, simple glasses.

Expression: serious but calm, clearly thinking, slight smirk of understanding.

Background: train interior suggestion, outside world overlaid with grid, arrows, nodes.

Meme elements: network diagram doodle, gear, tiny flowchart, small 🛰 and 🧩 stickers, progress bar "upgrading brain" vibe (no text).

Color accent: teal and cool gray border and icons.

Personality: This traveler seeks deep understanding of systems, structures, and underlying patterns. They enjoy intellectual exploration and prefer structured, analytical approaches to travel. They value efficiency and meaningful learning over casual experiences.`,
    systemPrompt: "", // Will be set below
  },
  SDLF: {
    code: "SDLF",
    name: "The Rabbit-Hole Nomad",
    emoji: "🧩",
    description:
      "Researcher who falls down rabbit holes from a single sign. Follows curiosity into niche worlds, loves discount bookstores, archives, and secret societies, and can spend hours decoding one mysterious clue. Ideal day: Archive pass, specialty museum, midnight research cafe session.",
    shortDescription: "Few photos but tabs multiply. Detours are justice",
    recommendedTypes: [
      "museum",
      "art_gallery",
      "establishment",
      "point_of_interest",
      "tourist_attraction",
    ],
    keywords: ["research", "deep-dive", "curious", "exploratory", "detailed"],
    searchQueryTemplate:
      "museums art galleries research centers unique establishments",
    searchQueryVariants: [
      "museums exhibitions",
      "art galleries cultural",
      "research centers archives",
      "unique establishments",
      "specialty bookstores",
    ],
    personalityPrompt: `Type: SDLF – The Rabbit-Hole Nomad.

A gender-neutral Gen Z traveler crouching in front of a tiny mysterious Tokyo shop entrance or strange sign, leaning in, inspecting intensely.

Outfit: layered hoodie under jacket, backpack with keychains, slightly messy hair.

Expression: hyper-curious, big eyes, little smile like "I HAVE to know what this is".

Background: narrow street, wires overhead, odd symbol on the door or sign.

Meme elements: magnifying glass, puzzle piece, browser window with multiple tab shapes, tiny 🤓 and 🤔 stickers, spiral arrow leading into the doorway.

Color accent: soft purple and light yellow border and icons.

Personality: This traveler is driven by intense curiosity and a desire to dive deep into mysteries and details. They enjoy spontaneous exploration that leads to unexpected discoveries and learning. They value the journey of discovery itself, often getting lost in research and investigation.`,
    systemPrompt: "", // Will be set below
  },
};

// Generate and set systemPrompt for each type
Object.values(TRAVEL_TYPE_MAPPINGS).forEach((type) => {
  (type as TravelTypeInfo).systemPrompt = generateSystemPromptForType(type);
});

/**
 * Get Google Places API types from type code (deprecated: kept for compatibility)
 */
export function getTypesForTravelType(
  travelTypeCode: TravelTypeCode,
): string[] {
  return TRAVEL_TYPE_MAPPINGS[travelTypeCode].recommendedTypes;
}

/**
 * Get search query template from type code (deprecated: kept for backward compatibility)
 */
export function getSearchQueryTemplate(travelTypeCode: TravelTypeCode): string {
  return TRAVEL_TYPE_MAPPINGS[travelTypeCode].searchQueryTemplate;
}

/**
 * Get multiple search query variants from type code (for diversity)
 */
export function getSearchQueryVariants(
  travelTypeCode: TravelTypeCode,
): string[] {
  return (
    TRAVEL_TYPE_MAPPINGS[travelTypeCode].searchQueryVariants || [
      TRAVEL_TYPE_MAPPINGS[travelTypeCode].searchQueryTemplate,
    ]
  );
}

/**
 * Get type information
 */
export function getTravelTypeInfo(
  travelTypeCode: TravelTypeCode,
): TravelTypeInfo {
  return TRAVEL_TYPE_MAPPINGS[travelTypeCode];
}

/**
 * Check if type code is valid
 */
export function isValidTravelTypeCode(code: string): code is TravelTypeCode {
  return code in TRAVEL_TYPE_MAPPINGS;
}

/**
 * Get system prompt from type code
 */
export function getSystemPromptForTravelType(
  travelTypeCode: TravelTypeCode,
): string {
  const typeInfo = TRAVEL_TYPE_MAPPINGS[travelTypeCode];
  return typeInfo.systemPrompt;
}
