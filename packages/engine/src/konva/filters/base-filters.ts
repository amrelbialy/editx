/**
 * Low-level pixel operations used by filter presets.
 * Ported from the reference implementation's BaseFilters.js.
 * Each operation mutates ImageData in-place.
 */

type FilterOp = (imageData: ImageData) => void;

function brightness(value: number): FilterOp {
  const adjustment = Math.round(255 * value);
  return (imageData: ImageData) => {
    const d = imageData.data;
    for (let i = 0; i < d.length; i += 4) {
      d[i] = Math.min(255, Math.max(0, d[i] + adjustment));
      d[i + 1] = Math.min(255, Math.max(0, d[i + 1] + adjustment));
      d[i + 2] = Math.min(255, Math.max(0, d[i + 2] + adjustment));
    }
  };
}

function contrast(value: number): FilterOp {
  const factor = (259 * (value * 255 + 255)) / (255 * (259 - value * 255));
  return (imageData: ImageData) => {
    const d = imageData.data;
    for (let i = 0; i < d.length; i += 4) {
      d[i] = Math.min(255, Math.max(0, factor * (d[i] - 128) + 128));
      d[i + 1] = Math.min(255, Math.max(0, factor * (d[i + 1] - 128) + 128));
      d[i + 2] = Math.min(255, Math.max(0, factor * (d[i + 2] - 128) + 128));
    }
  };
}

function saturation(value: number): FilterOp {
  return (imageData: ImageData) => {
    const d = imageData.data;
    for (let i = 0; i < d.length; i += 4) {
      const gray = 0.2989 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
      d[i] = Math.min(255, Math.max(0, -gray * value + d[i] * (1 + value)));
      d[i + 1] = Math.min(255, Math.max(0, -gray * value + d[i + 1] * (1 + value)));
      d[i + 2] = Math.min(255, Math.max(0, -gray * value + d[i + 2] * (1 + value)));
    }
  };
}

function grayscale(): FilterOp {
  return (imageData: ImageData) => {
    const d = imageData.data;
    for (let i = 0; i < d.length; i += 4) {
      const avg = 0.2126 * d[i] + 0.7152 * d[i + 1] + 0.0722 * d[i + 2];
      d[i] = avg;
      d[i + 1] = avg;
      d[i + 2] = avg;
    }
  };
}

function sepia(value: number): FilterOp {
  return (imageData: ImageData) => {
    const d = imageData.data;
    for (let i = 0; i < d.length; i += 4) {
      const r = d[i];
      const g = d[i + 1];
      const b = d[i + 2];
      d[i] = Math.min(255, r * (1 - 0.607 * value) + g * 0.769 * value + b * 0.189 * value);
      d[i + 1] = Math.min(255, r * 0.349 * value + g * (1 - 0.314 * value) + b * 0.168 * value);
      d[i + 2] = Math.min(255, r * 0.272 * value + g * 0.534 * value + b * (1 - 0.869 * value));
    }
  };
}

function adjustRGB(rgb: [number, number, number]): FilterOp {
  return (imageData: ImageData) => {
    const d = imageData.data;
    for (let i = 0; i < d.length; i += 4) {
      d[i] = Math.min(255, Math.max(0, d[i] * rgb[0]));
      d[i + 1] = Math.min(255, Math.max(0, d[i + 1] * rgb[1]));
      d[i + 2] = Math.min(255, Math.max(0, d[i + 2] * rgb[2]));
    }
  };
}

function colorFilter(rgba: [number, number, number, number]): FilterOp {
  const [cr, cg, cb, ca] = rgba;
  return (imageData: ImageData) => {
    const d = imageData.data;
    for (let i = 0; i < d.length; i += 4) {
      d[i] = d[i] - (d[i] - cr) * ca;
      d[i + 1] = d[i + 1] - (d[i + 1] - cg) * ca;
      d[i + 2] = d[i + 2] - (d[i + 2] - cb) * ca;
    }
  };
}

/**
 * Apply a sequence of filter operations to imageData in order.
 */
function apply(imageData: ImageData, ...ops: FilterOp[]): void {
  for (const op of ops) {
    op(imageData);
  }
}

export const BaseFilters = {
  brightness,
  contrast,
  saturation,
  grayscale,
  sepia,
  adjustRGB,
  colorFilter,
  apply,
} as const;

export type { FilterOp };
