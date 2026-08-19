import { describe, expect, it } from "vitest";
import type { ImageFillCrop } from "../editor-types";
import { resizeImageFillCropFrame } from "./konva-image-fill-crop-frame";

const INITIAL: ImageFillCrop = {
  x: 0,
  y: 0,
  width: 200,
  height: 100,
  mode: "crop",
  alignment: "center",
  offsetX: 0,
  offsetY: 0,
  scale: 1,
  rotation: 0,
  flipHorizontal: false,
  flipVertical: false,
};

describe("resizeImageFillCropFrame", () => {
  it("keeps image scale and center stationary while the crop frame shrinks", () => {
    const result = resizeImageFillCropFrame(
      INITIAL,
      { x: 0, y: 0, width: 100, height: 100 },
      { width: 400, height: 400 },
      0,
    );

    expect(result).toMatchObject({ width: 100, height: 100, scale: 2, offsetX: -100, offsetY: 0 });
  });

  it("recomputes automatic modes without retaining manual transforms", () => {
    const result = resizeImageFillCropFrame(
      { ...INITIAL, mode: "fit", alignment: "bottom-right", offsetX: 20, scale: 3 },
      { x: 0, y: 0, width: 100, height: 100 },
      { width: 400, height: 400 },
      0,
    );

    expect(result).toMatchObject({
      mode: "fit",
      alignment: "bottom-right",
      offsetX: 0,
      offsetY: 0,
      scale: 1,
    });
  });

  it("retains Tile scale and rebases its offset by frame center movement", () => {
    const result = resizeImageFillCropFrame(
      { ...INITIAL, mode: "tile", scale: 0.5 },
      { x: 50, y: 0, width: 200, height: 100 },
      { width: 400, height: 400 },
      0,
    );

    expect(result).toMatchObject({ mode: "tile", scale: 0.5, offsetX: 100, offsetY: 0 });
  });
});
