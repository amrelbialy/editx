import { beforeEach, describe, expect, it } from "vitest";
import { EditxEngine } from "../editx-engine";
import { BlockAPI } from "./block-api";
import {
  FILL_IMAGE_ALIGNMENT,
  FILL_IMAGE_MODE,
  FILL_IMAGE_OFFSET_X,
  FILL_IMAGE_SCALE,
} from "./property-keys";

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
      mode: "crop",
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
      mode: "tile",
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
      mode: "tile",
      alignment: "center",
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
      mode: "tile",
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
      mode: "tile",
      alignment: "center",
      offsetX: 12,
      offsetY: -8,
      scale: 2,
      rotation: 90,
      flipHorizontal: true,
      flipVertical: false,
    });
  });

  it("normalizes fields by mode and resets destructive transitions", () => {
    block.setFillImage(graphicId, {
      src: "img.png",
      mode: "crop",
      alignment: "top-left",
      offsetX: 12,
      offsetY: -8,
      scale: 0.5,
    });
    expect(block.getFillImage(graphicId)).toMatchObject({
      mode: "crop",
      alignment: "center",
      offsetX: 12,
      offsetY: -8,
      scale: 1,
    });

    block.updateFillImage(graphicId, { mode: "cover" });
    expect(block.getFillImage(graphicId)).toMatchObject({
      mode: "cover",
      alignment: "center",
      offsetX: 0,
      offsetY: 0,
      scale: 1,
    });

    block.updateFillImage(graphicId, { mode: "fit", alignment: "bottom-right" });
    block.updateFillImage(graphicId, { mode: "cover" });
    expect(block.getFillImage(graphicId)).toMatchObject({
      mode: "cover",
      alignment: "bottom-right",
    });

    block.updateFillImage(graphicId, { mode: "tile", offsetX: 3, scale: 0.1 });
    expect(block.getFillImage(graphicId)).toMatchObject({
      mode: "tile",
      alignment: "center",
      offsetX: 3,
      offsetY: 0,
      scale: 0.1,
    });
  });

  it("normalizes mode relevance when reading directly loaded properties", () => {
    const fillId = block.getFill(graphicId)!;
    block.setString(fillId, FILL_IMAGE_MODE, "cover");
    block.setString(fillId, FILL_IMAGE_ALIGNMENT, "top-left");
    block.setFloat(fillId, FILL_IMAGE_OFFSET_X, 25);
    block.setFloat(fillId, FILL_IMAGE_SCALE, 3);

    expect(block.getFillImage(graphicId)).toMatchObject({
      mode: "cover",
      alignment: "top-left",
      offsetX: 0,
      scale: 1,
    });
  });

  it("returns null and ignores writes when the fill kind is not image", () => {
    block.changeFillKind(graphicId, "color");
    block.setFillImage(graphicId, { src: "img.png" });

    expect(block.getFillImage(graphicId)).toBeNull();
  });
});
