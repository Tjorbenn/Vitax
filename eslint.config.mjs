// @ts-check
import js from "@eslint/js";

import eslintConfigPrettier from "eslint-config-prettier";
import jsdoc from "eslint-plugin-jsdoc";

import globals from "globals";
import path from "node:path";
import { fileURLToPath } from "node:url";
import tseslint from "typescript-eslint";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default [
  js.configs.recommended,
  ...tseslint.configs.strictTypeChecked,
  ...tseslint.configs.stylisticTypeChecked,
  eslintConfigPrettier,
  jsdoc.configs["flat/contents-typescript-error"],
  jsdoc.configs["flat/logical-typescript-error"],
  jsdoc.configs["flat/requirements-typescript-error"],
  {
    files: ["**/*.ts"],
    languageOptions: {
      parser: tseslint.parser,
      globals: {
        ...globals.browser,
        ...globals.es2025,
      },
      parserOptions: {
        project: true,
        tsconfigRootDir: __dirname,
      },
    },
    rules: {
      "@typescript-eslint/consistent-type-definitions": ["error", "type"], // Generally use type over interface
      "@typescript-eslint/no-unnecessary-type-assertion": "off",
      "@typescript-eslint/no-unnecessary-type-parameters": "off", // Rule makes using generics cumbersome
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" }, // Only allow unused variables if they start with an underscore
      ],
      "id-length": ["error", { min: 2, properties: "never", exceptions: ["x", "y"] }], // Variable names should be at least 2 characters long
      "func-style": ["error", "declaration", { allowArrowFunctions: false }], // No function expressions
      "jsdoc/require-jsdoc": [
        // Require JSDoc comments for classes, functions and methods
        "error",
        {
          require: {
            FunctionDeclaration: true,
            MethodDefinition: true,
            ClassDeclaration: true,
            ArrowFunctionExpression: false,
            FunctionExpression: false,
          },
        },
      ],
      "jsdoc/require-description": "error", // Ensure JSDoc comments have a description
      "jsdoc/require-param": "error", // Ensure all parameters are documented
      "jsdoc/require-param-description": "error", // Ensure parameter tags have a description
      "jsdoc/require-returns": "error", // Ensure return values are documented
      "jsdoc/require-returns-description": "error", // Ensure return tags have a description
      "jsdoc/require-example": "off", // Do not require examples
    },
  },
  {
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
      ".dependency-cruiser.cjs",
      "dev-dist",
      "thesis/**",
      "**/*.css",
    ],
  },
  eslintConfigPrettier,
];
