import { ImageEditor } from "../../src/image-editor";
import { expect, test } from "../fixtures";

/**
 * Guide: configure-crop — see docs/guides/configure-crop.md
 *
 * `config.crop.resizePresets` adds output-size presets to the Crop tool's
 * Resize tab.
 */

const TEST_IMAGE = "/fixtures/test-image-100x100.png";

// biome-ignore lint/suspicious/noExplicitAny: Playwright CT mount return type
async function waitForEditor(component: any) {
  await component.getByRole("toolbar", { name: "Editor tools" }).waitFor({ timeout: 15_000 });
}

test.describe("Guide: configure-crop", () => {
  test("resizePresets render under the Crop tool's Resize tab", async ({ mount }) => {
    const component = await mount(
      <ImageEditor
        src={TEST_IMAGE}
        width="900px"
        height="600px"
        config={{
          crop: {
            resizePresets: [
              {
                label: "Social",
                presets: [{ label: "Square", width: 1080, height: 1080 }],
              },
            ],
          },
        }}
      />,
    );
    await waitForEditor(component);

    // Open the Crop tool
    await component.getByRole("toolbar", { name: "Editor tools" }).getByText("Crop").click();

    // Switch to the Resize tab
    await component.getByRole("tab", { name: "Resize" }).click();

    // Configured group + preset appear
    await expect(component.getByText("Social")).toBeVisible({ timeout: 5_000 });
    await expect(component.getByText("Square")).toBeVisible();
  });
});
