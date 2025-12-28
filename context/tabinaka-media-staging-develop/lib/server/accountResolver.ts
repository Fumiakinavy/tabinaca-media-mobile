/**
 * Unified account ID resolution helper
 *
 * Unified function to resolve account_id from request.
 * 1. Try to get from Cookie
 * 2. Get Supabase user from Authorization header and resolve from account_linkages
 */

import type { NextApiRequest, NextApiResponse } from "next";
import { supabaseServer } from "@/lib/supabaseServer";
import {
  verifyAccountToken,
  signAccountToken,
  buildAccountCookie,
  ACCOUNT_ID_COOKIE,
  ACCOUNT_TOKEN_COOKIE,
  ACCOUNT_TOKEN_TTL_MS,
  createAccountId,
  isUuid,
} from "@/lib/accountToken";

export type ResolvedAccount = {
  accountId: string;
  supabaseUserId: string | null;
};

const getHeaderValue = (value?: string | string[]) =>
  Array.isArray(value) ? value[0] : value;

const ENSURED_ACCOUNT_TTL_MS = 60 * 60 * 1000;
const ensuredAccounts = new Map<string, number>();
const ensureAccountInFlight = new Map<string, Promise<void>>();

/**
 * Unified function to resolve account_id from request
 *
 * @param req Next.js API request
 * @param res Next.js API response (optional, needed when setting cookies)
 * @param setCookie Whether to set cookie (default: false)
 * @returns Resolved account information, or null (unauthenticated)
 */
export async function resolveAccountId(
  req: NextApiRequest,
  res?: NextApiResponse,
  setCookie = false,
): Promise<ResolvedAccount | null> {
  // 1. Try to get from Cookie
  const accountIdCookieRaw = req.cookies[ACCOUNT_ID_COOKIE];
  const accountIdCookie =
    accountIdCookieRaw && isUuid(accountIdCookieRaw)
      ? accountIdCookieRaw
      : null;
  const accountTokenCookie = req.cookies[ACCOUNT_TOKEN_COOKIE];

  let verifiedCookieSession: ReturnType<typeof verifyAccountToken> | null =
    null;
  if (accountIdCookie && accountTokenCookie) {
    try {
      verifiedCookieSession = verifyAccountToken(accountTokenCookie);
    } catch (error) {
      console.error("[accountResolver] Failed to verify account token", error);
    }
  }

  if (
    accountIdCookie &&
    accountTokenCookie &&
    verifiedCookieSession &&
    verifiedCookieSession.accountId === accountIdCookie
  ) {
    // Also try to get Supabase user ID (optional)
    try {
      const { data: linkage, error } = await supabaseServer
        .from("account_linkages")
        .select("supabase_user_id")
        .eq("account_id", accountIdCookie)
        .maybeSingle<{ supabase_user_id: string | null }>();

      if (error) {
        throw error;
      }

      await ensureAccountRow(accountIdCookie);

      return {
        accountId: accountIdCookie,
        supabaseUserId: linkage?.supabase_user_id ?? null,
      };
    } catch (error) {
      // If account_linkages table doesn't exist, etc., return only accountId
      console.warn(
        "[accountResolver] Failed to fetch linkage, returning accountId only",
        error,
      );
      await ensureAccountRow(accountIdCookie);
      return {
        accountId: accountIdCookie,
        supabaseUserId: null,
      };
    }
  }

  // 2. Resolve from Authorization header
  const authHeader = getHeaderValue(
    req.headers.authorization ?? req.headers.Authorization,
  );
  if (
    typeof authHeader === "string" &&
    authHeader.toLowerCase().startsWith("bearer ")
  ) {
    const accessToken = authHeader.slice(7).trim();
    if (accessToken) {
      try {
        const { data, error } = await supabaseServer.auth.getUser(accessToken);
        if (!error && data?.user) {
          const { data: linkage, error: linkageError } = await supabaseServer
            .from("account_linkages")
            .select("account_id")
            .eq("supabase_user_id", data.user.id)
            .order("linked_at", { ascending: false })
            .limit(1)
            .maybeSingle<{ account_id: string }>();

          if (linkageError) {
            throw linkageError;
          }

          let accountId = linkage?.account_id ?? null;

          if (!accountId) {
            const candidateAccountId =
              verifiedCookieSession?.accountId === accountIdCookie
                ? accountIdCookie
                : createAccountId();

            try {
              const { data: upserted, error: upsertError } =
                await supabaseServer
                  .from("account_linkages" as any)
                  .upsert(
                    {
                      account_id: candidateAccountId,
                      supabase_user_id: data.user.id,
                      linked_at: new Date().toISOString(),
                    } as any,
                    { onConflict: "supabase_user_id" },
                  )
                  .select("account_id")
                  .maybeSingle<{ account_id: string }>();

              if (upsertError) {
                const code = (
                  upsertError as { code?: string; message?: string }
                ).code;
                const message =
                  (upsertError as { message?: string }).message ?? "";
                if (
                  code === "PGRST205" ||
                  message.includes("account_linkages")
                ) {
                  console.warn(
                    "[accountResolver] account_linkages table not available, fallback cannot proceed",
                    upsertError,
                  );
                  return null;
                }
                throw upsertError;
              }

              const newAccountId = upserted?.account_id ?? candidateAccountId;
              accountId = newAccountId ?? null;
            } catch (error) {
              console.error(
                "[accountResolver] Failed to create linkage fallback",
                error,
              );
              return null;
            }
          }

          if (accountId) {
            await ensureAccountRow(accountId);

            const result = {
              accountId,
              supabaseUserId: data.user.id,
            };

            if (setCookie && res) {
              const token = signAccountToken(accountId);
              const ttlSeconds = Math.floor(ACCOUNT_TOKEN_TTL_MS / 1000);
              res.setHeader("Set-Cookie", [
                buildAccountCookie(ACCOUNT_ID_COOKIE, accountId, ttlSeconds),
                buildAccountCookie(
                  ACCOUNT_TOKEN_COOKIE,
                  token.token,
                  ttlSeconds,
                ),
              ]);
            }

            return result;
          }
        }
      } catch (error) {
        console.error(
          "[accountResolver] Failed to resolve from auth header",
          error,
        );
      }
    }
  }

  return null;
}

