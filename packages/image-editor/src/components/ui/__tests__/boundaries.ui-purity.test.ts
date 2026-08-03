import { describe, expect, it } from "vitest";

/**
 * Architecture guard: ui/ primitives must stay pure and portable so they can be
 * extracted into a standalone `@editx/ui` package later (see CLAUDE.md
 * "Design System").
 *
 * Forbidden here:
 *  - any `@editx/engine` import (primitives are engine-agnostic).
 *  - app-layer imports: `i18n/`, `config/`, `store/`, `hooks/`.
 *
 * Allowed (for reference, not asserted): relative `utils/*` (e.g. utils/cn),
 * `../styles`, sibling `ui/*`, `react`, `class-variance-authority`, `clsx`,
 * `tailwind-merge`, Radix/base-ui, `lucide-react`.
 */

// Scan every primitive under packages/image-editor/src/components/ui, no tests.
const modules = import.meta.glob("../**/*.{ts,tsx}", {
  query: "?raw",
  eager: true,
  import: "default",
}) as Record<string, string>;

const ENGINE_IMPORT = /@editx\/engine/;
const APP_LAYER_IMPORT = /(^|\/)(i18n|config|store|hooks)\//;

function isScannedSource(path: string): boolean {
  if (path.includes("/__tests__/")) return false;
  return !/\.test\.[cm]?[jt]sx?$/.test(path);
}

function extractSpecifiers(source: string): string[] {
  const specifiers: string[] = [];
  const patterns = [
    /\bfrom\s+["']([^"']+)["']/g,
    /\bimport\s+["']([^"']+)["']/g,
    /\bimport\s*\(\s*["']([^"']+)["']/g,
    /\brequire\s*\(\s*["']([^"']+)["']/g,
  ];

  for (const pattern of patterns) {
    let match: RegExpExecArray | null = pattern.exec(source);
    while (match !== null) {
      specifiers.push(match[1]);
      match = pattern.exec(source);
    }
  }

  return specifiers;
}

interface Violation {
  file: string;
  specifier: string;
}

function formatViolations(violations: Violation[]): string {
  const lines = violations.map((v) => `  - ${v.file}: ${v.specifier}`);
  return `ui/ primitives must stay pure (no engine, i18n, config, store, or hooks imports). Offending imports:\n${lines.join("\n")}`;
}

describe("image-editor boundary: ui/ primitive purity", () => {
  it("has no engine or app-layer imports in ui/ primitives", () => {
    const violations: Violation[] = [];

    for (const [file, source] of Object.entries(modules)) {
      if (!isScannedSource(file)) continue;

      for (const specifier of extractSpecifiers(source)) {
        if (ENGINE_IMPORT.test(specifier) || APP_LAYER_IMPORT.test(specifier)) {
          violations.push({ file, specifier });
        }
      }
    }

    expect(violations, formatViolations(violations)).toHaveLength(0);
  });
});
