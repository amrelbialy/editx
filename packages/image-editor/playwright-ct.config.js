const { resolve } = require("node:path");
const { defineConfig, devices } = require("@playwright/experimental-ct-react");

module.exports = defineConfig({
  testDir: "./tests",
  snapshotDir: "./tests/snapshots",
  outputDir: "./test-results",
  timeout: 30_000,
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : 4,
  reporter: "html",

  use: {
    trace: "on-first-retry",
    ctPort: 3100,
    ctViteConfig: {
      plugins: [
        require("@vitejs/plugin-react")(),
        require("@tailwindcss/vite").default(),
      ],
      resolve: {
        alias: {
          "@creative-editor/engine": resolve(__dirname, "../engine/src"),
        },
      },
    },
  },

  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
});
