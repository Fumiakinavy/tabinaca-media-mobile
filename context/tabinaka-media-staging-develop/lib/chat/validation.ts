/**
 * Chat API validation and authentication utilities
 * Extracted from send-message.ts for better organization
 */

import type { NextApiRequest, NextApiResponse } from "next";
import { verifyAccountToken } from "@/lib/accountToken";
import { fetchChatSessionById } from "@/lib/server/chatSessions";

export interface ValidatedChatRequest {
  message: string;
  conversationHistory?: { role: "user" | "assistant"; content: string }[];
  sessionId?: string;
  currentLocation?: {
    lat: number;
    lng: number;
    permission?: boolean;
  };
  displayedCards?: Array<{
    place_id: string;
    name: string;
    formatted_address?: string;
    rating?: number;
    user_ratings_total?: number;
    price_level?: number;
    types?: string[];
    distance_m?: number;
    clicked?: boolean;
    displayedAt?: string;
  }>;
  quizResults?: {
    recommendation?: any;
    places?: any[];
    timestamp?: number;
    travelType?: {
      travelTypeCode: string;
      travelTypeName?: string;
      travelTypeEmoji?: string;
      travelTypeDescription?: string;
      locationLat?: number;
      locationLng?: number;
      locationPermission?: boolean;
    };
    answers?: {
      walkingTolerance?: string;
      dietaryPreferences?: string[];
      languageComfort?: string[];
      photoSubjects?: string[];
      origin?: string;
    };
  };
  homeDurationPreference?: "under15" | "15-30" | "30-60" | "60+";
}

export interface ValidatedChatContext {
  accountId: string;
  sessionId: string;
  dbSessionId: string;
  message: string;
  conversationHistory: { role: "user" | "assistant"; content: string }[];
  currentLocation?: {
    lat: number;
    lng: number;
    permission?: boolean;
  };
  displayedCards?: Array<{
    place_id: string;
    name: string;
    formatted_address?: string;
    rating?: number;
    user_ratings_total?: number;
    price_level?: number;
    types?: string[];
    distance_m?: number;
    clicked?: boolean;
    displayedAt?: string;
  }>;
  quizResults?: ValidatedChatRequest['quizResults'];
  homeDurationPreference?: "under15" | "15-30" | "30-60" | "60+";
}

/**
 * Validate and parse chat request
 */
export function validateChatRequest(body: any): ValidatedChatRequest {
  const {
    message,
    conversationHistory = [],
    sessionId,
    currentLocation,
    displayedCards,
    quizResults,
    homeDurationPreference,
  }: ValidatedChatRequest = body || {};

  if (!message || typeof message !== "string") {
    throw new Error("Message is required");
  }

  return {
    message,
    conversationHistory,
    sessionId,
    currentLocation,
    displayedCards,
    quizResults,
    homeDurationPreference,
  };
}

/**
 * Validate session ID requirement
 */
export function validateSessionRequirement(sessionId?: string): void {
  if (!sessionId || typeof sessionId !== "string") {
    throw new Error("sessionId is required");
  }
}

/**
 * Authenticate and validate account token
 */
export async function authenticateChatRequest(
  req: NextApiRequest,
  res: NextApiResponse
): Promise<{ accountId: string }> {
  const accountIdHeader = req.headers["x-gappy-account-id"];
  const accountTokenHeader = req.headers["x-gappy-account-token"];

  const accountId = Array.isArray(accountIdHeader)
    ? accountIdHeader[0]
    : accountIdHeader;
  const accountToken = Array.isArray(accountTokenHeader)
    ? accountTokenHeader[0]
    : accountTokenHeader;

  if (!accountId || !accountToken) {
    res.status(401).json({ error: "Missing authentication headers" });
    throw new Error("Authentication failed");
  }

  const verified = verifyAccountToken(accountToken);

  if (!verified || verified.accountId !== accountId) {
    res.status(401).json({ error: "Invalid account token" });
    throw new Error("Authentication failed");
  }

  return { accountId };
}

/**
 * Validate and fetch chat session
 */
export async function validateChatSession(
  sessionId: string,
  accountId: string,
  res: NextApiResponse
): Promise<{ dbSessionId: string }> {
  const existingSession = await fetchChatSessionById(sessionId, accountId);

  if (!existingSession) {
    res.status(404).json({
      error: "Chat session not found",
      errorCode: "SESSION_NOT_FOUND",
      suggestion: "Reload the chat page or start a new chat session.",
    });
    throw new Error("Session not found");
  }

  return { dbSessionId: existingSession.id };
}

/**
 * Complete validation and authentication flow
 */
export async function validateAndAuthenticateChatRequest(
  req: NextApiRequest,
  res: NextApiResponse
): Promise<ValidatedChatContext> {
  // Validate HTTP method
  if (req.method !== "POST") {
    res.setHeader("Allow", ["POST"]);
    res.status(405).json({ error: "Method Not Allowed" });
    throw new Error("Method not allowed");
  }

  // Parse and validate request body
  const validatedRequest = validateChatRequest(req.body);

  // Validate session requirement
  validateSessionRequirement(validatedRequest.sessionId);

  // Authenticate request
  const { accountId } = await authenticateChatRequest(req, res);

  // Validate and fetch session
  const { dbSessionId } = await validateChatSession(
    validatedRequest.sessionId!,
    accountId,
    res
  );

  return {
    accountId,
    sessionId: validatedRequest.sessionId!,
    dbSessionId,
    message: validatedRequest.message,
    conversationHistory: validatedRequest.conversationHistory || [],
    currentLocation: validatedRequest.currentLocation,
    displayedCards: validatedRequest.displayedCards,
    quizResults: validatedRequest.quizResults,
    homeDurationPreference: validatedRequest.homeDurationPreference,
  };
}
