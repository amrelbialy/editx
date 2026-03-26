import type Konva from "konva";
import type { ExportOptions } from "../editor-types";

/** Convert a data URL string to a Blob without using fetch(). */
function dataUrlToBlob(dataUrl: string, mimeType: string): Promise<Blob> {
  return new Promise((resolve, reject) => {
    try {
      const base64 = dataUrl.split(",")[1];
      const binaryStr = atob(base64);
      const bytes = new Uint8Array(binaryStr.length);
      for (let i = 0; i < binaryStr.length; i++) {
        bytes[i] = binaryStr.charCodeAt(i);
      }
      resolve(new Blob([bytes], { type: mimeType }));
    } catch (err) {
      reject(err);
    }
  });
}

export async function exportScene(
  stage: Konva.Stage,
  contentLayer: Konva.Layer,
  uiLayer: Konva.Layer,
  pageSize: { width: number; height: number },
  options: ExportOptions,
): Promise<Blob> {
  const format = options.format ?? "png";
  const quality = options.quality ?? 0.92;
  const pixelRatio = options.pixelRatio ?? 1;
  const { width: pageW, height: pageH } = pageSize;
  const mimeType = `image/${format}`;

  const savedScaleX = contentLayer.scaleX();
  const savedScaleY = contentLayer.scaleY();
  const savedX = contentLayer.x();
  const savedY = contentLayer.y();

  contentLayer.scaleX(1);
  contentLayer.scaleY(1);
  contentLayer.x(0);
  contentLayer.y(0);

  const uiWasVisible = uiLayer.visible();
  uiLayer.visible(false);

  try {
    const dataUrl = stage.toDataURL({
      x: 0,
      y: 0,
      width: pageW,
      height: pageH,
      pixelRatio,
      mimeType,
      quality: format === "png" ? undefined : quality,
    });

    return await dataUrlToBlob(dataUrl, mimeType);
  } finally {
    contentLayer.scaleX(savedScaleX);
    contentLayer.scaleY(savedScaleY);
    contentLayer.x(savedX);
    contentLayer.y(savedY);
    uiLayer.visible(uiWasVisible);
  }
}
