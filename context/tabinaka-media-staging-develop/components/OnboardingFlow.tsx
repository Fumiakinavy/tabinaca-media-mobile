import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  MOOD_BASED_QUESTIONS,
  ENHANCED_ONBOARDING_INTRO,
  ENHANCED_ONBOARDING_COMPLETE,
  EnhancedUserAttributes,
  MoodBasedQuestion,
} from "@/lib/enhancedOnboarding";
import { useLocation } from "@/context/LocationContext";
import { normalizeLocationError } from "@/lib/locationService";
import { getLocationErrorMessage } from "@/lib/client/locationErrorMessages";
// import { SmartRecommendationEngine } from '@/lib/smartRecommendation';

interface OnboardingFlowProps {
  userId: string;
  onComplete: (attributes: EnhancedUserAttributes) => void;
  onSkip?: () => void;
  onSmartRecommendation?: (recommendation: any) => void;
}

export const OnboardingFlow: React.FC<OnboardingFlowProps> = ({
  userId,
  onComplete,
  onSkip,
  onSmartRecommendation,
}) => {
  const { requestLocation } = useLocation();
  const [currentStep, setCurrentStep] = useState<number>(-1); // -1 = intro
  const [attributes, setAttributes] = useState<EnhancedUserAttributes>(
    {} as EnhancedUserAttributes,
  );
  const [isSubmitting, setIsSubmitting] = useState(false);

  const totalSteps = MOOD_BASED_QUESTIONS.filter((q) => q.required).length;
  const progress =
    currentStep === -1 ? 0 : ((currentStep + 1) / totalSteps) * 100;

  const handleStart = () => {
    setCurrentStep(0);
  };

  const handleAnswer = async (questionId: string, value: string) => {
    const question = MOOD_BASED_QUESTIONS[currentStep];

    if (question) {
      setAttributes((prev) => ({
        ...prev,
        [question.dbField]: value,
      }));

      // Handle location permission request
      if (questionId === "current_location" && value === "get_location") {
        const { location, error } = await requestLocation({ source: "user" });
        if (location) {
          setAttributes((prev) => ({
            ...prev,
            [question.dbField]: "current_location",
            location_lat: location.lat,
            location_lng: location.lng,
            location_permission: true,
          }));
        } else {
          const normalized = normalizeLocationError(error);
          const errorMessage = getLocationErrorMessage(normalized.code);

          console.error("Error getting location:", errorMessage);

          // Notify user about the error
          alert(
            `${errorMessage}\n\n位置情報の取得に失敗しました。次の質問に進みます。`,
          );

          // Don't set a fallback location - let the user continue without location
          setAttributes((prev) => ({
            ...prev,
            location_permission: false,
          }));
        }
      }
    }

    // Move to next question
    if (currentStep < MOOD_BASED_QUESTIONS.length - 1) {
      setCurrentStep((prev) => prev + 1);
    } else {
      // Onboarding complete
      handleComplete();
    }
  };

  const handleSkipQuestion = () => {
    const question = MOOD_BASED_QUESTIONS[currentStep];

    if (question && !question.required) {
      if (currentStep < MOOD_BASED_QUESTIONS.length - 1) {
        setCurrentStep((prev) => prev + 1);
      } else {
        handleComplete();
      }
    }
  };

  const handleComplete = async () => {
    setIsSubmitting(true);

    try {
      // Save to database
      const response = await fetch("/api/user/save-attributes", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userId,
          attributes,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to save attributes");
      }

      // Generate smart recommendation if we have enough data
      // Note: SmartRecommendationEngine requires UserState type which is not compatible with onboarding attributes
      // This functionality should be updated to use the new UserState interface if needed
      if (
        onSmartRecommendation &&
        attributes.current_mood &&
        attributes.energy_level
      ) {
        // Temporarily disabled - requires proper UserState conversion
        // const userState = { ... };
        // const recommendationEngine = new SmartRecommendationEngine(userState);
        // const recommendation = recommendationEngine.generateRecommendation();
        // onSmartRecommendation(recommendation);
        console.log(
          "Smart recommendation generation temporarily disabled - requires UserState conversion",
        );
      }

      // Call onComplete callback
      onComplete(attributes);
    } catch (error) {
      console.error("Onboarding error:", error);
      alert("Failed to save your information. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const currentQuestion =
    currentStep >= 0 ? MOOD_BASED_QUESTIONS[currentStep] : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full mx-4 overflow-hidden"
      >
        {/* Progress Bar */}
        {currentStep >= 0 && (
          <div className="h-2 bg-gray-200">
            <motion.div
              className="h-full bg-gradient-to-r from-green-500 to-green-600"
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.3 }}
            />
          </div>
        )}

        <div className="p-8">
          <AnimatePresence mode="wait">
            {/* Intro Screen */}
            {currentStep === -1 && (
              <motion.div
                key="intro"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="text-center"
              >
                <div className="w-20 h-20 bg-gradient-to-br from-green-500 to-green-600 rounded-full flex items-center justify-center mx-auto mb-6 text-white text-3xl font-bold">
                  AI
                </div>
                <h2 className="text-3xl font-bold text-gray-900 mb-4">
                  Welcome to Gappy
                </h2>
                <p className="text-gray-600 whitespace-pre-line mb-8">
                  {ENHANCED_ONBOARDING_INTRO}
                </p>
                <div className="flex gap-4 justify-center">
                  <button
                    onClick={handleStart}
                    className="px-8 py-3 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-lg font-semibold hover:shadow-lg transition-all"
                  >
                    Get Started
                  </button>
                  {onSkip && (
                    <button
                      onClick={onSkip}
                      className="px-8 py-3 bg-gray-200 text-gray-700 rounded-lg font-semibold hover:bg-gray-300 transition-all"
                    >
                      Skip for now
                    </button>
                  )}
                </div>
              </motion.div>
            )}

            {/* Question Screen */}
            {currentStep >= 0 && currentQuestion && (
              <motion.div
                key={`question-${currentStep}`}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
              >
                <div className="mb-2 text-sm text-gray-500">
                  Question {currentStep + 1} of {MOOD_BASED_QUESTIONS.length}
                </div>
                <h3 className="text-2xl font-bold text-gray-900 mb-6">
                  {currentQuestion.question}
                </h3>

                {/* Select Type */}
                {currentQuestion.options && (
                  <div className="space-y-3">
                    {currentQuestion.options.map((option) => (
                      <button
                        key={option.value}
                        onClick={() =>
                          handleAnswer(currentQuestion.id, option.value)
                        }
                        className="w-full text-left p-4 border-2 border-gray-200 rounded-lg hover:border-green-500 hover:bg-green-50 transition-all group"
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-2xl">{option.emoji}</span>
                          <div className="flex-1">
                            <div className="font-semibold text-gray-900 group-hover:text-green-600">
                              {option.label}
                            </div>
                            {option.description && (
                              <div className="text-sm text-gray-500 mt-1">
                                {option.description}
                              </div>
                            )}
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                )}

                {/* Skip Button for optional questions */}
                {!currentQuestion.required && (
                  <button
                    onClick={handleSkipQuestion}
                    className="mt-4 text-gray-500 hover:text-gray-700 text-sm"
                  >
                    Skip this question
                  </button>
                )}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Loading State */}
          {isSubmitting && (
            <div className="text-center py-8">
              <div className="inline-block w-8 h-8 border-4 border-green-500 border-t-transparent rounded-full animate-spin" />
              <p className="mt-4 text-gray-600">Saving your preferences...</p>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
};

export default OnboardingFlow;
