module.exports = {
  extends: ["next/core-web-vitals", "eslint-config-prettier"],
  plugins: ["prettier"],
  root: true,
  env: {
    node: true,
    browser: true,
  },
  rules: {
    "react/prop-types": "off",
    "react/react-in-jsx-scope": "off",
    "react/no-unescaped-entities": "off",
    "@next/next/no-html-link-for-pages": "warn",
    "@next/next/no-img-element": "warn",
    "prettier/prettier": "warn",
    "no-console": ["warn", { allow: ["warn", "error"] }],
    "react-hooks/exhaustive-deps": "warn",
    "@typescript-eslint/no-explicit-any": "off",
  },
};
