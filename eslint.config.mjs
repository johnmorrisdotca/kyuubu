import js from "@eslint/js";
import reactHooks from "eslint-plugin-react-hooks";
import tseslint from "typescript-eslint";

export default tseslint.config(
  { ignores: [".readme-examples/", "dist", "site", "node_modules", "test-results", "playwright-report"] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ["src/**/*.{ts,tsx}", "test/**/*.ts"],
    plugins: { "react-hooks": reactHooks },
    rules: { ...reactHooks.configs.recommended.rules },
  },
  {
    files: ["scripts/**/*.mjs", "bin/**/*.mjs", "e2e/**/*.mjs", "playwright.config.mjs"],
    languageOptions: { globals: { console: "readonly", URL: "readonly", Blob: "readonly", DOMParser: "readonly", MutationObserver: "readonly", KeyboardEvent: "readonly", location: "readonly", setTimeout: "readonly", performance: "readonly", requestAnimationFrame: "readonly", document: "readonly", navigator: "readonly", window: "readonly", getComputedStyle: "readonly" } },
  },
  {
    files: ["demo/**/*.js"],
    languageOptions: {
      globals: { console: "readonly", URL: "readonly", Blob: "readonly", document: "readonly", localStorage: "readonly", matchMedia: "readonly", navigator: "readonly", performance: "readonly", requestAnimationFrame: "readonly", cancelAnimationFrame: "readonly", setTimeout: "readonly", clearTimeout: "readonly", URLSearchParams: "readonly", location: "readonly", history: "readonly" },
    },
  },
  { files: ["scripts/readme-pictures.mjs", "scripts/readme-pictures-lib.mjs"], languageOptions: { globals: { console: "readonly", process: "readonly", window: "readonly", document: "readonly", localStorage: "readonly", getComputedStyle: "readonly", URL: "readonly", URLSearchParams: "readonly" } }, rules: { "no-redeclare": ["error", { builtinGlobals: false }] } },
);
