export type BlockType = 'scene' | 'page' | 'graphic' | 'text' | 'image' | 'group';

export type PageLayoutMode = 'VerticalStack' | 'HorizontalStack' | 'DepthStack' | 'Free';

export interface Color {
  r: number;
  g: number;
  b: number;
  a: number;
}

export type PropertyValue = number | string | boolean | Color;

export interface BlockData {
  id: number;
  type: BlockType;
  kind: string;
  name: string;
  parentId: number | null;
  children: number[];
  properties: Record<string, PropertyValue>;
}
