import { describe, expect, it } from "vitest";
import type { ImageFillCrop } from "../editor-types";
import { resizeImageFillCropFrame } from "./konva-image-fill-crop-frame";

const INITIAL: ImageFillCrop = {
  x: 0,
  y: 0,
  width: 200,
  height: 100,
  fit: "cover",
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
});
