/**
 * Downscale very large images to a working resolution using an offscreen canvas.
 *
 * If the image exceeds `maxMegapixels`, it is scaled down proportionally to fit
 * within that budget. The original dimensions are preserved for accurate export.
 */

export interface DownscaleResult {
  /** The (possibly downscaled) image as a data URL. */
  dataUrl: string;
  /** Working dimensions (may be smaller than original). */
  workingWidth: number;
  workingHeight: number;
  /** Original dimensions (for export accuracy). */
  originalWidth: number;
  originalHeight: number;
  /** Whether downscaling was applied. */
  wasDownscaled: boolean;
}

const DEFAULT_MAX_MEGAPIXELS = 25;

/**
 * Downscale an image if it exceeds the megapixel budget.
 *
 * @param img - The loaded HTMLImageElement.
 * @param maxMegapixels - Maximum megapixels (width × height / 1_000_000). Default: 25.
 * @returns The (possibly downscaled) image info.
 */
export function downscaleIfNeeded(
  img: HTMLImageElement,
  maxMegapixels = DEFAULT_MAX_MEGAPIXELS,
): DownscaleResult {
  const { naturalWidth, naturalHeight } = img;
  const megapixels = (naturalWidth * naturalHeight) / 1_000_000;

  if (megapixels <= maxMegapixels) {
    return {
      dataUrl: img.src,
      workingWidth: naturalWidth,
      workingHeight: naturalHeight,
      originalWidth: naturalWidth,
      originalHeight: naturalHeight,
      wasDownscaled: false,
    };
  }

  // Calculate the scale factor to fit within the megapixel budget
  const scale = Math.sqrt(maxMegapixels / megapixels);
  const workingWidth = Math.round(naturalWidth * scale);
  const workingHeight = Math.round(naturalHeight * scale);

  console.warn(
    `[creative-editor] Image is ${megapixels.toFixed(1)} MP (${naturalWidth}×${naturalHeight}). ` +
    `Downscaling to ${workingWidth}×${workingHeight} for editing. Original dimensions preserved for export.`,
  );

  const canvas = document.createElement('canvas');
  canvas.width = workingWidth;
  canvas.height = workingHeight;

  const ctx = canvas.getContext('2d')!;
  ctx.drawImage(img, 0, 0, workingWidth, workingHeight);

  const dataUrl = canvas.toDataURL('image/png');

  return {
    dataUrl,
    workingWidth,
    workingHeight,
    originalWidth: naturalWidth,
    originalHeight: naturalHeight,
    wasDownscaled: true,
  };
}
