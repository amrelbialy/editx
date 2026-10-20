import { describe, expect, it, vi } from "vitest";
import { captureBlockToPng } from "./konva-export-block";

describe("exportBlockNode page filtering", () => {
  it("captures unfiltered and restores filtering before async PNG encoding", async () => {
    let filtered = true;
    let finishEncoding: ((blob: Blob | null) => void) | undefined;
    const canvas = {
      toBlob(callback: (blob: Blob | null) => void) {
        finishEncoding = callback;
      },
    } as unknown as HTMLCanvasElement;
    const result = captureBlockToPng(
      () => {
        expect(filtered).toBe(false);
        return canvas;
      },
      (capture) => {
        filtered = false;
        try {
          return capture();
        } finally {
          filtered = true;
        }
      },
    );
    await vi.waitFor(() => expect(finishEncoding).toBeTypeOf("function"));

    expect(filtered).toBe(true);
    finishEncoding?.(new Blob(["png"], { type: "image/png" }));
    await expect(result).resolves.toBeInstanceOf(Blob);
  });
});
