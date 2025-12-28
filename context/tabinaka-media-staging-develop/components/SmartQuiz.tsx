import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useLocation } from "@/context/LocationContext";
import { normalizeLocationError } from "@/lib/locationService";
import { getLocationErrorMessage } from "@/lib/client/locationErrorMessages";

export interface QuizAnswer {
  id: string;
  text: string;
  value: any;
  category: string;
}

export interface QuizQuestion {
  id: string;
  question: string;
  answers: QuizAnswer[];
  category: string;
}

export interface UserState {
  // New quiz system fields
  plan: number;
  social: number;
  immersion: number;
  nature: number;
  durationMinutes: number;
  budgetJPY: number;
  indoorPreferred: boolean;
  category: "eat" | "feel" | "make" | "learn" | "play";
  interests: string[];
  currentMood: string;
  preferences: Record<string, any>;
  // Location information
  currentLocation?: string;
  locationLat?: number;
  locationLng?: number;
  locationPermission?: boolean;
}

interface SmartQuizProps {
  onComplete: (userState: UserState) => void;
  onSkip: () => void;
  isVisible: boolean;
}

const quizQuestions: QuizQuestion[] = [
  {
    id: "category",
    question: "What kind of experience are you looking for today?",
    category: "category",
    answers: [
      {
        id: "eat",
        text: "🍜 Food & Dining",
        value: "eat",
        category: "category",
      },
      {
        id: "feel",
        text: "✨ Wellness & Relaxation",
        value: "feel",
        category: "category",
      },
      {
        id: "make",
        text: "🎨 Creative & Hands-on",
        value: "make",
        category: "category",
      },
      {
        id: "learn",
        text: "📚 Culture & Learning",
        value: "learn",
        category: "category",
      },
      {
        id: "play",
        text: "🎮 Entertainment & Fun",
        value: "play",
        category: "category",
      },
    ],
  },
  {
    id: "social",
    question: "What kind of atmosphere are you looking for?",
    category: "social",
    answers: [
      {
        id: "quiet",
        text: "🤫 Quiet & peaceful",
        value: 0,
        category: "social",
      },
      {
        id: "moderate",
        text: "😊 Moderately lively",
        value: 0.5,
        category: "social",
      },
      {
        id: "lively",
        text: "🎉 Lively & social",
        value: 1,
        category: "social",
      },
    ],
  },
  {
    id: "nature",
    question: "Do you prefer indoor or outdoor activities?",
    category: "nature",
    answers: [
      {
        id: "nature",
        text: "🌳 Outdoor & nature",
        value: 1,
        category: "nature",
      },
      {
        id: "balanced",
        text: "🏙️ Either is fine",
        value: 0.5,
        category: "nature",
      },
      { id: "urban", text: "🏢 Indoor & urban", value: 0, category: "nature" },
    ],
  },
  {
    id: "budget",
    question: "What's your budget?",
    category: "budget",
    answers: [
      { id: "low", text: "💴 ~¥2,000", value: 2000, category: "budget" },
      { id: "medium", text: "💵 ~¥5,000", value: 5000, category: "budget" },
      { id: "high", text: "💰 ~¥10,000", value: 10000, category: "budget" },
    ],
  },
  {
    id: "duration",
    question: "How much time do you have?",
    category: "duration",
    answers: [
      { id: "short", text: "⏱️ About 1 hour", value: 60, category: "duration" },
      {
        id: "medium",
        text: "🕐 About 3 hours",
        value: 180,
        category: "duration",
      },
      {
        id: "long",
        text: "🌅 Half day or more",
        value: 300,
        category: "duration",
      },
    ],
  },
];

