/**
 * Gappy メールデザインシステム
 * 統一されたデザインガイドラインとコンポーネント
 */

export interface EmailColors {
  primary: string;
  primaryLight: string;
  primaryDark: string;
  secondary: string;
  accent: string;
  background: string;
  surface: string;
  text: {
    primary: string;
    secondary: string;
    muted: string;
    inverse: string;
  };
  border: {
    light: string;
    medium: string;
    dark: string;
  };
  status: {
    success: string;
    warning: string;
    error: string;
    info: string;
  };
}

export interface EmailTypography {
  fontFamily: string;
  sizes: {
    xs: string;
    sm: string;
    base: string;
    lg: string;
    xl: string;
    "2xl": string;
    "3xl": string;
  };
  weights: {
    normal: string;
    medium: string;
    semibold: string;
    bold: string;
  };
  lineHeights: {
    tight: string;
    normal: string;
    relaxed: string;
  };
}

export interface EmailSpacing {
  xs: string;
  sm: string;
  md: string;
  lg: string;
  xl: string;
  "2xl": string;
  "3xl": string;
}

export interface EmailBorderRadius {
  sm: string;
  md: string;
  lg: string;
  xl: string;
  full: string;
}

export interface EmailShadows {
  sm: string;
  md: string;
  lg: string;
  xl: string;
}

// デザインシステムの定義
export const emailDesignSystem = {
  colors: {
    primary: "#22c55e",
    primaryLight: "#f0fdf4",
    primaryDark: "#16a34a",
    secondary: "#64748b",
    accent: "#f59e0b",
    background: "#ffffff",
    surface: "#f8fafc",
    text: {
      primary: "#1e293b",
      secondary: "#64748b",
      muted: "#94a3b8",
      inverse: "#ffffff",
    },
    border: {
      light: "#e2e8f0",
      medium: "#cbd5e1",
      dark: "#94a3b8",
    },
    status: {
      success: "#22c55e",
      warning: "#f59e0b",
      error: "#ef4444",
      info: "#3b82f6",
    },
  } as EmailColors,

  typography: {
    fontFamily:
      '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
    sizes: {
      xs: "12px",
      sm: "14px",
      base: "16px",
      lg: "18px",
      xl: "20px",
      "2xl": "24px",
      "3xl": "28px",
    },
    weights: {
      normal: "400",
      medium: "500",
      semibold: "600",
      bold: "700",
    },
    lineHeights: {
      tight: "1.25",
      normal: "1.5",
      relaxed: "1.75",
    },
  } as EmailTypography,

  spacing: {
    xs: "8px",
    sm: "12px",
    md: "16px",
    lg: "20px",
    xl: "24px",
    "2xl": "32px",
    "3xl": "40px",
  } as EmailSpacing,

  borderRadius: {
    sm: "6px",
    md: "8px",
    lg: "12px",
    xl: "16px",
    full: "50%",
  } as EmailBorderRadius,

  shadows: {
    sm: "0 1px 2px rgba(0, 0, 0, 0.05)",
    md: "0 4px 6px rgba(0, 0, 0, 0.1)",
    lg: "0 8px 25px rgba(0, 0, 0, 0.15)",
    xl: "0 20px 25px rgba(0, 0, 0, 0.1)",
  } as EmailShadows,
};

