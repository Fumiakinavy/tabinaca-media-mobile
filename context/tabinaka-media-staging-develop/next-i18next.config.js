const path = require("path");

module.exports = {
  i18n: {
    defaultLocale: "en",
    locales: ["en"],
    localeDetection: false, // ブラウザの自動言語検出を無効化
  },
  // 本番環境での翻訳読み込みを最適化
  reloadOnPrerender: process.env.NODE_ENV === "development",
  // 翻訳ファイルのプリロードを有効化
  preload: ["en"],
};
