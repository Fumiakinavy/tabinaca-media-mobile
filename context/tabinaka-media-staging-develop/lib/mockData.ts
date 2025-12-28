// Mock data for development environment to reduce API costs
export const MOCK_PLACES = [
  {
    place_id: "mock_1",
    name: "Tokyo Skytree",
    formatted_address:
      "1 Chome-1-2 Oshiage, Sumida City, Tokyo 131-0045, Japan",
    rating: 4.5,
    user_ratings_total: 1000,
    price_level: 2,
    types: ["tourist_attraction", "point_of_interest"],
    geometry: {
      location: {
        lat: 35.7101,
        lng: 139.8107,
      },
    },
    photos: [
      {
        photo_reference: "mock_photo_1",
        height: 400,
        width: 600,
      },
    ],
    opening_hours: {
      open_now: true,
    },
  },
  {
    place_id: "mock_2",
    name: "Senso-ji Temple",
    formatted_address: "2 Chome-3-1 Asakusa, Taito City, Tokyo 111-0032, Japan",
    rating: 4.3,
    user_ratings_total: 800,
    price_level: 0,
    types: ["place_of_worship", "tourist_attraction"],
    geometry: {
      location: {
        lat: 35.7148,
        lng: 139.7967,
      },
    },
    photos: [
      {
        photo_reference: "mock_photo_2",
        height: 400,
        width: 600,
      },
    ],
    opening_hours: {
      open_now: true,
    },
  },
  {
    place_id: "mock_3",
    name: "Shibuya Crossing",
    formatted_address: "Shibuya City, Tokyo 150-0002, Japan",
    rating: 4.2,
    user_ratings_total: 1200,
    price_level: 0,
    types: ["tourist_attraction", "point_of_interest"],
    geometry: {
      location: {
        lat: 35.6598,
        lng: 139.7006,
      },
    },
    photos: [
      {
        photo_reference: "mock_photo_3",
        height: 400,
        width: 600,
      },
    ],
    opening_hours: {
      open_now: true,
    },
  },
  {
    place_id: "mock_4",
    name: "Tsukiji Outer Market",
    formatted_address: "4 Chome-16-2 Tsukiji, Chuo City, Tokyo 104-0045, Japan",
    rating: 4.1,
    user_ratings_total: 600,
    price_level: 1,
    types: ["food", "point_of_interest"],
    geometry: {
      location: {
        lat: 35.6654,
        lng: 139.7706,
      },
    },
    photos: [
      {
        photo_reference: "mock_photo_4",
        height: 400,
        width: 600,
      },
    ],
    opening_hours: {
      open_now: true,
    },
  },
  {
    place_id: "mock_5",
    name: "Meiji Shrine",
    formatted_address:
      "1-1 Yoyogikamizonocho, Shibuya City, Tokyo 151-8557, Japan",
    rating: 4.4,
    user_ratings_total: 900,
    price_level: 0,
    types: ["place_of_worship", "tourist_attraction"],
    geometry: {
      location: {
        lat: 35.6763,
        lng: 139.6993,
      },
    },
    photos: [
      {
        photo_reference: "mock_photo_5",
        height: 400,
        width: 600,
      },
    ],
    opening_hours: {
      open_now: true,
    },
  },
];

export const MOCK_PLACE_DETAILS = {
  place_id: "mock_1",
  name: "Tokyo Skytree",
  vicinity: "Sumida, Tokyo",
  types: ["tourist_attraction", "point_of_interest"],
  rating: 4.5,
  user_ratings_total: 1000,
  price_level: 2,
  photos: [
    {
      photo_reference: "mock_photo_1",
      height: 400,
      width: 600,
    },
  ],
  geometry: {
    location: {
      lat: 35.7101,
      lng: 139.8107,
    },
  },
  opening_hours: {
    open_now: true,
  },
};

export const MOCK_REVIEWS = {
  rating: 4.5,
  user_ratings_total: 1000,
  reviews: [
    {
      author_name: "John Doe",
      rating: 5,
      relative_time_description: "2 weeks ago",
      time: Date.now() - 14 * 24 * 60 * 60 * 1000,
    },
    {
      author_name: "Jane Smith",
      rating: 4,
      relative_time_description: "1 month ago",
      time: Date.now() - 30 * 24 * 60 * 60 * 1000,
    },
  ],
};

// Check if we should use mock data
export const shouldUseMockData = (): boolean => {
  return (
    process.env.NODE_ENV === "development" &&
    process.env.USE_MOCK_MAPS_DATA === "true"
  );
};
