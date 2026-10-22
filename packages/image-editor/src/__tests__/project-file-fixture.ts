import { vi } from "vitest";
import { createNavigationEngine } from "./page-navigation-fixture";

export const projectPng = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]);

export function createProjectRenderer(): RendererAdapter {
  const png = async () => new Blob([projectPng], { type: "image/png" });
  return {
    init: vi.fn(async () => undefined),
    createScene: vi.fn(async () => undefined),
    syncBlock: vi.fn(),
    removeBlock: vi.fn(),
    showTransformer: vi.fn(),
    hideTransformer: vi.fn(),
    getSelectedBlockScreenRect: vi.fn(() => null),
    getBlockScreenRect: vi.fn(() => null),
    setZoom: vi.fn(),
    getZoom: vi.fn(() => 1),
    panTo: vi.fn(),
    getPan: vi.fn(() => ({ x: 0, y: 0 })),
    fitToScreen: vi.fn(),
    fitToRect: vi.fn(),
    centerOnRect: vi.fn(),
    screenToWorld: vi.fn((point: { x: number; y: number }) => point),
    worldToScreen: vi.fn((point: { x: number; y: number }) => point),
    renderFrame: vi.fn(),
    exportScene: vi.fn(png),
    exportDocumentPreview: vi.fn(png),
    exportBlock: vi.fn(png),
    dispose: vi.fn(),
    showCropOverlay: vi.fn(),
    hideCropOverlay: vi.fn(),
    setCropRect: vi.fn(),
    setCropRatio: vi.fn(),
    getCropRect: vi.fn(() => null),
    getCropImageRect: vi.fn(() => null),
  };
}

export async function createProjectFileFixture() {
  const fixture = await createNavigationEngine();
  const engineRef = { current: fixture.engine };
  const preview = vi
    .spyOn(fixture.engine.document, "exportPreview")
    .mockImplementation(async () => new Blob([projectPng], { type: "image/png" }));
  return { ...fixture, engineRef, preview };
}

import type { RendererAdapter } from "@editx/engine";
