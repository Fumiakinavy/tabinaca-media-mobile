// Enhanced Onboarding for Mood-Based Recommendations

export interface EnhancedUserAttributes {
  // Core mood and state
  current_mood: string;
  energy_level: string;
  social_comfort: string;
  time_available: string;
  budget_preference: string;

  // Context and preferences
  visit_purpose: string;
  travel_companion: string;
  activity_preferences: string; // New field for specific activity types
  current_location: string;
  location_lat?: number;
  location_lng?: number;
  location_permission?: boolean;

  // Optional demographic info
  age_range?: string;
  country_code?: string;
}

export interface MoodBasedQuestion {
  id: string;
  question: string;
  type:
    | "mood_select"
    | "energy_select"
    | "social_select"
    | "time_select"
    | "budget_select"
    | "purpose_select"
    | "companion_select"
    | "activity_select"
    | "location_select";
  options: Array<{
    value: string;
    label: string;
    emoji: string;
    description: string;
    mood_profile: {
      emotional_state: string;
      energy_impact: string;
      social_level: string;
      activity_type: string[];
    };
  }>;
  required: boolean;
  dbField: keyof EnhancedUserAttributes;
  priority: number; // 1 = highest priority
}

export const MOOD_BASED_QUESTIONS: MoodBasedQuestion[] = [
  {
    id: "current_mood",
    question: "How are you feeling right now?",
    type: "mood_select",
    priority: 1,
    required: true,
    dbField: "current_mood",
    options: [
      {
        value: "relaxed_peaceful",
        label: "Relaxed & Peaceful",
        emoji: "😌",
        description: "Looking for calm, soothing experiences",
        mood_profile: {
          emotional_state: "calm",
          energy_impact: "low",
          social_level: "intimate",
          activity_type: ["spa", "temple", "garden", "cafe", "museum"],
        },
      },
      {
        value: "excited_energetic",
        label: "Excited & Energetic",
        emoji: "🎉",
        description: "Ready for fun and high-energy activities",
        mood_profile: {
          emotional_state: "excited",
          energy_impact: "high",
          social_level: "group",
          activity_type: [
            "entertainment",
            "nightlife",
            "adventure",
            "shopping",
            "food",
          ],
        },
      },
      {
        value: "curious_explorer",
        label: "Curious Explorer",
        emoji: "🤔",
        description: "Want to discover new and interesting things",
        mood_profile: {
          emotional_state: "curious",
          energy_impact: "medium",
          social_level: "mixed",
          activity_type: [
            "museum",
            "culture",
            "food",
            "shopping",
            "sightseeing",
          ],
        },
      },
      {
        value: "stressed_tired",
        label: "Need to Unwind",
        emoji: "😅",
        description: "Looking for stress relief and relaxation",
        mood_profile: {
          emotional_state: "stressed",
          energy_impact: "low",
          social_level: "intimate",
          activity_type: ["spa", "temple", "garden", "cafe", "quiet"],
        },
      },
      {
        value: "adventurous_bold",
        label: "Adventurous & Bold",
        emoji: "🚀",
        description: "Seeking exciting and unique experiences",
        mood_profile: {
          emotional_state: "adventurous",
          energy_impact: "high",
          social_level: "group",
          activity_type: [
            "adventure",
            "nightlife",
            "unique",
            "entertainment",
            "food",
          ],
        },
      },
      {
        value: "romantic_intimate",
        label: "Romantic & Intimate",
        emoji: "💕",
        description: "Looking for romantic or intimate experiences",
        mood_profile: {
          emotional_state: "romantic",
          energy_impact: "low",
          social_level: "intimate",
          activity_type: [
            "romantic",
            "fine_dining",
            "scenic",
            "quiet",
            "luxury",
          ],
        },
      },
    ],
  },
  {
    id: "energy_level",
    question: "What's your energy level right now?",
    type: "energy_select",
    priority: 2,
    required: true,
    dbField: "energy_level",
    options: [
      {
        value: "low_gentle",
        label: "Low - Need Something Gentle",
        emoji: "😴",
        description: "Prefer calm, slow-paced activities",
        mood_profile: {
          emotional_state: "calm",
          energy_impact: "low",
          social_level: "intimate",
          activity_type: ["spa", "temple", "garden", "cafe", "museum"],
        },
      },
      {
        value: "medium_balanced",
        label: "Medium - Balanced Energy",
        emoji: "😊",
        description: "Good balance of activity and rest",
        mood_profile: {
          emotional_state: "content",
          energy_impact: "medium",
          social_level: "mixed",
          activity_type: ["culture", "food", "shopping", "sightseeing", "cafe"],
        },
      },
      {
        value: "high_active",
        label: "High - Ready for Action!",
        emoji: "⚡",
        description: "Ready for active, energetic experiences",
        mood_profile: {
          emotional_state: "energetic",
          energy_impact: "high",
          social_level: "group",
          activity_type: [
            "adventure",
            "entertainment",
            "nightlife",
            "shopping",
            "food",
          ],
        },
      },
      {
        value: "variable_flexible",
        label: "Variable - Surprise Me!",
        emoji: "🔄",
        description: "Flexible and open to different experiences",
        mood_profile: {
          emotional_state: "open",
          energy_impact: "variable",
          social_level: "mixed",
          activity_type: [
            "mixed",
            "unique",
            "culture",
            "food",
            "entertainment",
          ],
        },
      },
    ],
  },
  {
    id: "social_comfort",
    question: "What kind of social atmosphere do you prefer?",
    type: "social_select",
    priority: 3,
    required: true,
    dbField: "social_comfort",
    options: [
      {
        value: "intimate_quiet",
        label: "Intimate & Quiet",
        emoji: "🤫",
        description: "Small groups or solo experiences",
        mood_profile: {
          emotional_state: "calm",
          energy_impact: "low",
          social_level: "intimate",
          activity_type: ["spa", "temple", "garden", "cafe", "museum"],
        },
      },
      {
        value: "social_friendly",
        label: "Social & Friendly",
        emoji: "👥",
        description: "Enjoy meeting people and group activities",
        mood_profile: {
          emotional_state: "social",
          energy_impact: "medium",
          social_level: "group",
          activity_type: [
            "food",
            "culture",
            "entertainment",
            "shopping",
            "nightlife",
          ],
        },
      },
      {
        value: "mixed_adaptive",
        label: "Mixed - I Can Adapt",
        emoji: "🔄",
        description: "Comfortable in various social settings",
        mood_profile: {
          emotional_state: "flexible",
          energy_impact: "variable",
          social_level: "mixed",
          activity_type: [
            "mixed",
            "culture",
            "food",
            "entertainment",
            "unique",
          ],
        },
      },
      {
        value: "party_energetic",
        label: "Party & Energetic",
        emoji: "🎊",
        description: "Love vibrant, energetic atmospheres",
        mood_profile: {
          emotional_state: "excited",
          energy_impact: "high",
          social_level: "group",
          activity_type: [
            "nightlife",
            "entertainment",
            "adventure",
            "food",
            "shopping",
          ],
        },
      },
    ],
  },
  {
    id: "time_available",
    question: "How much time do you have for activities right now?",
    type: "time_select",
    priority: 4,
    required: true,
    dbField: "time_available",
    options: [
      {
        value: "quick_30min",
        label: "Quick Visit (30 minutes)",
        emoji: "⏰",
        description: "Short, focused experiences",
        mood_profile: {
          emotional_state: "focused",
          energy_impact: "low",
          social_level: "intimate",
          activity_type: ["cafe", "quick_bite", "photo_spot", "shop", "garden"],
        },
      },
      {
        value: "brief_1hour",
        label: "Brief Visit (1 hour)",
        emoji: "🕐",
        description: "Moderate time to explore",
        mood_profile: {
          emotional_state: "content",
          energy_impact: "medium",
          social_level: "mixed",
          activity_type: ["museum", "shopping", "food", "culture", "cafe"],
        },
      },
      {
        value: "leisurely_2hours",
        label: "Leisurely (2-3 hours)",
        emoji: "🕐",
        description: "Plenty of time to enjoy",
        mood_profile: {
          emotional_state: "relaxed",
          energy_impact: "medium",
          social_level: "mixed",
          activity_type: [
            "culture",
            "food",
            "shopping",
            "sightseeing",
            "entertainment",
          ],
        },
      },
      {
        value: "extended_4hours",
        label: "Extended (4+ hours)",
        emoji: "🌅",
        description: "Full experience immersion",
        mood_profile: {
          emotional_state: "immersed",
          energy_impact: "high",
          social_level: "group",
          activity_type: [
            "culture",
            "food",
            "entertainment",
            "adventure",
            "nightlife",
          ],
        },
      },
    ],
  },
  {
    id: "budget_preference",
    question: "What's your budget preference for today's activities?",
    type: "budget_select",
    priority: 5,
    required: true,
    dbField: "budget_preference",
    options: [
      {
        value: "budget_friendly",
        label: "Budget Friendly",
        emoji: "💰",
        description: "Free or low-cost activities (¥0-2,000)",
        mood_profile: {
          emotional_state: "practical",
          energy_impact: "variable",
          social_level: "mixed",
          activity_type: ["free", "cafe", "park", "temple", "shopping"],
        },
      },
      {
        value: "moderate_comfortable",
        label: "Moderate & Comfortable",
        emoji: "💳",
        description: "Standard activities (¥2,000-5,000)",
        mood_profile: {
          emotional_state: "content",
          energy_impact: "medium",
          social_level: "mixed",
          activity_type: [
            "food",
            "culture",
            "entertainment",
            "shopping",
            "museum",
          ],
        },
      },
      {
        value: "premium_luxury",
        label: "Premium & Luxury",
        emoji: "💎",
        description: "High-end experiences (¥5,000+)",
        mood_profile: {
          emotional_state: "indulgent",
          energy_impact: "low",
          social_level: "intimate",
          activity_type: ["fine_dining", "luxury", "spa", "unique", "romantic"],
        },
      },
      {
        value: "flexible_mixed",
        label: "Flexible - Mix It Up",
        emoji: "🔄",
        description: "Open to various price ranges",
        mood_profile: {
          emotional_state: "flexible",
          energy_impact: "variable",
          social_level: "mixed",
          activity_type: [
            "mixed",
            "unique",
            "culture",
            "food",
            "entertainment",
          ],
        },
      },
    ],
  },
  {
    id: "visit_purpose",
    question: "What's your main purpose for being in Tokyo today?",
    type: "purpose_select",
    priority: 6,
    required: false,
    dbField: "visit_purpose",
    options: [
      {
        value: "leisure_relaxation",
        label: "Leisure & Relaxation",
        emoji: "🧘",
        description: "Just want to unwind and enjoy",
        mood_profile: {
          emotional_state: "relaxed",
          energy_impact: "low",
          social_level: "intimate",
          activity_type: ["spa", "temple", "garden", "cafe", "quiet"],
        },
      },
      {
        value: "cultural_exploration",
        label: "Cultural Exploration",
        emoji: "🏛️",
        description: "Learn about Japanese culture",
        mood_profile: {
          emotional_state: "curious",
          energy_impact: "medium",
          social_level: "mixed",
          activity_type: [
            "museum",
            "temple",
            "culture",
            "traditional",
            "history",
          ],
        },
      },
      {
        value: "food_adventure",
        label: "Food Adventure",
        emoji: "🍜",
        description: "Discover amazing Japanese cuisine",
        mood_profile: {
          emotional_state: "excited",
          energy_impact: "medium",
          social_level: "mixed",
          activity_type: [
            "food",
            "restaurant",
            "street_food",
            "cooking",
            "market",
          ],
        },
      },
      {
        value: "shopping_entertainment",
        label: "Shopping & Entertainment",
        emoji: "🛍️",
        description: "Shop and have fun",
        mood_profile: {
          emotional_state: "excited",
          energy_impact: "high",
          social_level: "group",
          activity_type: [
            "shopping",
            "entertainment",
            "nightlife",
            "arcade",
            "theater",
          ],
        },
      },
      {
        value: "romantic_date",
        label: "Romantic Date",
        emoji: "💕",
        description: "Special time with someone special",
        mood_profile: {
          emotional_state: "romantic",
          energy_impact: "low",
          social_level: "intimate",
          activity_type: [
            "romantic",
            "fine_dining",
            "scenic",
            "quiet",
            "luxury",
          ],
        },
      },
      {
        value: "adventure_thrills",
        label: "Adventure & Thrills",
        emoji: "🎢",
        description: "Seek exciting experiences",
        mood_profile: {
          emotional_state: "adventurous",
          energy_impact: "high",
          social_level: "group",
          activity_type: [
            "adventure",
            "thrills",
            "unique",
            "entertainment",
            "nightlife",
          ],
        },
      },
    ],
  },
  {
    id: "travel_companion",
    question: "Who are you with today?",
    type: "companion_select",
    priority: 7,
    required: false,
    dbField: "travel_companion",
    options: [
      {
        value: "solo_explorer",
        label: "Solo Explorer",
        emoji: "🚶",
        description: "Exploring Tokyo by myself",
        mood_profile: {
          emotional_state: "independent",
          energy_impact: "variable",
          social_level: "intimate",
          activity_type: ["culture", "food", "shopping", "museum", "cafe"],
        },
      },
      {
        value: "couple_partner",
        label: "Couple/Partner",
        emoji: "💑",
        description: "With my partner or significant other",
        mood_profile: {
          emotional_state: "romantic",
          energy_impact: "medium",
          social_level: "intimate",
          activity_type: [
            "romantic",
            "fine_dining",
            "culture",
            "scenic",
            "quiet",
          ],
        },
      },
      {
        value: "family_members",
        label: "Family",
        emoji: "👨‍👩‍👧‍👦",
        description: "With family members",
        mood_profile: {
          emotional_state: "family",
          energy_impact: "medium",
          social_level: "group",
          activity_type: [
            "family",
            "culture",
            "food",
            "entertainment",
            "shopping",
          ],
        },
      },
      {
        value: "friends_group",
        label: "Friends",
        emoji: "👥",
        description: "With friends or a group",
        mood_profile: {
          emotional_state: "social",
          energy_impact: "high",
          social_level: "group",
          activity_type: [
            "entertainment",
            "nightlife",
            "food",
            "shopping",
            "adventure",
          ],
        },
      },
    ],
  },
  {
    id: "activity_preferences",
    question: "What type of activities interest you most?",
    type: "activity_select",
    priority: 6,
    required: true,
    dbField: "activity_preferences",
    options: [
      {
        value: "food_culture",
        label: "Food & Culture",
        emoji: "🍜",
        description:
          "Traditional food, cultural experiences, and local cuisine",
        mood_profile: {
          emotional_state: "curious",
          energy_impact: "medium",
          social_level: "mixed",
          activity_type: [
            "food",
            "culture",
            "traditional",
            "restaurant",
            "temple",
          ],
        },
      },
      {
        value: "entertainment_nightlife",
        label: "Entertainment & Nightlife",
        emoji: "🎭",
        description: "Shows, bars, clubs, and evening entertainment",
        mood_profile: {
          emotional_state: "excited",
          energy_impact: "high",
          social_level: "group",
          activity_type: ["entertainment", "nightlife", "bar", "club", "show"],
        },
      },
      {
        value: "shopping_fashion",
        label: "Shopping & Fashion",
        emoji: "🛍️",
        description: "Shopping districts, fashion, and unique items",
        mood_profile: {
          emotional_state: "excited",
          energy_impact: "medium",
          social_level: "mixed",
          activity_type: [
            "shopping",
            "fashion",
            "market",
            "boutique",
            "department_store",
          ],
        },
      },
      {
        value: "nature_relaxation",
        label: "Nature & Relaxation",
        emoji: "🌸",
        description: "Parks, gardens, spas, and peaceful places",
        mood_profile: {
          emotional_state: "calm",
          energy_impact: "low",
          social_level: "intimate",
          activity_type: ["park", "garden", "spa", "temple", "nature"],
        },
      },
      {
        value: "adventure_unique",
        label: "Adventure & Unique",
        emoji: "🎢",
        description: "Unique experiences, adventures, and unusual activities",
        mood_profile: {
          emotional_state: "adventurous",
          energy_impact: "high",
          social_level: "group",
          activity_type: [
            "adventure",
            "unique",
            "thrilling",
            "unusual",
            "experience",
          ],
        },
      },
      {
        value: "art_creativity",
        label: "Art & Creativity",
        emoji: "🎨",
        description: "Museums, galleries, art, and creative experiences",
        mood_profile: {
          emotional_state: "curious",
          energy_impact: "medium",
          social_level: "mixed",
          activity_type: ["museum", "gallery", "art", "creative", "cultural"],
        },
      },
    ],
  },
  {
    id: "current_location",
    question: "Where are you right now?",
    type: "location_select",
    priority: 8,
    required: false,
    dbField: "current_location",
    options: [
      {
        value: "get_location",
        label: "📍 Use My Current Location",
        emoji: "📍",
        description:
          "Allow location access to discover activities near you",
        mood_profile: {
          emotional_state: "convenient",
          energy_impact: "low",
          social_level: "mixed",
          activity_type: ["nearby", "convenient", "local", "quick"],
        },
      },
      {
        value: "shibuya",
        label: "Shibuya",
        emoji: "🌃",
        description: "Shibuya - The bustling heart of Tokyo",
        mood_profile: {
          emotional_state: "energetic",
          energy_impact: "high",
          social_level: "group",
          activity_type: [
            "shopping",
            "entertainment",
            "nightlife",
            "food",
            "culture",
          ],
        },
      },
      {
        value: "shinjuku",
        label: "Shinjuku",
        emoji: "🏙️",
        description: "Shinjuku - Business and entertainment district",
        mood_profile: {
          emotional_state: "mixed",
          energy_impact: "high",
          social_level: "group",
          activity_type: [
            "entertainment",
            "nightlife",
            "food",
            "shopping",
            "culture",
          ],
        },
      },
      {
        value: "harajuku",
        label: "Harajuku",
        emoji: "🎨",
        description: "Harajuku - Fashion and youth culture",
        mood_profile: {
          emotional_state: "creative",
          energy_impact: "medium",
          social_level: "mixed",
          activity_type: ["shopping", "culture", "food", "fashion", "art"],
        },
      },
      {
        value: "asakusa",
        label: "Asakusa",
        emoji: "🏮",
        description: "Asakusa - Traditional Tokyo atmosphere",
        mood_profile: {
          emotional_state: "traditional",
          energy_impact: "low",
          social_level: "mixed",
          activity_type: [
            "culture",
            "temple",
            "traditional",
            "shopping",
            "food",
          ],
        },
      },
      {
        value: "ginza",
        label: "Ginza",
        emoji: "💎",
        description: "Ginza - Luxury shopping and fine dining",
        mood_profile: {
          emotional_state: "luxurious",
          energy_impact: "low",
          social_level: "intimate",
          activity_type: [
            "luxury",
            "fine_dining",
            "shopping",
            "culture",
            "art",
          ],
        },
      },
    ],
  },
];

