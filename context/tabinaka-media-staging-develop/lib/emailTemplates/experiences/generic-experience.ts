/**
 * 汎用体験メールテンプレート
 * 新しいデザインシステムを使用した汎用テンプレート
 */

import { generateImprovedEmailTemplate, ExperienceData } from "../components";

export function genericExperienceTemplate(
  userName: string,
  couponCode: string,
  qrCodeData?: { qrUrl: string; qrBuffer: Buffer },
  experienceData?: Partial<ExperienceData>,
): { subject: string; html: string } {
  // デフォルトの体験データ（Kimono Experience）
  const defaultData: ExperienceData = {
    title: "Dress in a Traditional Kimono at TSUMUGI",
    description:
      "Your kimono dressing experience is confirmed. Show the QR code below at the venue.",
    imageUrl:
      "https://res.cloudinary.com/du4hpnqgl/image/upload/v1757837824/%E7%9D%80%E4%BB%98%E3%81%911_ws71lg.jpg",
    location: {
      name: "Kimono Experience (Shibuya)",
      address: "29-2 Udagawacho, Shibuya City, Tokyo 150-0042, Japan",
      phone: "090-9018-4342",
      email: "kohata@andand-shibuya.com",
      mapsUrl:
        "https://www.google.com/maps/dir//29-2+Udagawacho,+Shibuya+City,+Tokyo+150-0042,+Japan/@35.6604929,139.6161484,12z/data=!4m8!4m7!1m0!1m5!1m1!1s0x60188d8dcb3d06d9:0xf3864796d0e96435!2m2!1d139.6985615!2d35.6605162?entry=ttu&g_ep=EgoyMDI1MDcyMi4wIKXMDSoASAFQAw%3D%3D",
      instagramUrl: "https://www.instagram.com/kimono_shibuya/",
    },
    details: {
      venue: "Kimono Experience (Shibuya)",
      hours: "12:30 PM - 5:00 PM",
      duration: "60 minutes (2-3 people per slot)",
      phone: "090-9018-4342",
      email: "kohata@andand-shibuya.com",
    },
    experience: [
      "Traditional kimono dressing experience with professional assistance",
      "Choose from a variety of beautiful kimono styles and colors",
      "Professional styling and photo opportunities",
      "Cultural learning session about kimono history and etiquette",
    ],
    importantInfo: [
      "Arrival: Please arrive 10 minutes before your appointment time",
      "Dress Code: Wear comfortable undergarments for easy changing",
      "Photography: Photo opportunities are included and welcome",
      "Group Size: Maximum 2-3 people per time slot for personalized service",
    ],
    icon: "👘",
  };

  // デフォルトデータと提供されたデータをマージ
  const mergedData: ExperienceData = {
    ...defaultData,
    ...experienceData,
    location: {
      ...defaultData.location,
      ...experienceData?.location,
    },
    details: {
      ...defaultData.details,
      ...experienceData?.details,
    },
  };

  return generateImprovedEmailTemplate(
    userName,
    couponCode,
    mergedData,
    qrCodeData,
  );
}
