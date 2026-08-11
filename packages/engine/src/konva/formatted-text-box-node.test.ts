/**
 * @vitest-environment happy-dom
 *
 * Node-level background-box behaviour on FormattedText:
 *  - the scene clip is inflated by the box's paint bleed (shadow reach + the
 *    outer half of the centred stroke) so neither is cut off,
 *  - `getSelfRect` stays on the container rect (it drives the Transformer
 *    frame — see `formatted-text-box-frame.test.ts`) while `cache()` carries
 *    the bleed instead, and
 *  - curved text suppresses the box entirely (no meaningful axis-aligned union
 *    rect along an arc) while the properties stay in the model.
 *
 * Konva's Shape constructor needs a real 2D context (absent in happy-dom), so
 * the node is built off the prototype with a hand-made attrs bag — the pattern
 * `formatted-text-curve.test.ts` established — and canvas text metrics come
 * from a deterministic stub (10px advance per character).
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

function makeCtx() {
  const clips: number[][] = [];
  const rounds: number[][] = [];
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
    save: vi.fn(),
    restore: vi.fn(),
    translate: vi.fn(),
    rotate: vi.fn(),
    beginPath: vi.fn(),
    closePath: vi.fn(),
    moveTo: vi.fn(),
    lineTo: vi.fn(),
    arcTo: vi.fn(),
    clip: vi.fn(),
    fill: vi.fn(),
    stroke: vi.fn(),
    fillText: vi.fn(),
    strokeText: vi.fn(),
    measureText: vi.fn(() => ({ width: 10 })),
    rect: vi.fn((...args: number[]) => {
      clips.push(args);
    }),
    roundRect: vi.fn((...args: number[]) => {
      rounds.push(args);
    }),
  } as unknown as CanvasRenderingContext2D;

  return { context: { _context: ctx } as unknown as Konva.Context, clips, rounds };
}

const BOX: TextBackgroundBoxStyle = {
  color: "#0000ff",
  cornerRadius: 0,
  padding: { top: 0, right: 0, bottom: 0, left: 0 },
  shadow: { color: "#000000", blur: 6, offsetX: 4, offsetY: 0 },
  stroke: { color: "#00ff00", width: 8 },
};

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
    height: 100,
    lineHeight: 1.2,
    padding: 0,
    align: "left",
    verticalAlign: "top",
    ...attrs,
  };
  node._textLines = [];
  node._curvedLayout = null;
  node._plainTextCache = null;
  return node;
}

describe("FormattedText background box — clip and bounds", () => {
  it("clips to the plain container box when no box is set", () => {
    const node = makeNode();
    const { context, clips } = makeCtx();

    node._sceneFunc(context);

    expect(clips[0]).toEqual([0, 0, 200, 100]);
    expect(node.getSelfRect()).toEqual({ x: 0, y: 0, width: 200, height: 100 });
  });

  it("inflates the clip by the box bleed while the self-rect stays on the container", () => {
    const node = makeNode({ backgroundBox: BOX });
    const { context, clips, rounds } = makeCtx();

    node._sceneFunc(context);

    // max(blur + |offsetX|, blur + |offsetY|, strokeWidth / 2) = max(10, 6, 4)
    expect(clips[0]).toEqual([-10, -10, 220, 120]);
    expect(node.getSelfRect()).toEqual({ x: 0, y: 0, width: 200, height: 100 });
    expect(rounds.length).toBeGreaterThan(0);
  });

  it("suppresses the box for curved text but keeps the property on the node", () => {
    const node = makeNode({ backgroundBox: BOX, curveRadius: 80 });
    const { context, rounds, clips } = makeCtx();

    node._sceneFunc(context);

    expect(rounds).toHaveLength(0);
    expect(clips).toHaveLength(0);
    // The resolved style is untouched — only the paint is skipped.
    expect(node.getAttr("backgroundBox")).toBe(BOX);
  });
});
