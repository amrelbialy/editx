import { ImageEditor } from "../../src/image-editor";
import { expect, test } from "../fixtures";

/**
 * Real export validation.
 *
 * Existing journey tests only assert that `onSave` fired with a non-null blob.
 * Here we capture the actual encoded image (the engine exports via
 * `stage.toDataURL`) and validate it in the browser:
 *   - the data URL carries the requested MIME type
 *   - the encoded bytes start with the correct format signature
 *   - the decoded raster has the expected dimensions
 *   - the image is not blank (has opaque pixels)
 *
 * Capturing happens in-browser because Blobs do not round-trip cleanly across
 * the Playwright component-test Node boundary.
 */

const TEST_IMAGE = "/fixtures/test-image-100x100.png";
const SOURCE_SIZE = 100;

const FORMAT_SIGNATURES: Record<string, number[]> = {
  // PNG: 89 50 4E 47
  png: [0x89, 0x50, 0x4e, 0x47],
  // JPEG: FF D8 FF
  jpeg: [0xff, 0xd8, 0xff],
  // WebP container: "RIFF"
  webp: [0x52, 0x49, 0x46, 0x46],
};

// biome-ignore lint/suspicious/noExplicitAny: Playwright CT mount return type
async function waitForEditor(component: any) {
  await component.getByRole("toolbar", { name: "Editor tools" }).waitFor({ timeout: 15_000 });
}

/** Install a browser-side hook that records every exported data URL. */
async function installExportCapture(page: import("@playwright/test").Page) {
  await page.evaluate(() => {
    const proto = HTMLCanvasElement.prototype;
    const original = proto.toDataURL;
    // biome-ignore lint/suspicious/noExplicitAny: monkeypatch needs loose typing
    (window as any).__exports = [];
    proto.toDataURL = function (...args: unknown[]) {
      // biome-ignore lint/suspicious/noExplicitAny: passthrough to native impl
      const url = (original as any).apply(this, args);
      if (typeof url === "string" && url.startsWith("data:image/")) {
        // biome-ignore lint/suspicious/noExplicitAny: test-only global
        (window as any).__exports.push(url);
      }
      return url;
    };
  });
}

/** Decode the most recent export of the given format and report its properties. */
async function readExport(page: import("@playwright/test").Page, format: string) {
  return page.evaluate(async (fmt) => {
    // biome-ignore lint/suspicious/noExplicitAny: test-only global
    const urls: string[] = (window as any).__exports ?? [];
    const url = [...urls].reverse().find((u) => u.startsWith(`data:image/${fmt}`));
    if (!url) return null;

    const mime = url.slice(5, url.indexOf(";"));
    const base64 = url.split(",")[1];
    const headBin = atob(base64.slice(0, 24));
    const head = Array.from(headBin, (ch) => ch.charCodeAt(0));

    const img = new Image();
    await new Promise<void>((resolveLoad, rejectLoad) => {
      img.onload = () => resolveLoad();
      img.onerror = () => rejectLoad(new Error("decode failed"));
      img.src = url;
    });

    const canvas = document.createElement("canvas");
    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    ctx.drawImage(img, 0, 0);
    const { data } = ctx.getImageData(0, 0, canvas.width, canvas.height);
    let opaquePixels = 0;
    for (let i = 3; i < data.length; i += 4) {
      if (data[i] > 0) opaquePixels++;
    }

    return { mime, head, width: img.naturalWidth, height: img.naturalHeight, opaquePixels };
  }, format);
}

for (const format of ["png", "jpeg", "webp"] as const) {
  test.describe(`Export validation: ${format.toUpperCase()}`, () => {
    test(`produces a valid ${format} image at source dimensions`, async ({ mount, page }) => {
      const component = await mount(<ImageEditor src={TEST_IMAGE} width="900px" height="600px" />);
      await waitForEditor(component);

      await installExportCapture(page);

      // Open export dialog and choose the format.
      await component.getByRole("button", { name: /export image/i }).click();
      await expect(component.getByText("Format", { exact: true })).toBeVisible({ timeout: 5_000 });

      if (format !== "png") {
        await component.getByRole("combobox").click();
        await component.getByRole("option", { name: FORMAT_LABELS[format] }).click();
      }

      await component.getByRole("button", { name: "Save" }).click();
      await expect(component.getByText("Format", { exact: true })).not.toBeVisible({
        timeout: 15_000,
      });

      const result = await readExport(page, format);
      expect(result, "no export captured").not.toBeNull();
      if (!result) return;

      // MIME type matches the requested format.
      expect(result.mime).toBe(`image/${format}`);

      // Encoded bytes start with the correct format signature.
      const signature = FORMAT_SIGNATURES[format];
      expect(result.head.slice(0, signature.length)).toEqual(signature);

      // Decoded raster matches the source dimensions and is not blank.
      expect(result.width).toBe(SOURCE_SIZE);
      expect(result.height).toBe(SOURCE_SIZE);
      expect(result.opaquePixels).toBeGreaterThan(0);
    });
  });
}

const FORMAT_LABELS: Record<"jpeg" | "webp", string> = {
  jpeg: "JPEG",
  webp: "WebP",
};
