import { describe, expect, it } from "vitest";

/**
 * Architecture guard: demo dependency policy.
 *
 * The demo consumes the two published packages through their public entry
 * points only. Deep engine subpaths, `@editx/image-editor/src/*` internals, and
 * relative reach-arounds into `packages/{engine,image-editor}/src` are all
 * forbidden.
 *
 * Note: the bare `@editx/engine` barrel IS allowed in the demo. It is a declared
 * workspace dependency (apps/demo/package.json) and `guide-custom-tool.tsx`
 * demonstrates the public engine API to consumers, so the demo legitimately
 * imports from the engine's published root entry point.
 *
 * Allowed public entry points (for reference, not asserted):
 *  `@editx/engine`, `@editx/engine/konva`, `@editx/image-editor`,
 *  `@editx/image-editor/vanilla`, `@editx/image-editor/element`,
 *  `@editx/image-editor/presets`, `@editx/image-editor/styles.css`.
 */

// Scan every source file under apps/demo/src, excluding tests.
const modules = import.meta.glob("../**/*.{ts,tsx}", {
  query: "?raw",
  eager: true,
  import: "default",
}) as Record<string, string>;

const FORBIDDEN_PATTERNS: RegExp[] = [
  // Deep engine subpath other than `@editx/engine/konva`.
  // biome-ignore lint/complexity/noUselessEscapeInRegex: regex copied verbatim from the ratified boundary spec
  /@editx\/engine\/(?!konva(["'\/]|$))[^"']+/,
  // Reaching into image-editor internals.
  // biome-ignore lint/complexity/noUselessEscapeInRegex: regex copied verbatim from the ratified boundary spec
  /@editx\/image-editor\/src[\/"']/,
  // Relative reach-around into a package source tree.
  /\.\.\/.*packages\/(engine|image-editor)\/src/,
];

function isScannedSource(path: string): boolean {
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
  return `demo must consume packages via their public entry points only. Offending imports:\n${lines.join("\n")}`;
}

describe("demo boundary: dependency policy", () => {
  it("does not import package internals or reach around the barrels", () => {
    const violations: Violation[] = [];

    for (const [file, source] of Object.entries(modules)) {
      if (!isScannedSource(file)) continue;

      for (const specifier of extractSpecifiers(source)) {
        if (FORBIDDEN_PATTERNS.some((pattern) => pattern.test(specifier))) {
          violations.push({ file, specifier });
        }
      }
    }

    expect(violations, formatViolations(violations)).toHaveLength(0);
  });
});