/**
 * Simplified version when only account_id is needed
 *
 * @param req Next.js API request
 * @param res Next.js API response (optional)
 * @param setCookie Whether to set cookie (default: false)
 * @returns account_id, or null
 */
export async function resolveAccountIdOnly(
  req: NextApiRequest,
  res?: NextApiResponse,
  setCookie = false,
): Promise<string | null> {
  const resolved = await resolveAccountId(req, res, setCookie);
  return resolved?.accountId ?? null;
}

export async function ensureAccountRow(accountId: string) {
  if (!accountId) {
    return;
  }

  const now = Date.now();
  const lastEnsuredAt = ensuredAccounts.get(accountId);
  if (lastEnsuredAt && now - lastEnsuredAt < ENSURED_ACCOUNT_TTL_MS) {
    return;
  }

  const inFlight = ensureAccountInFlight.get(accountId);
  if (inFlight) {
    await inFlight;
    return;
  }

  const run = (async () => {
    try {
      const { error } = await supabaseServer
        .from("accounts" as any)
        .upsert({ id: accountId } as any, { onConflict: "id" });

      if (error) {
        if (
          error.code === "PGRST205" ||
          error.message?.includes("relation") ||
          error.message?.includes("does not exist")
        ) {
          console.warn(
            "[accountResolver] accounts table not available, skipping ensureAccountRow",
          );
          return;
        }

        console.warn("[accountResolver] Failed to upsert accounts row", error);
        return;
      }

      ensuredAccounts.set(accountId, now);
      if (ensuredAccounts.size > 5000) {
        const entries = Array.from(ensuredAccounts.entries()).sort(
          (a, b) => a[1] - b[1],
        );
        for (const [key] of entries.slice(0, 1000)) {
          ensuredAccounts.delete(key);
        }
      }
    } catch (error) {
      console.warn(
        "[accountResolver] Unexpected error while ensuring accounts row",
        error,
      );
    } finally {
      ensureAccountInFlight.delete(accountId);
    }
  })();

  ensureAccountInFlight.set(accountId, run);
  await run;
}
