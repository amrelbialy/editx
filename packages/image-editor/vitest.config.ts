import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["src/**/*.test.{ts,tsx}"],
    environment: "happy-dom",
    setupFiles: ["./vitest.setup.ts"],
    // Lexical's ESM entry (`@lexical/react/LexicalErrorBoundary`) imports
    // `react-error-boundary`, which ships `"type": "module"` with a CJS `main`
    // and no `exports` map. Vitest's default externalized resolution can't load
    // it, so inline (transform) these deps to let Vite resolve them correctly.
    server: {
      deps: {
        inline: [/@lexical\/react/, "react-error-boundary"],
      },
    },
    coverage: {
      provider: "v8",
      include: ["src/**/*.{ts,tsx}"],
      exclude: ["src/**/*.test.{ts,tsx}", "src/**/index.ts"],
      // Coverage ratchet: a floor to prevent backsliding, not an aspirational
      // target. Values are set ~1 point below the measured baseline
      // (statements 40.07 / branches 28.97 / functions 33.99 / lines 40.92),
      // rounded down to the nearest whole percent, so an unrelated minor dip
      // won't break CI while still catching real regressions. Raise these as
      // new tests land.
      thresholds: {
        statements: 39,
        branches: 28,
        functions: 33,
        lines: 40,
      },
    },
  },
});
