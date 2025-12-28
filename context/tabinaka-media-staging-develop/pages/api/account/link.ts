import type { NextApiRequest, NextApiResponse } from "next";
import { supabaseServer } from "@/lib/supabaseServer";
import {
  ACCOUNT_ID_COOKIE,
  ACCOUNT_TOKEN_COOKIE,
  ACCOUNT_TOKEN_TTL_MS,
  signAccountToken,
  verifyAccountToken,
  buildAccountCookie,
  createAccountId,
} from "@/lib/accountToken";
import {
  serializeSupabaseAuthCookie,
  serializeSupabaseAuthCookieRemoval,
} from "@/lib/server/supabaseCookies";
import { sendSlackUserSignupNotification } from "@/lib/slack";
import { handleCorsPreflightRequest, setCorsHeaders } from "@/lib/cors";

const secureCookieFlag = process.env.NODE_ENV === "production";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  // CORS: プリフライトリクエストを処理
  if (handleCorsPreflightRequest(req, res)) {
    return;
  }
  // 通常リクエストにもCORSヘッダーを設定
  setCorsHeaders(req, res);

  if (req.method === "DELETE") {
    const removalCookie = serializeSupabaseAuthCookieRemoval(secureCookieFlag);
    if (removalCookie) {
      res.setHeader("Set-Cookie", removalCookie);
    }
    return res.status(204).end();
  }

  if (req.method !== "POST") {
    res.setHeader("Allow", ["POST", "DELETE"]);
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  try {
    const accountTokenRaw = req.cookies[ACCOUNT_TOKEN_COOKIE];
    const accountIdCookie = req.cookies[ACCOUNT_ID_COOKIE];
    const session = verifyAccountToken(accountTokenRaw);
    if (!session || session.accountId !== accountIdCookie) {
      return res.status(401).json({ error: "Invalid account session" });
    }

    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ error: "Authorization header missing" });
    }
    const accessToken = authHeader.replace("Bearer ", "").trim();
    const { data: userData, error: userError } =
      await supabaseServer.auth.getUser(accessToken);
    if (userError || !userData.user) {
      return res.status(401).json({ error: "Invalid Supabase session" });
    }

    const supabaseUser = userData.user;
    const now = new Date().toISOString();
    const cookiesToSet: string[] = [];
    const TOKEN_TTL_SECONDS = Math.floor(ACCOUNT_TOKEN_TTL_MS / 1000);
    const isMissingTableError = (error: { code?: string; message?: string }) =>
      error?.code === "PGRST205" ||
      error?.message?.includes("Could not find the table");

    const appendSupabaseAuthCookie = async (accountIdForCookie: string) => {
      const cookie = await serializeSupabaseAuthCookie({
        accountId: accountIdForCookie,
        supabaseUserId: supabaseUser.id,
        secure: secureCookieFlag,
      });
      if (cookie) {
        cookiesToSet.push(cookie);
      }
    };

    const { data: existingLinkByUser, error: existingLinkError } =
      await supabaseServer
        .from("account_linkages")
        .select("account_id")
        .eq("supabase_user_id", supabaseUser.id)
        .maybeSingle<{ account_id: string }>();

    if (existingLinkError) {
      console.error(
        "[account/link] failed to lookup existing linkage",
        existingLinkError,
      );
      return res.status(500).json({
        error: "Failed to link account",
        details: existingLinkError.message,
      });
    }

    const isFirstTimeSupabaseUser = !existingLinkByUser;
    let targetAccountId = session.accountId;
    let accountIdChanged = false;
    if (
      existingLinkByUser?.account_id &&
      existingLinkByUser.account_id !== session.accountId
    ) {
      targetAccountId = existingLinkByUser.account_id;
      accountIdChanged = true;
    } else if (existingLinkByUser?.account_id) {
      targetAccountId = existingLinkByUser.account_id;
    }

    const { data: existingLinkByAccount, error: existingLinkByAccountError } =
      await supabaseServer
        .from("account_linkages")
        .select("account_id, supabase_user_id")
        .eq("account_id", targetAccountId)
        .maybeSingle<{ account_id: string; supabase_user_id: string }>();

    if (existingLinkByAccountError) {
      console.error(
        "[account/link] failed to lookup account linkage",
        existingLinkByAccountError,
      );
      return res.status(500).json({
        error: "Failed to link account",
        details: existingLinkByAccountError.message,
      });
    }

    if (
      existingLinkByAccount?.supabase_user_id &&
      existingLinkByAccount.supabase_user_id !== supabaseUser.id
    ) {
      // 既存のブラウザセッションが別ユーザーにリンクされた account_id を保持している場合は、
      // 新しい account_id を払い出してクリーンに紐付け直す（セッション共有を防ぐ）。
      console.warn(
        "[account/link] conflicting linkage detected, issuing new account",
        {
          staleAccountId: targetAccountId,
          existingSupabaseUserId: existingLinkByAccount.supabase_user_id,
          requestedSupabaseUserId: supabaseUser.id,
        },
      );

      const newAccountId = createAccountId();
      const newToken = signAccountToken(newAccountId);
      cookiesToSet.push(
        buildAccountCookie(ACCOUNT_ID_COOKIE, newAccountId, TOKEN_TTL_SECONDS),
        buildAccountCookie(
          ACCOUNT_TOKEN_COOKIE,
          newToken.token,
          TOKEN_TTL_SECONDS,
        ),
      );

      const { error: insertError } = await supabaseServer
        .from("account_linkages" as any)
        .upsert(
          {
            account_id: newAccountId,
            supabase_user_id: supabaseUser.id,
            linked_at: now,
          } as any,
          { onConflict: "supabase_user_id" },
        );

      if (insertError) {
        console.error(
          "[account/link] insert error (new account after conflict)",
          insertError,
        );
        if (!isMissingTableError(insertError)) {
          return res.status(500).json({
            error: "Failed to link account",
            details: insertError.message,
          });
        }
        console.warn(
          "[account/link] account_linkages table missing while resolving conflict. Migration 003_account_identity.sql needs to be applied.",
        );
      }

      await appendSupabaseAuthCookie(newAccountId);

      if (cookiesToSet.length > 0) {
        res.setHeader("Set-Cookie", cookiesToSet);
      }

      return res
        .status(200)
        .json({ linked: true, accountId: newAccountId, recreated: true });
    }

    if (existingLinkByAccount) {
      const query = supabaseServer.from("account_linkages" as any) as any;
      const { error: updateError } = await query
        .update({
          supabase_user_id: supabaseUser.id,
          linked_at: now,
        } as any)
        .eq("account_id", targetAccountId);

      if (updateError) {
        console.error("[account/link] update error", updateError);
        if (isMissingTableError(updateError)) {
          console.warn(
            "[account/link] account_linkages table does not exist. Migration 003_account_identity.sql needs to be applied.",
          );
          await appendSupabaseAuthCookie(targetAccountId);
          if (cookiesToSet.length > 0) {
            res.setHeader("Set-Cookie", cookiesToSet);
          }
          return res.status(200).json({
            linked: true,
            warning:
              "Database migration not applied. Please apply migration 003_account_identity.sql for full functionality.",
          });
        }
        return res.status(500).json({
          error: "Failed to link account",
          details: updateError.message,
        });
      }
    } else {
      const { error: insertError } = await supabaseServer
        .from("account_linkages" as any)
        .upsert(
          {
            account_id: targetAccountId,
            supabase_user_id: supabaseUser.id,
            linked_at: now,
          } as any,
          { onConflict: "supabase_user_id" },
        );

      if (insertError) {
        console.error("[account/link] insert error", insertError);
        if (isMissingTableError(insertError)) {
          console.warn(
            "[account/link] account_linkages table does not exist. Migration 003_account_identity.sql needs to be applied.",
          );
          await appendSupabaseAuthCookie(targetAccountId);
          if (cookiesToSet.length > 0) {
            res.setHeader("Set-Cookie", cookiesToSet);
          }
          return res.status(200).json({
            linked: true,
            warning:
              "Database migration not applied. Please apply migration 003_account_identity.sql for full functionality.",
          });
        }
        return res.status(500).json({
          error: "Failed to link account",
          details: insertError.message,
        });
      }
    }

    if (accountIdChanged) {
      const tokenRecord = signAccountToken(targetAccountId);
      cookiesToSet.push(
        buildAccountCookie(
          ACCOUNT_ID_COOKIE,
          targetAccountId,
          TOKEN_TTL_SECONDS,
        ),
        buildAccountCookie(
          ACCOUNT_TOKEN_COOKIE,
          tokenRecord.token,
          TOKEN_TTL_SECONDS,
        ),
      );
    }

    // Best-effort: sync Supabase user profile info into accounts.profile
    try {
      const { data: currentAccount } = await (supabaseServer
        .from("accounts" as any) as any)
        .select("profile")
        .eq("id", targetAccountId)
        .maybeSingle();

      const currentProfile = (currentAccount?.profile as Record<string, any>) || {};
      const userMetadata = supabaseUser.user_metadata ?? {};
      const mergedProfile = {
        ...currentProfile,
        email: supabaseUser.email ?? currentProfile.email,
        display_name:
          userMetadata.full_name ??
          userMetadata.name ??
          currentProfile.display_name,
        avatarUrl:
          userMetadata.avatar_url ??
          userMetadata.picture ??
          currentProfile.avatarUrl,
        provider: (supabaseUser.app_metadata?.provider as string | undefined) ??
          currentProfile.provider,
        lastSignInAt: supabaseUser.last_sign_in_at ?? currentProfile.lastSignInAt,
        createdAt: supabaseUser.created_at ?? currentProfile.createdAt,
        updatedAt: now,
      };

      await (supabaseServer.from("accounts" as any) as any)
        .update({ profile: mergedProfile })
        .eq("id", targetAccountId);
    } catch (error) {
      console.warn("[account/link] Failed to sync account profile", error);
    }

    await appendSupabaseAuthCookie(targetAccountId);

    if (cookiesToSet.length > 0) {
      res.setHeader("Set-Cookie", cookiesToSet);
    }

    const provider =
      (supabaseUser.app_metadata?.provider as string | undefined) ?? "unknown";
    if (isFirstTimeSupabaseUser && provider === "google") {
      const userMetadata = supabaseUser.user_metadata ?? {};
      sendSlackUserSignupNotification({
        accountId: targetAccountId,
        supabaseUserId: supabaseUser.id,
        email: supabaseUser.email,
        fullName:
          (userMetadata.full_name as string) ||
          (userMetadata.name as string) ||
          null,
        avatarUrl: (userMetadata.avatar_url as string) || null,
        provider,
        createdAt: supabaseUser.created_at,
        lastSignInAt: supabaseUser.last_sign_in_at,
      }).catch((notifyError) => {
        console.error(
          "[account/link] Failed to send Slack signup notification",
          notifyError,
        );
      });
    }

    return res.status(200).json({ linked: true, accountId: targetAccountId });
  } catch (error) {
    console.error("[account/link] unexpected error", error);
    return res.status(500).json({ error: "Unexpected error" });
  }
}
