import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { downloadBlob } from "./download-blob";

describe("downloadBlob", () => {
  let clickSpy: ReturnType<typeof vi.fn>;
  let createObjectURL: ReturnType<typeof vi.fn>;
  let revokeObjectURL: ReturnType<typeof vi.fn>;
  let anchor: HTMLAnchorElement;

  beforeEach(() => {
    vi.useFakeTimers();
    clickSpy = vi.fn();
    createObjectURL = vi.fn().mockReturnValue("blob:mock-url");
    revokeObjectURL = vi.fn();
    URL.createObjectURL = createObjectURL as unknown as typeof URL.createObjectURL;
    URL.revokeObjectURL = revokeObjectURL as unknown as typeof URL.revokeObjectURL;

    anchor = document.createElement("a");
    anchor.click = clickSpy;
    vi.spyOn(document, "createElement").mockReturnValue(anchor);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it("clicks an anchor with a name and MIME-derived extension", () => {
    const blob = new Blob(["x"], { type: "image/png" });
    downloadBlob(blob, "photo");

    expect(createObjectURL).toHaveBeenCalledWith(blob);
    expect(anchor.href).toContain("blob:mock-url");
    expect(anchor.download).toBe("photo.png");
    expect(clickSpy).toHaveBeenCalledTimes(1);
  });

  it("maps image/jpeg to a jpg extension", () => {
    downloadBlob(new Blob(["x"], { type: "image/jpeg" }), "shot");
    expect(anchor.download).toBe("shot.jpg");
  });

  it("defaults the base filename to 'edited'", () => {
    downloadBlob(new Blob(["x"], { type: "image/webp" }));
    expect(anchor.download).toBe("edited.webp");
  });

  it("revokes the object URL on the next tick", () => {
    downloadBlob(new Blob(["x"], { type: "image/png" }), "photo");
    expect(revokeObjectURL).not.toHaveBeenCalled();
    vi.runAllTimers();
    expect(revokeObjectURL).toHaveBeenCalledWith("blob:mock-url");
  });
});
