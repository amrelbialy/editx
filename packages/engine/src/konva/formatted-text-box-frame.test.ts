/**
 * @vitest-environment happy-dom
 *
 * Where the box bleed is and is NOT allowed to leak, pinned as a decision:
 *
 *  - `getSelfRect` stays on the CONTAINER rect. Konva's Transformer sizes its
 *    frame from `getClientRect` -> `getSelfRect`, and the pill-anchor handler
 *    in `konva-node-handlers` turns the resulting scale straight into a width.
 *    An inflated self rect would push the selection frame `bleed` px off the
 *    text on all four sides (symmetrically, even for one-sided padding) and
 *    would map a drag of `d` px onto `d * W / (W + 2 * bleed)`.
 *  - `cache()` gets the bleed explicitly instead, so cached / exported output
 *    still carries the shadow and stroke `_sceneFunc` paints outside the
 *    container.
 *
 * The scene clip and the hit area keep the bleed — see
 * `formatted-text-box-container.test.ts` and `formatted-text-box-hit.test.ts`.
 *
 * Harness mirrors `formatted-text-box-container.test.ts`: Konva's Shape
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

import type { BlockData } from "../block/block.types";
import { FormattedText } from "./formatted-text";
import type { TextBackgroundBoxStyle } from "./formatted-text-box-render";
import { attachNodeHandlers } from "./konva-node-handlers";

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

/** The shipped "Text Box" preset: padding 14, bleed 14 on a 200x32 container. */
const PADDING_14 = { top: 14, right: 14, bottom: 14, left: 14 };
const PADDED = boxStyle({ padding: PADDING_14 });

/** One-sided padding — the case an inflated self rect distorts most. */
const ONE_SIDED = boxStyle({ padding: { top: 0, right: 0, bottom: 0, left: 14 } });

const SHADOW_AND_STROKE = {
  shadow: { color: "#000000", blur: 6, offsetX: 4, offsetY: 0 },
  stroke: { color: "#00ff00", width: 8 },
};

const CONTAINER = { x: 0, y: 0, width: 200, height: 32 };

function makeNode(attrs: Record<string, unknown> = {}): FormattedText {
  const node = Object.create(FormattedText.prototype) as FormattedText & {
    attrs: Record<string, unknown>;
    _textLines: unknown[];
    _curvedLayout: null;
    _plainTextCache: null;
  };
  node.attrs = {
    textRuns: [{ text: "Hi", style: { fontSize: 20, fontFamily: "Arial" } }],
    width: CONTAINER.width,
    height: CONTAINER.height,
    lineHeight: 1.2,
    padding: 4,
    align: "left",
    verticalAlign: "top",
    ...attrs,
  };
  node.eventListeners = {};
  node._cache = new Map();
  node._textLines = [];
  node._curvedLayout = null;
  node._plainTextCache = null;
  return node;
}

/** Wires the real transform handlers with a fixed active anchor. */
function wireHandlers(node: FormattedText, anchor: string): void {
  attachNodeHandlers(node, 1, { type: "text" } as BlockData, {
    onDragEnd: vi.fn(),
    onTransformEnd: vi.fn(),
    getActiveAnchor: () => anchor,
  });
}

/**
 * Konva's Transformer scales the node so its frame follows the pointer, so a
 * pill-anchor drag of `d` px produces `(frame + d) / frame`.
 */
function scaleForDrag(frame: number, d: number): number {
  return (frame + d) / frame;
}

/** The rect `cache()` hands to Konva. */
function cacheRect(
  node: FormattedText,
  config?: Parameters<FormattedText["cache"]>[0],
): Record<string, number> {
  const spy = vi.spyOn(Konva.Node.prototype, "cache").mockReturnValue(undefined);
  try {
    node.cache(config);
    return spy.mock.calls[0][0] as Record<string, number>;
  } finally {
    spy.mockRestore();
  }
}

describe("FormattedText getSelfRect — the Transformer frame", () => {
  it("hugs the container for a padded box", () => {
    expect(makeNode({ backgroundBox: PADDED }).getSelfRect()).toEqual(CONTAINER);
  });

  it("hugs the container for one-sided padding", () => {
    expect(makeNode({ backgroundBox: ONE_SIDED }).getSelfRect()).toEqual(CONTAINER);
  });

  it("ignores the shadow and stroke bleed as well", () => {
    expect(makeNode({ backgroundBox: boxStyle(SHADOW_AND_STROKE) }).getSelfRect()).toEqual(
      CONTAINER,
    );
  });
});

describe("FormattedText pill-anchor resize — d px of drag moves the edge d px", () => {
  it("maps a horizontal drag one-to-one on a padded box", () => {
    const node = makeNode({ backgroundBox: PADDED });
    wireHandlers(node, "middle-right");

    // Sizing the frame from the bleed rect (228 wide) instead would land on
    // 200 * 268 / 228 ~= 235.1 — the edge lagging ~5px behind the pointer.
    node.scaleX(scaleForDrag(node.getSelfRect().width, 40));
    node.fire("transform");

    expect(node.width()).toBeCloseTo(240, 10);
    expect(node.scaleX()).toBe(1);
  });

  it("maps a vertical drag one-to-one on a padded box", () => {
    const node = makeNode({ backgroundBox: PADDED });
    wireHandlers(node, "bottom-center");

    node.scaleY(scaleForDrag(node.getSelfRect().height, 18));
    node.fire("transform");

    expect(node.height()).toBeCloseTo(50, 10);
    expect(node.scaleY()).toBe(1);
  });

  it("is unaffected by the box — boxed and unboxed drags agree", () => {
    const boxed = makeNode({ backgroundBox: PADDED });
    const plain = makeNode();
    wireHandlers(boxed, "middle-left");
    wireHandlers(plain, "middle-left");

    for (const node of [boxed, plain]) {
      node.scaleX(scaleForDrag(node.getSelfRect().width, -30));
      node.fire("transform");
    }

    expect(boxed.width()).toBeCloseTo(170, 10);
    expect(boxed.width()).toBeCloseTo(plain.width(), 10);
  });
});

describe("FormattedText cache — the export path keeps the bleed", () => {
  it("caches the bleed rect for a padded box", () => {
    expect(cacheRect(makeNode({ backgroundBox: PADDED }))).toEqual({
      x: -14,
      y: -14,
      width: 228,
      height: 60,
    });
  });

  it("caches the shadow and stroke reach on top of the padding", () => {
    const node = makeNode({
      backgroundBox: boxStyle({ padding: PADDING_14, ...SHADOW_AND_STROKE }),
    });

    // bleed = 14 + max(6 + 4, 6 + 0, 8 / 2) = 24.
    expect(cacheRect(node)).toEqual({ x: -24, y: -24, width: 248, height: 80 });
  });

  it("caches the plain container rect when there is no box", () => {
    expect(cacheRect(makeNode())).toEqual(CONTAINER);
  });

  it("lets an explicit rect from the caller win", () => {
    const node = makeNode({ backgroundBox: PADDED });

    expect(cacheRect(node, { x: 5, y: 6, width: 7, height: 8 })).toEqual({
      x: 5,
      y: 6,
      width: 7,
      height: 8,
    });
  });
});