export const ENHANCED_ONBOARDING_INTRO = `Hello! Welcome to Gappy 🌟

I'm here to help you discover amazing experiences in Tokyo that perfectly match your current mood and situation.

To provide you with the most personalized recommendations, I'd like to understand how you're feeling right now and what you're looking for today.

This will only take a few quick questions! ✨

Ready to find your perfect Tokyo experience?`;

export const ENHANCED_ONBOARDING_COMPLETE = `Perfect! Thank you for sharing that with me. 🌟

Based on your current mood, energy level, and preferences, I'm now analyzing what would be the perfect experiences for you right now...

I'll find places that match your emotional state and create the ideal day for you! ✨`;

/**
 * Generate mood-based recommendation profile
 */
export function generateMoodProfile(attributes: EnhancedUserAttributes) {
  const moodQuestion = MOOD_BASED_QUESTIONS.find(
    (q) => q.id === "current_mood",
  );
  const energyQuestion = MOOD_BASED_QUESTIONS.find(
    (q) => q.id === "energy_level",
  );
  const socialQuestion = MOOD_BASED_QUESTIONS.find(
    (q) => q.id === "social_comfort",
  );

  const moodOption = moodQuestion?.options.find(
    (opt) => opt.value === attributes.current_mood,
  );
  const energyOption = energyQuestion?.options.find(
    (opt) => opt.value === attributes.energy_level,
  );
  const socialOption = socialQuestion?.options.find(
    (opt) => opt.value === attributes.social_comfort,
  );

  return {
    emotional_state: moodOption?.mood_profile.emotional_state || "curious",
    energy_level: energyOption?.mood_profile.energy_impact || "medium",
    social_preference: socialOption?.mood_profile.social_level || "mixed",
    activity_types: [
      ...(moodOption?.mood_profile.activity_type || []),
      ...(energyOption?.mood_profile.activity_type || []),
      ...(socialOption?.mood_profile.activity_type || []),
    ].filter((value, index, self) => self.indexOf(value) === index), // Remove duplicates
    location_context: attributes.current_location || "Tokyo",
    time_context: attributes.time_available || "medium",
    budget_context: attributes.budget_preference || "moderate",
  };
}

