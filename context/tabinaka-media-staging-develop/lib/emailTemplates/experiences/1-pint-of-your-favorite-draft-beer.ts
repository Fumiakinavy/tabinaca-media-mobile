// Sip Your Favorite Draft Beer by the Pint専用メールテンプレート
// 新しいデザインシステムを使用

import { generateImprovedEmailTemplate, ExperienceData } from "../components";

export function onePintDraftBeerTemplate(
  userName: string,
  couponCode: string,
  qrCodeData?: { qrUrl: string; qrBuffer: Buffer },
): { subject: string; html: string } {
  const experienceData: ExperienceData = {
    title: "Sip Your Favorite Draft Beer by the Pint",
    description:
      "Your craft beer experience is confirmed. Choose from 18 taps and enjoy a fresh draft beer at TAP & CROWLER Shibuya.",
    imageUrl:
      "https://res.cloudinary.com/du4hpnqgl/image/upload/v1755246039/beer-1_wp8g4t.png",
    location: {
      name: "TAP & CROWLER Shibuya",
      address: "Shibuya, Tokyo",
      phone: "03-6416-5948",
      email: "hello@craft-beers.shop",
      mapsUrl:
        "https://maps.google.com/?q=TAP+%26+CROWLER+Shibuya+Store+Shibuya+Tokyo",
      instagramUrl: undefined,
    },
    details: {
      venue: "TAP & CROWLER Shibuya",
      hours: "3:00 PM - 12:00 AM",
      duration: "40 minutes",
      phone: "03-6416-5948",
      email: "hello@craft-beers.shop",
    },
    experience: [
      "Choose from 18 different craft beer taps with rotating selections",
      "Enjoy a full 1 pint of your selected beer in a casual atmosphere",
      "Experience authentic Japanese standing bar culture (kaku-uchi style)",
      "Bring your own food or order from nearby restaurants",
      "English-speaking staff available for recommendations",
    ],
    importantInfo: [
      "Atmosphere: Perfect for after-work casual drinks and socializing",
      "Target Audience: Great for craft beer enthusiasts and casual drinkers",
      "Group Size: Ideal for small groups, couples, or solo visitors",
      "Takeaway: Bottles and cans also available for purchase",
    ],
    icon: "🍺",
  };

  return generateImprovedEmailTemplate(
    userName,
    couponCode,
    experienceData,
    qrCodeData,
  );
}
