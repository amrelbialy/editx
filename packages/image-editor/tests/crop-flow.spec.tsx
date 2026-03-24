import { ImageEditor } from "../src/image-editor";
import { expect, test } from "./fixtures";

const TEST_IMAGE = "/fixtures/test-image-100x100.png";

test.describe("Crop Flow", () => {
  test("activates crop tool from sidebar and shows crop panel", async ({ mount }) => {
    const component = await mount(
      <ImageEditor src={TEST_IMAGE} width="900px" height="600px" />,
    );

    // Wait for editor to load
    const toolbar = component.getByRole("toolbar", { name: "Editor tools" });
    await expect(toolbar).toBeVisible();

    // Click the Crop tool button
    await toolbar.getByText("Crop").click();

    // Crop panel should appear with preset options
    await expect(component.getByText("Free")).toBeVisible({ timeout: 5_000 });
  });

  test("toggles crop tool off when clicking again", async ({ mount }) => {
    const component = await mount(
      <ImageEditor src={TEST_IMAGE} width="900px" height="600px" />,
    );

    const toolbar = component.getByRole("toolbar", { name: "Editor tools" });
    await expect(toolbar).toBeVisible();

    // Activate crop
    await toolbar.getByText("Crop").click();
    await expect(component.getByText("Free")).toBeVisible({ timeout: 5_000 });

    // Click crop again to deactivate
    await toolbar.getByText("Crop").click();

    // Crop panel should disappear
    await expect(component.getByText("Free")).not.toBeVisible({ timeout: 5_000 });
  });

  test("activates crop via keyboard shortcut C", async ({ mount, page }) => {
    const component = await mount(
      <ImageEditor src={TEST_IMAGE} width="900px" height="600px" />,
    );

    await expect(component.getByRole("toolbar", { name: "Editor tools" })).toBeVisible();

    // Focus the editor and press C
    await component.getByRole("application").first().focus();
    await page.keyboard.press("c");

    // Crop panel should appear
    await expect(component.getByText("Free")).toBeVisible({ timeout: 5_000 });
  });
});
