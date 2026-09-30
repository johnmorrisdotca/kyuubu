import js from "@eslint/js";
import reactHooks from "eslint-plugin-react-hooks";
import tseslint from "typescript-eslint";

export default tseslint.config(
  { ignores: ["dist", "_site", "node_modules", "test-results", "playwright-report"] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ["src/**/*.{ts,tsx}", "test/**/*.ts"],
    plugins: { "react-hooks": reactHooks },
    rules: { ...reactHooks.configs.recommended.rules },
  },
  {
    files: ["scripts/**/*.mjs", "bin/**/*.mjs", "e2e/**/*.mjs", "playwright.config.mjs"],
    languageOptions: { globals: { console: "readonly", URL: "readonly", document: "readonly", window: "readonly", getComputedStyle: "readonly" } },
  },
  {
    files: ["demo/**/*.js"],
    languageOptions: {
      globals: { console: "readonly", URL: "readonly", Blob: "readonly", document: "readonly", localStorage: "readonly", matchMedia: "readonly", navigator: "readonly", performance: "readonly", requestAnimationFrame: "readonly", cancelAnimationFrame: "readonly", setTimeout: "readonly", URLSearchParams: "readonly", location: "readonly", history: "readonly" },
    },
  },
);
