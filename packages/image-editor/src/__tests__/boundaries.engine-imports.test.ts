import { describe, expect, it } from "vitest";

/**
 * Architecture guard: image-editor must import the engine through its public
 * barrel only (`@editx/engine` or `@editx/engine/konva`).
 *
 * Deep subpath imports (`@editx/engine/scene`, ...) or relative reach-arounds
 * into `packages/engine/src` bypass the published API surface and couple the UI
 * to engine internals. Both are forbidden here.
 */

// Scan every source file under packages/image-editor/src, excluding tests.
const modules = import.meta.glob("../**/*.{ts,tsx}", {
  query: "?raw",
  eager: true,
  import: "default",
}) as Record<string, string>;

// Deep engine subpath other than `@editx/engine/konva`.
// biome-ignore lint/complexity/noUselessEscapeInRegex: regex copied verbatim from the ratified boundary spec
const DEEP_ENGINE_SUBPATH = /@editx\/engine\/(?!konva(["'\/]|$))[^"']+/;
// Relative reach-around into the engine source tree. image-editor and engine
// are sibling packages, so a real reach-around resolves to `../engine/src/...`
// (not `packages/engine/src`, which only appears from outside `packages/`).
const ENGINE_REACH_AROUND = /(^|\/)\.\.(\/\.\.)*\/engine\/src\//;

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
  return `image-editor must import the engine via '@editx/engine' or '@editx/engine/konva' only. Offending imports:\n${lines.join("\n")}`;
}

describe("image-editor boundary: engine imports via public barrel", () => {
  it("only imports '@editx/engine' or '@editx/engine/konva'", () => {
    const violations: Violation[] = [];

    for (const [file, source] of Object.entries(modules)) {
      if (!isScannedSource(file)) continue;

      for (const specifier of extractSpecifiers(source)) {
        if (DEEP_ENGINE_SUBPATH.test(specifier) || ENGINE_REACH_AROUND.test(specifier)) {
          violations.push({ file, specifier });
        }
      }
    }

    expect(violations, formatViolations(violations)).toHaveLength(0);
  });
});
