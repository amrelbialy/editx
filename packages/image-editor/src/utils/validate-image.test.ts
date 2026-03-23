import { describe, expect, it } from "vitest";
import { validateImageDimensions, validateImageFile } from "./validate-image";

describe("validateImageFile", () => {
  it("accepts a valid JPEG file", () => {
    const file = new File(["data"], "photo.jpg", { type: "image/jpeg" });
    const result = validateImageFile(file);
    expect(result.valid).toBe(true);
    expect(result.warnings).toHaveLength(0);
  });

  it("accepts a valid PNG file", () => {
    const file = new File(["data"], "image.png", { type: "image/png" });
    const result = validateImageFile(file);
    expect(result.valid).toBe(true);
  });

  it("accepts a valid WebP file", () => {
    const file = new File(["data"], "image.webp", { type: "image/webp" });
    const result = validateImageFile(file);
    expect(result.valid).toBe(true);
  });

  it("accepts a valid SVG file", () => {
    const file = new File(["<svg></svg>"], "icon.svg", { type: "image/svg+xml" });
    const result = validateImageFile(file);
    expect(result.valid).toBe(true);
  });

  it("rejects unsupported MIME type", () => {
    const file = new File(["data"], "doc.pdf", { type: "application/pdf" });
    const result = validateImageFile(file);
    expect(result.valid).toBe(false);
    expect(result.error).toContain("Unsupported image format");
    expect(result.error).toContain("application/pdf");
  });

  it("rejects files exceeding max file size", () => {
    // Create a mock file with a size above 50 MB
    const file = new File(["x"], "big.png", { type: "image/png" });
    Object.defineProperty(file, "size", { value: 55 * 1024 * 1024 });
    const result = validateImageFile(file);
    expect(result.valid).toBe(false);
    expect(result.error).toContain("too large");
  });

  it("warns for files above warning threshold but below max", () => {
    const file = new File(["x"], "medium.png", { type: "image/png" });
    Object.defineProperty(file, "size", { value: 25 * 1024 * 1024 });
    const result = validateImageFile(file);
    expect(result.valid).toBe(true);
    expect(result.warnings.length).toBeGreaterThan(0);
    expect(result.warnings[0]).toContain("Large image");
  });

  it("uses custom maxFileSize option", () => {
    const file = new File(["x"], "custom.png", { type: "image/png" });
    Object.defineProperty(file, "size", { value: 6 * 1024 * 1024 });
    const result = validateImageFile(file, { maxFileSize: 5 * 1024 * 1024 });
    expect(result.valid).toBe(false);
    expect(result.error).toContain("too large");
  });

  it("uses custom acceptedFormats option", () => {
    const file = new File(["data"], "image.bmp", { type: "image/bmp" });
    const result = validateImageFile(file, { acceptedFormats: ["image/png"] });
    expect(result.valid).toBe(false);
    expect(result.error).toContain("Unsupported image format");
  });

  it("accepts Blob without type (no MIME check)", () => {
    const blob = new Blob(["data"]);
    const result = validateImageFile(blob);
    // Empty type string is falsy, so MIME check is skipped
    expect(result.valid).toBe(true);
  });
});

describe("validateImageDimensions", () => {
  it("accepts normal dimensions", () => {
    const result = validateImageDimensions(1920, 1080);
    expect(result.valid).toBe(true);
    expect(result.warnings).toHaveLength(0);
  });

  it("rejects dimensions exceeding max", () => {
    const result = validateImageDimensions(20000, 10000);
    expect(result.valid).toBe(false);
    expect(result.error).toContain("exceed the maximum");
    expect(result.error).toContain("20000×10000");
  });

  it("warns for dimensions above warning threshold but below max", () => {
    const result = validateImageDimensions(10000, 5000);
    expect(result.valid).toBe(true);
    expect(result.warnings.length).toBeGreaterThan(0);
    expect(result.warnings[0]).toContain("Large image dimensions");
  });

  it("uses custom maxDimension option", () => {
    const result = validateImageDimensions(5000, 3000, { maxDimension: 4000 });
    expect(result.valid).toBe(false);
    expect(result.error).toContain("exceed the maximum");
  });

  it("uses custom warnDimension option", () => {
    const result = validateImageDimensions(3000, 2000, { warnDimension: 2500 });
    expect(result.valid).toBe(true);
    expect(result.warnings.length).toBeGreaterThan(0);
  });

  it("checks the larger of width and height", () => {
    // 4000 width is under default 8000 warn threshold
    const result1 = validateImageDimensions(4000, 100);
    expect(result1.valid).toBe(true);
    expect(result1.warnings).toHaveLength(0);

    // 9000 height exceeds warn threshold
    const result2 = validateImageDimensions(100, 9000);
    expect(result2.valid).toBe(true);
    expect(result2.warnings.length).toBeGreaterThan(0);
  });
});
