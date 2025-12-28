import { getEnvVarSafe } from "@/lib/env";

interface UserSignupNotificationContext {
  accountId: string;
  supabaseUserId: string;
  email?: string | null;
  fullName?: string | null;
  avatarUrl?: string | null;
  provider?: string | null;
  createdAt?: string | null;
  lastSignInAt?: string | null;
}

export async function sendSlackUserSignupNotification(
  context: UserSignupNotificationContext,
): Promise<void> {
  const webhookUrl = getEnvVarSafe("SLACK_USER_SIGNUP_WEBHOOK_URL", "");

  if (!webhookUrl) {
    if (process.env.NODE_ENV !== "production") {
      console.log(
        "[Slack] SLACK_USER_SIGNUP_WEBHOOK_URL not configured. Skipping signup notification.",
      );
    }
    return;
  }

  const providerLabel = context.provider ? context.provider : "unknown";
  const fullNameDisplay =
    context.fullName && context.fullName.trim().length > 0
      ? context.fullName
      : "N/A";

  const textLines = [
    ":tada: *New Google signup detected!*",
    `• Email: ${context.email ?? "N/A"}`,
    `• Name: ${fullNameDisplay}`,
    `• Provider: ${providerLabel}`,
    `• Account ID: ${context.accountId}`,
    `• Supabase User ID: ${context.supabaseUserId}`,
    `• Created At: ${context.createdAt ?? "N/A"}`,
    `• Last Sign In: ${context.lastSignInAt ?? "N/A"}`,
  ];

  const body: Record<string, any> = {
    text: textLines.join("\n"),
  };

  if (context.avatarUrl) {
    body.blocks = [
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: textLines.join("\n"),
        },
        accessory: {
          type: "image",
          image_url: context.avatarUrl,
          alt_text: "User avatar",
        },
      },
    ];
  }

  try {
    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(
        "[Slack] Failed to send signup notification",
        response.status,
        errorText,
      );
    }
  } catch (error) {
    console.error("[Slack] Signup webhook error:", error);
  }
}

interface FormSubmissionContext {
  recordId?: string | number | null;
  experienceSlug: string;
  experienceTitle: string;
  mode: string;
  isShibuyaPassActivity: boolean;
  couponCode?: string | null;
  // user
  firstName?: string | null;
  lastName?: string | null;
  email: string;
  phoneNumber: string;
  agreeToTerms: boolean;
  nationality?: string | null;
  ageGroup?: string | null;
  visitPurpose?: string[] | null;
  stayDuration?: string | null;
  travelIssues?: string | null;
  howDidYouFind?: string | null;
  howDidYouFindOther?: string | null;
  // request meta
  ipAddress?: string | string[] | null;
  userAgent?: string | null;
  referrer?: string | null;
  // delivery status
  emailStatus: "success" | "failed";
  emailErrorMessage?: string;
}

