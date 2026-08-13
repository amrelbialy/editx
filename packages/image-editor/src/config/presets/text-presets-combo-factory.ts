import type { TextPreset, TextPresetBlock, TextStyleSpec } from "../preset.types";
import type { TextCompositionShapeElement } from "../text-composition.types";

/**
 * One 1× em as a fraction of the page's reference edge: preset font sizes are
 * `24 × scale × min(pageW, pageH) / 1080`, so a scale-1 line is this tall.
 */
const EM = 24 / 1080;
/** Engine default for `text/lineHeight`, used to size each authored row. */
const DEFAULT_LINE_HEIGHT = 1.2;

/** Round authored fractions so the data stays readable in diffs. */
function round(value: number): number {
  return Number(value.toFixed(4));
}

export interface ComboLine extends Omit<Partial<TextStyleSpec>, "text"> {
  text: string;
  /** Multiplier applied to the 24px reference font size. Default `1`. */
  scale?: number;
  /** Blank space above this line, in ems of this line's own font size. */
  gap?: number;
  /** Defaults to auto for one-line text and fixed for explicit multiline text. */
  widthMode?: "auto" | "fixed";
}

export interface ComboSpec {
  id: string;
  label: string;
  /** Thumbnail sample. Defaults to every line joined by a newline. */
  sample?: string;
  /** Alignment inside the shared column. Default `"center"`. */
  align?: "left" | "center" | "right";
  /** Column width as a fraction of page width. Default `0.7`. */
  width?: number;
  /** Vertical centre of the stack as a fraction of page height. Default `0.5`. */
  centerY?: number;
  /** Rotation in degrees applied to every text row in the stack. */
  rotation?: number;
  /** Shape layers inserted behind the text layers, in authored order. */
  shapes?: TextCompositionShapeElement[];
  lines: ComboLine[];
}

/**
 * Build a multi-block "Text Combinations" preset as a vertical stack. Every
 * line shares one centred column (same `x`/`width`) so the blocks align on a
 * common axis, and each row's height/offset is derived from its font scale so
 * the lines sit on tight, typographic leading instead of hand-guessed gaps.
 */
export function combo(spec: ComboSpec): TextPreset {
  const align = spec.align ?? "center";
  const width = spec.width ?? 0.7;
  const x = round(0.5 - width / 2);

  const rows = spec.lines.map((line) => {
    const scale = line.scale ?? 1;
    const lineHeight = line.lineHeight ?? DEFAULT_LINE_HEIGHT;
    const rowCount = line.text.split("\n").length;
    return {
      line,
      scale,
      gap: (line.gap ?? 0) * scale * EM,
      height: scale * lineHeight * rowCount * EM,
    };
  });

  const total = rows.reduce((sum, row) => sum + row.gap + row.height, 0);
  let cursor = (spec.centerY ?? 0.5) - total / 2;

  const layouts: { x: number; y: number; width: number; height: number }[] = [];
  const widthModes: ("auto" | "fixed")[] = [];
  const blocks: TextPresetBlock[] = rows.map(({ line, scale, gap, height }) => {
    const { text, scale: _scale, gap: _gap, widthMode, ...style } = line;
    cursor += gap;
    const y = cursor;
    cursor += height;
    layouts.push({
      x,
      y: round(y),
      width,
      height: round(height),
      ...(spec.rotation ? { rotation: spec.rotation } : {}),
    });
    widthModes.push(widthMode ?? (text.includes("\n") ? "fixed" : "auto"));
    return {
      ...style,
      text,
      fontSizeScale: scale,
      align: line.align ?? align,
    };
  });

  return {
    id: spec.id,
    label: spec.label,
    blocks,
    composition: {
      elements: [
        ...(spec.shapes ?? []),
        ...layouts.map((layout, block) => ({
          kind: "text" as const,
          block,
          layout,
          widthMode: widthModes[block],
        })),
      ],
    },
    preview: {
      kind: "text",
      sample: spec.sample ?? spec.lines.map((line) => line.text).join("\n"),
    },
  };
}
