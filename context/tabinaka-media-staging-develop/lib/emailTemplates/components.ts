/**
 * Gappy メールコンポーネント
 * 再利用可能なメールコンポーネント
 */

import {
  emailDesignSystem,
  createEmailStyles,
  experienceIcons,
  experienceThemes,
} from "./designSystem";

export interface ExperienceData {
  title: string;
  description: string;
  imageUrl: string;
  location: {
    name: string;
    address: string;
    phone?: string;
    email?: string;
    mapsUrl: string;
    instagramUrl?: string;
  };
  details: {
    venue?: string;
    duration?: string;
    groupSize?: string;
    language?: string;
    level?: string;
    hours?: string;
    phone?: string;
    email?: string;
  };
  experience?: string[];
  importantInfo?: string[];
  icon?: string;
}

export interface EmailComponents {
  header: (userName: string, experienceTitle: string) => string;
  qrCodeSection: (qrCodeData: { qrUrl: string; qrBuffer: Buffer }) => string;
  couponCodeSection: (couponCode: string) => string;
  experienceImage: (imageUrl: string, title: string) => string;
  experienceDetails: (details: ExperienceData["details"]) => string;
  locationSection: (
    location: ExperienceData["location"],
    icon?: string,
  ) => string;
  experienceList: (experiences: string[]) => string;
  importantInfo: (info: string[]) => string;
  howToUse: () => string;
  footer: () => string;
}

