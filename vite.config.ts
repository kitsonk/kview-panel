import { defineConfig } from "vite";
import { fresh } from "@fresh/plugin-vite";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [fresh(), tailwindcss()],
  resolve: {
    alias: [
      { find: "node:v8", replacement: new URL("./shims/v8.ts", import.meta.url).href },
      { find: "node:util", replacement: new URL("./shims/util.ts", import.meta.url).href },
    ],
  },
});
