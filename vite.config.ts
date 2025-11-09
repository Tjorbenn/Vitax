// vite.config.ts
import tailwindcss from "@tailwindcss/vite";
import Icons from "unplugin-icons/vite";
import { defineConfig } from "vite";
import { beasties } from "vite-plugin-beasties";
import viteCompression from "vite-plugin-compression";
import { VitePWA } from "vite-plugin-pwa";
import Sitemap from "vite-plugin-sitemap";

export default defineConfig({
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
    // PWA
    VitePWA({
      registerType: "autoUpdate",
      devOptions: {
        enabled: true,
      },
      includeAssets: [
        "images/favicon.ico",
        "images/apple-touch-icon-180x180.png",
        "images/logo_green.svg",
        "images/screenshot-wide.png",
        "images/screenshot-mobile.png",
      ],
      manifest: {
        name: "Vitax",
        short_name: "Vitax",
        description: "Visualizing the NCBI Taxonomy",
        theme_color: "#006c66",
        background_color: "#ffffff",
        icons: [
          {
            src: "images/pwa-64x64.png",
            sizes: "64x64",
            type: "image/png",
          },
          {
            src: "images/pwa-192x192.png",
            sizes: "192x192",
            type: "image/png",
          },
          {
            src: "images/pwa-512x512.png",
            sizes: "512x512",
            type: "image/png",
          },
          {
            src: "images/pwa-512x512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "any",
          },
          {
            src: "images/maskable-icon-512x512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "maskable",
          },
        ],
        screenshots: [
          {
            src: "images/screenshot-wide.png",
            sizes: "2560x1440",
            type: "image/png",
            form_factor: "wide",
            label: "Vitax application showing taxonomy tree visualization",
          },
          {
            src: "images/screenshot-mobile.png",
            sizes: "1082x2402",
            type: "image/png",
            form_factor: "narrow",
            label: "Vitax application on mobile device",
          },
        ],
      },
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

  preview: {
    port: 4173,
    host: true,

    headers: {
      "X-Content-Type-Options": "nosniff",
      "X-Frame-Options": "SAMEORIGIN",
      "Referrer-Policy": "strict-origin-when-cross-origin",

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
