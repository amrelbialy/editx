export type BlockType = 'scene' | 'page' | 'graphic' | 'text' | 'image' | 'group' | 'effect' | 'shape' | 'fill';

/** Effect type identifiers — mirrors img.ly EFFECT_TYPES. */
export type EffectType = 'adjustments' | 'filter';

/** Shape geometry types — sub-block kinds for type='shape'. */
export type ShapeType = 'rect' | 'ellipse' | 'polygon' | 'star' | 'line';

/** Fill content types — sub-block kinds for type='fill'. */
export type FillType = 'color';

export type PageLayoutMode = 'VerticalStack' | 'HorizontalStack' | 'DepthStack' | 'Free';

export interface Color {
  r: number;
  g: number;
  b: number;
  a: number;
}

/** Style properties that can vary per text run (character-level). */
export interface TextRunStyle {
  fontSize?: number;
  fontFamily?: string;
  fontWeight?: string;
  fontStyle?: string;
  fill?: string;
  letterSpacing?: number;
  textDecoration?: string;
  backgroundColor?: string;
  textTransform?: 'none' | 'uppercase' | 'lowercase' | 'capitalize';
  textShadowColor?: string;
  textShadowBlur?: number;
  textShadowOffsetX?: number;
  textShadowOffsetY?: number;
  textStrokeColor?: string;
  textStrokeWidth?: number;
}

/** A contiguous segment of text with uniform styling. */
export interface TextRun {
  text: string;
  style: TextRunStyle;
}

export type PropertyValue = number | string | boolean | Color | TextRun[];

export interface BlockData {
  id: number;
  type: BlockType;
  kind: string;
  name: string;
  parentId: number | null;
  children: number[];
  effectIds: number[];
  /** Shape sub-block reference (graphic blocks only). */
  shapeId: number | null;
  /** Fill sub-block reference (graphic blocks only). */
  fillId: number | null;
  properties: Record<string, PropertyValue>;
}
