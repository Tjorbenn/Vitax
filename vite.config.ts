/// <reference types="vite-plus/test" />
// vite.config.ts
import { execSync } from "node:child_process";
import tailwindcss from "@tailwindcss/vite";
import Icons from "unplugin-icons/vite";
import { defineConfig } from "vite-plus";
import { beasties } from "vite-plugin-beasties";
import viteCompression from "vite-plugin-compression";
import Sitemap from "vite-plugin-sitemap";
import pkg from "./package.json" with { type: "json" };

let finalCommitHash = "unknown";
try {
  const commitHash = execSync("git rev-parse --short HEAD").toString().trim();
  const isDirty = execSync("git status --porcelain").toString().trim().length > 0;
  finalCommitHash = isDirty ? `${commitHash}*` : commitHash;
} catch (e) {
  console.warn("Could not determine git commit info", e);
}

export default defineConfig({
  staged: {
    "*": "vp check --fix",
  },
  lint: {
    plugins: ["oxc", "typescript", "unicorn", "jsdoc"],
    categories: {
      correctness: "warn",
    },
    options: {
      typeAware: true,
      typeCheck: true,
    },
    env: {
      builtin: true,
    },
    ignorePatterns: [
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
    rules: {
      "unicorn/no-new-array": "off",
      "constructor-super": "error",
      "for-direction": "error",
      "getter-return": "error",
      "no-async-promise-executor": "error",
      "no-case-declarations": "error",
      "no-class-assign": "error",
      "no-compare-neg-zero": "error",
      "no-cond-assign": "error",
      "no-const-assign": "error",
      "no-constant-binary-expression": "error",
      "no-constant-condition": "error",
      "no-control-regex": "error",
      "no-debugger": "error",
      "no-delete-var": "error",
      "no-dupe-class-members": "error",
      "no-dupe-else-if": "error",
      "no-dupe-keys": "error",
      "no-duplicate-case": "error",
      "no-empty": "error",
      "no-empty-character-class": "error",
      "no-empty-pattern": "error",
      "no-empty-static-block": "error",
      "no-ex-assign": "error",
      "no-extra-boolean-cast": "error",
      "no-fallthrough": "error",
      "no-func-assign": "error",
      "no-global-assign": "error",
      "no-import-assign": "error",
      "no-invalid-regexp": "error",
      "no-irregular-whitespace": "error",
      "no-loss-of-precision": "error",
      "no-misleading-character-class": "error",
      "no-new-native-nonconstructor": "error",
      "no-nonoctal-decimal-escape": "error",
      "no-obj-calls": "error",
      "no-prototype-builtins": "error",
      "no-redeclare": "error",
      "no-regex-spaces": "error",
      "no-self-assign": "error",
      "no-setter-return": "error",
      "no-shadow-restricted-names": "error",
      "no-sparse-arrays": "error",
      "no-this-before-super": "error",
      "no-unassigned-vars": "error",
      "no-undef": "error",
      "no-unexpected-multiline": "error",
      "no-unreachable": "error",
      "no-unsafe-finally": "error",
      "no-unsafe-negation": "error",
      "no-unsafe-optional-chaining": "error",
      "no-unused-labels": "error",
      "no-unused-private-class-members": "error",
      "no-unused-vars": "error",
      "no-useless-assignment": "error",
      "no-useless-backreference": "error",
      "no-useless-catch": "error",
      "no-useless-escape": "error",
      "no-with": "error",
      "preserve-caught-error": "error",
      "require-yield": "error",
      "use-isnan": "error",
      "valid-typeof": "error",
      "no-array-constructor": "error",
      "no-unused-expressions": "error",
      "no-useless-constructor": "error",
      "no-empty-function": "error",
      "jsdoc/check-access": "error",
      "jsdoc/check-property-names": "error",
      "jsdoc/check-tag-names": "error",
      "jsdoc/empty-tags": "error",
      "jsdoc/implements-on-classes": "error",
      "jsdoc/no-defaults": "error",
      "jsdoc/require-param": "error",
      "jsdoc/require-param-description": "error",
      "jsdoc/require-param-name": "error",
      "jsdoc/require-property": "error",
      "jsdoc/require-property-description": "error",
      "jsdoc/require-property-name": "error",
      "jsdoc/require-returns": "error",
      "jsdoc/require-returns-description": "error",
      "jsdoc/require-throws-type": "error",
      "jsdoc/require-yields": "error",
      "jsdoc/require-yields-type": "error",
      "typescript/await-thenable": "error",
      "typescript/ban-ts-comment": [
        "error",
        {
          minimumDescriptionLength: 10,
        },
      ],
      "typescript/no-array-delete": "error",
      "typescript/no-base-to-string": "error",
      "typescript/no-confusing-void-expression": "error",
      "typescript/no-deprecated": "error",
      "typescript/no-duplicate-enum-values": "error",
      "typescript/no-duplicate-type-constituents": "error",
      "typescript/no-dynamic-delete": "error",
      "typescript/no-empty-object-type": "error",
      "typescript/no-explicit-any": "error",
      "typescript/no-extra-non-null-assertion": "error",
      "typescript/no-extraneous-class": "error",
      "typescript/no-floating-promises": "error",
      "typescript/no-for-in-array": "error",
      "typescript/no-implied-eval": "error",
      "typescript/no-invalid-void-type": "error",
      "typescript/no-meaningless-void-operator": "error",
      "typescript/no-misused-new": "error",
      "typescript/no-misused-promises": "error",
      "typescript/no-misused-spread": "error",
      "typescript/no-mixed-enums": "error",
      "typescript/no-namespace": "error",
      "typescript/no-non-null-asserted-nullish-coalescing": "error",
      "typescript/no-non-null-asserted-optional-chain": "error",
      "typescript/no-non-null-assertion": "error",
      "typescript/no-redundant-type-constituents": "error",
      "typescript/no-require-imports": "error",
      "typescript/no-this-alias": "error",
      "typescript/no-unnecessary-boolean-literal-compare": "error",
      "typescript/no-unnecessary-condition": "error",
      "typescript/no-unnecessary-template-expression": "error",
      "typescript/no-unnecessary-type-arguments": "error",
      "typescript/no-unnecessary-type-assertion": "error",
      "typescript/no-unnecessary-type-constraint": "error",
      "typescript/no-unnecessary-type-conversion": "error",
      "typescript/no-unnecessary-type-parameters": "error",
      "typescript/no-unsafe-argument": "error",
      "typescript/no-unsafe-assignment": "error",
      "typescript/no-unsafe-call": "error",
      "typescript/no-unsafe-declaration-merging": "error",
      "typescript/no-unsafe-enum-comparison": "error",
      "typescript/no-unsafe-function-type": "error",
      "typescript/no-unsafe-member-access": "error",
      "typescript/no-unsafe-return": "error",
      "typescript/no-unsafe-unary-minus": "error",
      "typescript/no-useless-default-assignment": "error",
      "typescript/no-wrapper-object-types": "error",
      "typescript/only-throw-error": "error",
      "typescript/prefer-as-const": "error",
      "typescript/prefer-literal-enum-member": "error",
      "typescript/prefer-namespace-keyword": "error",
      "typescript/prefer-promise-reject-errors": "error",
      "typescript/prefer-reduce-type-parameter": "error",
      "typescript/prefer-return-this-type": "error",
      "typescript/related-getter-setter-pairs": "error",
      "typescript/require-await": "error",
      "typescript/restrict-plus-operands": [
        "error",
        {
          allowAny: false,
          allowBoolean: false,
          allowNullish: false,
          allowNumberAndString: false,
          allowRegExp: false,
        },
      ],
      "typescript/restrict-template-expressions": [
        "error",
        {
          allowAny: false,
          allowBoolean: false,
          allowNever: false,
          allowNullish: false,
          allowNumber: false,
          allowRegExp: false,
        },
      ],
      "typescript/return-await": ["error", "error-handling-correctness-only"],
      "typescript/triple-slash-reference": "error",
      "typescript/unbound-method": "error",
      "typescript/unified-signatures": "error",
      "typescript/use-unknown-in-catch-callback-variable": "error",
      "typescript/adjacent-overload-signatures": "error",
      "typescript/array-type": "error",
      "typescript/ban-tslint-comment": "error",
      "typescript/class-literal-property-style": "error",
      "typescript/consistent-generic-constructors": "error",
      "typescript/consistent-indexed-object-style": "error",
      "typescript/consistent-type-assertions": "error",
      "typescript/consistent-type-definitions": "error",
      "typescript/no-confusing-non-null-assertion": "error",
      "typescript/no-inferrable-types": "error",
      "typescript/non-nullable-type-assertion-style": "error",
      "typescript/prefer-find": "error",
      "typescript/prefer-for-of": "error",
      "typescript/prefer-function-type": "error",
      "typescript/prefer-includes": "error",
      "typescript/prefer-nullish-coalescing": "error",
      "typescript/prefer-optional-chain": "error",
      "typescript/prefer-regexp-exec": "error",
      "typescript/prefer-string-starts-ends-with": "error",
      "vite-plus/prefer-vite-plus-imports": "error",
    },
    overrides: [
      {
        files: ["**/*.ts", "**/*.tsx", "**/*.mts", "**/*.cts"],
        rules: {
          "constructor-super": "off",
          "getter-return": "off",
          "no-class-assign": "off",
          "no-const-assign": "off",
          "no-dupe-class-members": "off",
          "no-dupe-keys": "off",
          "no-func-assign": "off",
          "no-import-assign": "off",
          "no-new-native-nonconstructor": "off",
          "no-obj-calls": "off",
          "no-redeclare": "off",
          "no-setter-return": "off",
          "no-this-before-super": "off",
          "no-undef": "off",
          "no-unreachable": "off",
          "no-unsafe-negation": "off",
          "no-var": "error",
          "no-with": "off",
          "prefer-const": "error",
          "prefer-rest-params": "error",
          "prefer-spread": "error",
        },
      },
      {
        files: ["**/*.ts"],
        rules: {
          "id-length": [
            "error",
            {
              min: 2,
              properties: "never",
              checkGeneric: false,
              exceptions: ["e", "K", "_"],
            },
          ],
          "func-style": [
            "error",
            "declaration",
            {
              allowArrowFunctions: false,
            },
          ],
          "no-restricted-properties": [
            "error",
            {
              property: "querySelector",
              message:
                "Use requireElement(parent, selector) or optionalElement(parent, selector) instead.",
            },
            {
              property: "querySelectorAll",
              message: "Use queryElements(parent, selector) instead.",
            },
            {
              property: "getElementById",
              message:
                "Use requireElement(document, '#id') or optionalElement(document, '#id') instead.",
            },
            {
              property: "getElementsByClassName",
              message: "Use queryElements(parent, '.class') instead.",
            },
            {
              property: "getElementsByTagName",
              message: "Use queryElements(parent, 'tag') instead.",
            },
          ],
          "no-unused-vars": [
            "error",
            {
              argsIgnorePattern: "^_",
              varsIgnorePattern: "^_",
            },
          ],
          "typescript/consistent-type-definitions": ["error", "type"],
          "typescript/no-unnecessary-type-assertion": "off",
          "typescript/no-unnecessary-type-parameters": "off",
        },
        env: {
          browser: true,
          es2026: true,
        },
      },
      {
        files: ["src/visualizations/**/*.ts", "src/components/Visualization/**/*.ts"],
        rules: {
          "id-length": [
            "error",
            {
              min: 2,
              properties: "never",
              checkGeneric: false,
              exceptions: ["x", "y", "e", "K", "_"],
            },
          ],
        },
      },
      {
        files: ["**/*.test.ts"],
        rules: {
          "id-length": [
            "error",
            {
              min: 2,
              properties: "never",
              checkGeneric: false,
              exceptions: ["A", "B", "x", "y", "e", "K", "_"],
            },
          ],
        },
      },
    ],
    jsPlugins: [
      {
        name: "vite-plus",
        specifier: "vite-plus/oxlint-plugin",
      },
    ],
  },
  fmt: {
    printWidth: 100,
    singleQuote: false,
    trailingComma: "all",
    bracketSpacing: true,
    arrowParens: "always",
    semi: true,
    tabWidth: 2,
    useTabs: false,
    endOfLine: "lf",
    sortTailwindcss: {},
    sortPackageJson: false,
    ignorePatterns: [
      "dist",
      "build",
      "coverage",
      "node_modules",
      "public",
      "thesis",
      ".dependency-cruiser.cjs",
    ],
  },
  test: {
    environment: "jsdom",
    coverage: {
      provider: "v8",
      reporter: ["text"],
      all: true,
      include: ["src/**/*.ts"],
      exclude: [
        "src/**/*.test.ts",
        "src/**/*.d.ts",
        "src/vite-env.d.ts",
        "src/components/*/**/*Component.ts",
        "src/**/*Modal.ts",
        "src/visualizations/renderers/**",
      ],
      thresholds: {
        statements: 52,
        branches: 36,
        functions: 62,
        lines: 52,
      },
    },
  },
  define: {
    "import.meta.env.VITAX_COMMIT_HASH": JSON.stringify(finalCommitHash),
    "import.meta.env.VITAX_VERSION": JSON.stringify(pkg.version),
  },
  base: "./",
  envPrefix: "VITAX_",

  plugins: [
    tailwindcss(),
    Icons({
      compiler: "web-components",
      webComponents: {
        autoDefine: true,
      },
      autoInstall: true,
    }),
    // Inline critical CSS
    beasties({
      options: {
        path: "dist",
        preload: "swap",
        inlineFonts: false,
        preloadFonts: false,
        pruneSource: false,
        reduceInlineStyles: false,
      },
    }),
    // Brotli compression
    viteCompression({
      algorithm: "brotliCompress",
      ext: ".br",
      threshold: 1024, // Compress files > 1KB
      deleteOriginFile: false,
    }),
    // Sitemap
    Sitemap({
      hostname: "https://neighbors.evolbio.mpg.de",
      basePath: "/vitax",
      generateRobotsTxt: true,
      outDir: "dist",
      robots: [
        {
          userAgent: "*",
          allow: "/",
        },
      ],
    }),
  ],

  build: {
    target: "esnext",
    minify: "esbuild",
    cssCodeSplit: false,
    sourcemap: false,
    manifest: true,
    assetsInlineLimit: 4096,

    rollupOptions: {
      output: {
        // Better caching
        manualChunks: (id) => {
          if (id.includes("node_modules")) {
            if (id.includes("d3")) return "vendor-d3";
            return "vendor";
          }
        },
        // Cache busting
        chunkFileNames: "assets/js/[name]-[hash].js",
        entryFileNames: "assets/js/[name]-[hash].js",
        assetFileNames: (assetInfo) => {
          const ext = assetInfo.name?.split(".").pop();
          if (ext && /^(woff2?|eot|ttf|otf)$/.test(ext)) {
            return "assets/fonts/[name]-[hash][extname]";
          }
          if (ext && /^(png|jpe?g|svg|gif|webp|ico)$/.test(ext)) {
            return "assets/images/[name]-[hash][extname]";
          }
          return "assets/[name]-[hash][extname]";
        },
      },
    },
  },

  server: {
    headers: {
      "Cache-Control": "no-store",
    },
  },

  preview: {
    port: 4173,
    host: true,

    headers: {
      "X-Content-Type-Options": "nosniff",
      "X-Frame-Options": "SAMEORIGIN",
      "Referrer-Policy": "strict-origin-when-cross-origin",

      "Cache-Control": "no-store",

      "Content-Security-Policy": [
        "default-src 'self'",
        "script-src 'self' 'unsafe-inline'",
        "style-src 'self' 'unsafe-inline'",
        "img-src 'self' data: https:",
        "font-src 'self' data:",
        "connect-src 'self' https://neighbors.evolbio.mpg.de https://api.ncbi.nlm.nih.gov https://api.semanticscholar.org",
      ].join("; "),
    },
  },
});
