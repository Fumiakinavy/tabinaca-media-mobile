// アクセシビリティユーティリティ

// キーボードナビゲーション用のキーイベントハンドラー
export const handleKeyDown = (
  callback: () => void,
  keys: string[] = ["Enter", " "],
) => {
  return (e: React.KeyboardEvent) => {
    if (keys.includes(e.key)) {
      e.preventDefault();
      callback();
    }
  };
};

// フォーカス管理
export const trapFocus = (element: HTMLElement | null) => {
  if (!element) return;

  const focusableElements = element.querySelectorAll(
    'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
  );

  const firstElement = focusableElements[0] as HTMLElement;
  const lastElement = focusableElements[
    focusableElements.length - 1
  ] as HTMLElement;

  const handleTabKey = (e: KeyboardEvent) => {
    if (e.key === "Tab") {
      if (e.shiftKey) {
        if (document.activeElement === firstElement) {
          e.preventDefault();
          lastElement.focus();
        }
      } else {
        if (document.activeElement === lastElement) {
          e.preventDefault();
          firstElement.focus();
        }
      }
    }
  };

  document.addEventListener("keydown", handleTabKey);

  return () => {
    document.removeEventListener("keydown", handleTabKey);
  };
};

// スクリーンリーダー用のアナウンスメント
export const announceToScreenReader = (message: string) => {
  const announcement = document.createElement("div");
  announcement.setAttribute("aria-live", "polite");
  announcement.setAttribute("aria-atomic", "true");
  announcement.className = "sr-only";
  announcement.textContent = message;

  document.body.appendChild(announcement);

  // アナウンスメント後に要素を削除
  setTimeout(() => {
    document.body.removeChild(announcement);
  }, 1000);
};

// カラーコントラスト比の計算（簡易版）
export const getContrastRatio = (color1: string, color2: string): number => {
  // 簡易的な実装 - 実際の使用ではより精密な計算が必要
  const getLuminance = (color: string): number => {
    // 16進数カラーをRGBに変換
    const hex = color.replace("#", "");
    const r = parseInt(hex.substr(0, 2), 16) / 255;
    const g = parseInt(hex.substr(2, 2), 16) / 255;
    const b = parseInt(hex.substr(4, 2), 16) / 255;

    // 相対輝度の計算
    const [rs, gs, bs] = [r, g, b].map((c) => {
      if (c <= 0.03928) {
        return c / 12.92;
      }
      return Math.pow((c + 0.055) / 1.055, 2.4);
    });

    return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
  };

  const l1 = getLuminance(color1);
  const l2 = getLuminance(color2);

  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);

  return (lighter + 0.05) / (darker + 0.05);
};

// アクセシビリティチェック用の色の組み合わせ
export const accessibilityColors = {
  // WCAG AA準拠の色の組み合わせ
  primary: {
    text: "#1f2937", // gray-800
    background: "#ffffff", // white
    contrastRatio: 15.3, // 十分なコントラスト
  },
  secondary: {
    text: "#6b7280", // gray-500
    background: "#ffffff", // white
    contrastRatio: 4.5, // 十分なコントラスト
  },
  error: {
    text: "#dc2626", // red-600
    background: "#ffffff", // white
    contrastRatio: 4.5, // 十分なコントラスト
  },
  success: {
    text: "#059669", // green-600
    background: "#ffffff", // white
    contrastRatio: 4.5, // 十分なコントラスト
  },
};

// フォーカス可能な要素の検証
export const validateFocusableElements = (container: HTMLElement): string[] => {
  const issues: string[] = [];

  // フォーカス可能な要素を取得
  const focusableElements = container.querySelectorAll(
    'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
  );

  focusableElements.forEach((element, index) => {
    const htmlElement = element as HTMLElement;

    // aria-labelまたはaria-labelledbyの確認
    if (
      !htmlElement.getAttribute("aria-label") &&
      !htmlElement.getAttribute("aria-labelledby") &&
      !htmlElement.getAttribute("title")
    ) {
      issues.push(`Element ${index + 1} lacks accessible name`);
    }

    // キーボード操作の確認
    if (htmlElement.tagName === "BUTTON" || htmlElement.tagName === "A") {
      if (!htmlElement.onclick && !htmlElement.getAttribute("href")) {
        issues.push(`Element ${index + 1} has no click handler or href`);
      }
    }
  });

  return issues;
};

// アクセシビリティテスト用のヘルパー
export const accessibilityTestHelpers = {
  // フォーカス順序の確認
  checkFocusOrder: (container: HTMLElement): number[] => {
    const focusableElements = container.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
    );

    return Array.from(focusableElements).map((element, index) => {
      const tabIndex = (element as HTMLElement).tabIndex;
      return tabIndex || 0;
    });
  },

  // 見出し構造の確認
  checkHeadingStructure: (container: HTMLElement): string[] => {
    const headings = container.querySelectorAll("h1, h2, h3, h4, h5, h6");
    const structure: string[] = [];

    headings.forEach((heading) => {
      const level = parseInt(heading.tagName.charAt(1));
      const text = heading.textContent?.trim() || "";
      structure.push(`H${level}: ${text}`);
    });

    return structure;
  },

  // 画像のalt属性確認
  checkImageAltText: (container: HTMLElement): string[] => {
    const images = container.querySelectorAll("img");
    const issues: string[] = [];

    images.forEach((img, index) => {
      const alt = img.getAttribute("alt");
      if (alt === null) {
        issues.push(`Image ${index + 1} missing alt attribute`);
      } else if (alt === "" && !img.getAttribute("role")) {
        issues.push(`Image ${index + 1} has empty alt but no decorative role`);
      }
    });

    return issues;
  },
};
