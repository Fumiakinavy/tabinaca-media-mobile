import { TravelTypeCode, getTravelTypeInfo } from "@/lib/travelTypeMapping";

const DEFAULT_IMAGE = "/images/quiz-character/GRLP-final.png";

const TYPE_IMAGE_MAP: Record<TravelTypeCode, string> = {
  GRLP: "/images/quiz-character/GRLP-final.png",
  GRLF: "/images/quiz-character/GRLF-final.png",
  GRHP: "/images/quiz-character/GRHP-final.png",
  GRHF: "/images/quiz-character/GRHF-final.png",
  GDHP: "/images/quiz-character/GDHP-final.png",
  GDHF: "/images/quiz-character/GDHF-final.png",
  GDLP: "/images/quiz-character/GDLP-final.png",
  GDLF: "/images/quiz-character/GDLF-final.png",
  SRLP: "/images/quiz-character/SRLP-final.png",
  SRLF: "/images/quiz-character/SRLF-final.png",
  SRHP: "/images/quiz-character/SRHP-final.png",
  SRHF: "/images/quiz-character/SRHF-final.png",
  SDHP: "/images/quiz-character/SDHP-final.png",
  SDHF: "/images/quiz-character/SDHF-final.png",
  SDLP: "/images/quiz-character/SDLP-final.png",
  SDLF: "/images/quiz-character/SDLF-final.png",
};

export interface TravelTypeResultContent {
  code: TravelTypeCode;
  title: string;
  emoji: string;
  description: string;
  shortDescription: string;
  greeting: string;
  heroImage: string;
}

export const getTravelTypeResultContent = (
  code: TravelTypeCode,
): TravelTypeResultContent => {
  const info = getTravelTypeInfo(code);
  const heroImage = TYPE_IMAGE_MAP[code] || DEFAULT_IMAGE;

  return {
    code,
    title: info.name,
    emoji: info.emoji,
    description: info.description,
    shortDescription: info.shortDescription,
    // Simple, natural English shown in the quiz result modal
    greeting: `Your travel type is ${info.name}.`,
    heroImage,
  };
};
