/**
 * Image validation utility.
 *
 * Validates file type, file size, and image dimensions before loading
 * into the editor. Returns descriptive error messages for each failure case.
 */

export interface ImageValidationOptions {
  /** Accepted MIME types. Defaults to common image formats. */
  acceptedFormats?: string[];
  /** Maximum file size in bytes. Default: 50 MB. */
  maxFileSize?: number;
  /** Warning threshold for file size in bytes. Default: 20 MB. */
  warnFileSize?: number;
  /** Maximum dimension (width or height) in pixels. Default: 16000. */
  maxDimension?: number;
  /** Warning threshold for dimension in pixels. Default: 8000. */
  warnDimension?: number;
}

export interface ValidationResult {
  valid: boolean;
  error?: string;
  warnings: string[];
}

const DEFAULT_ACCEPTED_FORMATS = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/svg+xml",
  "image/bmp",
];

const DEFAULT_MAX_FILE_SIZE = 50 * 1024 * 1024; // 50 MB
const DEFAULT_WARN_FILE_SIZE = 20 * 1024 * 1024; // 20 MB
const DEFAULT_MAX_DIMENSION = 16000; // px
const DEFAULT_WARN_DIMENSION = 8000; // px

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * Validate a File or Blob before loading.
 * Checks MIME type and file size. Dimension checks require a loaded image
 * and should be done separately with `validateImageDimensions`.
 */
export function validateImageFile(
  file: File | Blob,
  options: ImageValidationOptions = {},
): ValidationResult {
  const {
    acceptedFormats = DEFAULT_ACCEPTED_FORMATS,
    maxFileSize = DEFAULT_MAX_FILE_SIZE,
    warnFileSize = DEFAULT_WARN_FILE_SIZE,
  } = options;

  const warnings: string[] = [];

  // Check MIME type
  if (file.type && !acceptedFormats.includes(file.type)) {
    return {
      valid: false,
      error: `Unsupported image format: ${file.type}. Accepted formats: ${acceptedFormats.join(", ")}`,
      warnings,
    };
  }

  // Check file size
  if (file.size > maxFileSize) {
    return {
      valid: false,
      error: `Image is too large (${formatBytes(file.size)}). Maximum size: ${formatBytes(maxFileSize)}`,
      warnings,
    };
  }

  if (file.size > warnFileSize) {
    warnings.push(`Large image (${formatBytes(file.size)}). This may slow down the editor.`);
  }

  return { valid: true, warnings };
}

/**
 * Validate image dimensions after the image has been loaded.
 * Call this with the natural width/height of the loaded HTMLImageElement.
 */
export function validateImageDimensions(
  width: number,
  height: number,
  options: ImageValidationOptions = {},
): ValidationResult {
  const { maxDimension = DEFAULT_MAX_DIMENSION, warnDimension = DEFAULT_WARN_DIMENSION } = options;

  const warnings: string[] = [];
  const maxSide = Math.max(width, height);

  if (maxSide > maxDimension) {
    return {
      valid: false,
      error: `Image dimensions (${width}×${height}) exceed the maximum of ${maxDimension}px. The image is too large for the browser canvas.`,
      warnings,
    };
  }

  if (maxSide > warnDimension) {
    warnings.push(`Large image dimensions (${width}×${height}). Performance may be affected.`);
  }

  return { valid: true, warnings };
}
