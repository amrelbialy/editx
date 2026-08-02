import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  test: {
    include: ["src/**/*.test.{ts,tsx}"],
    environment: "node",
  },
  resolve: {
    alias: {
      "@editx/engine": path.resolve(__dirname, "../../packages/engine/src"),
      "@editx/image-editor": path.resolve(__dirname, "../../packages/image-editor/src"),
    },
  },
});