export const SmartQuiz: React.FC<SmartQuizProps> = ({
  onComplete,
  onSkip,
  isVisible,
}) => {
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, QuizAnswer>>({});
  const [isAnimating, setIsAnimating] = useState(false);
  const [showLocationQuestion, setShowLocationQuestion] = useState(false);
  const [manualLocation, setManualLocation] = useState("");
  const [isSubmittingLocation, setIsSubmittingLocation] = useState(false);
  const [showManualInput, setShowManualInput] = useState(false);
  const [showLocationFallback, setShowLocationFallback] = useState(false);
  const {
    requestLocation,
    locationStatus,
    isLoadingLocation,
    userLocation,
    browserPermission,
  } = useLocation();
  const locationPermissionHint =
    browserPermission === "prompt"
      ? "Location permission is required. Tap the button to show the browser dialog."
      : browserPermission === "denied" || locationStatus === "denied"
        ? "Please allow location access in your browser settings."
        : null;
  const safariPermissionHint =
    browserPermission === "denied" || locationStatus === "denied"
      ? "On Safari: aA → Website Settings → Location."
      : null;
  const browserPermissionLabel =
    {
      granted: "allowed",
      denied: "denied",
      prompt: "prompt",
      unknown: "unknown",
      unsupported: "unsupported",
    }[browserPermission] ?? browserPermission;
  const locationStatusLabel =
    {
      idle: "idle",
      requesting: "requesting",
      granted: "granted",
      denied: "denied",
      unsupported: "unsupported",
      insecure: "insecure",
      error: "error",
    }[locationStatus] ?? locationStatus;
  const locationStatusNote = `Status: browser=${browserPermissionLabel}, location=${locationStatusLabel}`;

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!isLoadingLocation) {
      setShowLocationFallback(false);
      return;
    }
    const timer = window.setTimeout(() => {
      setShowLocationFallback(true);
    }, 7000);
    return () => {
      window.clearTimeout(timer);
    };
  }, [isLoadingLocation]);

  const currentQuestion = quizQuestions[currentQuestionIndex];
  const progress = ((currentQuestionIndex + 1) / quizQuestions.length) * 100;

  const handleAnswerSelect = (answer: QuizAnswer) => {
    setIsAnimating(true);

    setAnswers((prev) => ({
      ...prev,
      [currentQuestion.category]: answer,
    }));

    // Auto-advance after selection
    setTimeout(() => {
      if (currentQuestionIndex < quizQuestions.length - 1) {
        setCurrentQuestionIndex((prev) => prev + 1);
      } else {
        // Show location question after quiz completion
        setShowLocationQuestion(true);
      }
      setIsAnimating(false);
    }, 800);
  };

  const generateMoodFromAnswers = (
    allAnswers: Record<string, QuizAnswer>,
  ): string => {
    const category = allAnswers.category?.value || "feel";
    const social = allAnswers.social?.value || 0.5;
    const nature = allAnswers.nature?.value || 0.5;
    const immersion = allAnswers.immersion?.value || 0.5;

    // Generate mood based on preferences
    if (category === "eat" && social >= 0.7) return "foodie_social";
    if (category === "feel" && nature >= 0.7) return "nature_lover";
    if (category === "make" && immersion >= 0.7) return "creative_explorer";
    if (category === "learn" && immersion >= 0.7) return "cultural_enthusiast";
    if (category === "play" && social >= 0.7) return "fun_seeker";

    return "curious_explorer";
  };

  const generatePreferencesFromAnswers = (
    allAnswers: Record<string, QuizAnswer>,
  ): Record<string, any> => {
    const plan = allAnswers.plan?.value || 0.5;
    const social = allAnswers.social?.value || 0.5;
    const immersion = allAnswers.immersion?.value || 0.5;
    const nature = allAnswers.nature?.value || 0.5;
    const category = allAnswers.category?.value || "feel";
    const duration = allAnswers.duration?.value || 180;
    const budget = allAnswers.budget?.value || 5000;
    const indoor = allAnswers.indoor?.value || false;

    return {
      plan,
      social,
      immersion,
      nature,
      category,
      duration,
      budget,
      indoor,
      activityType: determineActivityType(category, social, nature, immersion),
      venueType: determineVenueType(category, social, nature, indoor),
      atmosphere: determineAtmosphere(social, nature, immersion),
    };
  };

  const determineActivityType = (
    category: string,
    social: number,
    nature: number,
    immersion: number,
  ): string[] => {
    const types = [];

    if (category === "eat") {
      types.push("food", "restaurant", "cafe", "dining");
    }
    if (category === "feel") {
      types.push("scenic", "attraction", "viewpoint", "landmark");
    }
    if (category === "make") {
      types.push("workshop", "craft", "art", "experience");
    }
    if (category === "learn") {
      types.push("cultural", "educational", "museum", "gallery");
    }
    if (category === "play") {
      types.push("entertainment", "fun", "game", "activity");
    }

    if (social >= 0.7) {
      types.push("social", "group", "lively");
    }
    if (nature >= 0.7) {
      types.push("outdoor", "natural", "park");
    }
    if (immersion >= 0.7) {
      types.push("immersive", "hands-on", "interactive");
    }

    return Array.from(new Set(types));
  };

  const determineVenueType = (
    category: string,
    social: number,
    nature: number,
    indoor: boolean,
  ): string[] => {
    const venues = [];

    if (category === "eat") {
      venues.push("restaurant", "cafe", "food_court", "market");
    }
    if (category === "feel") {
      venues.push("viewpoint", "park", "garden", "scenic_spot");
    }
    if (category === "make") {
      venues.push("workshop", "studio", "gallery", "craft_center");
    }
    if (category === "learn") {
      venues.push("museum", "library", "cultural_center", "gallery");
    }
    if (category === "play") {
      venues.push(
        "entertainment_center",
        "arcade",
        "sports_facility",
        "theme_park",
      );
    }

    if (social >= 0.7) {
      venues.push("social_venue", "group_friendly", "lively_spot");
    }
    if (nature >= 0.7) {
      venues.push("outdoor_venue", "natural_setting", "park");
    }
    if (indoor) {
      venues.push("indoor_venue", "covered_space", "mall");
    }

    return Array.from(new Set(venues));
  };

  const determineAtmosphere = (
    social: number,
    nature: number,
    immersion: number,
  ): string[] => {
    const atmospheres = [];

    if (social >= 0.7) {
      atmospheres.push("lively", "energetic", "social", "vibrant");
    }
    if (social <= 0.3) {
      atmospheres.push("quiet", "peaceful", "serene", "calm");
    }

    if (nature >= 0.7) {
      atmospheres.push("natural", "outdoor", "fresh", "organic");
    }
    if (nature <= 0.3) {
      atmospheres.push("urban", "modern", "sophisticated", "refined");
    }

    if (immersion >= 0.7) {
      atmospheres.push("immersive", "engaging", "interactive", "hands-on");
    }
    if (immersion <= 0.3) {
      atmospheres.push("visual", "photogenic", "scenic", "aesthetic");
    }

    return Array.from(new Set(atmospheres));
  };

  const handleLocationPermission = async () => {
    console.log("Requesting location permission...");

    const { location, error } = await requestLocation({ source: "user" });
    if (!location) {
      const normalized = normalizeLocationError(error);
      if (normalized.code !== "permission_denied") {
        console.error("Location access error:", error);
      } else {
        console.log(
          "Location access denied by user - this is normal behavior",
        );
      }

      const errorMessage = getLocationErrorMessage(normalized.code, "en", true);
      console.log("Location error:", errorMessage);
      setShowManualInput(true);
      return;
    }

    console.log("Location obtained successfully:", {
      lat: location.lat,
      lng: location.lng,
      accuracy: location.accuracy,
      timestamp: new Date().toISOString(),
    });

    const userState: UserState = {
      plan: answers.plan?.value || 0.5,
      social: answers.social?.value || 0.5,
      immersion: answers.immersion?.value || 0.5,
      nature: answers.nature?.value || 0.5,
      durationMinutes: answers.duration?.value || 180,
      budgetJPY: answers.budget?.value || 5000,
      indoorPreferred: answers.indoor?.value || false,
      category: answers.category?.value || "feel",
      interests: [],
      currentMood: generateMoodFromAnswers(answers),
      preferences: generatePreferencesFromAnswers(answers),
      currentLocation: `${location.lat},${location.lng}`,
      locationLat: location.lat,
      locationLng: location.lng,
      locationPermission: true,
    };

    onComplete(userState);
  };

  const handleLocationDenied = () => {
    setShowManualInput(true);
  };

  const handleManualLocationSubmit = async () => {
    if (!manualLocation.trim()) return;

    setIsSubmittingLocation(true);

    try {
      console.log("Geocoding manual location:", manualLocation);

      // Geocode the manual location
      const response = await fetch("/api/places/geocode", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ address: manualLocation }),
      });

      if (response.ok) {
        const data = await response.json();
        console.log("Geocoding response:", data);

        if (data.lat && data.lng) {
          const userState: UserState = {
            plan: answers.plan?.value || 0.5,
            social: answers.social?.value || 0.5,
            immersion: answers.immersion?.value || 0.5,
            nature: answers.nature?.value || 0.5,
            durationMinutes: answers.duration?.value || 180,
            budgetJPY: answers.budget?.value || 5000,
            indoorPreferred: answers.indoor?.value || false,
            category: answers.category?.value || "feel",
            interests: [],
            currentMood: generateMoodFromAnswers(answers),
            preferences: generatePreferencesFromAnswers(answers),
            currentLocation: manualLocation,
            locationLat: data.lat,
            locationLng: data.lng,
            locationPermission: true,
          };

          onComplete(userState);
        } else {
          throw new Error(
            "Could not get location coordinates from geocoding response",
          );
        }
      } else {
        const errorData = await response
          .json()
          .catch(() => ({ error: "Unknown error" }));
        throw new Error(
          errorData.error || `HTTP ${response.status}: ${response.statusText}`,
        );
      }
    } catch (error) {
      console.error("Geocoding error:", error);

      // Provide helpful suggestions for common issues
      let errorMessage = `Sorry, we couldn't find "${manualLocation}". `;
      errorMessage += "Please try:\n";
      errorMessage +=
        '• A more specific address (e.g., "Shibuya Station" instead of "Shibuya")\n';
      errorMessage += '• Adding "Tokyo" or "Japan" to your search\n';
      errorMessage += "• Using English place names\n";
      errorMessage += "• Checking your spelling";

      alert(errorMessage);
    } finally {
      setIsSubmittingLocation(false);
    }
  };

  const handleSkipLocation = () => {
    const userState: UserState = {
      plan: answers.plan?.value || 0.5,
      social: answers.social?.value || 0.5,
      immersion: answers.immersion?.value || 0.5,
      nature: answers.nature?.value || 0.5,
      durationMinutes: answers.duration?.value || 180,
      budgetJPY: answers.budget?.value || 5000,
      indoorPreferred: answers.indoor?.value || false,
      category: answers.category?.value || "feel",
      interests: [],
      currentMood: generateMoodFromAnswers(answers),
      preferences: generatePreferencesFromAnswers(answers),
      locationPermission: false,
    };

    onComplete(userState);
  };

  if (!isVisible) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="bg-white rounded-2xl p-6 max-w-lg w-full max-h-[90vh] overflow-y-auto"
      >
        {!showLocationQuestion ? (
          // Regular quiz questions
          <>
            {/* Header */}
            <div className="text-center mb-6">
              <h2 className="text-xl font-bold text-gray-900 mb-2">
                Let's personalize your Tokyo experience! 🎯
              </h2>
              <p className="text-gray-600 text-sm">
                Quick questions to find your perfect spots
              </p>
            </div>

            {/* Progress Bar */}
            <div className="mb-6">
              <div className="flex justify-between text-xs text-gray-500 mb-2">
                <span>
                  Step {currentQuestionIndex + 1} of {quizQuestions.length}
                </span>
                <span>{Math.round(progress)}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <motion.div
                  className="bg-green-500 h-2 rounded-full"
                  initial={{ width: 0 }}
                  animate={{ width: `${progress}%` }}
                  transition={{ duration: 0.3 }}
                />
              </div>
            </div>

            {/* Question */}
            <AnimatePresence mode="wait">
              <motion.div
                key={currentQuestion.id}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
              >
                <h3 className="text-lg font-bold text-gray-900 mb-6 text-center">
                  {currentQuestion.question}
                </h3>

                {/* Simple Answer Options */}
                <div className="space-y-3">
                  {currentQuestion.answers.map((answer, index) => (
                    <motion.button
                      key={answer.id}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => handleAnswerSelect(answer)}
                      disabled={isAnimating}
                      className="w-full p-4 text-left border border-gray-300 rounded-xl hover:border-green-500 hover:bg-green-50 transition-all duration-200 disabled:opacity-50 bg-white"
                    >
                      <div className="flex items-center">
                        <div className="text-2xl mr-3">
                          {answer.text.split(" ")[0]}
                        </div>
                        <div className="text-sm font-medium">
                          {answer.text.split(" ").slice(1).join(" ")}
                        </div>
                      </div>
                    </motion.button>
                  ))}
                </div>
              </motion.div>
            </AnimatePresence>

            {/* Skip Button */}
            <div className="mt-8 text-center">
              <button
                onClick={onSkip}
                className="text-gray-500 text-sm hover:text-gray-700 underline"
              >
                Skip quiz - I'll tell you what I want
              </button>
            </div>
          </>
        ) : (
          // Location question
          <div className="text-center">
            {/* Header */}
            <div className="mb-6">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={1.5}
                  stroke="currentColor"
                  className="w-8 h-8 text-blue-600"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z"
                  />
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                One last question! 📍
              </h2>
              <p className="text-gray-600">
                To find the best experiences near you, we'd love to know your
                location
              </p>
              <p className="text-sm text-gray-500 mt-2">
                🔒 Your location data is only used to find nearby places and is
                not stored
              </p>
            </div>

            {!showManualInput && locationStatus !== "denied" ? (
              // Initial location permission request
              <div className="space-y-4">
                {locationPermissionHint && (
                  <p className="text-xs text-gray-500">
                    {locationPermissionHint}
                  </p>
                )}
                {safariPermissionHint && (
                  <p className="text-xs text-gray-500">
                    {safariPermissionHint}
                  </p>
                )}
                <p className="text-xs text-gray-400">{locationStatusNote}</p>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleLocationPermission}
                  disabled={isLoadingLocation}
                  className={`w-full py-3 px-6 rounded-xl font-medium transition-all ${
                    isLoadingLocation
                      ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                      : "bg-blue-600 text-white hover:bg-blue-700 shadow-lg"
                  }`}
                >
                  {isLoadingLocation ? (
                    <div className="flex items-center justify-center">
                      <div className="w-5 h-5 border-2 border-gray-300 border-t-transparent rounded-full animate-spin mr-2"></div>
                      Getting your location...
                    </div>
                  ) : (
                    "Yes, use my location"
                  )}
                </motion.button>
                {showLocationFallback && (
                  <p className="text-xs text-gray-500">
                    If nothing happens, enable Location Services on your device
                    and allow Safari to access location in Settings.
                  </p>
                )}

                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleLocationDenied}
                  className="w-full py-3 px-6 rounded-xl font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 transition-all"
                >
                  No, I'll enter a location
                </motion.button>

                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleSkipLocation}
                  className="w-full py-2 px-6 rounded-xl font-medium text-gray-500 hover:text-gray-700 transition-all"
                >
                  Skip location
                </motion.button>
              </div>
            ) : showManualInput || locationStatus === "denied" ? (
              // Manual location input with retry option
              <div className="space-y-4">
                <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 mb-4">
                  <div className="flex items-start">
                    <svg
                      className="w-5 h-5 text-yellow-600 mr-2 mt-0.5 flex-shrink-0"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                        clipRule="evenodd"
                      />
                    </svg>
                    <div>
                      <p className="text-sm text-yellow-800">
                        Location access was denied.
                      </p>
                      {locationPermissionHint && (
                        <p className="text-xs text-yellow-700 mt-1">
                          {locationPermissionHint}
                        </p>
                      )}
                      {safariPermissionHint && (
                        <p className="text-xs text-yellow-700 mt-1">
                          {safariPermissionHint}
                        </p>
                      )}
                      <p className="text-xs text-yellow-700 mt-1">
                        {locationStatusNote}
                      </p>
                      <p className="text-xs text-yellow-700 mt-1">
                        If you've enabled location in your browser settings, tap
                        "Try again" below.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Retry location button */}
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleLocationPermission}
                  disabled={isLoadingLocation}
                  className={`w-full py-3 px-6 rounded-xl font-medium transition-all ${
                    isLoadingLocation
                      ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                      : "bg-blue-600 text-white hover:bg-blue-700 shadow-lg"
                  }`}
                >
                  {isLoadingLocation ? (
                    <div className="flex items-center justify-center">
                      <div className="w-5 h-5 border-2 border-gray-300 border-t-transparent rounded-full animate-spin mr-2"></div>
                      Getting your location...
                    </div>
                  ) : (
                    "Try again"
                  )}
                </motion.button>

                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-gray-200"></div>
                  </div>
                  <div className="relative flex justify-center text-sm">
                    <span className="px-2 bg-white text-gray-500">
                      or enter manually
                    </span>
                  </div>
                </div>

                <div>
                  <input
                    type="text"
                    value={manualLocation}
                    onChange={(e) => setManualLocation(e.target.value)}
                    placeholder="e.g., Shibuya Station, Tokyo Tower"
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div className="flex space-x-3">
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={handleManualLocationSubmit}
                    disabled={!manualLocation.trim() || isSubmittingLocation}
                    className={`flex-1 py-3 px-6 rounded-xl font-medium transition-all ${
                      !manualLocation.trim() || isSubmittingLocation
                        ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                        : "bg-green-600 text-white hover:bg-green-700 shadow-lg"
                    }`}
                  >
                    {isSubmittingLocation
                      ? "Finding location..."
                      : "Find experiences"}
                  </motion.button>

                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => setShowManualInput(false)}
                    className="px-6 py-3 rounded-xl font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 transition-all"
                  >
                    Back
                  </motion.button>
                </div>
              </div>
            ) : null}
          </div>
        )}
      </motion.div>
    </motion.div>
  );
};

export default SmartQuiz;