// メールコンポーネントの実装
export const emailComponents: EmailComponents = {
  // ヘッダーコンポーネント
  header: (userName: string, experienceTitle: string) => `
    <div style="${createEmailStyles.header()}">
      <h1 style="color: ${emailDesignSystem.colors.text.inverse}; margin: 0; font-size: ${emailDesignSystem.typography.sizes["3xl"]}; font-weight: ${emailDesignSystem.typography.weights.bold}; letter-spacing: -0.5px;">
        GAPPY
      </h1>
      <p style="color: rgba(255,255,255,0.9); margin: ${emailDesignSystem.spacing.sm} 0 0 0; font-size: ${emailDesignSystem.typography.sizes.base}; font-weight: ${emailDesignSystem.typography.weights.normal};">
        Authentic Japanese Experiences
      </p>
    </div>
    
    <div style="${createEmailStyles.mainContent()}">
      <h2 style="${createEmailStyles.title(2)}">
        Thanks for your booking, ${userName}!
      </h2>
      <p style="${createEmailStyles.text("secondary")}">
        Your ${experienceTitle} is confirmed. Show the QR code below at the venue.
      </p>
    </div>
  `,

  // QRコードセクション
  qrCodeSection: (qrCodeData: { qrUrl: string; qrBuffer: Buffer }) => `
    <div style="${createEmailStyles.section("highlighted")}">
      <h3 style="color: ${emailDesignSystem.colors.primary}; margin: 0 0 ${emailDesignSystem.spacing.lg} 0; font-size: ${emailDesignSystem.typography.sizes.xl}; font-weight: ${emailDesignSystem.typography.weights.semibold}; text-align: center;">
        Your QR Code
      </h3>
      <div style="text-align: center;">
        <div style="background: ${emailDesignSystem.colors.background}; border-radius: ${emailDesignSystem.borderRadius.lg}; padding: ${emailDesignSystem.spacing.lg}; display: inline-block; box-shadow: ${emailDesignSystem.shadows.md};">
          <img src="cid:qrcode" alt="クーポンQRコード" style="max-width: 200px; height: auto;">
        </div>
        <p style="color: ${emailDesignSystem.colors.primary}; margin: ${emailDesignSystem.spacing.md} 0 0 0; font-size: ${emailDesignSystem.typography.sizes.sm}; font-weight: ${emailDesignSystem.typography.weights.medium}; text-align: center;">
          Show this QR code at the venue • Valid for up to 3 scans
        </p>
      </div>
    </div>
  `,

  // クーポンコードセクション
  couponCodeSection: (couponCode: string) => `
    <div style="${createEmailStyles.section("card")}">
      <h3 style="color: ${emailDesignSystem.colors.text.primary}; margin-bottom: ${emailDesignSystem.spacing.sm}; text-align: center;">
        Your Coupon Code
      </h3>
      <div style="text-align: center;">
        <div style="background-color: #fef3c7; padding: ${emailDesignSystem.spacing.md}; border-radius: ${emailDesignSystem.borderRadius.sm}; border: 2px dashed #f59e0b; display: inline-block;">
          <span style="font-size: ${emailDesignSystem.typography.sizes["2xl"]}; font-weight: ${emailDesignSystem.typography.weights.bold}; color: #d97706;">${couponCode}</span>
        </div>
      </div>
    </div>
  `,

  // 体験画像（最適化済み）
  experienceImage: (imageUrl: string, title: string) => `
    <div style="text-align: center; margin: ${emailDesignSystem.spacing.lg} 0;">
      <img src="${imageUrl}" 
           alt="${title}" 
           style="width: 100%; max-width: 300px; height: 180px; object-fit: cover; border-radius: ${emailDesignSystem.borderRadius.md}; box-shadow: ${emailDesignSystem.shadows.sm};">
    </div>
  `,

  // 体験詳細テーブル
  experienceDetails: (details: ExperienceData["details"], mapsUrl?: string) => {
    const rows = [];

    if (details.venue) {
      rows.push(`
        <tr style="${createEmailStyles.tableRow("striped")}">
          <td style="${createEmailStyles.tableCell("header")}">Venue</td>
          <td style="${createEmailStyles.tableCell("data")}">${details.venue}</td>
        </tr>
      `);
    }

    if (details.hours) {
      rows.push(`
        <tr style="${createEmailStyles.tableRow()}>
          <td style="${createEmailStyles.tableCell("header")}">Hours</td>
          <td style="${createEmailStyles.tableCell("data")}">${details.hours}</td>
        </tr>
      `);
    }

    if (details.duration) {
      rows.push(`
        <tr style="${createEmailStyles.tableRow("striped")}">
          <td style="${createEmailStyles.tableCell("header")}">Duration</td>
          <td style="${createEmailStyles.tableCell("data")}">${details.duration}</td>
        </tr>
      `);
    }

    if (details.groupSize) {
      rows.push(`
        <tr style="${createEmailStyles.tableRow()}>
          <td style="${createEmailStyles.tableCell("header")}">Group Size</td>
          <td style="${createEmailStyles.tableCell("data")}">${details.groupSize}</td>
        </tr>
      `);
    }

    if (details.language) {
      rows.push(`
        <tr style="${createEmailStyles.tableRow("striped")}">
          <td style="${createEmailStyles.tableCell("header")}">Language</td>
          <td style="${createEmailStyles.tableCell("data")}">${details.language}</td>
        </tr>
      `);
    }

    if (details.level) {
      rows.push(`
        <tr style="${createEmailStyles.tableRow()}>
          <td style="${createEmailStyles.tableCell("header")}">Level</td>
          <td style="${createEmailStyles.tableCell("data")}">${details.level}</td>
        </tr>
      `);
    }

    if (details.phone) {
      rows.push(`
        <tr style="${createEmailStyles.tableRow("striped")}">
          <td style="${createEmailStyles.tableCell("header")}">Phone</td>
          <td style="${createEmailStyles.tableCell("data")}">${details.phone}</td>
        </tr>
      `);
    }

    if (details.email) {
      rows.push(`
        <tr style="${createEmailStyles.tableRow()}>
          <td style="${createEmailStyles.tableCell("header")}">Email</td>
          <td style="${createEmailStyles.tableCell("data")}">${details.email}</td>
        </tr>
      `);
    }

    // Google Maps URLを追加
    if (mapsUrl) {
      rows.push(`
        <tr style="${createEmailStyles.tableRow("striped")}">
          <td style="${createEmailStyles.tableCell("header")}">Google Maps</td>
          <td style="${createEmailStyles.tableCell("data")}">
            <a href="${mapsUrl}" style="color: ${emailDesignSystem.colors.primary}; text-decoration: none; font-weight: ${emailDesignSystem.typography.weights.medium};">
              View Location on Google Maps
            </a>
          </td>
        </tr>
      `);
    }

    return `
      <div style="${createEmailStyles.section("highlighted")}">
        <h3 style="color: ${emailDesignSystem.colors.primary}; margin: 0 0 ${emailDesignSystem.spacing.xl} 0; font-size: ${emailDesignSystem.typography.sizes.xl}; font-weight: ${emailDesignSystem.typography.weights.bold}; text-align: center; text-transform: uppercase; letter-spacing: 1px;">
          Experience Details
        </h3>
        <table style="${createEmailStyles.table()}">
          ${rows.join("")}
        </table>
      </div>
    `;
  },

  // ロケーションセクション（シンプル化）
  locationSection: (
    location: ExperienceData["location"],
    icon: string = "📍",
  ) => `
    <div style="${createEmailStyles.section("highlighted")}">
      <h4 style="color: ${emailDesignSystem.colors.primary}; margin: 0 0 ${emailDesignSystem.spacing.lg} 0; font-size: ${emailDesignSystem.typography.sizes.xl}; font-weight: ${emailDesignSystem.typography.weights.bold}; text-align: center; text-transform: uppercase; letter-spacing: 1px;">
        Location & Contact
      </h4>
      
      <!-- Simple Location Info -->
      <div style="${createEmailStyles.section("card")}">
        <div style="text-align: center; margin-bottom: ${emailDesignSystem.spacing.lg};">
          <div style="width: 60px; height: 60px; background: ${emailDesignSystem.colors.primary}; border-radius: ${emailDesignSystem.borderRadius.full}; display: flex; align-items: center; justify-content: center; margin: 0 auto ${emailDesignSystem.spacing.md} auto;">
            <span style="color: ${emailDesignSystem.colors.text.inverse}; font-size: ${emailDesignSystem.typography.sizes["2xl"]}; font-weight: ${emailDesignSystem.typography.weights.bold};">${icon}</span>
          </div>
          <h4 style="color: ${emailDesignSystem.colors.primary}; margin: 0 0 ${emailDesignSystem.spacing.sm} 0; font-size: ${emailDesignSystem.typography.sizes.lg}; font-weight: ${emailDesignSystem.typography.weights.bold};">${location.name}</h4>
          <p style="color: ${emailDesignSystem.colors.text.primary}; margin: 0; font-size: ${emailDesignSystem.typography.sizes.base}; line-height: ${emailDesignSystem.typography.lineHeights.normal};">
            ${location.address}
          </p>
        </div>
        
        <!-- Action Buttons -->
        <div style="display: flex; justify-content: center; gap: ${emailDesignSystem.spacing.lg}; flex-wrap: wrap;">
          <a href="${location.mapsUrl}" 
             style="${createEmailStyles.button("primary")}">
            View on Google Maps
          </a>
          ${
            location.instagramUrl
              ? `
            <a href="${location.instagramUrl}" 
               style="${createEmailStyles.button("primary")}">
              Follow on Instagram
            </a>
          `
              : ""
          }
        </div>
      </div>
    </div>
  `,

  // 体験内容リスト
  experienceList: (experiences: string[]) => `
    <div style="${createEmailStyles.section("highlighted")}">
      <h3 style="color: ${emailDesignSystem.colors.primary}; margin: 0 0 ${emailDesignSystem.spacing.lg} 0; font-size: ${emailDesignSystem.typography.sizes.xl}; font-weight: ${emailDesignSystem.typography.weights.bold}; text-align: center; text-transform: uppercase; letter-spacing: 1px;">
        What You'll Experience
      </h3>
      <div style="${createEmailStyles.section("card")}">
        <ul style="color: ${emailDesignSystem.colors.text.primary}; line-height: ${emailDesignSystem.typography.lineHeights.relaxed}; margin: 0; padding-left: ${emailDesignSystem.spacing.lg}; font-size: ${emailDesignSystem.typography.sizes.sm};">
          ${experiences
            .map(
              (item, index) => `
            <li style="margin-bottom: ${emailDesignSystem.spacing.sm};">
              <strong style="color: ${emailDesignSystem.colors.primary};">${item.split(" ")[0]}</strong> ${item.substring(item.indexOf(" ") + 1)}
            </li>
          `,
            )
            .join("")}
        </ul>
      </div>
    </div>
  `,

  // 重要な情報
  importantInfo: (info: string[]) => `
    <div style="${createEmailStyles.section("highlighted")}">
      <h4 style="color: ${emailDesignSystem.colors.primary}; margin: 0 0 ${emailDesignSystem.spacing.lg} 0; font-size: ${emailDesignSystem.typography.sizes.xl}; font-weight: ${emailDesignSystem.typography.weights.bold}; text-align: center; text-transform: uppercase; letter-spacing: 1px;">
        Important Information
      </h4>
      <div style="${createEmailStyles.section("card")}">
        <ul style="color: ${emailDesignSystem.colors.text.primary}; line-height: ${emailDesignSystem.typography.lineHeights.relaxed}; margin: 0; padding-left: ${emailDesignSystem.spacing.lg}; font-size: ${emailDesignSystem.typography.sizes.sm};">
          ${info
            .map(
              (item, index) => `
            <li style="margin-bottom: ${emailDesignSystem.spacing.sm};">
              <strong style="color: ${emailDesignSystem.colors.primary};">${item.split(":")[0]}:</strong> ${item.substring(item.indexOf(":") + 1)}
            </li>
          `,
            )
            .join("")}
        </ul>
      </div>
    </div>
  `,

  // 使用方法
  howToUse: () => `
    <div style="${createEmailStyles.section("highlighted")}">
      <h4 style="color: ${emailDesignSystem.colors.primary}; margin: 0 0 ${emailDesignSystem.spacing.lg} 0; font-size: ${emailDesignSystem.typography.sizes.xl}; font-weight: ${emailDesignSystem.typography.weights.bold}; text-transform: uppercase; letter-spacing: 1px; text-align: center;">
        How to Use Your QR Code
      </h4>
      <div style="${createEmailStyles.section("card")}">
        <p style="color: ${emailDesignSystem.colors.text.primary}; margin: 0; font-size: ${emailDesignSystem.typography.sizes.base}; line-height: ${emailDesignSystem.typography.lineHeights.normal}; font-weight: ${emailDesignSystem.typography.weights.medium}; text-align: center;">
          Simply show this QR code to our staff at the venue.<br>
          <strong style="color: ${emailDesignSystem.colors.primary};">No need to print anything</strong> - just display it on your phone!
        </p>
      </div>
    </div>
  `,

  // フッター
  footer: () => `
    <div style="${createEmailStyles.footer()}">
      <p style="color: ${emailDesignSystem.colors.text.secondary}; margin: 0 0 ${emailDesignSystem.spacing.sm} 0; font-size: ${emailDesignSystem.typography.sizes.sm};">
        Best regards,<br>
        <strong style="color: ${emailDesignSystem.colors.primary};">The Gappy Team</strong>
      </p>
      <p style="color: ${emailDesignSystem.colors.text.muted}; margin: 0; font-size: ${emailDesignSystem.typography.sizes.xs};">
        Authentic Japanese Experiences
      </p>
    </div>
  `,
};

