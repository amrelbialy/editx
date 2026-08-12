/** @vitest-environment happy-dom */

import Konva from "konva";
import { describe, expect, it, vi } from "vitest";

const stubCtx = vi.hoisted(
  () =>
    ({
      font: "",
      measureText: (text: string) => ({ width: text.length * 10 }),
    }) as unknown as CanvasRenderingContext2D,
);

vi.mock("./formatted-text-utils", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./formatted-text-utils")>();
  return { ...actual, getDummyContext: () => stubCtx };
});

import { FormattedText } from "./formatted-text";
import type { TextBackgroundBoxStyle } from "./formatted-text-box-render";

const FRAME: TextBackgroundBoxStyle = {
  color: "#0000ff",
  geometry: "frame",
  cornerRadius: 0,
  padding: { top: 3, right: 7, bottom: 5, left: 11 },
  shadow: null,
  stroke: null,
};

function makeNode(attrs: Record<string, unknown> = {}): FormattedText {
  const node = Object.create(FormattedText.prototype) as FormattedText & {
    attrs: Record<string, unknown>;
    _textLines: unknown[];
    _curvedLayout: null;
    _plainTextCache: null;
  };
  node.attrs = {
    textRuns: [{ text: "Hello", style: { fontSize: 20, fontFamily: "Arial" } }],
    width: 100,
    height: 40,
    lineHeight: 1.2,
    padding: 99,
    wrap: "word",
    align: "left",
    verticalAlign: "top",
    backgroundBox: FRAME,
    ...attrs,
  };
  node._textLines = [];
  node._curvedLayout = null;
  node._plainTextCache = null;
  return node;
}

function makeContext() {
  const rects: number[][] = [];
  const rounds: Array<{ args: number[]; color: string }> = [];
  const text: number[][] = [];
  let pending: number[] = [];
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
    globalAlpha: 1,
    save: noop,
    restore: noop,
    beginPath: noop,
    closePath: noop,
    moveTo: noop,
    lineTo: noop,
    arcTo: noop,
    clip: noop,
    stroke: noop,
    strokeText: noop,
    measureText: (value: string) => ({ width: value.length * 10 }),
    rect: vi.fn((...args: number[]) => rects.push(args)),
    roundRect: vi.fn((...args: number[]) => {
      pending = args;
    }),
    fill: vi.fn(() => rounds.push({ args: pending, color: ctx.fillStyle })),
    fillRect: noop,
    fillText: vi.fn((_value: string, x: number, y: number) => text.push([x, y])),
  } as unknown as CanvasRenderingContext2D;
  return { context: { _context: ctx } as unknown as Konva.Context, rects, rounds, text };
}

describe("FormattedText frame geometry", () => {
  it("paints exact local transformer bounds even when text is empty", () => {
    const node = makeNode({ textRuns: [{ text: "", style: { fontSize: 20 } }] });
    const probe = makeContext();

    node._sceneFunc(probe.context);

    expect(probe.rounds[0].args).toEqual([0, 0, 100, 40, 0]);
    expect(node.getSelfRect()).toEqual({ x: 0, y: 0, width: 100, height: 40 });
  });

  it("uses frame padding as asymmetric content insets instead of text/padding", () => {
    const node = makeNode();
    const probe = makeContext();

    node._sceneFunc(probe.context);

    expect(probe.rounds[0].args).toEqual([0, 0, 100, 40, 0]);
    expect(probe.text[0]).toEqual([11, 3]);
    expect(node.getComputedWidth()).toBe(68);
    expect(node.getComputedHeight()).toBe(28);
  });

  it("uses horizontal frame insets for wrapping", () => {
    const node = makeNode({
      width: 58,
      textRuns: [{ text: "abcdefgh", style: { fontSize: 20, fontFamily: "Arial" } }],
    });
    const probe = makeContext();

    node._sceneFunc(probe.context);

    expect(probe.text).toEqual([
      [11, 3],
      [11, 27],
    ]);
  });

  it("aligns content inside asymmetric frame insets", () => {
    const node = makeNode({ align: "right", verticalAlign: "bottom" });
    const probe = makeContext();

    node._sceneFunc(probe.context);

    expect(probe.text[0]).toEqual([43, 15]);
  });

  it("paints the current explicit width and height after resize", () => {
    const node = makeNode();
    node.attrs.width = 140;
    node.attrs.height = 70;
    const probe = makeContext();

    node._sceneFunc(probe.context);

    expect(probe.rounds[0].args).toEqual([0, 0, 140, 70, 0]);
    expect(node.getSelfRect()).toEqual({ x: 0, y: 0, width: 140, height: 70 });
  });

  it("paints per-run Highlight above the frame", () => {
    const node = makeNode({
      textRuns: [{ text: "Hi", style: { fontSize: 20, backgroundColor: "#ffff00" } }],
    });
    const probe = makeContext();

    node._sceneFunc(probe.context);

    expect(probe.rounds.map((entry) => entry.color)).toEqual(["#0000ff", "#ffff00"]);
  });

  it("does not expand clip or hit bounds for frame padding", () => {
    const node = makeNode();
    const scene = makeContext();
    const hit = makeContext();
    (hit.context as unknown as { fillStrokeShape: () => void }).fillStrokeShape = vi.fn();

    node._sceneFunc(scene.context);
    node._hitFunc(hit.context);

    expect(scene.rects[0]).toEqual([0, 0, 100, 40]);
    expect(hit.rects[0]).toEqual([0, 0, 100, 40]);
  });

  it("does not expand cache for padding, but retains shadow bleed", () => {
    const cache = vi.spyOn(Konva.Node.prototype, "cache").mockReturnValue(undefined);
    try {
      makeNode().cache();
      expect(cache.mock.calls[0][0]).toEqual({ x: 0, y: 0, width: 100, height: 40 });

      makeNode({
        backgroundBox: {
          ...FRAME,
          shadow: { color: "#000000", blur: 4, offsetX: 3, offsetY: 0 },
        },
      }).cache();
      expect(cache.mock.calls[1][0]).toEqual({ x: -7, y: -7, width: 114, height: 54 });

      makeNode({
        backgroundBox: {
          ...FRAME,
          stroke: { color: "#00ff00", width: 8 },
        },
      }).cache();
      expect(cache.mock.calls[2][0]).toEqual({ x: -4, y: -4, width: 108, height: 48 });
    } finally {
      cache.mockRestore();
    }
  });
});
