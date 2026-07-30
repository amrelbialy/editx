import { ImageEditor } from "../../src/image-editor";
import { expect, test } from "../fixtures";

/**
 * Guide: configure-adjustments — see docs/guides/configure-adjustments.md
 *
 * `config.adjust.controls` whitelists which sliders the Adjust tool exposes.
 */

const TEST_IMAGE = "/fixtures/test-image-100x100.png";

// biome-ignore lint/suspicious/noExplicitAny: Playwright CT mount return type
async function waitForEditor(component: any) {
  await component.getByRole("toolbar", { name: "Editor tools" }).waitFor({ timeout: 15_000 });
}

test.describe("Guide: configure-adjustments", () => {
  test("config.adjust.controls renders only the whitelisted sliders", async ({ mount }) => {
    const component = await mount(
      <ImageEditor
        src={TEST_IMAGE}
        width="900px"
        height="600px"
        config={{ adjust: { controls: ["brightness", "contrast", "saturation"] } }}
      />,
    );
    await waitForEditor(component);

    // Open the Adjust tool.
    await component.getByRole("toolbar", { name: "Editor tools" }).getByText("Adjust").click();

    // Whitelisted sliders appear.
    await expect(component.getByTestId("adjust-brightness")).toBeVisible({ timeout: 5_000 });
    await expect(component.getByTestId("adjust-contrast")).toBeVisible();
    await expect(component.getByTestId("adjust-saturation")).toBeVisible();

    // Everything else is hidden.
    await expect(component.getByTestId("adjust-gamma")).toHaveCount(0);
    await expect(component.getByTestId("adjust-clarity")).toHaveCount(0);
    await expect(component.getByTestId("adjust-temperature")).toHaveCount(0);
  });
});
