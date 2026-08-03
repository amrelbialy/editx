import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

/**
 * Architecture guard: the engine package must stay React-free.
 *
 * The engine is pure TypeScript + Konva (see CLAUDE.md "Architecture"). A React
 * import here would leak a UI dependency into the core and break the
 * `packages/engine -> pure TypeScript, no React dependency` contract.
 *
 * This Vitest guard is authoritative; the mirrored Biome `noRestrictedImports`
 * override (root biome.json) is DX-only.
 */

// Scan every source file under packages/engine/src, excluding tests.
const modules = import.meta.glob("../**/*.{ts,tsx}", {
  query: "?raw",
  eager: true,
  import: "default",
}) as Record<string, string>;

const REACT_IMPORT_PATTERNS: RegExp[] = [
  /from\s+["']react(-dom)?(\/|["'])/,
  /import\s+["']react(-dom)?["']/,
];

function isScannedSource(path: string): boolean {
  if (path.includes("/__tests__/")) return false;
  return !/\.test\.[cm]?[jt]sx?$/.test(path);
}

interface Violation {
  file: string;
  specifier: string;
}

function formatViolations(violations: Violation[]): string {
  const lines = violations.map((v) => `  - ${v.file}: ${v.specifier}`);
  return `Engine source must not import React. Offending imports:\n${lines.join("\n")}`;
}

describe("engine boundary: React-free source", () => {
  it("has no react/react-dom imports in engine source files", () => {
    const violations: Violation[] = [];

    for (const [file, source] of Object.entries(modules)) {
      if (!isScannedSource(file)) continue;

      for (const line of source.split("\n")) {
        for (const pattern of REACT_IMPORT_PATTERNS) {
          if (pattern.test(line)) {
            violations.push({ file, specifier: line.trim() });
            break;
          }
        }
      }
    }

    expect(violations, formatViolations(violations)).toHaveLength(0);
  });
});

describe("engine boundary: React-free manifest", () => {
  it("does not declare react/react-dom in package.json", () => {
    const manifestUrl = new URL("../../package.json", import.meta.url);
    const manifest = JSON.parse(readFileSync(manifestUrl, "utf8")) as Record<
      string,
      Record<string, string> | undefined
    >;

    const fields = ["dependencies", "devDependencies", "peerDependencies"] as const;
    const forbidden = ["react", "react-dom"] as const;
    const offenders: string[] = [];

    for (const field of fields) {
      const deps = manifest[field] ?? {};
      for (const name of forbidden) {
        if (name in deps) offenders.push(`${field}.${name}`);
      }
    }

    expect(
      offenders,
      `engine package.json must not depend on React. Offending fields: ${offenders.join(", ")}`,
    ).toHaveLength(0);
  });
});
