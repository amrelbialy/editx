import { vi } from "vitest";
import { EditxEngine } from "../../editx-engine";
import { createMockRenderer } from "./mock-renderer";

export async function createThumbnailEngine(width = 800, height = 400) {
  const renderer = createMockRenderer();
  const render = vi.mocked(renderer.exportPage!);
  render.mockImplementation(async () => new Blob([String(render.mock.calls.length)]));
  const engine = new EditxEngine({ renderer });
  await engine.scene.create({ width, height });
  return { engine, renderer, render, page: engine.getActivePage()! };
}

export function deferredBlob() {
  let resolve!: (blob: Blob) => void;
  let reject!: (error: unknown) => void;
  const promise = new Promise<Blob>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, resolve, reject };
}
