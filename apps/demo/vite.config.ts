import path from "node:path";
import { fileURLToPath } from "node:url";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 4000,
  },
  resolve: {
    alias: {
      "@creative-editor/engine": path.resolve(__dirname, "../../packages/engine/src"),
      "@creative-editor/image-editor": path.resolve(__dirname, "../../packages/image-editor/src"),
    },
  },
});
