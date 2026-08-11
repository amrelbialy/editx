/**
 * @vitest-environment happy-dom
 *
 * The THIRD rect derived from the same geometry: the hit area. It is inflated
 * by the shared `textBoxBleedRect` exactly like the scene clip, so everything
 * the block can paint — the box's own padding, its shadow and the outer half
 * of its stroke — is clickable. Leaving it on the bare container rect would
 * make clicks on the visible padded box fall through to whatever is behind.
 *
 * It deliberately does NOT match `getSelfRect` (the Transformer frame, pinned
 * in `formatted-text-box-frame.test.ts`): the frame is what you resize, the hit
 * area is what you click.
 *
 * Harness mirrors `formatted-text-box-container.test.ts`: Konva's Shape
 * constructor needs a real 2D context, so the node is built off the prototype
 * with a hand-made attrs bag and deterministic text metrics (10px per char).
 */

import type Konva from "konva";
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
  /** Args of every `rect(x, y, w, h)` — the scene clip, or the hit rect. */
  rects: number[][];
  filled: () => boolean;
}

function makeCtx(): Probe {
  const rects: number[][] = [];
  const noop = vi.fn();
  const fillStrokeShape = vi.fn();
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
      rects.push(a);
    }),
    roundRect: noop,
  } as unknown as CanvasRenderingContext2D;

  return {
    context: { _context: ctx, fillStrokeShape } as unknown as Konva.Context,
    rects,
    filled: () => fillStrokeShape.mock.calls.length > 0,
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

/** The shipped "Text Box" preset. */
const PADDED = boxStyle({ padding: { top: 14, right: 14, bottom: 14, left: 14 } });

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
    height: 32,
    lineHeight: 1.2,
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

describe("FormattedText _hitFunc — the visible box is clickable", () => {
  it("stays on the container when there is no box", () => {
    const hit = makeCtx();

    makeNode()._hitFunc(hit.context);

    expect(hit.rects[0]).toEqual([0, 0, 200, 32]);
    expect(hit.filled()).toBe(true);
  });

  it("matches the scene clip for a padded box", () => {
    const node = makeNode({ backgroundBox: PADDED });
    const scene = makeCtx();
    const hit = makeCtx();

    node._sceneFunc(scene.context);
    node._hitFunc(hit.context);

    expect(hit.rects[0]).toEqual([-14, -14, 228, 60]);
    expect(hit.rects[0]).toEqual(scene.rects[0]);
  });

  it("covers one-sided padding symmetrically, like the clip", () => {
    const node = makeNode({
      backgroundBox: boxStyle({ padding: { top: 0, right: 0, bottom: 0, left: 14 } }),
    });
    const hit = makeCtx();

    node._hitFunc(hit.context);

    expect(hit.rects[0]).toEqual([-14, -14, 228, 60]);
  });

  it("covers the shadow and stroke reach as well", () => {
    const node = makeNode({
      backgroundBox: boxStyle({
        shadow: { color: "#000000", blur: 6, offsetX: 4, offsetY: 0 },
        stroke: { color: "#00ff00", width: 8 },
      }),
    });
    const hit = makeCtx();

    node._hitFunc(hit.context);

    // max(blur + |offsetX|, blur + |offsetY|, strokeWidth / 2) = 10.
    expect(hit.rects[0]).toEqual([-10, -10, 220, 52]);
  });

  it("falls back to the computed height when the node has none", () => {
    const node = makeNode({ backgroundBox: PADDED, height: 0 });
    const hit = makeCtx();

    node._hitFunc(hit.context);

    // computedTextHeight = 20 × 1.2 + text padding 4 × 2 = 32, then bleed 14.
    expect(hit.rects[0]).toEqual([-14, -14, 228, 60]);
  });

  it("still uses the arc bbox for curved text", () => {
    const node = makeNode({ backgroundBox: PADDED, curveRadius: 80 });
    const hit = makeCtx();

    node._hitFunc(hit.context);

    expect(hit.rects[0][2]).toBeGreaterThan(0);
    expect(hit.rects[0]).not.toEqual([-14, -14, 228, 60]);
  });
});
