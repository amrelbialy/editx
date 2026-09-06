import { beforeEach, describe, expect, it } from "vitest";
import { EditxEngine } from "../editx-engine";
import type { StrokeGradient } from "./block.types";
import { BlockAPI } from "./block-api";
import { cssStringToRunStyle, runStyleToCssString, textRunStyleToCssPatch } from "./lexical-bridge";
import { stylesEqual } from "./text-run-utils";

const GRADIENT: StrokeGradient = {
  type: "linear",
  angle: 25,
  stops: [
    { offset: 0, color: "#ff0000" },
    { offset: 1, color: "#0000ff" },
  ],
};

describe("text stroke gradient model", () => {
  let block: BlockAPI;
  let textId: number;

  beforeEach(() => {
    block = new BlockAPI(new EditxEngine({ renderer: undefined }));
    textId = block.create("text");
    block.insertTextAt(textId, 0, "Gradient");
  });

  it("sets, preserves when omitted, and clears on null", () => {
    block.setTextStroke(textId, 0, 8, { gradient: GRADIENT });
    expect(block.getTextRuns(textId)[0].style.textStrokeGradient).toEqual(GRADIENT);

    block.setTextStroke(textId, 0, 8, { width: 3 });
    expect(block.getTextRuns(textId)[0].style.textStrokeGradient).toEqual(GRADIENT);

    block.setTextStroke(textId, 0, 8, { gradient: null });
    expect(block.getTextRuns(textId)[0].style.textStrokeGradient).toBeUndefined();
    expect(block.getTextRuns(textId)[0].style.textStrokeWidth).toBe(3);
  });

  it("owns a defensive copy of the caller's gradient", () => {
    const gradient = structuredClone(GRADIENT);
    block.setTextStroke(textId, 0, 8, { gradient });

    gradient.angle = 90;
    gradient.stops[0].color = "#ffffff";

    expect(block.getTextRuns(textId)[0].style.textStrokeGradient).toEqual(GRADIENT);
  });

  it("includes stroke gradients in run equality", () => {
    expect(stylesEqual({ textStrokeGradient: GRADIENT }, { textStrokeGradient: GRADIENT })).toBe(
      true,
    );
    expect(
      stylesEqual(
        { textStrokeGradient: GRADIENT },
        { textStrokeGradient: { ...GRADIENT, angle: 90 } },
      ),
    ).toBe(false);
  });

  it("round-trips through Lexical CSS and supports set/clear patches", () => {
    const css = runStyleToCssString({ textStrokeGradient: GRADIENT });
    expect(cssStringToRunStyle(css).textStrokeGradient).toEqual(GRADIENT);

    const setPatch = textRunStyleToCssPatch({ textStrokeGradient: GRADIENT });
    expect(setPatch["--text-stroke-gradient"]).toBe(encodeURIComponent(JSON.stringify(GRADIENT)));
    expect(
      textRunStyleToCssPatch({ textStrokeGradient: null })["--text-stroke-gradient"],
    ).toBeNull();
    expect("--text-stroke-gradient" in textRunStyleToCssPatch({ textStrokeWidth: 2 })).toBe(false);
  });
});
