import type { EditxEngine } from "@editx/engine";

export interface PageNavigationHarness {
  engine: EditxEngine;
  ids: number[];
  samplePixel(pageId?: number): Promise<number[]>;
}

declare global {
  interface Window {
    __pageNavigationHarness?: PageNavigationHarness;
  }
}
