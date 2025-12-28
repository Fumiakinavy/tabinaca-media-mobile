import { supabaseServer } from "@/lib/supabaseServer";

const LIKE_INTERACTION_TYPE = "like";
const INTERACTION_RECHECK_DELAY_MS = 5 * 60 * 1000;

type NormalizedError = {
  message: string;
  code?: string;
  details?: string;
  hint?: string;
};

type SafeResponse<T> = {
  data: T | null;
  error: NormalizedError | null;
  count?: number | null;
};

export type LikeBackend = "activity_interactions" | "activity_likes";

export type LikeStateResult = {
  liked: boolean;
  backend: LikeBackend;
};

export type LikeCountResult = {
  count: number;
  backend: LikeBackend;
};

let interactionsSuppressedUntil = 0;
let lastFallbackLogAt = 0;

export class LikeStorageUnavailableError extends Error {
  constructor(
    public readonly attempted: LikeBackend[],
    public readonly lastError?: NormalizedError | null,
  ) {
    super(
      `Like storage tables unavailable (attempted: ${attempted.join(", ")})` +
        (lastError?.message ? `: ${lastError.message}` : ""),
    );
    this.name = "LikeStorageUnavailableError";
  }
}

function normalizeError(error: unknown): NormalizedError {
  if (!error) {
    return { message: "Unknown error" };
  }

  if (typeof error === "object") {
    const err = error as Record<string, unknown>;
    const messageValue = err.message;
    return {
      message:
        typeof messageValue === "string"
          ? messageValue
          : JSON.stringify(messageValue),
      code: typeof err.code === "string" ? err.code : undefined,
      details: typeof err.details === "string" ? err.details : undefined,
      hint: typeof err.hint === "string" ? err.hint : undefined,
    };
  }

  return { message: String(error) };
}

async function safeQuery<T>(
  promise: Promise<any> | PromiseLike<any> | any,
): Promise<SafeResponse<T>> {
  try {
    // Supabase query builder can be treated as PromiseLike, but type inference may be incorrect
    // Explicitly convert to Promise
    const result = await Promise.resolve(promise);
    return {
      data: result?.data ?? null,
      error: result?.error ? normalizeError(result.error) : null,
      count: typeof result?.count === "number" ? result.count : null,
    };
  } catch (error) {
    return { data: null, error: normalizeError(error), count: null };
  }
}

function isMissingTableError(error: NormalizedError | null) {
  if (!error) return false;
  const message = error.message?.toLowerCase() ?? "";
  return (
    error.code === "PGRST116" ||
    message.includes("does not exist") ||
    message.includes("schema cache") ||
    message.includes("could not find the table") ||
    message.includes("was not found") ||
    message.includes("unsupported table")
  );
}

function markInteractionsAvailable() {
  interactionsSuppressedUntil = 0;
}

function suppressInteractionsTemporarily() {
  interactionsSuppressedUntil = Date.now() + INTERACTION_RECHECK_DELAY_MS;
}

function shouldSkipInteractions() {
  return interactionsSuppressedUntil > Date.now();
}

function logFallbackOnce(message: string) {
  const now = Date.now();
  if (now - lastFallbackLogAt > 30_000) {
    console.warn(message);
    lastFallbackLogAt = now;
  }
}

function buildOperationError(action: string, error: NormalizedError | null) {
  const detail = error
    ? `${error.message}${error.code ? ` (code: ${error.code})` : ""}`
    : "unknown error";
  const err = new Error(`[likeStorage] Failed to ${action}: ${detail}`);
  (err as any).cause = error;
  return err;
}

async function readFromInteractions<T>(
  queryFactory: () => Promise<SafeResponse<T>>,
): Promise<
  | { success: true; data: SafeResponse<T> }
  | { success: false; missing: boolean }