export async function sendSlackFormSubmission(
  context: FormSubmissionContext,
): Promise<void> {
  const webhookUrl = getEnvVarSafe("SLACK_WEBHOOK_URL", "");

  // デバッグ情報の出力
  console.log("[Slack] Attempting to send notification...");
  console.log("[Slack] Environment:", {
    NODE_ENV: process.env.NODE_ENV,
    hasWebhookUrl: !!webhookUrl,
    webhookUrlLength: webhookUrl ? webhookUrl.length : 0,
  });

  if (!webhookUrl) {
    console.warn(
      "[Slack] SLACK_WEBHOOK_URL not configured. Skipping notification.",
    );
    return;
  }

  const botUsername = getEnvVarSafe("SLACK_BOT_USERNAME", "Gappy 通知ボット");
  const botIconEmoji = getEnvVarSafe("SLACK_ICON_EMOJI", ":bell:");

  console.log("[Slack] Bot configuration:", { botUsername, botIconEmoji });

  const title = context.isShibuyaPassActivity ? "渋谷パス登録" : "クーポン登録";
  const emailStatusEmoji =
    context.emailStatus === "success" ? ":white_check_mark:" : ":x:";

  const hasFirstName = Boolean(
    context.firstName && context.firstName.trim() !== "",
  );
  const hasLastName = Boolean(
    context.lastName && context.lastName.trim() !== "",
  );
  const hasName = hasFirstName || hasLastName;
  const fullName = [context.firstName, context.lastName]
    .filter(Boolean)
    .join(" ");
  const visitPurposeText =
    Array.isArray(context.visitPurpose) && context.visitPurpose.length > 0
      ? context.visitPurpose.join(", ")
      : "-";

  const userFields: any[] = [
    ...(hasName ? [{ type: "mrkdwn", text: `*氏名:*\n${fullName}` }] : []),
    { type: "mrkdwn", text: `*メールアドレス:*\n${context.email}` },
    { type: "mrkdwn", text: `*電話番号:*\n${context.phoneNumber}` },
  ];

  if (context.agreeToTerms) {
    userFields.push({ type: "mrkdwn", text: `*規約同意:*\nはい` });
  }
  if (context.nationality && String(context.nationality).trim() !== "") {
    userFields.push({
      type: "mrkdwn",
      text: `*国籍:*\n${context.nationality}`,
    });
  }
  if (context.ageGroup && String(context.ageGroup).trim() !== "") {
    userFields.push({ type: "mrkdwn", text: `*年齢層:*\n${context.ageGroup}` });
  }

  const detailFields: any[] = [];
  if (Array.isArray(context.visitPurpose) && context.visitPurpose.length > 0) {
    detailFields.push({
      type: "mrkdwn",
      text: `*訪問目的:*\n${visitPurposeText}`,
    });
  }
  if (context.stayDuration && String(context.stayDuration).trim() !== "") {
    detailFields.push({
      type: "mrkdwn",
      text: `*滞在期間:*\n${context.stayDuration}`,
    });
  }
  if (context.travelIssues && String(context.travelIssues).trim() !== "") {
    detailFields.push({
      type: "mrkdwn",
      text: `*旅行の困りごと:*\n${context.travelIssues}`,
    });
  }
  if (
    (context.howDidYouFind && String(context.howDidYouFind).trim() !== "") ||
    (context.howDidYouFindOther &&
      String(context.howDidYouFindOther).trim() !== "")
  ) {
    detailFields.push({
      type: "mrkdwn",
      text: `*流入経路:*\n${context.howDidYouFind || ""}${context.howDidYouFindOther ? ` / ${context.howDidYouFindOther}` : ""}`,
    });
  }

  const blocks: any[] = [
    {
      type: "header",
      text: {
        type: "plain_text",
        text: `新規フォーム送信 — ${title}`,
        emoji: true,
      },
    },
    {
      type: "section",
      fields: [
        { type: "mrkdwn", text: `*体験名:*\n${context.experienceTitle}` },
        {
          type: "mrkdwn",
          text: `*メール配信:*\n${emailStatusEmoji} ${context.emailStatus === "success" ? "成功" : "失敗"}`,
        },
      ],
    },
    { type: "divider" },
    { type: "section", fields: userFields },
    ...(detailFields.length > 0
      ? [
          {
            type: "section",
            fields: detailFields,
          },
        ]
      : []),
    ...(context.couponCode
      ? [
          { type: "divider" },
          {
            type: "section",
            fields: [
              {
                type: "mrkdwn",
                text: `*クーポンコード:*\n${context.couponCode}`,
              },
            ],
          },
        ]
      : []),
  ];

  const body: Record<string, any> = {
    username: botUsername,
    icon_emoji: botIconEmoji,
    text: hasName
      ? `${title}: ${context.experienceTitle} — ${fullName} (${context.email})`
      : `${title}: ${context.experienceTitle} — ${context.email}`,
    blocks,
  };

  console.log("[Slack] Sending notification with payload:", {
    webhookUrl: webhookUrl.substring(0, 20) + "...",
    experienceTitle: context.experienceTitle,
    email: context.email,
    timestamp: new Date().toISOString(),
  });

  try {
    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (response.ok) {
      console.log(
        "[Slack] Notification sent successfully. Status:",
        response.status,
      );
    } else {
      const errorText = await response.text();
      console.error(
        "[Slack] Notification failed. Status:",
        response.status,
        "Response:",
        errorText,
      );
    }
  } catch (err) {
    // Slack通知失敗はアプリのフローを阻害しない
    console.error("[Slack] Webhook error:", err);
  }
}

interface FormSubmissionContext {
  recordId?: string | number | null;
  experienceSlug: string;
  experienceTitle: string;
  mode: string;
  isShibuyaPassActivity: boolean;
  couponCode?: string | null;
  // user
  firstName?: string | null;
  lastName?: string | null;
  email: string;
  phoneNumber: string;
  agreeToTerms: boolean;
  nationality?: string | null;
  ageGroup?: string | null;
  visitPurpose?: string[] | null;
  stayDuration?: string | null;
  travelIssues?: string | null;
  howDidYouFind?: string | null;
  howDidYouFindOther?: string | null;
  // request meta
  ipAddress?: string | string[] | null;
  userAgent?: string | null;
  referrer?: string | null;
  // delivery status
  emailStatus: "success" | "failed";
  emailErrorMessage?: string;
}

