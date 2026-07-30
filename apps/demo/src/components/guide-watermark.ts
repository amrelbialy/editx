/**
 * Stamps a diagonal "© EDITX" watermark across an exported image blob and
 * returns a new PNG blob. Used by the watermark-on-save guide's live demo so
 * clicking Export downloads a genuinely watermarked file.
 */
export async function stampWatermark(blob: Blob): Promise<Blob> {
  const bitmap = await createImageBitmap(blob);

  const canvas = document.createElement("canvas");
  canvas.width = bitmap.width;
  canvas.height = bitmap.height;

  const ctx = canvas.getContext("2d");
  if (!ctx) return blob;

  ctx.drawImage(bitmap, 0, 0);
  bitmap.close();

  // Tile a repeated, semi-transparent label diagonally across the image.
  const label = "© EDITX";
  const fontSize = Math.max(24, Math.round(canvas.width / 18));
  ctx.font = `600 ${fontSize}px system-ui, sans-serif`;
  ctx.fillStyle = "rgba(255, 255, 255, 0.35)";
  ctx.strokeStyle = "rgba(0, 0, 0, 0.25)";
  ctx.lineWidth = Math.max(1, fontSize / 24);
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  const step = fontSize * 6;
  ctx.save();
  ctx.translate(canvas.width / 2, canvas.height / 2);
  ctx.rotate(-Math.PI / 6);
  for (let y = -canvas.height; y < canvas.height; y += step) {
    for (let x = -canvas.width; x < canvas.width; x += step * 1.4) {
      ctx.strokeText(label, x, y);
      ctx.fillText(label, x, y);
    }
  }
  ctx.restore();

  return new Promise<Blob>((resolve) => {
    canvas.toBlob((out) => resolve(out ?? blob), "image/png");
  });
}