> {
  if (shouldSkipInteractions()) {
    return { success: false, missing: true };
  }

  const result = await queryFactory();
  if (!result.error) {
    markInteractionsAvailable();
    return { success: true, data: result };
  }

  if (isMissingTableError(result.error)) {
    suppressInteractionsTemporarily();
    logFallbackOnce(
      "[likeStorage] activity_interactions unavailable, falling back to activity_likes",
    );
    return { success: false, missing: true };
  }

  throw buildOperationError("query activity_interactions", result.error);
}

async function readFromLegacy<T>(queryFactory: () => Promise<SafeResponse<T>>) {
  const result = await queryFactory();
  if (result.error) {
    if (isMissingTableError(result.error)) {
      throw new LikeStorageUnavailableError(
        ["activity_interactions", "activity_likes"],
        result.error,
      );
    }
    throw buildOperationError("query activity_likes", result.error);
  }
  return result;
}

export async function fetchLikeState(
  accountId: string,
  activitySlug: string,
): Promise<LikeStateResult> {
  const interactionsResult = await readFromInteractions(() =>
    safeQuery(
      supabaseServer
        .from("activity_interactions")
        .select("id")
        .eq("account_id", accountId)
        .eq("activity_slug", activitySlug)
        .eq("interaction_type", LIKE_INTERACTION_TYPE)
        .maybeSingle(),
    ),
  );

  if (interactionsResult.success) {
    return {
      liked: !!interactionsResult.data.data,
      backend: "activity_interactions",
    };
  }

  const legacyResult = await readFromLegacy(() =>
    safeQuery(
      supabaseServer
        .from("activity_likes")
        .select("id")
        .eq("account_id", accountId)
        .eq("activity_slug", activitySlug)
        .maybeSingle(),
    ),
  );

  return {
    liked: !!legacyResult.data,
    backend: "activity_likes",
  };
}

export async function fetchLikeCount(
  activitySlug: string,
): Promise<LikeCountResult> {
  const interactionsResult = await readFromInteractions(() =>
    safeQuery(
      supabaseServer
        .from("activity_interactions")
        .select("*", { count: "exact", head: true })
        .eq("activity_slug", activitySlug)
        .eq("interaction_type", LIKE_INTERACTION_TYPE),
    ),
  );

  if (interactionsResult.success) {
    return {
      count: interactionsResult.data.count ?? 0,
      backend: "activity_interactions",
    };
  }

  const legacyResult = await readFromLegacy(() =>
    safeQuery(
      supabaseServer
        .from("activity_likes")
        .select("*", { count: "exact", head: true })
        .eq("activity_slug", activitySlug),
    ),
  );

  return {
    count: legacyResult.count ?? 0,
    backend: "activity_likes",
  };
}

