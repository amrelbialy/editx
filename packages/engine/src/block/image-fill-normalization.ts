import type {
  ImageFillMode,
  ImageFillOptions,
  ImageFillUpdate,
  ResolvedImageFill,
} from "./block.types";

const CROP_SCALE_MIN = 1;
const TILE_SCALE_MIN = 0.1;
const MANUAL_SCALE_MAX = 4;

function isAutomatic(mode: ImageFillMode): boolean {
  return mode === "cover" || mode === "fit";
}

function finiteOr(value: number | undefined, fallback: number): number {
  return value !== undefined && Number.isFinite(value) ? value : fallback;
}

function clampScale(mode: ImageFillMode, scale: number | undefined): number {
  if (isAutomatic(mode)) return 1;
  const minimum = mode === "crop" ? CROP_SCALE_MIN : TILE_SCALE_MIN;
  return Math.min(MANUAL_SCALE_MAX, Math.max(minimum, finiteOr(scale, 1)));
}

export function normalizeImageFill(options: ImageFillOptions): ResolvedImageFill {
  const mode = options.mode ?? "crop";
  const automatic = isAutomatic(mode);
  return {
    src: options.src,
    mode,
    alignment: automatic ? (options.alignment ?? "center") : "center",
    offsetX: automatic ? 0 : finiteOr(options.offsetX, 0),
    offsetY: automatic ? 0 : finiteOr(options.offsetY, 0),
    scale: clampScale(mode, options.scale),
    rotation: ((finiteOr(options.rotation, 0) % 360) + 360) % 360,
    flipHorizontal: options.flipHorizontal ?? false,
    flipVertical: options.flipVertical ?? false,
  };
}

export function normalizeImageFillUpdate(
  current: ResolvedImageFill,
  update: ImageFillUpdate,
): ResolvedImageFill {
  const mode = update.mode ?? current.mode;
  if (mode === current.mode) return normalizeImageFill({ ...current, ...update });

  const automatic = isAutomatic(mode);
  const wasAutomatic = isAutomatic(current.mode);
  return normalizeImageFill({
    ...current,
    ...update,
    mode,
    alignment: automatic
      ? (update.alignment ?? (wasAutomatic ? current.alignment : "center"))
      : "center",
    offsetX: automatic ? 0 : (update.offsetX ?? 0),
    offsetY: automatic ? 0 : (update.offsetY ?? 0),
    scale: automatic ? 1 : (update.scale ?? 1),
  });
}
