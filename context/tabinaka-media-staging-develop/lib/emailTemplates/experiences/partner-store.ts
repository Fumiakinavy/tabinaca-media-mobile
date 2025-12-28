/**
 * Partner Store Activity Email Template
 * No booking required - Simple venue information
 */

import { emailDesignSystem, createEmailStyles } from "../designSystem";

interface StoreInfo {
  name: string;
  address: string;
  phone?: string;
  hours?: string;
  mapsUrl?: string;
}

export function partnerStoreTemplate(
  userName: string,
  couponCode: string,
  activityTitle: string,
  activityDuration: number,
  storeInfo: StoreInfo,
  qrCodeData?: { qrUrl: string; qrBuffer: Buffer },
): { subject: string; html: string } {
  const subject = `[Gappy] ${activityTitle} - Venue Information`;

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
          📍 ${activityTitle}
        </h2>
        
        <p style="${createEmailStyles.text("secondary")}">
          Dear ${userName},
        </p>
        
        <p style="${createEmailStyles.text("secondary")}">
          Thank you for your interest in <strong>${activityTitle}</strong>!<br>
          No booking required - just visit the venue directly during operating hours.
        </p>
        
        <!-- Venue Information -->
        <div style="${createEmailStyles.section("card")}">
          <h3 style="color: ${emailDesignSystem.colors.accent}; margin: 0 0 ${emailDesignSystem.spacing.md} 0; font-size: ${emailDesignSystem.typography.sizes.xl}; font-weight: ${emailDesignSystem.typography.weights.bold};">
            📍 Venue Information
          </h3>
          
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding: ${emailDesignSystem.spacing.sm} 0; color: ${emailDesignSystem.colors.text.secondary}; font-size: ${emailDesignSystem.typography.sizes.sm}; font-weight: ${emailDesignSystem.typography.weights.semibold}; vertical-align: top; width: 80px;">
                Venue
              </td>
              <td style="padding: ${emailDesignSystem.spacing.sm} 0; color: ${emailDesignSystem.colors.text.primary}; font-size: ${emailDesignSystem.typography.sizes.base};">
                ${storeInfo.name}
              </td>
            </tr>
            <tr>
              <td style="padding: ${emailDesignSystem.spacing.sm} 0; color: ${emailDesignSystem.colors.text.secondary}; font-size: ${emailDesignSystem.typography.sizes.sm}; font-weight: ${emailDesignSystem.typography.weights.semibold}; vertical-align: top;">
                Address
              </td>
              <td style="padding: ${emailDesignSystem.spacing.sm} 0; color: ${emailDesignSystem.colors.text.primary}; font-size: ${emailDesignSystem.typography.sizes.base};">
                ${storeInfo.address}
              </td>
            </tr>
            ${
              storeInfo.phone
                ? `
            <tr>
              <td style="padding: ${emailDesignSystem.spacing.sm} 0; color: ${emailDesignSystem.colors.text.secondary}; font-size: ${emailDesignSystem.typography.sizes.sm}; font-weight: ${emailDesignSystem.typography.weights.semibold}; vertical-align: top;">
                Phone
              </td>
              <td style="padding: ${emailDesignSystem.spacing.sm} 0; color: ${emailDesignSystem.colors.text.primary}; font-size: ${emailDesignSystem.typography.sizes.base};">
                <a href="tel:${storeInfo.phone.replace(/[^0-9+]/g, "")}" style="color: ${emailDesignSystem.colors.primary}; text-decoration: none;">
                  ${storeInfo.phone}
                </a>
              </td>
            </tr>
            `
                : ""
            }
            ${
              storeInfo.hours
                ? `
            <tr>
              <td style="padding: ${emailDesignSystem.spacing.sm} 0; color: ${emailDesignSystem.colors.text.secondary}; font-size: ${emailDesignSystem.typography.sizes.sm}; font-weight: ${emailDesignSystem.typography.weights.semibold}; vertical-align: top;">
                Hours
              </td>
              <td style="padding: ${emailDesignSystem.spacing.sm} 0; color: ${emailDesignSystem.colors.text.primary}; font-size: ${emailDesignSystem.typography.sizes.base};">
                ${storeInfo.hours}
              </td>
            </tr>
            `
                : ""
            }
            <tr>
              <td style="padding: ${emailDesignSystem.spacing.sm} 0; color: ${emailDesignSystem.colors.text.secondary}; font-size: ${emailDesignSystem.typography.sizes.sm}; font-weight: ${emailDesignSystem.typography.weights.semibold}; vertical-align: top;">
                Duration
              </td>
              <td style="padding: ${emailDesignSystem.spacing.sm} 0; color: ${emailDesignSystem.colors.text.primary}; font-size: ${emailDesignSystem.typography.sizes.base};">
                Approx. ${activityDuration} min
              </td>
            </tr>
          </table>
          
          ${
            storeInfo.mapsUrl
              ? `
          <div style="text-align: center; margin: ${emailDesignSystem.spacing.lg} 0 0 0;">
            <a href="${storeInfo.mapsUrl}" 
               style="${createEmailStyles.button("secondary")}">
              🗺️ Open in Google Maps
            </a>
          </div>
          `
              : ""
          }
        </div>
        
        <!-- How to Visit -->
        <div style="${createEmailStyles.section("highlighted")}">
          <h4 style="color: ${emailDesignSystem.colors.primary}; margin: 0 0 ${emailDesignSystem.spacing.sm} 0; font-size: ${emailDesignSystem.typography.sizes.lg}; font-weight: ${emailDesignSystem.typography.weights.bold};">
            ℹ️ How to Visit
          </h4>
          <ol style="color: ${emailDesignSystem.colors.text.primary}; margin: 0; padding-left: ${emailDesignSystem.spacing.lg}; font-size: ${emailDesignSystem.typography.sizes.base}; line-height: ${emailDesignSystem.typography.lineHeights.normal};">
            <li style="margin-bottom: ${emailDesignSystem.spacing.xs};">
              Visit the venue during operating hours
            </li>
            <li style="margin-bottom: ${emailDesignSystem.spacing.xs};">
              Tell the staff "I found you through Gappy"
            </li>
            <li>
              Enjoy your experience!
            </li>
          </ol>
        </div>
        
        <!-- Important Information -->
        <div style="${createEmailStyles.section("card")}">
          <h4 style="color: ${emailDesignSystem.colors.accent}; margin: 0 0 ${emailDesignSystem.spacing.sm} 0; font-size: ${emailDesignSystem.typography.sizes.lg}; font-weight: ${emailDesignSystem.typography.weights.bold};">
            ⚠️ Important Information
          </h4>
          <ul style="color: ${emailDesignSystem.colors.text.primary}; margin: 0; padding-left: ${emailDesignSystem.spacing.lg}; font-size: ${emailDesignSystem.typography.sizes.sm}; line-height: ${emailDesignSystem.typography.lineHeights.normal};">
            <li style="margin-bottom: ${emailDesignSystem.spacing.xs};">
              No reservation required - walk-ins welcome
            </li>
            <li style="margin-bottom: ${emailDesignSystem.spacing.xs};">
              Wait times may occur during busy periods
            </li>
            <li style="margin-bottom: ${emailDesignSystem.spacing.xs};">
              Operating hours may change - please check before visiting
            </li>
            <li>
              Questions? Contact Gappy Support at mitsuki@gappy.jp
            </li>
          </ul>
        </div>
        
        <!-- Explore More -->
        <div style="text-align: center; margin: ${emailDesignSystem.spacing["2xl"]} 0;">
          <p style="color: ${emailDesignSystem.colors.text.secondary}; margin: 0 0 ${emailDesignSystem.spacing.md} 0; font-size: ${emailDesignSystem.typography.sizes.base};">
            Discover more Tokyo experiences
          </p>
          <a href="https://gappytravel.com/experiences" 
             style="${createEmailStyles.button("primary")}">
            Explore More Experiences
          </a>
        </div>
      </div>
      
      <!-- Footer -->
      <div style="${createEmailStyles.footer()}">
        <p style="color: ${emailDesignSystem.colors.text.secondary}; margin: 0 0 ${emailDesignSystem.spacing.sm} 0; font-size: ${emailDesignSystem.typography.sizes.sm};">
          Enjoy your authentic Japanese experience!<br>
          <strong style="color: ${emailDesignSystem.colors.primary};">The Gappy Team</strong><br>
          Supporting your journey through Japan
        </p>
        <p style="color: ${emailDesignSystem.colors.text.muted}; margin: 0; font-size: ${emailDesignSystem.typography.sizes.xs};">
          If you have any questions, feel free to contact us at mitsuki@gappy.jp<br>
          This email was sent to confirm your booking.
        </p>
      </div>
    </div>
  `;

  return { subject, html };
}
