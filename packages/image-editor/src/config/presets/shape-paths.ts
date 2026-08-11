/**
 * Inline SVG path `d` strings for non-primitive shape presets. Every string is
 * restricted to path-command + numeric characters
 * (`[MmLlHhVvCcSsQqTtAaZz0-9\s,.\-+eE]`) so the engine's `addShape` validator
 * accepts them. Raw SVG markup is never injected into the DOM — Konva consumes
 * only the `d` attribute.
 */

export interface ShapePath {
  data: string;
  viewBox: { width: number; height: number };
}

/** A 5-point burst / star silhouette. */
export const BURST_PATH: ShapePath = {
  data: "M50 2 L61 38 L98 38 L68 60 L79 96 L50 74 L21 96 L32 60 L2 38 L39 38 Z",
  viewBox: { width: 100, height: 100 },
};

/** A soft organic blob. */
export const BLOB_PATH: ShapePath = {
  data: "M54 8 C74 6 92 22 90 44 C89 62 98 74 88 84 C76 96 54 88 40 90 C20 92 6 74 8 54 C10 36 4 20 22 12 C34 6 44 9 54 8 Z",
  viewBox: { width: 100, height: 100 },
};

/** A rounded heart. */
export const HEART_PATH: ShapePath = {
  data: "M50 88 C12 60 4 38 20 22 C33 9 46 16 50 28 C54 16 67 9 80 22 C96 38 88 60 50 88 Z",
  viewBox: { width: 100, height: 100 },
};

/** A speech / chat bubble. */
export const CHAT_PATH: ShapePath = {
  data: "M8 8 H92 V70 H44 L24 90 V70 H8 Z",
  viewBox: { width: 100, height: 100 },
};
