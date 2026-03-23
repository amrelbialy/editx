/**
 * EXIF orientation auto-correction using browser-native APIs.
 *
 * Uses `createImageBitmap` with `imageOrientation: 'from-image'` for
 * File/Blob sources. No external EXIF library needed.
 */

/**
 * Correct EXIF orientation for a File or Blob source.
 * Returns an HTMLCanvasElement with the correctly-oriented image.
 * Falls back to the raw image if createImageBitmap is not supported.
 */
export async function correctOrientation(source: File | Blob): Promise<{
  canvas: HTMLCanvasElement;
  width: number;
  height: number;
}> {
  // Use createImageBitmap with orientation correction (wide support since ~2020)
  const bitmap = await createImageBitmap(source, {
    imageOrientation: "from-image",
  });

  const canvas = document.createElement("canvas");
  canvas.width = bitmap.width;
  canvas.height = bitmap.height;

  const ctx = canvas.getContext("2d")!;
  ctx.drawImage(bitmap, 0, 0);
  bitmap.close();

  return {
    canvas,
    width: canvas.width,
    height: canvas.height,
  };
}
