import type { PreviewStyle, PreviewTextSegment, ShapePreset, TextLayoutSpec } from "./preset.types";

export interface TextCompositionTextElement {
  kind: "text";
  block: number;
  layout: TextLayoutSpec;
  /** Defaults to fixed for composition text. */
  widthMode?: "auto" | "fixed";
}

export interface TextCompositionShapeElement {
  kind: "shape";
  layout: TextLayoutSpec;
  shape: ShapePreset["shape"];
  fill: ShapePreset["fill"];
  stroke?: ShapePreset["stroke"];
  opacity?: number;
}

/** Ordered back-to-front composition elements. */
export interface TextComposition {
  elements: (TextCompositionTextElement | TextCompositionShapeElement)[];
}

export interface TextCompositionPreview {
  kind: "composition";
  bounds: TextLayoutSpec;
  layers: (
    | {
        kind: "text";
        layout: TextLayoutSpec;
        sample: string;
        fontSizeScale?: number;
        align?: "left" | "center" | "right";
        style?: PreviewStyle;
        segments?: PreviewTextSegment[];
      }
    | {
        kind: "shape";
        layout: TextLayoutSpec;
        shape: ShapePreset["shape"];
        style?: PreviewStyle;
        opacity?: number;
      }
  )[];
}
