/**
 * @vitest-environment happy-dom
 *
 * The background box vs. the node TRANSFORM: `computeTextUnionRect` works in
 * block-local unrotated space, so the rect handed to `roundRect` must be
 * identical whatever rotation / opacity Konva applies above `_sceneFunc`, and
 * must re-anchor to an explicitly resized frame through the same align /
 * verticalAlign anchors the glyphs use.
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

/** Whether `rect` [x, y, w, h] fully contains the box [x, y, w, h, r]. */
function contains(outer: number[], box: number[]): boolean {
  return (
    box[0] >= outer[0] &&
    box[1] >= outer[1] &&
    box[0] + box[2] <= outer[0] + outer[2] &&
    box[1] + box[3] <= outer[1] + outer[3]
  );
}

describe("FormattedText background box — transform independence", () => {
  it.each([0, 45, 180, -30])("emits the same local box rect at rotation %i", (rotation) => {
    const node = makeNode({ backgroundBox: boxStyle(), rotation });
    const probe = makeCtx();

    node._sceneFunc(probe.context);

    // The union rect lives in block-local UNROTATED space; the node transform
    // is applied by Konva above `_sceneFunc` and must not leak into it.
    expect(probe.boxRect()).toEqual([4, 4, 20, 20, 0]);
    expect(probe.clip()).toEqual([0, 0, 200, 32]);
  });

  it.each([0, 0.35, 1])("emits the same local box rect at opacity %s", (opacity) => {
    const node = makeNode({ backgroundBox: boxStyle(), opacity });
    const probe = makeCtx();

    node._sceneFunc(probe.context);

    expect(probe.boxRect()).toEqual([4, 4, 20, 20, 0]);
  });

  it("re-anchors the box after an explicit resize (auto-height/width off)", () => {
    // A resize writes an explicit width/height; the box must follow the new
    // frame through the SAME align/verticalAlign anchors, not the old size.
    const node = makeNode({
      backgroundBox: boxStyle(),
      width: 400,
      height: 200,
      align: "center",
      verticalAlign: "bottom",
    });
    const probe = makeCtx();

    node._sceneFunc(probe.context);

    // x = 4 + (392 - 20) / 2 = 190; y = 4 + 192 - 20 = 176.
    expect(probe.boxRect()).toEqual([190, 176, 20, 20, 0]);
    expect(contains(probe.clip(), probe.boxRect())).toBe(true);
  });
});
