import type Konva from "konva";
import { describe, expect, it, vi } from "vitest";
import type { KonvaCamera } from "./konva-camera";
import { setupWheelZoom } from "./konva-wheel-zoom";

function setup(mode: string) {
  let listener: ((event: WheelEvent) => void) | undefined;
  const container = {
    addEventListener: vi.fn((_name, callback) => {
      listener = callback as (event: WheelEvent) => void;
    }),
  };
  const stage = {
    container: () => container,
    getPointerPosition: () => ({ x: 40, y: 30 }),
  } as unknown as Konva.Stage;
  const camera = {
    panBy: vi.fn(),
    getZoom: vi.fn(() => 2),
    zoomAtPoint: vi.fn(),
  } as unknown as KonvaCamera;
  setupWheelZoom(stage, camera, new Map(), undefined, () => mode);
  const wheel = (deltaX: number, deltaY: number, ctrlKey = false) => {
    const preventDefault = vi.fn();
    listener?.({
      deltaX,
      deltaY,
      ctrlKey,
      metaKey: false,
      preventDefault,
    } as unknown as WheelEvent);
    return preventDefault;
  };
  return { camera, wheel };
}

describe("continuous canvas wheel handling", () => {
  it("pans vertical mode on native axes", () => {
    const { camera, wheel } = setup("vertical-pages");
    expect(wheel(5, 20)).toHaveBeenCalled();
    expect(camera.panBy).toHaveBeenCalledWith(-5, -20);
  });

  it("maps vertical wheel motion to horizontal mode and preserves deltaX", () => {
    const { camera, wheel } = setup("horizontal-pages");
    wheel(5, 20);
    expect(camera.panBy).toHaveBeenCalledWith(-25, 0);
  });

  it("keeps legacy plain-wheel behavior and pointer-anchored modifier zoom", () => {
    const { camera, wheel } = setup("all-pages");
    expect(wheel(0, 20)).not.toHaveBeenCalled();
    expect(camera.panBy).not.toHaveBeenCalled();
    expect(wheel(0, -10, true)).toHaveBeenCalled();
    expect(camera.zoomAtPoint).toHaveBeenCalledWith(2.03, { x: 40, y: 30 });
  });
});
