import { afterEach, describe, expect, it, vi } from "vitest";
import { processImageFile } from "./process-image-file";

class MockFileReader {
  result: string | ArrayBuffer | null = "data:image/png;base64,processed";
  onload: (() => void) | null = null;
  onerror: (() => void) | null = null;

  readAsDataURL(): void {
    this.onload?.();
  }
}

class MockImage {
  naturalWidth = 640;
  naturalHeight = 480;
  onload: (() => void) | null = null;
  onerror: (() => void) | null = null;
  #src = "";

  get src(): string {
    return this.#src;
  }

  set src(value: string) {
    this.#src = value;
    queueMicrotask(() => this.onload?.());
  }
}

describe("processImageFile", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("rejects invalid types and oversized files", async () => {
    await expect(
      processImageFile(new File(["text"], "notes.txt", { type: "text/plain" })),
    ).rejects.toThrow("File is not an image");
    await expect(
      processImageFile(new File([new Uint8Array(6)], "large.png", { type: "image/png" }), {
        maxFileSize: 5,
      }),
    ).rejects.toThrow("Image is too large");
  });

  it("returns the processed source and dimensions", async () => {
    vi.stubGlobal("FileReader", MockFileReader);
    vi.stubGlobal("Image", MockImage);

    await expect(
      processImageFile(new File(["image"], "fill.png", { type: "image/png" })),
    ).resolves.toEqual({
      src: "data:image/png;base64,processed",
      width: 640,
      height: 480,
    });
  });
});
