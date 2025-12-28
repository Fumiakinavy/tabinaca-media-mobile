export type DetectedLanguage = "ja" | "en" | "mixed" | "unknown";

const JA_REGEX = /[\\u3040-\\u30ff\\u3400-\\u4dbf\\u4e00-\\u9fff]/;
const EN_REGEX = /[A-Za-z]/;

export function detectLanguage(text?: string | null): DetectedLanguage {
  if (!text) return "unknown";
  const trimmed = text.trim();
  if (!trimmed) return "unknown";

  const hasJa = JA_REGEX.test(trimmed);
  const hasEn = EN_REGEX.test(trimmed);

  if (hasJa && hasEn) return "mixed";
  if (hasJa) return "ja";
  if (hasEn) return "en";
  return "unknown";
}
