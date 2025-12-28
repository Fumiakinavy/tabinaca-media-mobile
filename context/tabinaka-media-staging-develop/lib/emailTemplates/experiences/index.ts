import { kimonoDressingExperienceTemplate } from "./kimono-dressing-experience";
import { shibuyaPassRegistrationTemplate } from "./shibuya-pass-registration";
import { fountainPenBuffetTemplate } from "./fountain-pen-buffet";
import { onePintDraftBeerTemplate } from "./1-pint-of-your-favorite-draft-beer";
import { emiAuthenticSushiMakingClassTemplate } from "./emi-authentic-sushi-making-class-in-tokyo";
import { genericExperienceTemplate } from "./generic-experience";
import { partnerStoreTemplate } from "./partner-store";

export const experienceEmailTemplates: Record<
  string,
  (
    userName: string,
    couponCode: string,
    qrCodeData?: { qrUrl: string; qrBuffer: Buffer },
  ) => { subject: string; html: string }
> = {
  "kimono-dressing-experience": kimonoDressingExperienceTemplate,
  // Shibuya Passアクティビティ用の汎用テンプレート
  "shibuya-pass": shibuyaPassRegistrationTemplate,
  // Design Your Own Fountain Pen at STYLE OF LAB専用テンプレート
  "fountain-pen-buffet": fountainPenBuffetTemplate,
  // Sip Your Favorite Draft Beer by the Pint専用テンプレート
  "1-pint-of-your-favorite-draft-beer": onePintDraftBeerTemplate,
  // Master Edo‑Style Sushi in a Hands‑On Class専用テンプレート
  "emi-authentic-sushi-making-class-in-tokyo":
    emiAuthenticSushiMakingClassTemplate,
  // 汎用テンプレート（Kimono Experienceデザインベース）
  "generic-experience": genericExperienceTemplate,
  // 提携店舗アクティビティ用テンプレート（店舗情報中心）
  "partner-store": partnerStoreTemplate as any,
  // 今後他エクスペリエンスもここに追加
};

// 汎用テンプレート関数をエクスポート
export { genericExperienceTemplate, partnerStoreTemplate };
