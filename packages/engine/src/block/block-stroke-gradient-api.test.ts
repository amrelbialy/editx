import { beforeEach, describe, expect, it } from "vitest";
import { EditxEngine } from "../editx-engine";
import { BlockAPI } from "./block-api";

const GRADIENT = {
  type: "linear" as const,
  angle: 35,
  stops: [
    { offset: 0, color: "#ff0000" },
    { offset: 1, color: "#0000ff" },
  ],
};

describe("BlockStrokeAPI gradient", () => {
  let engine: EditxEngine;
  let block: BlockAPI;
  let graphicId: number;

  beforeEach(() => {
    engine = new EditxEngine({ renderer: undefined });
    block = new BlockAPI(engine);
    graphicId = block.create("graphic");
  });

  it("round-trips, clears, and preserves the solid fallback", () => {
    const solid = { r: 0.2, g: 0.4, b: 0.6, a: 0.8 };
    block.setStrokeColor(graphicId, solid);
    block.setStrokeGradient(graphicId, GRADIENT);

    expect(block.getStrokeGradient(graphicId)).toEqual(GRADIENT);
    block.setStrokeGradient(graphicId, null);

    expect(block.getStrokeGradient(graphicId)).toBeNull();
    expect(block.getStrokeColor(graphicId)).toEqual(solid);
  });

  it("defensively copies stops on set and get", () => {
    const input = structuredClone(GRADIENT);
    block.setStrokeGradient(graphicId, input);
    input.stops[0].color = "#ffffff";

    const result = block.getStrokeGradient(graphicId)!;
    expect(result.stops[0].color).toBe("#ff0000");
    result.stops[0].color = "#000000";
    expect(block.getStrokeGradient(graphicId)!.stops[0].color).toBe("#ff0000");
  });

  it("sets and clears as one undoable entry each", () => {
    block.setStrokeGradient(graphicId, GRADIENT);
    engine.undo();
    expect(block.getStrokeGradient(graphicId)).toBeNull();

    engine.redo();
    expect(block.getStrokeGradient(graphicId)).toEqual(GRADIENT);

    block.setStrokeGradient(graphicId, null);
    expect(block.getStrokeGradient(graphicId)).toBeNull();
    engine.undo();
    expect(block.getStrokeGradient(graphicId)).toEqual(GRADIENT);
  });

  it("is a no-op for non-graphic blocks", () => {
    const textId = block.create("text");
    block.setStrokeGradient(textId, GRADIENT);
    expect(block.getStrokeGradient(textId)).toBeNull();
  });
});
