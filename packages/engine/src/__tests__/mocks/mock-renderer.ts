import { vi } from 'vitest';
import type { RendererAdapter } from '../../render-adapter';

/**
 * Creates a mock RendererAdapter with vi.fn() stubs for all methods.
 * Reusable across engine integration tests.
 */
export function createMockRenderer(): RendererAdapter {
  return {
    init: vi.fn().mockResolvedValue(undefined),
    createScene: vi.fn().mockResolvedValue(undefined),
    syncBlock: vi.fn(),
    removeBlock: vi.fn(),
    showTransformer: vi.fn(),
    hideTransformer: vi.fn(),
    getSelectedBlockScreenRect: vi.fn().mockReturnValue(null),
    getBlockScreenRect: vi.fn().mockReturnValue(null),
    setZoom: vi.fn(),
    getZoom: vi.fn().mockReturnValue(1),
    panTo: vi.fn(),
    getPan: vi.fn().mockReturnValue({ x: 0, y: 0 }),
    fitToScreen: vi.fn(),
    fitToRect: vi.fn(),
    centerOnRect: vi.fn(),
    screenToWorld: vi.fn().mockImplementation((pt) => pt),
    worldToScreen: vi.fn().mockImplementation((pt) => pt),
    renderFrame: vi.fn(),
    exportScene: vi.fn().mockResolvedValue(new Blob()),
    dispose: vi.fn(),
    setCursor: vi.fn(),
    showCropOverlay: vi.fn(),
    hideCropOverlay: vi.fn(),
    setCropRect: vi.fn(),
    setCropRatio: vi.fn(),
    getCropRect: vi.fn().mockReturnValue(null),
    getCropImageRect: vi.fn().mockReturnValue(null),
  };
}
