import { describe, expect, it } from "vitest";
import { createMockRenderer } from "../__tests__/mocks/mock-renderer";
import { EditxEngine } from "../editx-engine";
import { SceneAPI } from "../scene";
import type { StrokeGradient } from "./block.types";

const GRADIENT: StrokeGradient = {
  type: "linear",
  angle: 40,
  stops: [
    { offset: 0, color: "#123456" },
    { offset: 1, color: "#abcdef" },
  ],
};

function createEngine() {
  const engine = new EditxEngine({ renderer: createMockRenderer() });
  return { engine, block: engine.block, scene: new SceneAPI(engine, engine.block) };
}

describe("text stroke gradient persistence", () => {
  it("deep-copies on duplicate and survives save/load", async () => {
    const { block, scene } = createEngine();
    await scene.create();
    const pageId = scene.getCurrentPage()!;
    const textId = block.create("text");
    block.setName(textId, "Original gradient text");
    block.appendChild(pageId, textId);
    block.insertTextAt(textId, 0, "Gradient");
    block.setTextStroke(textId, 0, 8, { gradient: GRADIENT, width: 2 });

    const duplicateId = block.duplicate(textId);
    const duplicateGradient = block.getTextRuns(duplicateId)[0].style.textStrokeGradient!;
    expect(duplicateGradient).toEqual(GRADIENT);
    duplicateGradient.stops[0].color = "#ffffff";
    expect(block.getTextRuns(textId)[0].style.textStrokeGradient).toEqual(GRADIENT);

    const json = scene.saveToString();
    const loaded = createEngine();
    await loaded.scene.loadFromString(json);
    const loadedPageId = loaded.scene.getCurrentPage()!;
    const loadedTextId = loaded.block
      .getChildren(loadedPageId)
      .find((id) => loaded.block.getName(id) === "Original gradient text")!;

    expect(loaded.block.getTextRuns(loadedTextId)[0].style.textStrokeGradient).toEqual(GRADIENT);
  });
});
