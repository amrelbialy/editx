import { describe, expect, it } from "vitest";
import { isSameSource } from "./is-same-source";

describe("isSameSource", () => {
  it("returns true for identical string URLs", () => {
    expect(isSameSource("https://example.com/img.png", "https://example.com/img.png")).toBe(true);
  });

  it("returns false for different string URLs", () => {
    expect(isSameSource("https://example.com/a.png", "https://example.com/b.png")).toBe(false);
  });

  it("returns false when comparing null/undefined", () => {
    expect(isSameSource(null, "https://example.com/img.png")).toBe(false);
    expect(isSameSource("https://example.com/img.png", null)).toBe(false);
    expect(isSameSource(null, null)).toBe(false);
    expect(isSameSource(undefined, undefined)).toBe(false);
  });

  it("returns true for same File object reference", () => {
    const file = new File(["data"], "photo.jpg", { type: "image/jpeg" });
    expect(isSameSource(file, file)).toBe(true);
  });

  it("returns false for different File objects even with same content", () => {
    const a = new File(["data"], "photo.jpg", { type: "image/jpeg" });
    const b = new File(["data"], "photo.jpg", { type: "image/jpeg" });
    expect(isSameSource(a, b)).toBe(false);
  });

  it("returns true for same Blob object reference", () => {
    const blob = new Blob(["data"], { type: "image/png" });
    expect(isSameSource(blob, blob)).toBe(true);
  });

  it("returns false for mixed types (string vs File)", () => {
    const file = new File(["data"], "photo.jpg", { type: "image/jpeg" });
    expect(isSameSource(file, "https://example.com/img.png")).toBe(false);
  });

  it("returns true for data URL string equality", () => {
    const dataUrl = "data:image/png;base64,iVBOR";
    expect(isSameSource(dataUrl, dataUrl)).toBe(true);
  });
});
