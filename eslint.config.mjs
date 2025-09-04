// @ts-check
import js from "@eslint/js";
import eslintConfigPrettier from "eslint-config-prettier";
import globals from "globals";
import tseslint from "typescript-eslint";

/**
 * Typisierung für das Flat-Config Array.
 * @type {import('eslint').Linter.Config[]}
 */
export default [
  js.configs.recommended,
  ...tseslint.configs.strictTypeChecked,
  ...tseslint.configs.stylisticTypeChecked,
  {
    // Gilt explizit nur für TypeScript-Dateien
    files: ["**/*.ts"],
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.es2025,
      },
      parserOptions: {
        project: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      "@typescript-eslint/consistent-type-definitions": ["error"],
      "@typescript-eslint/no-unnecessary-type-assertion": "off",
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
    },
  },
  eslintConfigPrettier,
  {
    // Linter-spezifische Optionen
    linterOptions: {
      reportUnusedDisableDirectives: "warn",
      noInlineConfig: false,
    },
  },
  {
    ignores: [
      "dist",
      "build",
      "coverage",
      "**/node_modules",
      "*.config.*",
      "public",
      "eslint.config.mjs",
      "prettier.config.mjs",
      // Thesis-Ordner ausschließen (PDF, Typst Artefakte)
      "thesis/**",
    ],
  },
];
// Hinweis: defineConfig wird hier nicht benötigt; Flat Config erwartet direkt ein Array.
