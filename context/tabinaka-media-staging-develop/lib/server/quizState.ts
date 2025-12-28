import { supabaseServer } from "@/lib/supabaseServer";

export type QuizStateRecord = {
  completed?: boolean;
  travelTypeCode?: string;
  timestamp?: number;
  [key: string]: any;
} | null;

export const fetchQuizState = async (
  accountId: string,
): Promise<QuizStateRecord> => {
  // 1. Try fetching from new quiz_sessions table
  const { data: sessionData, error: sessionError } = await supabaseServer
    .from("quiz_sessions" as any)
    .select("status, travel_type_code, travel_type_payload, completed_at, answers, result")
    .eq("account_id", accountId)
    .eq("status", "completed")
    .order("completed_at", { ascending: false })
    .limit(1)
    .maybeSingle<{
      status: string;
      travel_type_code: string;
      travel_type_payload: any;
      completed_at: string;
      answers: any;
      result?: any;
    }>();

  if (sessionData) {
    return {
      completed: true,
      travelTypeCode: sessionData.travel_type_code,
      travelType: {
        travelTypeCode: sessionData.travel_type_code,
        ...sessionData.travel_type_payload,
      },
      timestamp: new Date(sessionData.completed_at).getTime(),
      answers: sessionData.answers,
      recommendation: sessionData.result?.snapshot ? { places: sessionData.result.snapshot.places } : undefined,
    };
  }

  // 2. Fallback to account_metadata (legacy)
  const { data, error } = await supabaseServer
    .from("account_metadata" as any)
    .select("quiz_state")
    .eq("account_id", accountId)
    .maybeSingle<{ quiz_state: any }>();

  if (error) {
    // Check if the error is due to missing table
    if (
      error.code === "PGRST205" ||
      error.message?.includes("Could not find the table")
    ) {
      console.error(
        "[quizState] account_metadata table not found. Migration required:",
        {
          migrationFile: "supabase/migrations/003_account_identity.sql",
          hint: "Run the migration via Supabase SQL Editor or use: supabase db push",
        },
      );
      return null;
    }
    console.error("[quizState] Failed to fetch quiz_state", error);
    return null;
  }

  return (data?.quiz_state as QuizStateRecord) ?? null;
};

export const ensureQuizCompleted = async (
  accountId: string,
): Promise<QuizStateRecord> => {
  const quizState = await fetchQuizState(accountId);
  if (!quizState?.completed) {
    return null;
  }
  return quizState;
};
