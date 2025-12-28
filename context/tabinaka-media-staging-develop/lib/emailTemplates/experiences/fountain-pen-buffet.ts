// Design Your Own Fountain Pen at STYLE OF LAB専用メールテンプレート
// 新しいデザインシステムを使用

import { generateImprovedEmailTemplate, ExperienceData } from "../components";

export function fountainPenBuffetTemplate(
  userName: string,
  couponCode: string,
  qrCodeData?: { qrUrl: string; qrBuffer: Buffer },
): { subject: string; html: string } {
  const experienceData: ExperienceData = {
    title: "Design Your Own Fountain Pen at STYLE OF LAB",
    description:
      "Your fountain pen creation experience is confirmed. Design and assemble your own custom-colored fountain pen from over 6 million combinations at STYLE OF LAB.",
    imageUrl:
      "https://res.cloudinary.com/du4hpnqgl/image/upload/v1755243755/fountain-pen-buffet-top_vu3ppn.jpg",
    location: {
      name: "STYLE OF LAB",
      address: "1-29-9 Ebisu-Nishi, Shibuya-ku, Tokyo 150-0021",
      phone: "03-6416-5948",
      email: "info@styleoflab.com",
      mapsUrl:
        "https://maps.google.com/?q=STYLE+OF+LAB+1-29-9+Ebisu-Nishi+Shibuya-ku+Tokyo+150-0021",
      instagramUrl: "https://www.instagram.com/styleoflab",
    },
    details: {
      venue: "STYLE OF LAB",
      duration: "30 minutes",
      groupSize: "1-4 people",
      language: "Japanese / English",
      level: "Beginner-friendly",
      hours: "10:00-20:00",
      phone: "03-6416-5948",
      email: "info@styleoflab.com",
    },
    experience: [
      "Choose colors for 5 pen parts from 20+ options each (over 6 million combinations)",
      "Assemble your custom fountain pen with professional staff guidance",
      "Receive your pen in an elegant gift box with cartridge ink included",
      "No reservation required - walk in anytime during business hours",
    ],
    importantInfo: [
      "Age Requirement: Perfect for families with children (ages 6 and up)",
      "Gift Idea: Great for creating thoughtful, personalized gifts for loved ones",
      "Best Time: Visit during weekdays for a more relaxed and personalized experience",
      "Skill Level: No prior experience needed - perfect for beginners",
    ],
    icon: "✒️",
  };

  return generateImprovedEmailTemplate(
    userName,
    couponCode,
    experienceData,
    qrCodeData,
  );
}
