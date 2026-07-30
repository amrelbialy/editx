import { ImageEditor } from "../../src/image-editor";
import { expect, test } from "../fixtures";

/**
 * Guide: image-upload-limits — see docs/guides/image-upload-limits.md
 *
 * `config.image.maxFileSize` rejects oversized uploads in the Image tool with an
 * inline error.
 */

const TEST_IMAGE = "/fixtures/test-image-100x100.png";

// biome-ignore lint/suspicious/noExplicitAny: Playwright CT mount return type
async function waitForEditor(component: any) {
  await component.getByRole("toolbar", { name: "Editor tools" }).waitFor({ timeout: 15_000 });
}

test.describe("Guide: image-upload-limits", () => {
  test("config.image.maxFileSize rejects oversized uploads", async ({ mount }) => {
    const component = await mount(
      <ImageEditor
        src={TEST_IMAGE}
        width="900px"
        height="600px"
        config={{ image: { maxFileSize: 1 * 1024 * 1024 } }}
      />,
    );
    await waitForEditor(component);

    // Open the Image tool.
    await component.getByRole("toolbar", { name: "Editor tools" }).getByText("Image").click();

    // Upload a 2 MB file — over the 1 MB cap.
    const oversized = new Uint8Array(2 * 1024 * 1024);
    await component.locator('input[type="file"]').setInputFiles({
      name: "too-big.png",
      mimeType: "image/png",
      buffer: Buffer.from(oversized),
    });

    // The size-limit error appears inline.
    await expect(component.getByText(/exceeds 1MB limit/i)).toBeVisible({ timeout: 10_000 });
  });
});
