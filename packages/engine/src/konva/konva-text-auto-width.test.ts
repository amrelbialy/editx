/**
 * @vitest-environment happy-dom
 *
 * updateTextNode auto-width reporting: when TEXT_AUTO_WIDTH is on, the node is
 * measured with wrapping disabled and the content-derived width is returned as
 * `computedWidth` (so the adapter can write it back to the block's SIZE_WIDTH).
 * When off, the passed-in width is applied and no computedWidth is reported.
 */

import { describe, expect, it } from "vitest";
import { TEXT_AUTO_WIDTH, TEXT_RUNS } from "../block/property-keys";
import type { FormattedText } from "./formatted-text";
import { updateTextNode } from "./konva-text-updater";

function makeTextNode(computedWidth: number): {
  node: FormattedText;
  widthArgs: () => number[];
  wrapArgs: () => string[];
} {
  const attrs = new Map<string, unknown>();
  const widthArgs: number[] = [];
  const wrapArgs: string[] = [];
  const noop = () => undefined;

  const node = {
    textRuns: noop,
    align: noop,
    lineHeight: noop,
    verticalAlign: noop,
    padding: noop,
    curveRadius: noop,
    curveDirection: noop,
    height: noop,
    shadowEnabled: noop,
    width: (v?: number) => {
      if (v !== undefined) widthArgs.push(v);
      return undefined;
    },
    wrap: (v?: string) => {
      if (v !== undefined) wrapArgs.push(v);
      return undefined;
    },
    getComputedWidth: () => computedWidth,
    getComputedHeight: () => 42,
    getAttr: (k: string) => attrs.get(k),
    setAttr: (k: string, v: unknown) => {
      attrs.set(k, v);
    },
  } as unknown as FormattedText;

  return { node, widthArgs: () => widthArgs, wrapArgs: () => wrapArgs };
}

const RUNS = [{ text: "Hello", style: { fontSize: 24, fontFamily: "Arial" } }];

describe("updateTextNode auto-width", () => {
  it("reports computedWidth and disables wrapping when auto-width is on", () => {
    const fake = makeTextNode(137);

    const result = updateTextNode(
      fake.node,
      { [TEXT_RUNS]: RUNS, [TEXT_AUTO_WIDTH]: true },
      100,
      50,
    );

    expect(result.computedWidth).toBe(137);
    // wrap is forced to "none" so the box hugs the widest line.
    expect(fake.wrapArgs()).toContain("none");
    // final width applied to the node is the content-derived width.
    expect(fake.widthArgs()).toContain(137);
  });

  it("keeps the passed width and reports no computedWidth when auto-width off", () => {
    const fake = makeTextNode(999);

    const result = updateTextNode(
      fake.node,
      { [TEXT_RUNS]: RUNS, [TEXT_AUTO_WIDTH]: false },
      100,
      50,
    );

    expect(result.computedWidth).toBeNull();
    expect(fake.widthArgs()).toContain(100);
    expect(fake.widthArgs()).not.toContain(999);
  });
});
