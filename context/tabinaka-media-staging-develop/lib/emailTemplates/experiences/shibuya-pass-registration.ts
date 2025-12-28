// Shibuya Passアクティビティ専用メールテンプレート
// 新しいデザインシステムを使用

import { emailDesignSystem, createEmailStyles } from "../designSystem";

export function shibuyaPassRegistrationTemplate(
  userName: string,
  experienceTitle: string,
): { subject: string; html: string } {
  const subject =
    "[Gappy] Thank you for registering! Enjoy your Shibuya experience";

  const html = `
    <div style="${createEmailStyles.container()}">
      <!-- Header -->
      <div style="${createEmailStyles.header()}">
        <h1 style="color: ${emailDesignSystem.colors.text.inverse}; margin: 0; font-size: ${emailDesignSystem.typography.sizes["3xl"]}; font-weight: ${emailDesignSystem.typography.weights.bold}; letter-spacing: -0.5px;">
          GAPPY
        </h1>
        <p style="color: rgba(255,255,255,0.9); margin: ${emailDesignSystem.spacing.sm} 0 0 0; font-size: ${emailDesignSystem.typography.sizes.base}; font-weight: ${emailDesignSystem.typography.weights.normal};">
          Authentic Japanese Experiences
        </p>
      </div>
      
      <!-- Main Content -->
      <div style="${createEmailStyles.mainContent()}">
        <h2 style="${createEmailStyles.title(2)}">
          🎉 Thank you for registering with Gappy!
        </h2>
        
        <p style="${createEmailStyles.text("secondary")}">
          Dear ${userName},
        </p>
        
        <p style="${createEmailStyles.text("secondary")}">
          Thank you for your interest in <strong>${experienceTitle}</strong>!
        </p>
        
        <p style="${createEmailStyles.text("secondary")}">
          We're excited to help you discover amazing experiences in Shibuya. You've been successfully registered with Gappy, and we'll keep you updated with exclusive deals and travel tips for your Japan adventure.
        </p>
        
        <!-- Shibuya Pass Information -->
        <div style="${createEmailStyles.section("highlighted")}">
          <h3 style="color: ${emailDesignSystem.colors.primary}; margin: 0 0 ${emailDesignSystem.spacing.md} 0; font-size: ${emailDesignSystem.typography.sizes.lg}; font-weight: ${emailDesignSystem.typography.weights.bold};">
            About Shibuya Pass
          </h3>
          <p style="color: ${emailDesignSystem.colors.text.primary}; margin: 0 0 ${emailDesignSystem.spacing.sm} 0; font-size: ${emailDesignSystem.typography.sizes.base}; line-height: ${emailDesignSystem.typography.lineHeights.normal};">
            <strong>${experienceTitle}</strong> is available through Shibuya Pass, a convenient service that lets you enjoy multiple experiences in Shibuya with prepaid points.
          </p>
          <ul style="color: ${emailDesignSystem.colors.text.primary}; margin: 0; padding-left: ${emailDesignSystem.spacing.lg}; font-size: ${emailDesignSystem.typography.sizes.base}; line-height: ${emailDesignSystem.typography.lineHeights.normal};">
            <li style="margin-bottom: ${emailDesignSystem.spacing.xs};">Purchase points on Shibuya Pass website</li>
            <li style="margin-bottom: ${emailDesignSystem.spacing.xs};">Use points to book your desired experiences</li>
            <li>Enjoy hassle-free reservations and payments</li>
          </ul>
        </div>
        
        <!-- CTA Button -->
        <div style="text-align: center; margin: ${emailDesignSystem.spacing["2xl"]} 0;">
          <a href="https://shibuya-pass.com/" 
             style="${createEmailStyles.button("primary")}">
            Visit Shibuya Pass
          </a>
        </div>
        
        <!-- Pro Tips -->
        <div style="${createEmailStyles.section("card")}">
          <h4 style="color: ${emailDesignSystem.colors.accent}; margin: 0 0 ${emailDesignSystem.spacing.sm} 0; font-size: ${emailDesignSystem.typography.sizes.lg}; font-weight: ${emailDesignSystem.typography.weights.bold};">
            💡 Pro Tips for Your Shibuya Adventure
          </h4>
          <ul style="color: ${emailDesignSystem.colors.text.primary}; margin: 0; padding-left: ${emailDesignSystem.spacing.lg}; font-size: ${emailDesignSystem.typography.sizes.base}; line-height: ${emailDesignSystem.typography.lineHeights.normal};">
            <li style="margin-bottom: ${emailDesignSystem.spacing.xs};">Check our latest articles for insider tips on Shibuya</li>
            <li style="margin-bottom: ${emailDesignSystem.spacing.xs};">Follow us for updates on new experiences and deals</li>
            <li>Plan your visit during weekdays for fewer crowds</li>
          </ul>
        </div>
        
        <!-- Articles CTA -->
        <div style="text-align: center; margin: ${emailDesignSystem.spacing["2xl"]} 0;">
          <a href="https://gappytravel.com/articles" 
             style="${createEmailStyles.button("secondary")}">
            Read Shibuya Articles
          </a>
        </div>
      </div>
      
      <!-- Footer -->
      <div style="${createEmailStyles.footer()}">
        <p style="color: ${emailDesignSystem.colors.text.secondary}; margin: 0 0 ${emailDesignSystem.spacing.sm} 0; font-size: ${emailDesignSystem.typography.sizes.sm};">
          Best regards,<br>
          <strong style="color: ${emailDesignSystem.colors.primary};">The Gappy Team</strong><br>
          Your guide to authentic Japanese experiences
        </p>
        <p style="color: ${emailDesignSystem.colors.text.muted}; margin: 0; font-size: ${emailDesignSystem.typography.sizes.xs};">
          You're receiving this email because you registered for a Shibuya experience through Gappy.<br>
          If you have any questions, please contact us at mitsuki@gappy.jp
        </p>
      </div>
    </div>
  `;

  return { subject, html };
}
