import React from "react";
import { motion } from "framer-motion";
import PlaceCard from "./PlaceCard";

interface Place {
  place_id: string;
  name: string;
  formatted_address?: string;
  geometry?: {
    location: {
      lat: number;
      lng: number;
    };
  };
  rating?: number;
  user_ratings_total?: number;
  photos?: Array<{
    photo_reference: string;
    width: number;
    height: number;
  }>;
  types?: string[];
  price_level?: number;
  opening_hours?: {
    open_now?: boolean;
  };
}

interface EnhancedChatMessageProps {
  role: "user" | "assistant" | "system";
  content: string;
  timestamp?: Date;
  places?: Place[];
  isLoading?: boolean;
  onNavigateToMap?: () => void;
}

const EnhancedChatMessage: React.FC<EnhancedChatMessageProps> = ({
  role,
  content,
  timestamp,
  places,
  isLoading = false,
  onNavigateToMap,
}) => {
  const isUser = role === "user";
  const isSystem = role === "system";

  if (isLoading) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex justify-start mb-4"
      >
        <div className="flex items-center space-x-3 max-w-4xl">
          <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
          </div>
          <div className="bg-gray-100 rounded-2xl px-4 py-2">
            <div className="flex space-x-1">
              <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" />
              <div
                className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                style={{ animationDelay: "0.1s" }}
              />
              <div
                className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                style={{ animationDelay: "0.2s" }}
              />
            </div>
          </div>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`flex ${isUser ? "justify-end" : "justify-start"} mb-4`}
    >
      <div
        className={`flex items-start space-x-3 max-w-4xl ${isUser ? "flex-row-reverse space-x-reverse" : ""}`}
      >
        {/* Avatar */}
        <div
          className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
            isUser ? "bg-blue-500" : isSystem ? "bg-red-500" : "bg-green-500"
          }`}
        >
          {isUser ? (
            <svg
              className="w-4 h-4 text-white"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z"
                clipRule="evenodd"
              />
            </svg>
          ) : (
            <svg
              className="w-4 h-4 text-white"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
              />
            </svg>
          )}
        </div>

        {/* Message Content */}
        <div
          className={`flex flex-col space-y-2 ${isUser ? "items-end" : "items-start"}`}
        >
          {/* Text Content */}
          {content && (
            <div
              className={`rounded-2xl px-4 py-2 max-w-2xl ${
                isUser
                  ? "bg-blue-500 text-white"
                  : isSystem
                    ? "bg-red-100 text-red-800 border border-red-200"
                    : "bg-gray-100 text-gray-900"
              }`}
            >
              <p className="text-sm whitespace-pre-wrap">{content}</p>
            </div>
          )}

          {/* Places Cards (TOP 3 only) */}
          {places && places.length > 0 && (
            <div className="space-y-3">
              {/* Show top 3 places as cards */}
              <div className="grid gap-3 max-w-2xl">
                {places.slice(0, 3).map((place, index) => (
                  <motion.div
                    key={place.place_id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                  >
                    <PlaceCard
                      place={{
                        ...place,
                        formatted_address: place.formatted_address || "",
                        types: place.types || [],
                      }}
                    />
                  </motion.div>
                ))}
              </div>

              {/* Show remaining places info and map navigation */}
              {places.length > 3 && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                  className="bg-green-50 border border-green-200 rounded-lg p-4 max-w-2xl"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-green-800">
                        Found {places.length} places total
                      </p>
                      <p className="text-xs text-green-600 mt-1">
                        Showing top 3 recommendations above
                      </p>
                    </div>
                    <button
                      onClick={onNavigateToMap}
                      className="px-4 py-2 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 transition-colors flex items-center space-x-2"
                    >
                      <svg
                        className="w-4 h-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                        />
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                        />
                      </svg>
                      <span>View on Map</span>
                    </button>
                  </div>
                </motion.div>
              )}

              {/* If 3 or fewer places, show map button */}
              {places.length <= 3 && onNavigateToMap && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                  className="flex justify-center"
                >
                  <button
                    onClick={onNavigateToMap}
                    className="px-4 py-2 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 transition-colors flex items-center space-x-2"
                  >
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                      />
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                      />
                    </svg>
                    <span>View on Map</span>
                  </button>
                </motion.div>
              )}
            </div>
          )}

          {/* Timestamp */}
          {timestamp && (
            <p className="text-xs text-gray-500 px-2">
              {timestamp.toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </p>
          )}
        </div>
      </div>
    </motion.div>
  );
};

export default EnhancedChatMessage;
