/** @vitest-environment happy-dom */

import Konva from "konva";
import { describe, expect, it, vi } from "vitest";
import { FormattedText } from "./formatted-text";
import type { TextBackgroundBoxStyle } from "./formatted-text-box-render";
import { resolveStyle, type TextLine } from "./formatted-text-utils";

const FRAME: TextBackgroundBoxStyle = {
  color: "#0000ff",
  geometry: "frame",
  cornerRadius: 0,
  padding: { top: 0, right: 0, bottom: 0, left: 0 },
  shadow: null,
  stroke: { color: "#00ff00", width: 8 },
};

function line(padding?: { top: number; right: number; bottom: number; left: number }): TextLine {
  return {
    width: 100,
    height: 20,
    parts: [
      {
        text: "abcdefghij",
        width: 100,
        style: resolveStyle({
          fontSize: 20,
          fontFamily: "Arial",
          backgroundColor: "#ffff00",
          backgroundPadding: padding,
        }),
      },
    ],
  };
}

function makeNode(textLine: TextLine): FormattedText {
  const node = Object.create(FormattedText.prototype) as FormattedText & {
    attrs: Record<string, unknown>;
    _textLines: TextLine[];
    _curvedLayout: null;
    _plainTextCache: string;
  };
  node.attrs = {
    width: 100,
    height: 20,
    padding: 0,
    align: "left",
    verticalAlign: "top",
    backgroundBox: FRAME,
  };
  node._textLines = [textLine];
  node._curvedLayout = null;
  node._plainTextCache = textLine.parts[0].text;
  return node;
}

function makeContext() {
  const rects: number[][] = [];
  const noop = vi.fn();
  const ctx = {
    font: "",
    fillStyle: "",
    strokeStyle: "",
    lineWidth: 0,
    lineJoin: "" as CanvasLineJoin,
    textBaseline: "" as CanvasTextBaseline,
    globalAlpha: 1,
    shadowColor: "",
    shadowBlur: 0,
    shadowOffsetX: 0,
    shadowOffsetY: 0,
    save: noop,
    restore: noop,
    beginPath: noop,
    closePath: noop,
    moveTo: noop,
    lineTo: noop,
    arcTo: noop,
    roundRect: noop,
    rect: vi.fn((...args: number[]) => rects.push(args)),
    clip: noop,
    fill: noop,
    stroke: noop,
    fillRect: noop,
    fillText: noop,
    strokeText: noop,
    measureText: (text: string) => ({ width: text.length * 10 }),
  } as unknown as CanvasRenderingContext2D;
  const context = { _context: ctx, fillStrokeShape: noop } as unknown as Konva.Context;
  return { context, rects };
}

function expectSceneAndHit(node: FormattedText, rect: number[]): void {
  const scene = makeContext();
  const hit = makeContext();
  node._sceneFunc(scene.context);
  node._hitFunc(hit.context);
  expect(scene.rects[0]).toEqual(rect);
  expect(hit.rects[0]).toEqual(rect);
}

describe("FormattedText Highlight paint bounds", () => {
  it("composes asymmetric all-edge padding with frame bleed for scene/cache/hit", () => {
    const node = makeNode(line({ top: 7, right: 13, bottom: 9, left: 11 }));
    const cache = vi.spyOn(Konva.Node.prototype, "cache").mockReturnValue(undefined);
    try {
      expectSceneAndHit(node, [-11, -7, 124, 36]);
      node.cache();
      expect(cache).toHaveBeenCalledWith({ x: -11, y: -7, width: 124, height: 36 });
      expect(node.getSelfRect()).toEqual({ x: 0, y: 0, width: 100, height: 20 });
    } finally {
      cache.mockRestore();
    }
  });

  it("keeps zero-default Highlight padding on frame-only scene/cache/hit bounds", () => {
    const node = makeNode(line());
    const cache = vi.spyOn(Konva.Node.prototype, "cache").mockReturnValue(undefined);
    try {
      expectSceneAndHit(node, [-4, -4, 108, 28]);
      node.cache();
      expect(cache).toHaveBeenCalledWith({ x: -4, y: -4, width: 108, height: 28 });
    } finally {
      cache.mockRestore();
    }
  });
});
