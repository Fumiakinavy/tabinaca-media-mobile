import { useCallback, useState } from "react";
import { useRouter } from "next/router";
import Image from "next/image";
import {
  clearQuizData,
  flushPendingQuizResults,
  persistQuizResultLocal,
  queueQuizResultSync,
  saveQuizFormAnswers,
} from "@/lib/quizClientState";
import { useAccount } from "@/context/AccountContext";
import { useQuizStatus } from "@/context/QuizStatusContext";

const QuizResultModal = () => {
  const router = useRouter();
  const { quizResult, isModalOpen, closeModal, status, accountId } =
    useQuizStatus();
  const { resetToGuest, supabaseAccessToken } = useAccount();
  const { resultContent, travelType } = quizResult ?? {};
  const experienceHref = travelType?.travelTypeCode
    ? `/experiences?type=${travelType.travelTypeCode}`
    : "/experiences";

  const handleRouteChange = (path: string) => {
    closeModal();
    router.push(path).catch(() => {
      /* no-op */
    });
  };

  const handleNavigateWithLocation = useCallback(
    (path: string) => {
      handleRouteChange(path);
    },
    [handleRouteChange],
  );

  const handleEditQuiz = () => {
    if (quizResult?.answers && accountId) {
      saveQuizFormAnswers(accountId, quizResult.answers);
    }
    const fallbackReturnTo = "/chat";
    const currentPath =
      typeof router.asPath === "string" && router.asPath.startsWith("/")
        ? router.asPath
        : fallbackReturnTo;
    const target = `/quiz?edit=1&returnTo=${encodeURIComponent(currentPath)}`;
    handleRouteChange(target);
  };

  const handleSignOut = async () => {
    try {
      clearQuizData(accountId);
      closeModal();
      await resetToGuest();
      router.push("/");
    } catch (error) {
      console.error("[QuizResultModal] Failed to sign out", error);
    }
  };

  const handleOpenShareCard = () => {
    if (!travelType?.travelTypeCode) return;
    const target = `/quiz/share-card?code=${encodeURIComponent(travelType.travelTypeCode)}`;
    closeModal();
    router.push(target).catch(() => undefined);
  };

  const showQuizResult =
    status === "completed" && resultContent && travelType?.travelTypeCode;
  const showMissingState = status === "missing";
  const shouldRenderModal = showQuizResult || showMissingState;

  if (!isModalOpen || !shouldRenderModal) {
    return null;
  }

  const heroContent = showQuizResult ? (
    <div className="relative flex items-stretch justify-center bg-slate-50">
      <div className="relative w-full max-w-[320px] md:w-full md:max-w-none md:min-w-[200px] aspect-[2/3] overflow-hidden sm:overflow-visible">
        <Image
          src={resultContent!.heroImage}
          alt={`${resultContent!.title} hero`}
          fill
          sizes="(max-width: 768px) 100vw, 50vw"
          className="object-cover"
          priority
        />
      </div>
      <button
        type="button"
        onClick={closeModal}
        className="absolute right-3 top-3 z-10 rounded-full bg-black/40 p-1.5 text-white backdrop-blur-md transition hover:bg-black/50 md:hidden"
        aria-label="Close"
      >
        ✕
      </button>
    </div>
  ) : (
    <div className="flex items-center justify-center bg-slate-50">
      <div className="relative w-full max-w-[320px] md:w-full md:max-w-none md:min-w-[200px] aspect-[2/3] flex items-center justify-center overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-slate-100 to-slate-200" />
        <div className="relative z-10 flex w-full flex-col items-center gap-3 px-4 text-center">
          <p className="text-lg md:text-xl font-semibold text-slate-900">
            No quiz result yet
          </p>
          <p className="text-sm md:text-base text-slate-600 leading-relaxed">
            Complete the quiz to unlock personalized recommendations.
          </p>
          <button
            type="button"
            onClick={() => handleNavigateWithLocation("/quiz")}
            className="rounded-full bg-[#36D879] px-4 py-2 text-sm font-semibold text-white shadow hover:bg-[#2B9E5A] transition"
          >
            Take the quiz
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 z-[80] flex items-start md:items-center justify-center px-3 md:px-6 py-6 md:py-10 overflow-y-auto overscroll-contain min-h-screen -webkit-overflow-scrolling-touch pb-safe-bottom">
      <button
        type="button"
        aria-label="Close results"
        onClick={closeModal}
        className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
      />
      <div
        className={`relative z-10 w-full md:h-auto -webkit-overflow-scrolling-touch pb-[calc(env(safe-area-inset-bottom)+96px)] md:pb-8 rounded-2xl md:rounded-[28px] bg-white shadow-2xl ring-1 ring-slate-100 overflow-y-auto md:overflow-hidden max-h-[calc(100svh-2rem)] md:max-h-none ${showQuizResult
          ? "md:w-auto md:max-w-[60vw] md:aspect-[16/10.9] max-w-3xl"
          : "max-w-md"
          }`}
      >
        <div
          className={`grid gap-0 ${showQuizResult ? "md:grid-cols-[1fr_1.2fr] md:h-full" : "h-full"
            }`}
        >
          {showQuizResult && heroContent}

          <div className="relative flex h-full flex-col gap-4 md:gap-5 p-4 md:p-5 overflow-y-auto pb-[calc(env(safe-area-inset-bottom)+80px)] md:pb-10 pb-safe-bottom -webkit-overflow-scrolling-touch">
            <button
              type="button"
              onClick={closeModal}
              className="hidden md:block absolute right-2 md:right-3 top-2 md:top-3 rounded-full border border-slate-200 p-1 md:p-1.5 text-slate-500 transition hover:bg-slate-50 text-sm md:text-base"
              aria-label="Close"
            >
              ✕
            </button>

            {showQuizResult ? (
              <div className="flex flex-1 flex-col gap-4 md:gap-5 pr-3 md:pr-6">
                <div className="flex flex-col gap-2">
                  <p className="text-sm md:text-base font-semibold text-green-500">
                    Your 16-Type Result
                  </p>
                  <h2 className="text-xl md:text-2xl font-bold text-slate-900 leading-tight">
                    {resultContent!.greeting}
                  </h2>
                  <p className="text-sm md:text-base text-slate-700 leading-relaxed">
                    {resultContent!.description}
                  </p>
                </div>

                <div className="rounded-lg md:rounded-xl border border-slate-100 bg-slate-50/60 p-2.5 md:p-3">
                  <div className="flex items-center justify-between gap-2 md:gap-3">
                    <div>
                      <p className="text-sm font-semibold text-slate-500">
                        Your Type
                      </p>
                      <p className="text-base md:text-lg font-bold text-slate-900">
                        {travelType!.travelTypeEmoji}{" "}
                        {travelType!.travelTypeName}
                      </p>
                    </div>
                    <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                      {travelType!.travelTypeCode}
                    </span>
                  </div>
                  <p className="mt-1.5 md:mt-2 text-sm md:text-base text-slate-600 leading-relaxed">
                    {resultContent!.shortDescription}
                  </p>
                </div>
              </div>
            ) : (
              <div className="flex flex-1 flex-col gap-4 md:gap-5 pr-3 md:pr-6">
                <div className="flex flex-col gap-2">
                  <p className="text-sm md:text-base font-semibold text-green-500">
                    No Quiz Result
                  </p>
                  <h2 className="text-xl md:text-2xl font-bold text-slate-900 leading-tight">
                    Personalize your experience
                  </h2>
                  <p className="text-sm md:text-base text-slate-700 leading-relaxed">
                    Please take the quiz for a more personalized experience.
                  </p>
                </div>
                <div className="flex-1" aria-hidden="true" />
              </div>
            )}

            {showQuizResult ? (
              <div className="mt-auto pt-1.5 md:pt-2 grid w-full gap-2 md:gap-2.5 md:grid-cols-2">
                <button
                  type="button"
                  onClick={() => handleNavigateWithLocation("/chat")}
                  className="col-span-2 w-full rounded-full bg-slate-900 px-3 py-2 md:py-2.5 text-xs font-semibold text-white transition hover:bg-slate-800"
                >
                  Chat with AI
                </button>

                <button
                  type="button"
                  onClick={handleEditQuiz}
                  className="w-full rounded-full border border-amber-200 px-2.5 md:px-3 py-2 md:py-2.5 text-xs font-semibold text-amber-600 transition hover:bg-amber-50"
                >
                  Edit Answers
                </button>
                <button
                  type="button"
                  onClick={handleOpenShareCard}
                  className="w-full rounded-full border border-emerald-200 px-2.5 md:px-3 py-2 md:py-2.5 text-xs font-semibold text-emerald-700 transition hover:bg-emerald-50"
                >
                  Share your card
                </button>

                <button
                  type="button"
                  onClick={() => handleNavigateWithLocation(experienceHref)}
                  className="w-full rounded-full border border-slate-200 px-2.5 md:px-3 py-2 md:py-2.5 text-xs font-semibold text-slate-900 transition hover:bg-slate-50"
                >
                  See experiences
                </button>
                <button
                  type="button"
                  onClick={handleSignOut}
                  className="w-full rounded-full border border-slate-200 px-2.5 md:px-3 py-2 md:py-2.5 text-xs font-semibold text-slate-600 transition hover:bg-slate-50"
                >
                  Sign out
                </button>
              </div>
            ) : (
              <div className="mt-auto pt-1.5 md:pt-2 grid w-full gap-2 md:gap-2.5 md:grid-cols-2">
                <button
                  type="button"
                  onClick={() => handleNavigateWithLocation("/quiz")}
                  className="col-span-2 w-full rounded-full bg-[#36D879] px-3 py-2 md:py-2.5 text-xs font-semibold text-white transition hover:bg-[#2B9E5A]"
                >
                  Take the quiz
                </button>

                <button
                  type="button"
                  onClick={() => handleNavigateWithLocation("/chat")}
                  className="col-span-2 w-full rounded-full bg-slate-900 px-3 py-2 md:py-2.5 text-xs font-semibold text-white transition hover:bg-slate-800"
                >
                  Chat with AI
                </button>

                <button
                  type="button"
                  disabled
                  className="w-full rounded-full border border-slate-100 bg-slate-50 px-2.5 md:px-3 py-2 md:py-2.5 text-xs font-semibold text-slate-400 cursor-not-allowed"
                >
                  Edit Answers
                </button>
                <button
                  type="button"
                  disabled
                  className="w-full rounded-full border border-slate-100 bg-slate-50 px-2.5 md:px-3 py-2 md:py-2.5 text-xs font-semibold text-slate-400 cursor-not-allowed"
                >
                  Share your card
                </button>

                <button
                  type="button"
                  onClick={() => handleNavigateWithLocation(experienceHref)}
                  className="w-full rounded-full border border-slate-200 px-2.5 md:px-3 py-2 md:py-2.5 text-xs font-semibold text-slate-900 transition hover:bg-slate-50"
                >
                  See experiences
                </button>
                <button
                  type="button"
                  onClick={handleSignOut}
                  className="w-full rounded-full border border-slate-200 px-2.5 md:px-3 py-2 md:py-2.5 text-xs font-semibold text-slate-600 transition hover:bg-slate-50"
                >
                  Sign out
                </button>
              </div>
            )}

            {/* Extra scroll buffer for mobile safe area & thumb reachability */}
            <div className="h-24 md:h-14" aria-hidden="true" />
          </div>
        </div>
      </div>
    </div>
  );
};

export default QuizResultModal;
