// 個人情報マスキング機能
// ユーザーが入力した機密情報（パスワード、クレジットカード、メールなど）をマスキング

/**
 * 機密情報のパターン
 */
const SENSITIVE_PATTERNS = {
  // クレジットカード番号 (4桁x4または3桁x4x3)
  creditCard: /\b\d{4}[\s\-]?\d{4}[\s\-]?\d{4}[\s\-]?\d{3,4}\b/g,

  // メールアドレス
  email: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g,

  // 電話番号 (日本の形式)
  phoneJP:
    /\b(0\d{1,4}[\s\-]?\d{1,4}[\s\-]?\d{4}|\+81[\s\-]?\d{1,4}[\s\-]?\d{1,4}[\s\-]?\d{4})\b/g,

  // 郵便番号 (日本の形式)
  postalCodeJP: /\b\d{3}[\s\-]?\d{4}\b/g,

  // IPアドレス
  ipAddress: /\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b/g,

  // マイナンバー (12桁)
  myNumber: /\b\d{4}[\s\-]?\d{4}[\s\-]?\d{4}\b/g,

  // パスポート番号 (2文字+7桁の数字)
  passport: /\b[A-Z]{2}\d{7}\b/g,
};

/**
 * 機密情報フィールドの識別子
 */
const SENSITIVE_FIELD_PATTERNS = {
  password: /password|passwd|pwd/i,
  creditCard: /card|credit|ccnumber|cardnumber/i,
  cvv: /cvv|cvc|securitycode/i,
  ssn: /ssn|social.*security/i,
  tax: /tax.*id|ein/i,
};

/**
 * テキスト内の機密情報をマスキング
 */
export function maskSensitiveText(text: string): string {
  if (!text || typeof text !== "string") return text;

  let maskedText = text;

  // クレジットカード番号をマスキング (最後の4桁のみ表示)
  maskedText = maskedText.replace(SENSITIVE_PATTERNS.creditCard, (match) => {
    const digits = match.replace(/[\s\-]/g, "");
    return `****-****-****-${digits.slice(-4)}`;
  });

  // メールアドレスをマスキング (ドメインの一部のみ表示)
  maskedText = maskedText.replace(SENSITIVE_PATTERNS.email, (match) => {
    const [local, domain] = match.split("@");
    return `${local.slice(0, 2)}***@${domain}`;
  });

  // 電話番号をマスキング (最後の4桁のみ表示)
  maskedText = maskedText.replace(SENSITIVE_PATTERNS.phoneJP, (match) => {
    const digits = match.replace(/[\s\-+]/g, "");
    return `***-****-${digits.slice(-4)}`;
  });

  // 郵便番号をマスキング
  maskedText = maskedText.replace(SENSITIVE_PATTERNS.postalCodeJP, "***-****");

  // IPアドレスをマスキング
  maskedText = maskedText.replace(
    SENSITIVE_PATTERNS.ipAddress,
    "***.***.***.***",
  );

  // マイナンバーをマスキング
  maskedText = maskedText.replace(
    SENSITIVE_PATTERNS.myNumber,
    "****-****-****",
  );

  // パスポート番号をマスキング
  maskedText = maskedText.replace(SENSITIVE_PATTERNS.passport, "XX*******");

  return maskedText;
}

/**
 * フィールド名が機密情報フィールドかどうかを判定
 */
export function isSensitiveField(fieldName: string): boolean {
  if (!fieldName || typeof fieldName !== "string") return false;

  const lowerFieldName = fieldName.toLowerCase();

  return Object.values(SENSITIVE_FIELD_PATTERNS).some((pattern) =>
    pattern.test(lowerFieldName),
  );
}

/**
 * 機密情報フィールドの値をマスキング
 */
export function maskFieldValue(fieldName: string, value: string): string {
  if (!value || typeof value !== "string") return value;

  // フィールド名が機密情報フィールドの場合、完全にマスキング
  if (isSensitiveField(fieldName)) {
    return "*".repeat(Math.min(value.length, 12));
  }

  // それ以外の場合は、テキスト内の機密情報のみマスキング
  return maskSensitiveText(value);
}

/**
 * DOM要素が機密情報フィールドかどうかを判定
 */