// 新しい5セクション構成のメールテンプレート生成関数
export const generateImprovedEmailTemplate = (
  userName: string,
  couponCode: string,
  experienceData: ExperienceData,
  qrCodeData?: { qrUrl: string; qrBuffer: Buffer },
): { subject: string; html: string } => {
  const subject = `[Gappy] Your ${experienceData.title} on ${new Date().toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })} — QR Code Inside`;

  const html = `
    <!-- wrapper -->
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f7faf9;padding:16px 0;">
      <tr><td align="center">
        <table role="presentation" width="600" cellspacing="0" cellpadding="0" style="width:600px;max-width:100%;background:#ffffff;border-radius:12px;overflow:hidden;">
          
          <!-- セクション1: ヘッダー（ブランド） -->
          <tr><td style="background:#22c55e;color:#fff;padding:20px 24px;text-align:center;">
            <div style="font:700 20px/1.3 Inter,Arial;">GAPPY</div>
            <div style="font:400 12px/1.6 Inter,Arial;opacity:.9;">Authentic Japanese Experiences</div>
          </td></tr>

          <!-- セクション2: 予約サマリー（1枚のカード） ← 最重要 -->
          <tr><td style="padding:20px 24px;">
            <h1 style="margin:0 0 8px;font:700 18px/1.4 Inter,Arial;color:#0f172a;">Thanks for your booking, ${userName}!</h1>
            <p style="margin:0 0 16px;font:400 14px/1.7 Inter,Arial;color:#334155;">
              <strong>${experienceData.title}</strong><br>
              ${experienceData.details.hours || "Check your booking time"} · Party: ${experienceData.details.groupSize || "1-3"} · Booking ID: ${couponCode}
            </p>

          </td></tr>

          <!-- セクション3: QRコード + アクティビティ画像 -->
          <tr><td style="padding:0 24px 8px;">
            <div style="border:1px solid #d1fae5;background:#ecfdf5;border-radius:12px;padding:20px;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                <tr>
                  <!-- QRコード（左側） -->
                  <td style="width:180px;vertical-align:top;padding-right:20px;">
                    <div style="text-align:left;">
                      <div style="font:700 16px/1.4 Inter,Arial;color:#059669;margin-bottom:12px;">Your QR Code</div>
                      ${
                        qrCodeData
                          ? `
                        <img src="cid:qrcode" width="140" height="140" alt="Check-in QR" style="display:block;border:0;">
                      `
                          : `
                        <div style="background:#f3f4f6;border:2px dashed #9ca3af;border-radius:8px;padding:20px;width:140px;height:140px;display:flex;align-items:center;justify-content:center;">
                          <span style="color:#6b7280;font:600 12px Inter,Arial;">QR Code</span>
                        </div>
                      `
                      }
                    </div>
                  </td>
                  <!-- アクティビティ画像（右側） -->
                  <td style="vertical-align:top;">
                    <div style="text-align:right;padding-top:28px;">
                      <img src="${experienceData.imageUrl}" 
                           alt="${experienceData.title}" 
                           style="width:100%;max-width:240px;height:140px;object-fit:cover;border-radius:8px;box-shadow:0 2px 4px rgba(0,0,0,0.1);">
                    </div>
                  </td>
                </tr>
                <!-- 説明文（下段） -->
                <tr>
                  <td colspan="2" style="padding-top:12px;">
                    <div style="font:400 12px/1.6 Inter,Arial;color:#047857;text-align:center;">
                      Show this QR at the venue. Valid for up to 3 scans. <a href="#" style="color:#047857;">If it doesn't show, open your QR in browser</a>
                    </div>
                  </td>
                </tr>
              </table>
            </div>
          </td></tr>

          <!-- セクション4: 店舗情報 -->
          <tr><td style="padding:20px 24px;">
            <div style="border:1px solid #e5e7eb;border-radius:12px;padding:16px;">
              <div style="font:700 14px/1.4 Inter,Arial;color:#0f172a;margin-bottom:8px;">Location & Contact</div>
              <div style="font:400 14px/1.7 Inter,Arial;color:#334155;">
                <strong>${experienceData.location.name}</strong><br>
                ${experienceData.location.address}<br>
                Tel: <a href="tel:${experienceData.location.phone}" style="color:#0f766e;text-decoration:none;">${experienceData.location.phone}</a> ·
                Email: <a href="mailto:${experienceData.location.email}" style="color:#0f766e;text-decoration:none;">${experienceData.location.email}</a>
              </div>
              <div style="margin-top:12px;">
                <a href="${experienceData.location.mapsUrl}" style="display:inline-block;background:#22c55e;color:#fff;text-decoration:none;padding:10px 14px;border-radius:8px;font:600 13px Inter,Arial;">Open in Google Maps</a>
                ${
                  experienceData.location.instagramUrl
                    ? `
                  <a href="${experienceData.location.instagramUrl}" style="display:inline-block;background:#111827;color:#fff;text-decoration:none;padding:10px 14px;border-radius:8px;font:600 13px Inter,Arial;margin-left:8px;">Follow on Instagram</a>
                `
                    : ""
                }
              </div>
            </div>
          </td></tr>


          <!-- フッター（ヘルプ） -->
          <tr><td style="background:#f1f5f9;color:#475569;padding:16px 24px;text-align:center;font:400 12px/1.6 Inter,Arial;">
            Need help? Reply to this email or call <a href="tel:${experienceData.location.phone}" style="color:#0f766e;text-decoration:none;">${experienceData.location.phone}</a>.
            <div style="margin-top:6px;">© ${new Date().getFullYear()} Gappy Inc.</div>
          </td></tr>
        </table>
      </td></tr>
    </table>

    <!-- Preheader (hidden) -->
    <span style="display:none;max-height:0;overflow:hidden;">Show this QR at check-in. Venue: ${experienceData.location.name}.</span>
  `;

  return { subject, html };
};