export async function recordLike(
  accountId: string,
  activitySlug: string,
  activityId?: string | null,
) {
  try {
    // Use select→insert/update instead of upsert because activity_id may be NULL
    // First check for existing record
    const existingResult = await readFromInteractions<{ id: any }>(() =>
      safeQuery<{ id: any }>(
        supabaseServer
          .from("activity_interactions")
          .select("id")
          .eq("account_id", accountId)
          .eq("activity_slug", activitySlug)
          .eq("interaction_type", LIKE_INTERACTION_TYPE)
          .maybeSingle(),
      ),
    );

    if (!existingResult.success) {
      // Fallback if activity_interactions table does not exist
      throw new LikeStorageUnavailableError(["activity_interactions"], null);
    }

    const existingData = existingResult.data.data as
      | { id: any }
      | null
      | undefined;
    let upsertResult:
      | { success: true; data: SafeResponse<any> }
      | { success: false; missing: boolean };

    if (existingData && existingData.id) {
      // Update if existing record exists
      upsertResult = await readFromInteractions(() =>
        safeQuery(
          (supabaseServer as any)
            .from("activity_interactions")
            .update({
              activity_id: activityId,
              updated_at: new Date().toISOString(),
            })
            .eq("id", existingData.id),
        ),
      );
    } else {
      // Insert if no existing record
      upsertResult = await readFromInteractions(() =>
        safeQuery(
          (supabaseServer as any).from("activity_interactions").insert({
            account_id: accountId,
            activity_slug: activitySlug,
            activity_id: activityId,
            interaction_type: LIKE_INTERACTION_TYPE,
          }),
        ),
      );
    }

    if (upsertResult.success) {
      if (
        upsertResult.data.error &&
        !isMissingTableError(upsertResult.data.error)
      ) {
        throw buildOperationError(
          "upsert activity_interactions",
          upsertResult.data.error,
        );
      }
      return "activity_interactions" as LikeBackend;
    }

    // activity_interactionsテーブルが存在しない場合はfallbackへ
    throw new LikeStorageUnavailableError(["activity_interactions"], null);
  } catch (error) {
    if (error instanceof LikeStorageUnavailableError) {
      // Proceed to fallback
      throw error;
    }
    // If readFromInteractions threw an error other than missing table
    // This is an unexpected error, so rethrow as is
    console.error(
      "[likeStorage] recordLike: readFromInteractions threw error",
      {
        error,
        accountId,
        activitySlug,
        activityId,
      },
    );
    throw error;
  }

  const legacyCleanup = await safeQuery(
    supabaseServer
      .from("activity_likes")
      .delete()
      .eq("account_id", accountId)
      .eq("activity_slug", activitySlug),
  );

  if (legacyCleanup.error && !isMissingTableError(legacyCleanup.error)) {
    throw buildOperationError(
      "cleanup duplicate legacy likes",
      legacyCleanup.error,
    );
  }

  await readFromLegacy(() =>
    safeQuery(
      (supabaseServer as any).from("activity_likes").insert({
        account_id: accountId,
        activity_slug: activitySlug,
      }),
    ),
  );

  return "activity_likes" as LikeBackend;
}

export async function removeLike(accountId: string, activitySlug: string) {
  try {
    const interactionsResult = await readFromInteractions(() =>
      safeQuery(
        supabaseServer
          .from("activity_interactions")
          .delete()
          .eq("account_id", accountId)
          .eq("activity_slug", activitySlug)
          .eq("interaction_type", LIKE_INTERACTION_TYPE),
      ),
    );

    if (interactionsResult.success) {
      return;
    }
  } catch (error) {
    // If readFromInteractions threw an error other than missing table
    // This is an unexpected error, so rethrow as is
    console.error(
      "[likeStorage] removeLike: readFromInteractions threw error",
      {
        error,
        accountId,
        activitySlug,
      },
    );
    throw error;
  }

  const legacyResult = await safeQuery(
    supabaseServer
      .from("activity_likes")
      .delete()
      .eq("account_id", accountId)
      .eq("activity_slug", activitySlug),
  );

  if (legacyResult.error && !isMissingTableError(legacyResult.error)) {
    throw buildOperationError("delete legacy likes", legacyResult.error);
  }
}

export async function listLikes(
  accountId: string,
): Promise<Array<{ activity_slug: string; created_at: string }>> {
  const interactionsResult = await readFromInteractions(() =>
    safeQuery<Array<{ activity_slug: string; created_at: string }>>(
      supabaseServer
        .from("activity_interactions")
        .select("activity_slug, created_at")
        .eq("account_id", accountId)
        .eq("interaction_type", LIKE_INTERACTION_TYPE)
        .order("created_at", { ascending: false }),
    ),
  );

  if (interactionsResult.success) {
    return interactionsResult.data.data ?? [];
  }

  const legacyResult = await readFromLegacy(() =>
    safeQuery<Array<{ activity_slug: string; created_at: string }>>(
      supabaseServer
        .from("activity_likes")
        .select("activity_slug, created_at")
        .eq("account_id", accountId)
        .order("created_at", { ascending: false }),
    ),
  );

  return legacyResult.data ?? [];
}
