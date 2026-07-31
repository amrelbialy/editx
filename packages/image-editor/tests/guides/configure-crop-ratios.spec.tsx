import { ImageEditor } from "../../src/image-editor";
import { expect, test } from "../fixtures";

/**
 * Guide: configure-crop-ratios — see docs/guides/configure-crop-ratios.md
 *
 * `config.crop.presets` whitelists which aspect-ratio presets the Crop tool
 * offers, in the order listed. `config.crop.aspectRatios` defines a fully
 * custom ratio list (`{ id, label, ratio }` objects).
 */

const TEST_IMAGE = "/fixtures/test-image-100x100.png";

// biome-ignore lint/suspicious/noExplicitAny: Playwright CT mount return type
async function waitForEditor(component: any) {
  await component.getByRole("toolbar", { name: "Editor tools" }).waitFor({ timeout: 15_000 });
}

test.describe("Guide: configure-crop-ratios", () => {
  test("config.crop.presets renders only the whitelisted ratios", async ({ mount }) => {
    const component = await mount(
      <ImageEditor
        src={TEST_IMAGE}
        width="900px"
        height="600px"
        config={{ crop: { presets: ["1:1", "16:9", "4:3"] } }}
      />,
    );
    await waitForEditor(component);

    // Open the Crop tool (aspect-ratio tab is the default).
    await component.getByRole("toolbar", { name: "Editor tools" }).getByText("Crop").click();

    // Whitelisted ratios appear.
    await expect(component.getByTestId("crop-preset-1:1")).toBeVisible({ timeout: 10_000 });
    await expect(component.getByTestId("crop-preset-16:9")).toBeVisible();
    await expect(component.getByTestId("crop-preset-4:3")).toBeVisible();

    // Non-whitelisted ratios are hidden.
    await expect(component.getByTestId("crop-preset-free")).toHaveCount(0);
    await expect(component.getByTestId("crop-preset-original")).toHaveCount(0);
    await expect(component.getByTestId("crop-preset-9:16")).toHaveCount(0);
  });

  test("config.crop.aspectRatios renders a custom ratio list", async ({ mount }) => {
    const component = await mount(
      <ImageEditor
        src={TEST_IMAGE}
        width="900px"
        height="600px"
        config={{
          crop: {
            aspectRatios: [
              { id: "free", label: "Free", ratio: "free" },
              { id: "1:1", label: "Square", ratio: 1 },
              { id: "2.39:1", label: "Cinema", ratio: 2.39 },
            ],
          },
        }}
      />,
    );
    await waitForEditor(component);

    await component.getByRole("toolbar", { name: "Editor tools" }).getByText("Crop").click();

    // Custom presets appear, including a ratio not in the built-in set.
    await expect(component.getByTestId("crop-preset-2.39:1")).toBeVisible({ timeout: 10_000 });
    await expect(component.getByText("Cinema")).toBeVisible();
    await expect(component.getByTestId("crop-preset-1:1")).toBeVisible();

    // Built-in ratios omitted from the custom list are hidden.
    await expect(component.getByTestId("crop-preset-16:9")).toHaveCount(0);
    await expect(component.getByTestId("crop-preset-original")).toHaveCount(0);
  });
});