export function isSensitiveElement(element: HTMLElement): boolean {
  if (!element) return false;

  // input要素の場合
  if (element.tagName === "INPUT") {
    const input = element as HTMLInputElement;

    // typeがpasswordの場合
    if (input.type === "password") return true;

    // name/id/classに機密情報のキーワードが含まれている場合
    const fieldIdentifiers = [
      input.name,
      input.id,
      input.className,
      input.getAttribute("data-field"),
      input.getAttribute("autocomplete"),
    ].filter(Boolean);

    return fieldIdentifiers.some((identifier) =>
      isSensitiveField(identifier || ""),
    );
  }

  // textarea要素の場合
  if (element.tagName === "TEXTAREA") {
    const textarea = element as HTMLTextAreaElement;
    const fieldIdentifiers = [
      textarea.name,
      textarea.id,
      textarea.className,
    ].filter(Boolean);

    return fieldIdentifiers.some((identifier) =>
      isSensitiveField(identifier || ""),
    );
  }

  return false;
}

/**
 * DOM要素のパスから機密情報を除外
 */
export function sanitizeElementPath(elementPath: string): string {
  if (!elementPath) return elementPath;

  // IDやクラス名に含まれる機密情報をマスキング
  return elementPath.replace(
    /(#|\.)(password|card|cvv|ssn|tax)[\w-]*/gi,
    "$1***",
  );
}

/**
 * オブジェクト内の機密情報をマスキング
 */
export function maskSensitiveData(
  data: Record<string, any>,
): Record<string, any> {
  if (!data || typeof data !== "object") return data;

  const maskedData: Record<string, any> = {};

  for (const [key, value] of Object.entries(data)) {
    if (value === null || value === undefined) {
      maskedData[key] = value;
      continue;
    }

    // 配列の場合は再帰的に処理
    if (Array.isArray(value)) {
      maskedData[key] = value.map((item) =>
        typeof item === "object" ? maskSensitiveData(item) : item,
      );
      continue;
    }

    // オブジェクトの場合は再帰的に処理
    if (typeof value === "object") {
      maskedData[key] = maskSensitiveData(value);
      continue;
    }

    // 文字列の場合はマスキング
    if (typeof value === "string") {
      maskedData[key] = maskFieldValue(key, value);
      continue;
    }

    maskedData[key] = value;
  }

  return maskedData;
}

/**
 * ユーザーアクションの値をマスキング
 */
export function maskUserActionValue(
  element: string,
  value?: string,
): string | undefined {
  if (!value) return value;

  // 要素パスから機密情報フィールドかどうかを判定
  const isSensitive =
    element.toLowerCase().includes("password") ||
    element.toLowerCase().includes("card") ||
    element.toLowerCase().includes("cvv") ||
    element.toLowerCase().includes("ssn");

  if (isSensitive) {
    return "*".repeat(Math.min(value.length, 12));
  }

  return maskSensitiveText(value);
}

/**
 * トラッキングデータの機密情報を一括マスキング
 */
export function sanitizeTrackingData(trackingData: any): any {
  if (!trackingData || typeof trackingData !== "object") return trackingData;

  // ディープコピーを作成
  const sanitized = JSON.parse(JSON.stringify(trackingData));

  // actions配列の処理
  if (Array.isArray(sanitized.actions)) {
    sanitized.actions = sanitized.actions.map((action: any) => ({
      ...action,
      element: sanitizeElementPath(action.element),
      value: action.value
        ? maskUserActionValue(action.element, action.value)
        : action.value,
    }));
  }

  // pageUrlからクエリパラメータの機密情報を除去
  if (sanitized.pageUrl) {
    try {
      const url = new URL(sanitized.pageUrl);
      // tokenやpasswordなどのパラメータを除去
      ["token", "password", "key", "secret", "api_key", "access_token"].forEach(
        (param) => {
          if (url.searchParams.has(param)) {
            url.searchParams.set(param, "***");
          }
        },
      );
      sanitized.pageUrl = url.toString();
    } catch {
      // URLのパースに失敗した場合はそのまま
    }
  }

  // referrerの処理
  if (sanitized.referrer) {
    try {
      const url = new URL(sanitized.referrer);
      ["token", "password", "key", "secret", "api_key", "access_token"].forEach(
        (param) => {
          if (url.searchParams.has(param)) {
            url.searchParams.set(param, "***");
          }
        },
      );
      sanitized.referrer = url.toString();
    } catch {
      // URLのパースに失敗した場合はそのまま
    }
  }

  return sanitized;
}