/**
 * Generate personalized recommendation query
 */
export function generatePersonalizedQuery(
  attributes: EnhancedUserAttributes,
): string {
  const profile = generateMoodProfile(attributes);

  // Build query based on mood profile and activity preferences
  let query = "";

  // Add emotional context
  switch (profile.emotional_state) {
    case "calm":
      query += "peaceful relaxing quiet ";
      break;
    case "excited":
      query += "exciting fun energetic ";
      break;
    case "curious":
      query += "interesting unique discover ";
      break;
    case "stressed":
      query += "calming therapeutic relaxing ";
      break;
    case "adventurous":
      query += "adventurous unique thrilling ";
      break;
    case "romantic":
      query += "romantic intimate cozy ";
      break;
  }

  // Add specific activity preferences if available
  if (attributes.activity_preferences) {
    const activityQuery = getActivityQuery(attributes.activity_preferences);
    query += activityQuery + " ";
  }

  // Add activity types from mood profile
  const activityTypes = profile.activity_types.slice(0, 2); // Top 2 most relevant
  query += activityTypes.join(" ");

  // Add location context
  query += `Tokyo Japan`;

  return query.trim();
}

/**
 * Get specific activity query based on user's activity preferences
 */
function getActivityQuery(activityPreference: string): string {
  const activityQueries: Record<string, string> = {
    food_culture:
      "traditional food cultural experience local cuisine restaurant temple",
    entertainment_nightlife:
      "entertainment nightlife bar club show performance",
    shopping_fashion:
      "shopping fashion market boutique department store unique items",
    nature_relaxation: "park garden spa temple nature peaceful quiet",
    adventure_unique: "adventure unique thrilling unusual experience exciting",
    art_creativity: "museum gallery art creative cultural exhibition",
  };

  return activityQueries[activityPreference] || "";
}
