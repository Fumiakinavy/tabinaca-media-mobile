/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    // モバイルファーストのブレークポイント設定
    screens: {
      xs: "375px", // 小型スマートフォン
      sm: "480px", // スマートフォン
      md: "768px", // タブレット
      lg: "1024px", // デスクトップ
      xl: "1280px", // 大型デスクトップ
      "2xl": "1536px", // 超大型画面
      // Touch device specific breakpoints
      touch: { raw: "(pointer: coarse)" },
      "no-touch": { raw: "(pointer: fine)" },
    },
    extend: {
      colors: {
        primary: {
          50: "#f0fdf4",
          100: "#dcfce7",
          200: "#bbf7d0",
          300: "#86efac",
          400: "#4ade80",
          500: "#36D879", // メインの緑色
          600: "#2BBB6A",
          700: "#229E5B",
          800: "#1A814C",
          900: "#11643D",
          DEFAULT: "#36D879", // デフォルト
        },
      },
      fontFamily: {
        sans: [
          "Noto Sans JP",
          "Hiragino Kaku Gothic ProN",
          "Hiragino Sans",
          "Meiryo",
          "system-ui",
          "sans-serif",
        ],
      },
      // モバイル最適化のためのフォントサイズ
      fontSize: {
        xs: ["0.75rem", { lineHeight: "1rem" }],
        sm: ["0.875rem", { lineHeight: "1.25rem" }],
        base: ["1rem", { lineHeight: "1.5rem" }],
        lg: ["1.125rem", { lineHeight: "1.75rem" }],
        xl: ["1.25rem", { lineHeight: "1.75rem" }],
        "2xl": ["1.5rem", { lineHeight: "2rem" }],
        "3xl": ["1.875rem", { lineHeight: "2.25rem" }],
        "4xl": ["2.25rem", { lineHeight: "2.5rem" }],
        "5xl": ["3rem", { lineHeight: "1" }],
        "6xl": ["3.75rem", { lineHeight: "1" }],
        // モバイル専用サイズ
        "mobile-sm": ["0.8125rem", { lineHeight: "1.125rem" }],
        "mobile-base": ["0.9375rem", { lineHeight: "1.375rem" }],
        "mobile-lg": ["1.0625rem", { lineHeight: "1.5rem" }],
        "mobile-xl": ["1.1875rem", { lineHeight: "1.625rem" }],
        "mobile-2xl": ["1.375rem", { lineHeight: "1.75rem" }],
        "mobile-3xl": ["1.625rem", { lineHeight: "2rem" }],
        "mobile-4xl": ["1.875rem", { lineHeight: "2.25rem" }],
      },
      // モバイル最適化のための間隔設定
      spacing: {
        "safe-top": "env(safe-area-inset-top)",
        "safe-bottom": "env(safe-area-inset-bottom)",
        "safe-left": "env(safe-area-inset-left)",
        "safe-right": "env(safe-area-inset-right)",
        18: "4.5rem",
        88: "22rem",
        128: "32rem",
      },
      // タッチターゲットサイズ
      minHeight: {
        touch: "44px", // iOS Human Interface Guidelines
        "touch-lg": "48px", // Material Design
      },
      minWidth: {
        touch: "44px",
        "touch-lg": "48px",
      },
      animation: {
        "fade-in": "fadeIn 0.5s ease-in-out",
        "slide-up": "slideUp 0.3s ease-out",
        "slide-down": "slideDown 0.3s ease-out",
        "scale-in": "scaleIn 0.2s ease-out",
        "bounce-gentle": "bounceGentle 2s infinite",
      },
      keyframes: {
        fadeIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        slideUp: {
          "0%": { transform: "translateY(20px)", opacity: "0" },
          "100%": { transform: "translateY(0)", opacity: "1" },
        },
        slideDown: {
          "0%": { transform: "translateY(-20px)", opacity: "0" },
          "100%": { transform: "translateY(0)", opacity: "1" },
        },
        scaleIn: {
          "0%": { transform: "scale(0.95)", opacity: "0" },
          "100%": { transform: "scale(1)", opacity: "1" },
        },
        bounceGentle: {
          "0%, 20%, 50%, 80%, 100%": { transform: "translateY(0)" },
          "40%": { transform: "translateY(-4px)" },
          "60%": { transform: "translateY(-2px)" },
        },
      },
      // モバイル最適化のためのグリッド設定
      gridTemplateColumns: {
        mobile: "repeat(1, minmax(0, 1fr))",
        "mobile-2": "repeat(2, minmax(0, 1fr))",
      },
    },
  },
  plugins: [require("@tailwindcss/typography")],
};
