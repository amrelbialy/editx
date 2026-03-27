import path from "node:path";
import { fileURLToPath } from "node:url";
import mdx from "@mdx-js/rollup";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import rehypeAutolink from "rehype-autolink-headings";
import rehypeSlug from "rehype-slug";
import remarkGfm from "remark-gfm";
import { defineConfig } from "vite";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [
    mdx({
      providerImportSource: "@mdx-js/react",
      remarkPlugins: [remarkGfm],
      rehypePlugins: [rehypeSlug, [rehypeAutolink, { behavior: "wrap" }]],
    }),
    react(),
    tailwindcss(),
  ],
  server: { port: 4000 },
  appType: "spa",
  resolve: {
    alias: {
      "@editx/engine": path.resolve(__dirname, "../../packages/engine/src"),
      "@editx/image-editor": path.resolve(__dirname, "../../packages/image-editor/src"),
    },
  },
});
