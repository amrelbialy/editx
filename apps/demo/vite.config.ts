import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import mdx from "@mdx-js/rollup";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import rehypeAutolink from "rehype-autolink-headings";
import rehypeSlug from "rehype-slug";
import remarkGfm from "remark-gfm";
import { defineConfig, type Plugin } from "vite";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * Dev-only: serve the local-only docs-private/dashboard.html at /dashboard.
 * `apply: "serve"` means this never runs in (or ships with) the production build.
 */
function dashboardPlugin(): Plugin {
  const file = path.resolve(__dirname, "../../docs-private/dashboard.html");
  return {
    name: "editx-dashboard",
    apply: "serve",
    configureServer(server) {
      server.middlewares.use("/dashboard", (_req, res) => {
        res.setHeader("Content-Type", "text/html; charset=utf-8");
        if (!fs.existsSync(file)) {
          res.statusCode = 404;
          res.end(
            "<h1>No dashboard yet</h1><p>Run <code>pnpm dashboard</code> to generate it.</p>",
          );
          return;
        }
        res.end(fs.readFileSync(file));
      });
    },
  };
}

export default defineConfig({
  plugins: [
    mdx({
      providerImportSource: "@mdx-js/react",
      remarkPlugins: [remarkGfm],
      rehypePlugins: [rehypeSlug, [rehypeAutolink, { behavior: "wrap" }]],
    }),
    react(),
    tailwindcss(),
    dashboardPlugin(),
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
