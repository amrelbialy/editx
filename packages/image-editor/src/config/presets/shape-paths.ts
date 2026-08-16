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

export const RIGHT_TRIANGLE_PATH: ShapePath = {
  data: "M8 8 H92 V92 Z",
  viewBox: { width: 100, height: 100 },
};

export const DIAMOND_PATH: ShapePath = {
  data: "M50 4 L96 50 L50 96 L4 50 Z",
  viewBox: { width: 100, height: 100 },
};

export const PLUS_PATH: ShapePath = {
  data: "M36 6 H64 V36 H94 V64 H64 V94 H36 V64 H6 V36 H36 Z",
  viewBox: { width: 100, height: 100 },
};

export const BLOCK_ARROW_PATH: ShapePath = {
  data: "M6 32 H58 V12 L96 50 L58 88 V68 H6 Z",
  viewBox: { width: 100, height: 100 },
};

export const CRESCENT_PATH: ShapePath = {
  data: "M68 6 C30 12 18 62 48 88 C62 100 82 94 92 80 C62 84 42 58 50 32 C54 18 60 10 68 6 Z",
  viewBox: { width: 100, height: 100 },
};

export const CLOVER_PATH: ShapePath = {
  data: "M50 42 C38 20 8 22 8 44 C8 58 22 64 36 58 C20 72 30 94 50 82 C70 94 80 72 64 58 C78 64 92 58 92 44 C92 22 62 20 50 42 Z",
  viewBox: { width: 100, height: 100 },
};

export const SPARKLE_PATH: ShapePath = {
  data: "M50 2 L60 38 L98 50 L60 62 L50 98 L40 62 L2 50 L40 38 Z",
  viewBox: { width: 100, height: 100 },
};

export const ARCH_PATH: ShapePath = {
  data: "M8 94 V50 C8 20 26 6 50 6 C74 6 92 20 92 50 V94 H68 V52 C68 36 60 28 50 28 C40 28 32 36 32 52 V94 Z",
  viewBox: { width: 100, height: 100 },
};

export const SEMICIRCLE_PATH: ShapePath = {
  data: "M6 90 A44 44 0 0 1 94 90 Z",
  viewBox: { width: 100, height: 100 },
};

export const TEARDROP_PATH: ShapePath = {
  data: "M50 4 C42 24 18 46 18 68 C18 86 32 96 50 96 C68 96 82 86 82 68 C82 46 58 24 50 4 Z",
  viewBox: { width: 100, height: 100 },
};

export const WAVE_PATH: ShapePath = {
  data: "M4 38 C20 18 36 18 52 38 C68 58 82 58 96 38 V78 C80 96 64 96 48 78 C32 60 18 60 4 78 Z",
  viewBox: { width: 100, height: 100 },
};

export const SUNBURST_PATH: ShapePath = {
  data: "M50 2 L57 24 L72 8 L73 31 L94 20 L82 40 L98 50 L76 57 L92 72 L69 73 L80 94 L60 82 L50 98 L43 76 L28 92 L27 69 L6 80 L18 60 L2 50 L24 43 L8 28 L31 27 L20 6 L40 18 Z",
  viewBox: { width: 100, height: 100 },
};
