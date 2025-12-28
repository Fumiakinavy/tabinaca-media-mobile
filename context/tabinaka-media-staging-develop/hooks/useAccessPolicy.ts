import { useAccount } from "@/context/AccountContext";
import { useQuizStatus } from "@/context/QuizStatusContext";
import { ACCESS_POLICIES } from "@/lib/accessPolicy";

export type AccessPolicyResult = {
  allowed: boolean;
  reason: "auth" | "quiz" | null;
  redirectPath: string | null;
};

export const useAccessPolicy = (
  policyKey: keyof typeof ACCESS_POLICIES,
): AccessPolicyResult => {
  const policy = ACCESS_POLICIES[policyKey];
  const { authState } = useAccount();
  const { status: quizStatus } = useQuizStatus();

  if (!policy) {
    return { allowed: true, reason: null, redirectPath: null };
  }

  if (policy.requiresAuth && authState !== "authenticated") {
    return {
      allowed: false,
      reason: "auth",
      redirectPath: policy.redirectPath ?? null,
    };
  }

  if (policy.requiresQuiz && quizStatus !== "completed") {
    return {
      allowed: false,
      reason: "quiz",
      redirectPath: policy.redirectPath ?? null,
    };
  }

  return {
    allowed: true,
    reason: null,
    redirectPath: policy.redirectPath ?? null,
  };
};
