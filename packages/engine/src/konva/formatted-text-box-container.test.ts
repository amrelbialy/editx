/**
 * @vitest-environment happy-dom
 *
 * The background box vs. the CONTAINER: the scene clip and the rect handed to
 * `cache()` are both derived from the block's width/height inflated by
 * `textBoxBleedRect`, which accounts for BOTH sources of outward reach — the
 * box's own padding and its shadow / stroke bleed. Because the two callers
 * share that one function, the clip and the cached/exported bitmap cannot
 * drift, and neither can crop the box.
 *
 * `getSelfRect` deliberately stays on the container rect (it drives the
 * Transformer frame) — pinned in `formatted-text-box-frame.test.ts`.
 *
 * Node construction follows `formatted-text-box-node.test.ts`: Konva's Shape
 * constructor needs a real 2D context, so the node is built off the prototype
 * with a hand-made attrs bag and deterministic text metrics (10px per char).
 */

import Konva from "konva";
import { describe, expect, it, vi } from "vitest";

const stubCtx = vi.hoisted(
  () =>
    ({
      font: "",
      measureText: (t: string) => ({ width: t.length * 10 }),
    }) as unknown as CanvasRenderingContext2D,
);

vi.mock("./formatted-text-utils", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./formatted-text-utils")>();
  return { ...actual, getDummyContext: () => stubCtx };
});

import { FormattedText } from "./formatted-text";
import type { TextBackgroundBoxStyle } from "./formatted-text-box-render";

interface Probe {
  context: Konva.Context;
  /** Args of the container clip `rect(x, y, w, h)`. */
  clip: () => number[];
  /** Args of the FIRST `roundRect` — the background box. */
  boxRect: () => number[];
}

function makeCtx(): Probe {
  const clips: number[][] = [];
  const rounds: number[][] = [];
  const noop = vi.fn();
  const ctx = {
    font: "",
    fillStyle: "",
    strokeStyle: "",
    lineWidth: 0,
    lineJoin: "" as CanvasLineJoin,
    textBaseline: "" as CanvasTextBaseline,
    textAlign: "" as CanvasTextAlign,
    shadowColor: "",
    shadowBlur: 0,
    shadowOffsetX: 0,
    shadowOffsetY: 0,
    save: noop,
    restore: noop,
    translate: noop,
    rotate: noop,
    beginPath: noop,
    closePath: noop,
    moveTo: noop,
    lineTo: noop,
    arcTo: noop,
    clip: noop,
    fill: noop,
    stroke: noop,
    fillText: noop,
    strokeText: noop,
    measureText: vi.fn(() => ({ width: 10 })),
    rect: vi.fn((...a: number[]) => {
      clips.push(a);
    }),
    roundRect: vi.fn((...a: number[]) => {
      rounds.push(a);
    }),
  } as unknown as CanvasRenderingContext2D;

  return {
    context: { _context: ctx } as unknown as Konva.Context,
    clip: () => clips[0],
    boxRect: () => rounds[0],
  };
}

function boxStyle(over: Partial<TextBackgroundBoxStyle> = {}): TextBackgroundBoxStyle {
  return {
    color: "#0000ff",
    cornerRadius: 0,
    padding: { top: 0, right: 0, bottom: 0, left: 0 },
    shadow: null,
    stroke: null,
    ...over,
  };
}

/** Text block sized the way `updateTextNode` sizes it under auto-height. */
function makeNode(attrs: Record<string, unknown> = {}): FormattedText {
  const node = Object.create(FormattedText.prototype) as FormattedText & {
    attrs: Record<string, unknown>;
    _textLines: unknown[];
    _curvedLayout: null;
    _plainTextCache: null;
  };
  node.attrs = {
    textRuns: [{ text: "Hi", style: { fontSize: 20, fontFamily: "Arial" } }],
    width: 200,
    // computedTextHeight: line box (20 × 1.2) + text/padding × 2.
    height: 32,
    lineHeight: 1.2,
    // The engine default for text blocks.
    padding: 4,
    align: "left",
    verticalAlign: "top",
    ...attrs,
  };
  node._textLines = [];
  node._curvedLayout = null;
  node._plainTextCache = null;
  return node;
}

/** Whether `rect` [x, y, w, h] fully contains the box [x, y, w, h, r]. */
function contains(outer: number[], box: number[]): boolean {
  return (
    box[0] >= outer[0] &&
    box[1] >= outer[1] &&
    box[0] + box[2] <= outer[0] + outer[2] &&
    box[1] + box[3] <= outer[1] + outer[3]
  );
}

