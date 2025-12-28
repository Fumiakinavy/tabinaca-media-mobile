export interface AiDiscoveryCategory {
  id: string;
  title: string;
  description: string;
  searchQuery: string;
  chatQuery: string;
  locationName?: string;
  lat?: number;
  lng?: number;
}

export const aiDiscoveryCategories: AiDiscoveryCategory[] = [
  {
    id: "for-you",
    title: "For You",
    description:
      "The AI's own blend of serendipity—spots that feel custom-picked just for you.",
    searchQuery:
      "hidden gems, curated experiences, and unexpected local favorites",
    chatQuery: "Surprise me with a few must-do experiences in Shibuya",
    locationName: "Shibuya Station",
    lat: 35.658,
    lng: 139.7016,
  },
  {
    id: "history-art-culture",
    title: "History, Art & Culture",
    description:
      "Museums, galleries, and cultural deep dives that reveal Shibuya's creative history.",
    searchQuery:
      "historical tours, contemporary art museums, and cultural experiences",
    chatQuery:
      "Where can I explore Shibuya's history, art, and culture in a single visit?",
    locationName: "Shibuya Center",
    lat: 35.664,
    lng: 139.699,
  },
  {
    id: "leisure-attractions",
    title: "Leisure & Attractions",
    description:
      "Eye-catching landmarks, photo-spots, and fun attractions you can enjoy on your own pace.",
    searchQuery:
      "leisure attractions, photo spots, and must-see city highlights",
    chatQuery:
      "Recommend memorable leisure attractions in Shibuya for a relaxed afternoon",
    locationName: "Shibuya Crossing",
    lat: 35.6592,
    lng: 139.7004,
  },
  {
    id: "entertainment-shows",
    title: "Entertainment & Shows",
    description:
      "Live performances, immersive shows, and evening spectacles curated by the AI.",
    searchQuery: "live shows, entertainment venues, and performance spaces",
    chatQuery:
      "What entertainment or shows should I experience in Shibuya tonight?",
    locationName: "Nonbei Yokocho",
    lat: 35.6615,
    lng: 139.7016,
  },
  {
    id: "activities-recreation",
    title: "Activities & Recreation",
    description:
      "Hands-on workshops, skill-building sessions, and energetic recreations to try now.",
    searchQuery:
      "interactive activities, workshops, and recreational experiences",
    chatQuery:
      "Find fun activity or recreation ideas in Shibuya for a lively afternoon",
    locationName: "Cat Street",
    lat: 35.6656,
    lng: 139.7041,
  },
  {
    id: "nature-outdoors",
    title: "Nature & Outdoors",
    description:
      "Parks, rooftop gardens, and greenery escapes that bring the outdoors into the city.",
    searchQuery: "parks, rooftop greenery, and nature-focused experiences",
    chatQuery: "Where can I enjoy nature and fresh air in Shibuya?",
    locationName: "Yoyogi Park",
    lat: 35.6692,
    lng: 139.6997,
  },
  {
    id: "dining-western",
    title: "Dining – Western & General",
    description:
      "From boutique bistros to modern fusion kitchens, these spots satisfy western cravings.",
    searchQuery:
      "western-style dining experiences, bistros, and general modern restaurants",
    chatQuery: "Suggest Western-inspired dining experiences in Shibuya",
    locationName: "Omotesando",
    lat: 35.6644,
    lng: 139.712,
  },
  {
    id: "dining-asian",
    title: "Dining – Asian & Ethnic",
    description:
      "Authentic Asian and ethnic flavors—from ramen to regional street eats—curated by the AI.",
    searchQuery:
      "Asian dining, ethnic restaurants, and authentic local cuisine",
    chatQuery:
      "What Asian or ethnic dining experiences should I book in Shibuya?",
    locationName: "Udagawacho",
    lat: 35.6598,
    lng: 139.6978,
  },
  {
    id: "cafes-bites-sweets",
    title: "Cafes, Bites & Sweets",
    description:
      "Specialty cafes, dessert bars, and quick bites that fuel your wanderings.",
    searchQuery: "cafes, dessert bars, and quick bite sweets experiences",
    chatQuery: "Recommend cafes, sweets, or bite-sized treats in Shibuya",
    locationName: "Daikanyama",
    lat: 35.6467,
    lng: 139.7072,
  },
  {
    id: "nightlife-bars",
    title: "Nightlife & Bars",
    description:
      "After-dark spots for cocktails, music, and neon-soaked socializing picked by the AI.",
    searchQuery: "nightlife bars, cocktail lounges, and live music spots",
    chatQuery: "Where should I go for nightlife and bars around Shibuya?",
    locationName: "Dogenzaka",
    lat: 35.6588,
    lng: 139.6986,
  },
  {
    id: "shopping-lifestyle",
    title: "Shopping & Lifestyle",
    description:
      "Stylish boutiques, local crafts, and curated shopping journeys tailored for you.",
    searchQuery: "lifestyle boutiques, craft shopping, and designer stores",
    chatQuery:
      "What shopping and lifestyle experiences should I explore in Shibuya?",
    locationName: "Shibuya Hikarie",
    lat: 35.658,
    lng: 139.703,
  },
  {
    id: "traditional-food",
    title: "Traditional Food",
    description:
      "Classic Japanese flavors and ritual meals—sushi, soba, yakitori—highlighted by the AI.",
    searchQuery: "traditional local dining and authentic regional cuisine",
    chatQuery: "Help me find traditional Japanese food experiences in Shibuya",
    locationName: "Shibuya Maruyama-cho",
    lat: 35.6599,
    lng: 139.7005,
  },
  {
    id: "location",
    title: "Location Insights",
    description:
      "Landmarks, viewpoints, and neighborhoods that help you orient within Shibuya.",
    searchQuery: "orientation spots, city views, and landmark-guided walks",
    chatQuery: "Where should I start exploring Shibuya to get my bearings?",
    locationName: "Shibuya Station",
    lat: 35.658,
    lng: 139.7016,
  },
];
