import type { ExportOptions } from "@editx/engine";

export type Pixel = [number, number, number, number];

export interface DecodedExport {
  mime: string;
  width: number;
  height: number;
  pixels: Record<string, Pixel>;
}

export interface ExportFailure {
  name: string;
  code?: string;
  pageId?: number;
  blockId?: number;
  resource?: string;
  cause: string;
}

export interface ExportFixtureIds {
  active: number;
  target: number;
  transparent: number;
}

export interface ExportState {
  activePage: number | null;
  selection: number[];
  groupContext: number[];
  zoom: number;
  pan: { x: number; y: number };
  serialized: string;
  canRedo: boolean;
  editMode: string;
  crop: object | null;
}

export interface PageExportHarness {
  ids(): ExportFixtureIds;
  exportDecoded(
    pageId: number,
    options?: ExportOptions,
    points?: Array<[number, number]>,
  ): Promise<DecodedExport>;
  exportFailure(pageId: number): Promise<ExportFailure>;
  addAssetPage(kind: "image" | "fill" | "background", src: string): {
    pageId: number;
    blockId: number;
  };
  setImageSource(blockId: number, src: string): void;
  addFontPage(family: string, src: string): { pageId: number; blockId: number };
  preparePreservation(): Promise<ExportState>;
  readState(): ExportState;
}
