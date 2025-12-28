import { CHAT_RESULT_PATH, buildQuizRedirect } from "@/lib/chatAccess";

export type AccessPolicyRequirement = {
  requiresAuth?: boolean;
  requiresQuiz?: boolean;
  redirectPath?: string;
};

export const ACCESS_POLICIES: Record<string, AccessPolicyRequirement> = {
  aiChat: {
    requiresAuth: true,
    requiresQuiz: false, // Quiz is optional - users can chat without completing the quiz
    redirectPath: buildQuizRedirect(CHAT_RESULT_PATH),
  },
  savedActivities: {
    requiresAuth: true,
    redirectPath: buildQuizRedirect("/liked-activities"),
  },
};
