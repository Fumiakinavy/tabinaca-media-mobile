const normalizeReturnTo = (target: string) => {
  if (!target) {
    return "/";
  }
  return target.startsWith("/") ? target : `/${target}`;
};

export const CHAT_RESULT_PATH = "/chat";

export const buildQuizRedirect = (target: string) => {
  const normalized = normalizeReturnTo(target);
  return `/quiz?returnTo=${encodeURIComponent(normalized)}`;
};

export const CHAT_GUARD_REDIRECT = buildQuizRedirect(CHAT_RESULT_PATH);
 
