import { beforeEach, describe, expect, it } from "vitest";
import { EditxEngine } from "../editx-engine";
import { BlockAPI } from "./block-api";
import { TEXT_AUTO_WIDTH } from "./property-keys";

describe("BlockTextAPI auto-width", () => {
  let engine: EditxEngine;
  let block: BlockAPI;

  beforeEach(() => {
    engine = new EditxEngine({ renderer: undefined });
    block = new BlockAPI(engine);
  });

  it("defaults to false (unchanged fixed-width behavior)", () => {
    const id = block.create("text");
    expect(block.getTextAutoWidth(id)).toBe(false);
  });

  it("setTextAutoWidth / getTextAutoWidth round-trips", () => {
    const id = block.create("text");
    block.setTextAutoWidth(id, true);
    expect(block.getTextAutoWidth(id)).toBe(true);
    expect(engine._getBlockStore().getBool(id, TEXT_AUTO_WIDTH)).toBe(true);

    block.setTextAutoWidth(id, false);
    expect(block.getTextAutoWidth(id)).toBe(false);
  });

  it("is undoable", () => {
    const id = block.create("text");
    block.setTextAutoWidth(id, true);
    expect(block.getTextAutoWidth(id)).toBe(true);

    engine.undo();
    expect(block.getTextAutoWidth(id)).toBe(false);

    engine.redo();
    expect(block.getTextAutoWidth(id)).toBe(true);
  });
});