export async function クーポンフォームの通知(
  context: FormSubmissionContext,
): Promise<void> {
  const webhookUrl = getEnvVarSafe("SLACK_WEBHOOK_URL", "");
  if (!webhookUrl) return; // Slack未設定時は何もしない

  const title = context.isShibuyaPassActivity
    ? "Shibuya Pass Registration"
    : "Coupon Registration";
  const emailStatusEmoji =
    context.emailStatus === "success" ? ":white_check_mark:" : ":x:";

  const fullName =
    [context.firstName, context.lastName].filter(Boolean).join(" ") ||
    context.email;
  const visitPurposeText =
    Array.isArray(context.visitPurpose) && context.visitPurpose.length > 0
      ? context.visitPurpose.join(", ")
      : "-";

  const blocks: any[] = [
    {
      type: "header",
      text: {
        type: "plain_text",
        text: `New Form Submission — ${title}`,
        emoji: true,
      },
    },
    {
      type: "section",
      fields: [
        {
          type: "mrkdwn",
          text: `*Experience:*
${context.experienceTitle}`,
        },
        {
          type: "mrkdwn",
          text: `*Slug:*
${context.experienceSlug}`,
        },
        {
          type: "mrkdwn",
          text: `*Mode:*
${context.mode}`,
        },
        {
          type: "mrkdwn",
          text: `*DB Record ID:*
${context.recordId ?? "-"}`,
        },
      ],
    },
    { type: "divider" },
    {
      type: "section",
      fields: [
        {
          type: "mrkdwn",
          text: `*Name:*
${fullName}`,
        },
        {
          type: "mrkdwn",
          text: `*Email:*
${context.email}`,
        },
        {
          type: "mrkdwn",
          text: `*Phone:*
${context.phoneNumber}`,
        },
        {
          type: "mrkdwn",
          text: `*Agree To Terms:*
${context.agreeToTerms ? "Yes" : "No"}`,
        },
        {
          type: "mrkdwn",
          text: `*Nationality:*
${context.nationality || "-"}`,
        },
        {
          type: "mrkdwn",
          text: `*Age Group:*
${context.ageGroup || "-"}`,
        },
      ],
    },
    {
      type: "section",
      fields: [
        {
          type: "mrkdwn",
          text: `*Visit Purpose:*
${visitPurposeText}`,
        },
        {
          type: "mrkdwn",
          text: `*Stay Duration:*
${context.stayDuration || "-"}`,
        },
        {
          type: "mrkdwn",
          text: `*Travel Issues:*
${context.travelIssues || "-"}`,
        },
        {
          type: "mrkdwn",
          text: `*How Did You Find:*
${context.howDidYouFind || "-"}${context.howDidYouFindOther ? ` / ${context.howDidYouFindOther}` : ""}`,
        },
      ],
    },
    ...(context.couponCode
      ? [
          { type: "divider" },
          {
            type: "section",
            fields: [
              {
                type: "mrkdwn",
                text: `*Coupon Code:*
${context.couponCode}`,
              },
            ],
          },
        ]
      : []),
    { type: "divider" },
    {
      type: "section",
      fields: [
        {
          type: "mrkdwn",
          text: `*Email Delivery:*
${emailStatusEmoji} ${context.emailStatus}`,
        },
        ...(context.emailStatus === "failed" && context.emailErrorMessage
          ? [
              {
                type: "mrkdwn",
                text: `*Email Error:*
${context.emailErrorMessage}`,
              },
            ]
          : []),
      ],
    },
    {
      type: "context",
      elements: [
        { type: "mrkdwn", text: `IP: ${String(context.ipAddress ?? "-")}` },
        { type: "mrkdwn", text: `UA: ${context.userAgent || "-"}` },
        { type: "mrkdwn", text: `Referrer: ${context.referrer || "-"}` },
        {
          type: "mrkdwn",
          text: `Time: ${new Date().toLocaleString("ja-JP", { timeZone: "Asia/Tokyo" })}`,
        },
      ],
    },
  ];

  const body = {
    text: `${title}: ${context.experienceTitle} — ${fullName} (${context.email})`,
    blocks,
  };

  try {
    await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  } catch (err) {
    // Slack通知失敗はアプリのフローを阻害しない
    console.error("Slack webhook error:", err);
  }
}