// 共通スタイル生成関数
export const createEmailStyles = {
  // コンテナスタイル
  container: (maxWidth: string = "600px") => `
    font-family: ${emailDesignSystem.typography.fontFamily};
    max-width: ${maxWidth};
    margin: 0 auto;
    background-color: ${emailDesignSystem.colors.background};
  `,

  // ヘッダースタイル
  header: () => `
    background: ${emailDesignSystem.colors.primary};
    padding: ${emailDesignSystem.spacing["2xl"]} ${emailDesignSystem.spacing.lg};
    text-align: center;
    border-radius: ${emailDesignSystem.borderRadius.xl} ${emailDesignSystem.borderRadius.xl} 0 0;
  `,

  // メインコンテンツスタイル
  mainContent: () => `
    padding: ${emailDesignSystem.spacing["2xl"]} ${emailDesignSystem.spacing.lg};
  `,

  // セクションスタイル
  section: (variant: "default" | "highlighted" | "card" = "default") => {
    const baseStyle = `
      margin: ${emailDesignSystem.spacing["2xl"]} 0;
      border-radius: ${emailDesignSystem.borderRadius.xl};
      padding: ${emailDesignSystem.spacing["2xl"]};
    `;

    switch (variant) {
      case "highlighted":
        return `
          ${baseStyle}
          background: linear-gradient(135deg, ${emailDesignSystem.colors.primaryLight} 0%, #ecfdf5 100%);
          border: 1px solid ${emailDesignSystem.colors.primary};
          box-shadow: 0 4px 6px rgba(34, 197, 94, 0.1);
        `;
      case "card":
        return `
          ${baseStyle}
          background: ${emailDesignSystem.colors.background};
          border: 1px solid ${emailDesignSystem.colors.border.light};
          box-shadow: ${emailDesignSystem.shadows.md};
        `;
      default:
        return baseStyle;
    }
  },

  // タイトルスタイル
  title: (level: 1 | 2 | 3 | 4 = 2) => {
    const sizes = {
      1: emailDesignSystem.typography.sizes["3xl"],
      2: emailDesignSystem.typography.sizes["2xl"],
      3: emailDesignSystem.typography.sizes.xl,
      4: emailDesignSystem.typography.sizes.lg,
    };

    return `
      color: ${emailDesignSystem.colors.text.primary};
      margin: 0 0 ${emailDesignSystem.spacing.sm} 0;
      font-size: ${sizes[level]};
      font-weight: ${emailDesignSystem.typography.weights.semibold};
      line-height: ${emailDesignSystem.typography.lineHeights.tight};
    `;
  },

  // テキストスタイル
  text: (variant: "primary" | "secondary" | "muted" = "primary") => {
    const colors = {
      primary: emailDesignSystem.colors.text.primary,
      secondary: emailDesignSystem.colors.text.secondary,
      muted: emailDesignSystem.colors.text.muted,
    };

    return `
      color: ${colors[variant]};
      margin: 0 0 ${emailDesignSystem.spacing.lg} 0;
      font-size: ${emailDesignSystem.typography.sizes.base};
      line-height: ${emailDesignSystem.typography.lineHeights.normal};
    `;
  },

  // ボタンスタイル
  button: (variant: "primary" | "secondary" = "primary") => {
    const colors = {
      primary: {
        background: emailDesignSystem.colors.primary,
        color: emailDesignSystem.colors.text.inverse,
        hover: emailDesignSystem.colors.primaryDark,
      },
      secondary: {
        background: emailDesignSystem.colors.secondary,
        color: emailDesignSystem.colors.text.inverse,
        hover: "#475569",
      },
    };

    const colorSet = colors[variant];

    return `
      display: inline-block;
      background-color: ${colorSet.background};
      color: ${colorSet.color};
      padding: ${emailDesignSystem.spacing.sm} ${emailDesignSystem.spacing.xl};
      text-decoration: none;
      border-radius: ${emailDesignSystem.borderRadius.md};
      font-weight: ${emailDesignSystem.typography.weights.semibold};
      font-size: ${emailDesignSystem.typography.sizes.sm};
      text-transform: uppercase;
      letter-spacing: 0.5px;
      box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
      transition: all 0.3s ease;
    `;
  },

  // テーブルスタイル
  table: () => `
    width: 100%;
    border-collapse: collapse;
    background: ${emailDesignSystem.colors.background};
    border-radius: ${emailDesignSystem.borderRadius.lg};
    overflow: hidden;
    box-shadow: ${emailDesignSystem.shadows.sm};
  `,

  tableRow: (variant: "default" | "striped" = "default") => {
    const baseStyle = `
      border-bottom: 1px solid ${emailDesignSystem.colors.border.light};
    `;

    if (variant === "striped") {
      return `
        ${baseStyle}
        background: ${emailDesignSystem.colors.surface};
      `;
    }

    return baseStyle;
  },

  tableCell: (variant: "header" | "data" = "data") => {
    const baseStyle = `
      padding: ${emailDesignSystem.spacing.md} ${emailDesignSystem.spacing.lg};
    `;

    if (variant === "header") {
      return `
        ${baseStyle}
        color: ${emailDesignSystem.colors.primary};
        font-weight: ${emailDesignSystem.typography.weights.bold};
        font-size: ${emailDesignSystem.typography.sizes.sm};
        text-transform: uppercase;
        letter-spacing: 0.5px;
        width: 35%;
      `;
    }

    return `
      ${baseStyle}
      color: ${emailDesignSystem.colors.text.primary};
      font-weight: ${emailDesignSystem.typography.weights.medium};
      font-size: ${emailDesignSystem.typography.sizes.sm};
    `;
  },

  // フッタースタイル
  footer: () => `
    background: ${emailDesignSystem.colors.surface};
    padding: ${emailDesignSystem.spacing.xl} ${emailDesignSystem.spacing.lg};
    text-align: center;
    border-radius: 0 0 ${emailDesignSystem.borderRadius.xl} ${emailDesignSystem.borderRadius.xl};
    border-top: 1px solid ${emailDesignSystem.colors.border.light};
  `,
};

// アイコンマッピング
export const experienceIcons: Record<string, string> = {
  "kimono-dressing-experience": "👘",
  "fountain-pen-buffet": "✒️",
  "1-pint-of-your-favorite-draft-beer": "🍺",
  "emi-authentic-sushi-making-class-in-tokyo": "🍣",
  "shibuya-pass": "🎫",
  "generic-experience": "🎯",
};

// 体験タイプ別のカラーテーマ
export const experienceThemes: Record<
  string,
  { primary: string; light: string; dark: string }
> = {
  "kimono-dressing-experience": {
    primary: "#22c55e",
    light: "#f0fdf4",
    dark: "#16a34a",
  },
  "fountain-pen-buffet": {
    primary: "#3b82f6",
    light: "#eff6ff",
    dark: "#2563eb",
  },
  "1-pint-of-your-favorite-draft-beer": {
    primary: "#f59e0b",
    light: "#fffbeb",
    dark: "#d97706",
  },
  "emi-authentic-sushi-making-class-in-tokyo": {
    primary: "#ef4444",
    light: "#fef2f2",
    dark: "#dc2626",
  },
  "shibuya-pass": {
    primary: "#8b5cf6",
    light: "#f3e8ff",
    dark: "#7c3aed",
  },
  "generic-experience": {
    primary: "#22c55e",
    light: "#f0fdf4",
    dark: "#16a34a",
  },
};
