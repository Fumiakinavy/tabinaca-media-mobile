import { NextApiRequest, NextApiResponse } from "next";
import { supabaseServer } from "@/lib/supabaseServer";
import { ApiResponse, FormSubmission } from "@/types/experiences-db";
import { generateEmailQRCode } from "@/lib/qrCodeGenerator";
import sgMail from "@sendgrid/mail";
import { getEnvVar } from "@/lib/env";
import { experienceEmailTemplates } from "@/lib/emailTemplates/experiences";
import { getExperienceActivityType } from "@/config/experienceSettings";

// Edge RuntimeはSendGridと互換性がないため削除
// export const runtime = 'edge';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ApiResponse<FormSubmission>>,
) {
  if (req.method !== "POST") {
    return res.status(405).json({
      success: false,
      message: "Method not allowed",
    });
  }

  try {
    const {
      experience_slug,
      experience_title,
      email,
      phone_number,
      first_name,
      last_name,
      country,
      nationality,
      age_group,
      visit_purposes,
      stay_duration,
      travel_issues,
      how_found,
      how_found_other,
    }: FormSubmission = req.body;

    console.log("  - Experience Slug:", experience_slug);

    // 必須フィールドのバリデーション
    if (!experience_slug || !experience_title || !email) {
      return res.status(400).json({
        success: false,
        message:
          "Missing required fields: experience_slug, experience_title, email",
      });
    }

    // メールアドレスの形式チェック
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        message: "Invalid email format",
      });
    }

    // アクティビティの存在確認
    console.log("🔍 Querying activities table...");
    const { data: activity, error: expError } = await supabaseServer
      .from("activities" as any)
      .select("id, slug, is_active")
      .eq("slug", experience_slug)
      .eq("is_active", true)
      .single<{ id: string; slug: string; is_active: boolean }>();

    console.log("🔍 Activity Query Result:", {
      data: activity,
      error: expError,
      errorCode: expError?.code,
      errorMessage: expError?.message,
    });

    if (expError || !activity) {
      // より詳細なエラー情報を提供
      let errorMessage = "Activity not found or inactive";
      if (expError?.code === "PGRST116") {
        errorMessage = "Schema not exposed or table not found";
      } else if (expError?.message?.includes("permission denied")) {
        errorMessage = "Permission denied - check RLS policies";
      } else if (
        expError?.message?.includes("relation") &&
        expError?.message?.includes("does not exist")
      ) {
        errorMessage = "Table does not exist in current schema";
      }

      return res.status(404).json({
        success: false,
        message: errorMessage,
        debug: {
          errorCode: expError?.code,
          errorMessage: expError?.message,
          schema: "public (branch-based)",
        },
      });
    }

    // フォーム送信データを挿入
    // age_groupがnullの場合はフィールドを除外（チェック制約回避）
    const insertData: any = {
      activity_id: activity.id,
      experience_slug,
      experience_title,
      email,
      phone_number,
      first_name,
      last_name,
      country,
      nationality,
      visit_purposes: visit_purposes || [],
      stay_duration,
      travel_issues,
      how_found,
      how_found_other,
      ip_address:
        req.headers["x-forwarded-for"] || req.connection.remoteAddress,
      user_agent: req.headers["user-agent"],
      referrer: req.headers.referer,
      mode: "unified",
      agree_to_terms: true,
    };

    // age_groupが有効な値の場合のみ追加
    if (age_group && age_group.trim() !== "") {
      insertData.age_group = age_group;
    }

    const { data, error } = (await supabaseServer
      .from("form_submissions" as any)
      .insert(insertData)
      .select()
      .single()) as any;

    if (error) {
      console.error("Database error:", error);
      return res.status(500).json({
        success: false,
        message: "Failed to save form submission",
        error: error.message,
      });
    }

    // QRコード生成
    console.log("🔍 Generating QR code for submission:", data.id);

    try {
      // アクティビティ情報を取得
      const { data: activityData, error: activityError } = (await supabaseServer
        .from("activities" as any)
        .select("*")
        .eq("id", activity.id)
        .single()) as any;

      if (activityError || !activityData) {
        console.error("Activity data error:", activityError);
        // QRコード生成に失敗してもフォーム送信は成功とする
        return res.status(201).json({
          success: true,
          data,
          message: "Form submitted successfully (QR code generation failed)",
          qrCodeGenerated: false,
        });
      }

      // 予約IDを生成（フォーム送信IDをベースに）
      const bookingId = `booking_${data.id.replace(/-/g, "")}`;

      // クーポンコードを生成
      const couponCode = `GAPPY${new Date().getFullYear()}${Math.random().toString(36).substr(2, 6).toUpperCase()}`;

      // ユーザー情報を構築
      const userInfo = {
        name: `${first_name || ""} ${last_name || ""}`.trim() || "Guest",
        email: email,
        phone: phone_number || undefined,
        partySize: 1, // デフォルト値、後で拡張可能
      };

      // アクティビティ情報を構築
      const activityInfo = {
        slug: activityData.slug,
        title: activityData.title,
        duration: activityData.duration_minutes || 60,
        location: activityData.location || "Tokyo, Japan",
      };

      // 予約日を設定（今日から1週間後）
      const bookingDate = new Date();
      bookingDate.setDate(bookingDate.getDate() + 7);

      // アクティビティタイプを取得
      const activityType = getExperienceActivityType(experience_slug);
      console.log("🔍 Activity type:", activityType);

      let qrCodeResult = null;

      // 提携店舗以外のアクティビティでQRコードを生成
      if (activityType !== "partner_store") {
        // QRコード生成
        console.log("🔍 Generating QR code...");
        qrCodeResult = await generateEmailQRCode(
          bookingId,
          couponCode,
          userInfo,
          activityInfo,
          bookingDate,
          {
            size: 300,
            errorCorrectionLevel: "M",
          },
          3, // 最大スキャン回数
        );

        console.log("✅ QR code generated successfully:", {
          bookingId,
          qrUrl: qrCodeResult.qrUrl,
          trackingUrl: qrCodeResult.qrUrl, // トラッキングURLが正しく設定されているか確認
        });

        // form_submissionsテーブルに予約情報を更新
        const updateQuery = supabaseServer.from(
          "form_submissions" as any,
        ) as any;
        const { error: updateError } = await updateQuery
          .update({
            booking_id: bookingId,
            coupon_code: couponCode,
            booking_date: bookingDate.toISOString(),
            status: "confirmed",
            scans_used: 0,
            max_scans: 3,
            party_size: userInfo.partySize,
            user_name: userInfo.name,
            user_email: userInfo.email,
            activity_title: activityInfo.title,
            activity_location: activityInfo.location,
            qr_code_data: JSON.stringify({
              bookingId,
              couponCode,
              user: userInfo,
              activity: activityInfo,
              bookingDate: bookingDate.toISOString(),
              trackingUrl: qrCodeResult.qrUrl,
            }),
          } as any)
          .eq("id", (data as any).id);

        if (updateError) {
          console.error("Booking information update error:", updateError);
          // エラーが発生してもQRコード生成は成功とする
        } else {
          console.log("✅ Booking information saved to form_submissions table");
        }
      } else {
        console.log(
          "⏭️ Skipping QR code generation for partner_store activity",
        );
      }

      // メール送信
      console.log("📧 Sending confirmation email...");

      const sendGridApiKey = process.env.SENDGRID_API_KEY;
      const fromEmail = process.env.SENDGRID_FROM_EMAIL;
      const emailEnabled = Boolean(sendGridApiKey && fromEmail);
      let emailSent = false;
      let emailErrorMessage: string | undefined;

      if (!emailEnabled) {
        console.warn(
          "📧 SendGrid configuration missing. Skipping email delivery.",
          {
            hasApiKey: Boolean(sendGridApiKey),
            hasFromEmail: Boolean(fromEmail),
          },
        );
      } else {
        try {
          sgMail.setApiKey(sendGridApiKey as string);

          // ユーザー名を作成
          const userName =
            `${first_name || ""} ${last_name || ""}`.trim() || "Guest";

          // 一時的に送信者メールアドレスを変更（SendGridの検証済みアドレスを使用）
          const verifiedFromEmail = fromEmail || "yuta@gappy.jp";

          // アクティビティタイプに応じてメール送信ロジックを分岐
          if (activityType === "company_affiliated") {
            // 1. 自社連携: QRコード + 詳細情報
            if (!qrCodeResult) {
              throw new Error("QR code generation failed");
            }

            // 個別テンプレートまたは汎用テンプレート
            const templateKey = activityData.slug || "generic-experience";
            const emailTemplate =
              experienceEmailTemplates[templateKey] ||
              experienceEmailTemplates["generic-experience"];

            console.log(
              "📧 Using email template (company_affiliated):",
              templateKey,
            );

            const qrCodeData = {
              qrUrl: qrCodeResult.qrUrl,
              qrBuffer: qrCodeResult.qrBuffer,
            };

            const { subject, html } = emailTemplate(
              userName,
              couponCode,
              qrCodeData,
            );

            await sgMail.send({
              to: email,
              from: verifiedFromEmail,
              subject: subject,
              html: html,
              attachments: [
                {
                  content: qrCodeResult.qrBuffer.toString("base64"),
                  filename: "qrcode.png",
                  type: "image/png",
                  disposition: "inline",
                  contentId: "qrcode",
                },
              ],
            });

            console.log(
              "✅ Company affiliated email sent successfully to:",
              email,
            );
          } else if (activityType === "shibuya_pass") {
            // 2. Shibuya Pass: 渋谷パスのリンク + 登録完了通知（QRコードなし）
            const emailTemplate = experienceEmailTemplates["shibuya-pass"];

            console.log("📧 Using email template (shibuya_pass): shibuya-pass");

            const { subject, html } = emailTemplate(
              userName,
              activityData.title,
            );

            await sgMail.send({
              to: email,
              from: verifiedFromEmail,
              subject: subject,
              html: html,
            });

            console.log("✅ Shibuya Pass email sent successfully to:", email);
          } else if (activityType === "partner_store") {
            // 3. 提携店舗: 店舗情報のみ（予約不要・QRコード不要）
            const emailTemplate = experienceEmailTemplates["partner-store"];

            console.log(
              "📧 Using email template (partner_store): partner-store",
            );

            // 店舗情報を準備
            const storeInfo = {
              name: activityData.title,
              address: activityData.location || "Tokyo, Japan",
              phone: undefined,
              hours: undefined,
              mapsUrl: activityData.location
                ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(activityData.location)}`
                : undefined,
            };

            const { subject, html } = (emailTemplate as any)(
              userName,
              couponCode,
              activityData.title,
              activityData.duration_minutes || 60,
              storeInfo,
              undefined,
            );

            await sgMail.send({
              to: email,
              from: verifiedFromEmail,
              subject: subject,
              html: html,
            });

            console.log("✅ Partner store email sent successfully to:", email);
          }

          emailSent = true;
        } catch (emailError) {
          console.error("Email sending error:", emailError);
          emailErrorMessage =
            emailError instanceof Error ? emailError.message : "Unknown error";

          if (
            emailError &&
            typeof emailError === "object" &&
            "response" in emailError
          ) {
            const sgError = emailError as any;
            console.error("SendGrid error details:", {
              code: sgError.code,
              body: JSON.stringify(sgError.response?.body, null, 2),
              headers: sgError.response?.headers,
            });

            if (sgError.response?.body?.errors) {
              console.error("SendGrid error messages:");
              sgError.response.body.errors.forEach(
                (error: any, index: number) => {
                  console.error(`  Error ${index + 1}:`, {
                    message: error.message,
                    field: error.field,
                    help: error.help,
                  });
                },
              );
            }
          }
        }
      }

      const responseData: any = {
        ...data,
        bookingId,
        couponCode,
        emailSent,
        emailSkipped: !emailEnabled,
      };

      if (qrCodeResult) {
        responseData.qrUrl = qrCodeResult.qrUrl;
        responseData.qrDataUrl = qrCodeResult.qrDataUrl;
      }

      return res.status(201).json({
        success: true,
        data: responseData,
        message: emailSent
          ? "Detailed information sent successfully!"
          : emailErrorMessage
            ? "Form submitted and QR code generated successfully (email sending failed)"
            : "Form submitted successfully (email delivery skipped)",
        qrCodeGenerated: !!qrCodeResult,
        emailSent,
        emailError: emailErrorMessage,
      });
    } catch (qrError) {
      console.error("QR code generation error:", qrError);
      // QRコード生成に失敗してもフォーム送信は成功とする
      return res.status(201).json({
        success: true,
        data,
        message: "Form submitted successfully (QR code generation failed)",
        qrCodeGenerated: false,
        qrError: qrError instanceof Error ? qrError.message : "Unknown error",
      });
    }
  } catch (error) {
    console.error("API error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
}
