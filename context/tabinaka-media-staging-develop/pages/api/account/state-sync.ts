import type { NextApiRequest, NextApiResponse } from "next";
import { verifyAccountToken } from "@/lib/accountToken";
import { supabaseServer } from "@/lib/supabaseServer";
import { ensureAccountRow } from "@/lib/server/accountResolver";

type SyncResources = {
  quiz_results?: any;
  recommendation?: any;
};

type SyncResponse = {
  synced: string[];
};

type ErrorPayload = {
  error: string;
  message?: string;
  details?: string;
  hint?: string;
  migrationFile?: string;
};

const getHeaderValue = (value?: string | string[]) =>
  Array.isArray(value) ? value[0] : value;

const normalizeTravelType = (payload: any) => {
  if (!payload) return null;
  const travelType = payload.travelType || payload;
  if (!travelType?.travelTypeCode && !payload?.travelTypeCode) {
    return null;
  }
  return {
    travelTypeCode: travelType.travelTypeCode || payload.travelTypeCode,
    travelTypeName: travelType.travelTypeName || payload.travelTypeName,
    travelTypeEmoji: travelType.travelTypeEmoji || payload.travelTypeEmoji,
    travelTypeDescription:
      travelType.travelTypeDescription || payload.travelTypeDescription,
  };
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<SyncResponse | ErrorPayload>,
) {
  if (req.method !== "POST") {
    res.setHeader("Allow", ["POST"]);
    return res.status(405).json({ error: "Method not allowed" });
  }

  const accountId = getHeaderValue(req.headers["x-gappy-account-id"]);
  const accountToken = getHeaderValue(req.headers["x-gappy-account-token"]);
  if (!accountId || !accountToken) {
    return res.status(401).json({ error: "Missing account credentials" });
  }

  const tokenRecord = verifyAccountToken(accountToken);
  if (!tokenRecord || tokenRecord.accountId !== accountId) {
    return res.status(401).json({ error: "Invalid account session" });
  }

  // Ensure the account exists in the accounts table before any operations
  // This prevents foreign key constraint violations when inserting/updating account_metadata
  await ensureAccountRow(accountId);

  // Update last seen timestamp (best-effort)
  try {
    await (supabaseServer.from("accounts" as any) as any)
      .update({ last_seen_at: new Date().toISOString() })
      .eq("id", accountId);
  } catch (error) {
    console.warn("[account/state-sync] Failed to update last_seen_at", error);
  }

  const resources = req.body?.resources as SyncResources | undefined;
  if (!resources || typeof resources !== "object") {
    return res.status(400).json({ error: "Missing resources payload" });
  }

  const authHeader = req.headers.authorization || req.headers.Authorization;
  let supabaseUserId: string | null = null;
  if (
    typeof authHeader === "string" &&
    authHeader.toLowerCase().startsWith("bearer ")
  ) {
    const accessToken = authHeader.slice(7).trim();
    if (accessToken) {
      const { data, error } = await supabaseServer.auth.getUser(accessToken);
      if (!error && data?.user) {
        supabaseUserId = data.user.id;
      }
    }
  }

  const isMissingTableError = (error: { code?: string; message?: string }) =>
    error?.code === "PGRST205" ||
    error?.message?.includes("Could not find the table");

  let skipSupabaseUserUpdate = false;
  const hasSupabaseUser = Boolean(supabaseUserId);

  if (supabaseUserId) {
    const { data: existingLinkForUser, error: existingLinkForUserError } =
      await supabaseServer
        .from("account_linkages" as any)
        .select("account_id")
        .eq("supabase_user_id", supabaseUserId)
        .maybeSingle<{ account_id: string }>();

    if (existingLinkForUserError) {
      console.error(
        "[account/state-sync] failed to lookup linkage by supabase_user_id",
        existingLinkForUserError,
      );
      return res.status(500).json({
        error: "Failed to sync state",
        details: existingLinkForUserError.message,
      });
    }

    if (
      existingLinkForUser?.account_id &&
      existingLinkForUser.account_id !== accountId
    ) {
      skipSupabaseUserUpdate = true;
      console.warn(
        "[account/state-sync] Supabase user already linked to another account",
        {
          requestedAccountId: accountId,
          linkedAccountId: existingLinkForUser.account_id,
          supabaseUserId,
        },
      );
    }
  }

  const { data: existingLinkForAccount, error: existingLinkForAccountError } =
    await supabaseServer
      .from("account_linkages" as any)
      .select("account_id, supabase_user_id")
      .eq("account_id", accountId)
      .maybeSingle<{ account_id: string; supabase_user_id: string | null }>();

  if (existingLinkForAccountError) {
    console.error(
      "[account/state-sync] failed to lookup linkage by account_id",
      existingLinkForAccountError,
    );
    return res.status(500).json({
      error: "Failed to sync state",
      details: existingLinkForAccountError.message,
    });
  }

  const shouldWriteLinkage = hasSupabaseUser && !skipSupabaseUserUpdate;

  if (!existingLinkForAccount) {
    if (shouldWriteLinkage) {
      const { error: insertLinkageError } = await supabaseServer
        .from("account_linkages" as any)
        .insert({
          account_id: accountId,
          supabase_user_id: supabaseUserId,
          linked_at: new Date().toISOString(),
        } as any);

      if (insertLinkageError) {
        console.error(
          "[account/state-sync] failed to insert linkage",
          insertLinkageError,
        );
        if (isMissingTableError(insertLinkageError)) {
          return res.status(503).json({
            error: "Database schema not ready",
            message:
              "The account_linkages table does not exist. Please apply migration 003_account_identity.sql to your Supabase database.",
            migrationFile: "supabase/migrations/003_account_identity.sql",
            hint: "Run the migration via Supabase SQL Editor or use: supabase db push",
          });
        }

        return res.status(500).json({
          error: "Failed to sync state",
          details: insertLinkageError.message,
        });
      }
    } else if (skipSupabaseUserUpdate) {
      return res.status(409).json({
        error: "Account already linked to a different Supabase user",
        details: "State sync skipped to avoid overwriting existing linkage.",
      });
    }
  } else if (shouldWriteLinkage) {
    if (
      existingLinkForAccount.supabase_user_id &&
      existingLinkForAccount.supabase_user_id !== supabaseUserId
    ) {
      console.error(
        "[account/state-sync] conflicting Supabase linkage detected",
        {
          accountId,
          existingSupabaseUserId: existingLinkForAccount.supabase_user_id,
          supabaseUserId,
        },
      );
      return res.status(409).json({
        error: "Account already linked to a different Supabase user",
        details: "Please refresh your session to continue.",
      });
    }

    const updateQuery = supabaseServer.from("account_linkages" as any) as any;
    const { error: updateLinkageError } = await updateQuery
      .update({
        supabase_user_id: supabaseUserId,
        linked_at: new Date().toISOString(),
      } as any)
      .eq("account_id", accountId);

    if (updateLinkageError) {
      console.error(
        "[account/state-sync] failed to update linkage",
        updateLinkageError,
      );
      if (isMissingTableError(updateLinkageError)) {
        return res.status(503).json({
          error: "Database schema not ready",
          message:
            "The account_linkages table does not exist. Please apply migration 003_account_identity.sql to your Supabase database.",
          migrationFile: "supabase/migrations/003_account_identity.sql",
          hint: "Run the migration via Supabase SQL Editor or use: supabase db push",
        });
      }
      return res.status(500).json({
        error: "Failed to sync state",
        details: updateLinkageError.message,
      });
    }
  }

  const { data: existingMetadata, error: metadataError } = await supabaseServer
    .from("account_metadata" as any)
    .select("quiz_state")
    .eq("account_id", accountId)
    .maybeSingle<{ quiz_state: Record<string, any> | null }>();

  if (metadataError) {
    // Check if the error is due to missing table
    if (
      metadataError.code === "PGRST205" ||
      metadataError.message?.includes("Could not find the table")
    ) {
      console.error(
        "[account/state-sync] account_metadata table not found. Migration required:",
        {
          migrationFile: "supabase/migrations/003_account_identity.sql",
          hint: "Run the migration via Supabase SQL Editor or use: supabase db push",
        },
      );
      // Continue with empty state - will try to create metadata later
    } else {
      console.error(
        "[account/state-sync] error fetching account_metadata",
        metadataError,
      );
    }
  }

  let nextQuizState: Record<string, any> = existingMetadata?.quiz_state ?? {};
  const synced: string[] = [];

  if (resources.quiz_results) {
    const quizPayload = resources.quiz_results;
    const travelType = normalizeTravelType(quizPayload);
    const timestamp = quizPayload.timestamp || Date.now();
    nextQuizState = {
      ...nextQuizState,
      completed: Boolean(travelType?.travelTypeCode),
      travelType,
      timestamp,
    };
    synced.push("quiz_results");
  }

  if (resources.recommendation) {
    const recommendationPayload = resources.recommendation;
    nextQuizState = {
      ...nextQuizState,
      recommendation: {
        places: recommendationPayload.places || [],
        timestamp: recommendationPayload.timestamp || Date.now(),
      },
    };
    const travelType = normalizeTravelType(
      recommendationPayload.travelType || recommendationPayload,
    );
    if (travelType) {
      nextQuizState.travelType = travelType;
      nextQuizState.completed = true;
    }
    synced.push("recommendation");
  }

  if (synced.length === 0) {
    return res.status(400).json({ error: "No recognized resources to sync" });
  }

  // Verify that the account exists in the accounts table before upserting account_metadata
  // This prevents foreign key constraint violations
  const { data: accountExists, error: accountCheckError } = await supabaseServer
    .from("accounts" as any)
    .select("id")
    .eq("id", accountId)
    .maybeSingle<{ id: string }>();

  if (accountCheckError) {
    // If accounts table doesn't exist, try to ensure the account row again
    if (
      accountCheckError.code === "PGRST205" ||
      accountCheckError.message?.includes("Could not find the table") ||
      accountCheckError.message?.includes("relation") ||
      accountCheckError.message?.includes("does not exist")
    ) {
      console.warn(
        "[account/state-sync] accounts table not available, skipping account_metadata upsert",
      );
      return res.status(503).json({
        error: "Database schema not ready",
        message:
          "The accounts table does not exist. Please apply migration 003_account_identity.sql to your Supabase database.",
        migrationFile: "supabase/migrations/003_account_identity.sql",
        hint: "Run the migration via Supabase SQL Editor or use: supabase db push",
      });
    }
    console.error(
      "[account/state-sync] error checking account existence",
      accountCheckError,
    );
    return res.status(500).json({
      error: "Failed to sync state",
      details: accountCheckError.message,
    });
  }

  if (!accountExists) {
    // Account doesn't exist, try to create it
    await ensureAccountRow(accountId);
    
    // Verify again after attempting to create
    const { data: accountExistsAfter, error: accountCheckErrorAfter } =
      await supabaseServer
        .from("accounts" as any)
        .select("id")
        .eq("id", accountId)
        .maybeSingle<{ id: string }>();

    if (accountCheckErrorAfter || !accountExistsAfter) {
      console.error(
        "[account/state-sync] account does not exist and could not be created",
        {
          accountId,
          accountCheckErrorAfter,
        },
      );
      return res.status(500).json({
        error: "Failed to sync state",
        details:
          "Account does not exist in the accounts table and could not be created. Please try again.",
      });
    }
  }

  const { error: upsertMetadataError } = await supabaseServer
    .from("account_metadata" as any)
    .upsert(
      {
        account_id: accountId,
        quiz_state: nextQuizState,
        last_synced_at: new Date().toISOString(),
      } as any,
      { onConflict: "account_id" },
    );

  if (upsertMetadataError) {
    // Check if the error is due to missing table
    if (
      upsertMetadataError.code === "PGRST205" ||
      upsertMetadataError.message?.includes("Could not find the table")
    ) {
      return res.status(503).json({
        error: "Database schema not ready",
        message:
          "The account_metadata table does not exist. Please apply migration 003_account_identity.sql to your Supabase database.",
        migrationFile: "supabase/migrations/003_account_identity.sql",
        hint: "Run the migration via Supabase SQL Editor or use: supabase db push",
      });
    }

    // Check if the error is due to foreign key constraint violation
    if (
      upsertMetadataError.message?.includes("foreign key constraint") ||
      upsertMetadataError.message?.includes("account_metadata_account_id_fkey")
    ) {
      console.error(
        "[account/state-sync] foreign key constraint violation - account does not exist",
        {
          accountId,
          error: upsertMetadataError.message,
        },
      );
      // Try to ensure the account exists one more time
      await ensureAccountRow(accountId);
      
      // Retry the upsert after ensuring the account exists
      const { error: retryUpsertError } = await supabaseServer
        .from("account_metadata" as any)
        .upsert(
          {
            account_id: accountId,
            quiz_state: nextQuizState,
            last_synced_at: new Date().toISOString(),
          } as any,
          { onConflict: "account_id" },
        );

      if (retryUpsertError) {
        console.error(
          "[account/state-sync] error upserting account_metadata after retry",
          retryUpsertError,
        );
        return res.status(500).json({
          error: "Failed to sync state",
          details:
            "Account does not exist in the accounts table. Please refresh your session and try again.",
        });
      }
    } else {
      console.error(
        "[account/state-sync] error upserting account_metadata",
        upsertMetadataError,
      );
      return res.status(500).json({
        error: "Failed to sync state",
        details: upsertMetadataError.message,
      });
    }
  }

  return res.status(200).json({ synced });
}
