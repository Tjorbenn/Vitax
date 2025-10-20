// vite.config.ts
import tailwindcss from "@tailwindcss/vite";
import Icons from "unplugin-icons/vite";
import { defineConfig } from "vite";

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
  ],
});
