// Master Edo‑Style Sushi in a Hands‑On Class専用メールテンプレート
// 新しいデザインシステムを使用

import { generateImprovedEmailTemplate, ExperienceData } from "../components";

export function emiAuthenticSushiMakingClassTemplate(
  userName: string,
  couponCode: string,
  qrCodeData?: { qrUrl: string; qrBuffer: Buffer },
): { subject: string; html: string } {
  const experienceData: ExperienceData = {
    title: "Master Edo‑Style Sushi in a Hands‑On Class",
    description:
      "Your authentic sushi making class is confirmed. Learn traditional Edo-mae sushi techniques from professional chefs at Samurai Sushi Tokyo.",
    imageUrl:
      "https://res.cloudinary.com/du4hpnqgl/image/upload/v1755833865/%E3%82%B9%E3%82%AF%E3%83%AA%E3%83%BC%E3%83%B3%E3%82%B7%E3%83%A7%E3%83%83%E3%83%88_2025-08-22_12.37.25_vmvbeq.png",
    location: {
      name: "Samurai Sushi Tokyo",
      address: "3-8-18 Nishiazabu, Minato City, Tokyo 106-0031, Japan",
      phone: "03-6869-6339",
      email: "samuraisushitokyo@gmail.com",
      mapsUrl:
        "https://www.google.com/maps/dir//3-8-18+Nishiazabu,+Minato+City,+Tokyo+106-0031,+Japan/@35.6605162,139.6985615,17z/data=!3m1!4b1!4m8!4m7!1m0!1m5!1m1!1s0x60188d8dcb3d06d9:0xf3864796d0e96435!2m2!1d139.6985615!2d35.6605162",
      instagramUrl: undefined,
    },
    details: {
      venue: "Samurai Sushi Tokyo",
      duration: "105 minutes",
      groupSize: "Small group (under 10 participants)",
      language: "Bilingual (Japanese/English)",
      level: "Beginner-friendly",
      phone: "03-6869-6339",
      email: "samuraisushitokyo@gmail.com",
    },
    experience: [
      "Introduction to Edo-mae sushi history and cultural significance",
      "Professional knife skills demonstration by experienced chefs",
      "Hands-on sushi making practice (nigiri, maki, gunkan styles)",
      "Interactive sushi quiz with prizes for participants",
      "Photo session with your handmade sushi creations",
    ],
    importantInfo: [
      "Arrival: Please arrive 5 minutes before the start time for smooth check-in",
      "Age Requirement: Recommended for ages 6+ (children charged as one participant)",
      "Dietary Options: Vegan/Vegetarian, Allergy, Halal available (contact 3 days in advance)",
      "Contact: For special requests, email samuraisushitokyo@gmail.com",
    ],
    icon: "🍣",
  };

  return generateImprovedEmailTemplate(
    userName,
    couponCode,
    experienceData,
    qrCodeData,
  );
}
