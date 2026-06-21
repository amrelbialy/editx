import { describe, expect, it } from "vitest";
import { TOOL_IDS } from "./config.types";
import { defaultConfig } from "./default-config";

/**
 * Public configuration contract for @editx/image-editor.
 *
 * Consumers configure the editor through `ImageEditorConfig`. These tests
 * lock the *shape* of that surface (tool ids + the nested key structure of
 * the default config) so accidental breaking changes fail CI. Value tweaks
 * (e.g. a default colour) are tolerated; structural changes are reviewed.
 */
describe("@editx/image-editor config contract", () => {
  it("exposes the stable set of built-in tool ids", () => {
    expect([...TOOL_IDS]).toEqual(["crop", "adjust", "filter", "text", "shapes", "image"]);
  });

  it("keeps a stable default-config shape", () => {
    expect(keyPaths(defaultConfig)).toMatchSnapshot();
  });
});

/** Collect sorted dotted key paths of an object, recursing into plain objects only. */
function keyPaths(value: unknown, prefix = ""): string[] {
  if (!isPlainObject(value)) return prefix ? [prefix] : [];
  const paths: string[] = [];
  for (const key of Object.keys(value)) {
    const next = prefix ? `${prefix}.${key}` : key;
    const child = (value as Record<string, unknown>)[key];
    if (isPlainObject(child)) {
      paths.push(...keyPaths(child, next));
    } else {
      paths.push(next);
    }
  }
  return paths.sort();
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
