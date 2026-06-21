import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["src/**/*.test.ts"],
    environment: "node",
    coverage: {
      provider: "v8",
      include: ["src/**/*.ts"],
      exclude: ["src/**/*.test.ts", "src/**/index.ts", "src/konva/**"],
      // Ratchet floors: bump these up as coverage grows (target: 75%).
      // CI fails if coverage drops below these values.
      thresholds: {
        lines: 60,
        statements: 58,
        functions: 57,
        branches: 45,
      },
    },
  },
});
