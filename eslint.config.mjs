// @ts-check
import js from "@eslint/js";
import eslintConfigPrettier from "eslint-config-prettier";
import prettierPlugin from "eslint-plugin-prettier";
import globals from "globals";
import path from "node:path";
import { fileURLToPath } from "node:url";
import tseslint from "typescript-eslint";

// ESM-kompatibles __dirname (statt inoffiziellem import.meta.dirname)
const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * Typisierung für das Flat-Config Array.
 * @type {import('eslint').Linter.Config[]}
 */
export default [
  js.configs.recommended,
  ...tseslint.configs.strictTypeChecked,
  ...tseslint.configs.stylisticTypeChecked,
  {
    // Prettier als Fehlerquelle (muss vor eslint-config-prettier stehen)
    plugins: { prettier: prettierPlugin },
    rules: {
      "prettier/prettier": [
        "error",
        {
          endOfLine: "auto",
        },
      ],
    },
  },
  {
    // Gilt explizit nur für TypeScript-Dateien
    files: ["**/*.ts"],
    languageOptions: {
      parser: tseslint.parser,
      globals: {
        ...globals.browser,
        ...globals.es2025,
      },
      parserOptions: {
        // Typed-Linting aktivieren (nutzt nächstgelegene tsconfig)
        project: true,
        tsconfigRootDir: __dirname,
      },
    },
    rules: {
      "@typescript-eslint/consistent-type-definitions": ["error", "type"],
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
