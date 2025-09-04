// vite.config.ts
import { defineConfig } from "vite";
import tailwindcss from "@tailwindcss/vite";
import Icons from "unplugin-icons/vite";

export default defineConfig({
  base: "./",
  envPrefix: "VITAX_",
  plugins: [
    tailwindcss(),
    Icons({
      compiler: "web-components",
      webComponents: {
        autoDefine: true
      },
      autoInstall: true
    })
  ]
});