/** The rect `cache()` hands to Konva — what a cached / exported bitmap covers. */
function cacheRect(node: FormattedText): number[] {
  const spy = vi.spyOn(Konva.Node.prototype, "cache").mockReturnValue(undefined);
  try {
    node.cache();
    const cfg = spy.mock.calls[0][0] as Record<string, number>;
    return [cfg.x, cfg.y, cfg.width, cfg.height];
  } finally {
    spy.mockRestore();
  }
}

describe("FormattedText background box — container containment", () => {
  it("keeps a zero-padding box inside the container clip", () => {
    const node = makeNode({ backgroundBox: boxStyle() });
    const probe = makeCtx();

    node._sceneFunc(probe.context);

    expect(probe.clip()).toEqual([0, 0, 200, 32]);
    expect(probe.boxRect()).toEqual([4, 4, 20, 20, 0]);
    expect(contains(probe.clip(), probe.boxRect())).toBe(true);
  });

  /**
   * Padding 14 — the shipped "Text Box" preset. The box starts at -10, well
   * outside the 200×32 container, so the clip has to be inflated by the padding
   * as well as the shadow/stroke bleed.
   */
  it("keeps a padded box inside the container clip", () => {
    const node = makeNode({
      backgroundBox: boxStyle({ padding: { top: 14, right: 14, bottom: 14, left: 14 } }),
    });
    const probe = makeCtx();

    node._sceneFunc(probe.context);

    expect(contains(probe.clip(), probe.boxRect())).toBe(true);
  });

  /**
   * Same rect, via the other caller: the cache rect drives cached / exported
   * output, so under-reporting it would crop the box in output the live canvas
   * draws.
   */
  it("caches a rect that contains a padded box", () => {
    const node = makeNode({
      backgroundBox: boxStyle({ padding: { top: 14, right: 14, bottom: 14, left: 14 } }),
    });
    const probe = makeCtx();

    node._sceneFunc(probe.context);

    expect(contains(cacheRect(node), probe.boxRect())).toBe(true);
  });

  it("documents the clip/box geometry for a padded box", () => {
    const node = makeNode({
      backgroundBox: boxStyle({ padding: { top: 14, right: 14, bottom: 14, left: 14 } }),
    });
    const probe = makeCtx();

    node._sceneFunc(probe.context);

    // bleed = max(padding) + 0 overflow = 14.
    expect(probe.clip()).toEqual([-14, -14, 228, 60]);
    expect(probe.boxRect()).toEqual([-10, -10, 48, 48, 0]);
    expect(cacheRect(node)).toEqual([-14, -14, 228, 60]);
  });

  it("adds the shadow and stroke bleed on top of the padding", () => {
    const node = makeNode({
      backgroundBox: boxStyle({
        padding: { top: 14, right: 14, bottom: 14, left: 14 },
        shadow: { color: "#000000", blur: 6, offsetX: 4, offsetY: 0 },
        stroke: { color: "#00ff00", width: 8 },
      }),
    });
    const probe = makeCtx();

    node._sceneFunc(probe.context);

    // bleed = 14 + max(6 + 4, 6 + 0, 8 / 2) = 14 + 10 = 24.
    expect(probe.clip()).toEqual([-24, -24, 248, 80]);
    expect(cacheRect(node)).toEqual([-24, -24, 248, 80]);
    expect(contains(probe.clip(), probe.boxRect())).toBe(true);
  });

  it("ignores negative padding, which only tightens the box inward", () => {
    const node = makeNode({
      backgroundBox: boxStyle({ padding: { top: -4, right: -4, bottom: -4, left: -4 } }),
    });
    const probe = makeCtx();

    node._sceneFunc(probe.context);

    expect(probe.clip()).toEqual([0, 0, 200, 32]);
    expect(contains(probe.clip(), probe.boxRect())).toBe(true);
  });

  // The paddings the shipped boxed presets use, symmetric and asymmetric.
  it.each([
    [14, 14],
    [10, 20],
    [28, 40],
  ])("contains the shipped preset padding %i / %i", (vertical, horizontal) => {
    const node = makeNode({
      backgroundBox: boxStyle({
        padding: { top: vertical, bottom: vertical, left: horizontal, right: horizontal },
      }),
    });
    const probe = makeCtx();

    node._sceneFunc(probe.context);

    expect(contains(probe.clip(), probe.boxRect())).toBe(true);
    expect(contains(cacheRect(node), probe.boxRect())).toBe(true);
  });
});
