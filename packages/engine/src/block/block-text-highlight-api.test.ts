import { beforeEach, describe, expect, it } from "vitest";
import { EditxEngine } from "../editx-engine";
import { BlockAPI } from "./block-api";

describe("BlockTextAPI per-run highlight style setters", () => {
  let engine: EditxEngine;
  let block: BlockAPI;
  let pageId: number;

  beforeEach(() => {
    engine = new EditxEngine({ renderer: undefined });
    block = new BlockAPI(engine);
    pageId = block.create("page");
  });

  const addTextBlock = (text: string): number => block.addText(pageId, 0, 0, 200, 60, text);

  it("setTextBackgroundOpacity applies within range and leaves the rest untouched", () => {
    const id = addTextBlock("Hello");
    block.setTextBackgroundOpacity(id, 0, 2, 0.5);

    const runs = block.getTextRuns(id);
    expect(runs.map((run) => run.text)).toEqual(["He", "llo"]);
    expect(runs[0].style.backgroundOpacity).toBe(0.5);
    expect(runs[1].style.backgroundOpacity).toBeUndefined();
  });

  it("setTextBackgroundOpacity(undefined) clears the field back to unset", () => {
    const id = addTextBlock("Hello");
    block.setTextBackgroundOpacity(id, 0, 5, 0.5);
    expect(block.getTextRuns(id)[0].style.backgroundOpacity).toBe(0.5);

    block.setTextBackgroundOpacity(id, 0, 5, undefined);
    expect(block.getTextRuns(id)[0].style.backgroundOpacity).toBeUndefined();
  });

  it("setTextBackgroundCornerRadius applies within range and leaves the rest untouched", () => {
    const id = addTextBlock("Hello");
    block.setTextBackgroundCornerRadius(id, 0, 2, 8);

    const runs = block.getTextRuns(id);
    expect(runs.map((run) => run.text)).toEqual(["He", "llo"]);
    expect(runs[0].style.backgroundCornerRadius).toBe(8);
    expect(runs[1].style.backgroundCornerRadius).toBeUndefined();
  });

  it("setTextBackgroundCornerRadius(undefined) clears the field back to unset", () => {
    const id = addTextBlock("Hello");
    block.setTextBackgroundCornerRadius(id, 0, 5, 8);
    expect(block.getTextRuns(id)[0].style.backgroundCornerRadius).toBe(8);

    block.setTextBackgroundCornerRadius(id, 0, 5, undefined);
    expect(block.getTextRuns(id)[0].style.backgroundCornerRadius).toBeUndefined();
  });

  it("setTextBackgroundPadding applies within range and leaves the rest untouched", () => {
    const id = addTextBlock("Hello");
    block.setTextBackgroundPadding(id, 0, 2, { top: 4, left: 6 });

    const runs = block.getTextRuns(id);
    expect(runs.map((run) => run.text)).toEqual(["He", "llo"]);
    expect(runs[0].style.backgroundPadding).toEqual({ top: 4, left: 6 });
    expect(runs[1].style.backgroundPadding).toBeUndefined();
  });

  it("setTextBackgroundPadding(undefined) clears the field back to unset", () => {
    const id = addTextBlock("Hello");
    block.setTextBackgroundPadding(id, 0, 5, { top: 4, left: 6 });
    expect(block.getTextRuns(id)[0].style.backgroundPadding).toEqual({ top: 4, left: 6 });

    block.setTextBackgroundPadding(id, 0, 5, undefined);
    expect(block.getTextRuns(id)[0].style.backgroundPadding).toBeUndefined();
  });

  it("round-trips all highlight geometry setters through undo and redo", () => {
    const id = addTextBlock("Hello");

    block.setTextBackgroundOpacity(id, 0, 5, 0.4);
    block.setTextBackgroundCornerRadius(id, 0, 5, 7);
    block.setTextBackgroundPadding(id, 0, 5, { top: 2, right: 6 });

    expect(block.getTextRuns(id)[0].style).toMatchObject({
      backgroundOpacity: 0.4,
      backgroundCornerRadius: 7,
      backgroundPadding: { top: 2, right: 6 },
    });

    engine.undo();
    engine.undo();
    engine.undo();
    expect(block.getTextRuns(id)[0].style).not.toHaveProperty("backgroundOpacity");
    expect(block.getTextRuns(id)[0].style).not.toHaveProperty("backgroundCornerRadius");
    expect(block.getTextRuns(id)[0].style).not.toHaveProperty("backgroundPadding");

    engine.redo();
    engine.redo();
    engine.redo();
    expect(block.getTextRuns(id)[0].style).toMatchObject({
      backgroundOpacity: 0.4,
      backgroundCornerRadius: 7,
      backgroundPadding: { top: 2, right: 6 },
    });
  });
});
