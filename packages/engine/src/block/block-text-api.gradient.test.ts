import { beforeEach, describe, expect, it } from "vitest";
import { EditxEngine } from "../editx-engine";
import type { TextGradient } from "./block.types";
import { BlockAPI } from "./block-api";

const GRAD: TextGradient = {
  type: "linear",
  angle: 45,
  stops: [
    { offset: 0, color: "#ff0000" },
    { offset: 1, color: "#0000ff" },
  ],
};

describe("BlockTextAPI setTextGradient", () => {
  let engine: EditxEngine;
  let block: BlockAPI;
  let pageId: number;

  beforeEach(() => {
    engine = new EditxEngine({ renderer: undefined });
    block = new BlockAPI(engine);
    pageId = block.create("page");
  });

  const addTextBlock = (text: string): number => block.addText(pageId, 0, 0, 200, 60, text);

  it("sets fillGradient on the covered range and getTextRuns reflects it", () => {
    const id = addTextBlock("Hello");
    block.setTextGradient(id, 0, 5, GRAD);

    const runs = block.getTextRuns(id);
    expect(runs).toHaveLength(1);
    expect(runs[0].style.fillGradient).toEqual(GRAD);
  });

  it("null clears the gradient back to solid fill", () => {
    const id = addTextBlock("Hello");
    block.setTextGradient(id, 0, 5, GRAD);
    expect(block.getTextRuns(id)[0].style.fillGradient).toEqual(GRAD);

    block.setTextGradient(id, 0, 5, null);
    expect(block.getTextRuns(id)[0].style.fillGradient).toBeUndefined();
  });

  it("one undo reverts a gradient application", () => {
    const id = addTextBlock("Hello");
    block.setTextGradient(id, 0, 5, GRAD);
    expect(block.getTextRuns(id)[0].style.fillGradient).toEqual(GRAD);

    engine.undo();
    expect(block.getTextRuns(id)[0].style.fillGradient).toBeUndefined();

    engine.redo();
    expect(block.getTextRuns(id)[0].style.fillGradient).toEqual(GRAD);
  });

  it("applying a gradient to a sub-range splits the run", () => {
    const id = addTextBlock("Hello");
    block.setTextGradient(id, 0, 2, GRAD);

    const runs = block.getTextRuns(id);
    expect(runs.map((r) => r.text)).toEqual(["He", "llo"]);
    expect(runs[0].style.fillGradient).toEqual(GRAD);
    expect(runs[1].style.fillGradient).toBeUndefined();
  });

  it("survives snapshot restore (undo/redo) with stops preserved", () => {
    const id = addTextBlock("Hello");
    block.setTextGradient(id, 0, 5, GRAD);

    engine.undo();
    engine.redo();

    const grad = block.getTextRuns(id)[0].style.fillGradient;
    expect(grad).toEqual(GRAD);
    // Deep copied — not the same array reference as the input literal.
    expect(grad?.stops).not.toBe(GRAD.stops);
  });
});
