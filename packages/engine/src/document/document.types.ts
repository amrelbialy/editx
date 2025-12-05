export type LayerType = 'rectangle' | 'ellipse' | 'image' | 'text';

export interface Layer {
  id: string;
  type: LayerType;
  name: string;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  opacity: number;
  visible: boolean;
  fill?: string;
  stroke?: string;
  strokeWidth?: number;
}

export interface Scene {
  width: number;
  height: number;
  background: string;
}

export interface CreativeDocument {
  id: string;
  width: number;
  height: number;
  layers: Record<string, Layer>;
  scene: Scene | null;
  version: number;
}