// 既存のテンプレート関数（後方互換性のため保持）
export const generateEmailTemplate = (
  userName: string,
  couponCode: string,
  experienceData: ExperienceData,
  qrCodeData?: { qrUrl: string; qrBuffer: Buffer },
): { subject: string; html: string } => {
  const subject = `[Gappy] ${experienceData.title} - Your QR Code is Ready!`;

  const html = `
    <div style="${createEmailStyles.container()}">
      ${emailComponents.header(userName, experienceData.title)}
      
      ${qrCodeData ? emailComponents.qrCodeSection(qrCodeData) : emailComponents.couponCodeSection(couponCode)}
      
      ${emailComponents.experienceImage(experienceData.imageUrl, experienceData.title)}
      
      ${emailComponents.experienceDetails(experienceData.details)}
      
      ${emailComponents.locationSection(experienceData.location, experienceData.icon)}
      
      ${experienceData.experience && experienceData.experience.length > 0 ? emailComponents.experienceList(experienceData.experience) : ""}
      
      ${experienceData.importantInfo && experienceData.importantInfo.length > 0 ? emailComponents.importantInfo(experienceData.importantInfo) : ""}
      
      ${emailComponents.howToUse()}
      
      ${emailComponents.footer()}
    </div>
  `;

  return { subject, html };
};
