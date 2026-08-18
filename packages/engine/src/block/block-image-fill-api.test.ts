import { beforeEach, describe, expect, it } from "vitest";
import { EditxEngine } from "../editx-engine";
import { BlockAPI } from "./block-api";

describe("BlockFillAPI image fills", () => {
  let block: BlockAPI;
  let graphicId: number;

  beforeEach(() => {
    const engine = new EditxEngine({ renderer: undefined });
    block = new BlockAPI(engine);
    graphicId = block.create("graphic");
    block.setFill(graphicId, block.createFill("image"));
  });

  it("applies defaults for omitted fields", () => {
    block.setFillImage(graphicId, { src: "https://example.com/a.png" });

    expect(block.getFillImage(graphicId)).toEqual({
      src: "https://example.com/a.png",
      fit: "cover",
      alignment: "center",
      offsetX: 0,
      offsetY: 0,
      scale: 1,
      rotation: 0,
      flipHorizontal: false,
      flipVertical: false,
    });
  });

  it("round-trips explicit values", () => {
    block.setFillImage(graphicId, {
      src: "img.png",
      fit: "tile",
      alignment: "bottom-right",
      offsetX: 12,
      offsetY: -8,
      scale: 2,
      rotation: -90,
      flipHorizontal: true,
      flipVertical: true,
    });

    expect(block.getFillImage(graphicId)).toEqual({
      src: "img.png",
      fit: "tile",
      alignment: "bottom-right",
      offsetX: 12,
      offsetY: -8,
      scale: 2,
      rotation: 270,
      flipHorizontal: true,
      flipVertical: true,
    });
  });

  it("updates only supplied fields", () => {
    block.setFillImage(graphicId, {
      src: "before.png",
      fit: "tile",
      alignment: "top-left",
      offsetX: 12,
      offsetY: -8,
      scale: 2,
      rotation: 90,
      flipHorizontal: true,
    });

    block.updateFillImage(graphicId, { src: "after.png" });

    expect(block.getFillImage(graphicId)).toEqual({
      src: "after.png",
      fit: "tile",
      alignment: "top-left",
      offsetX: 12,
      offsetY: -8,
      scale: 2,
      rotation: 90,
      flipHorizontal: true,
      flipVertical: false,
    });
  });

  it("returns null and ignores writes when the fill kind is not image", () => {
    block.changeFillKind(graphicId, "color");
    block.setFillImage(graphicId, { src: "img.png" });

    expect(block.getFillImage(graphicId)).toBeNull();
  });
});
