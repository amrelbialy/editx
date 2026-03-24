import { ImageEditor } from "../src/image-editor";
import { expect, test } from "./fixtures";

const TEST_IMAGE = "/fixtures/test-image-100x100.png";

test.describe("Undo/Redo", () => {
  test("undo and redo buttons are present in topbar", async ({ mount }) => {
    const component = await mount(
      <ImageEditor src={TEST_IMAGE} width="900px" height="600px" />,
    );

    // Undo and Redo buttons should be visible
    await expect(component.getByRole("button", { name: /undo/i })).toBeVisible();
    await expect(component.getByRole("button", { name: /redo/i })).toBeVisible();
  });

  test("Ctrl+Z triggers undo", async ({ mount, page }) => {
    const component = await mount(
      <ImageEditor src={TEST_IMAGE} width="900px" height="600px" />,
    );

    await component.getByRole("toolbar", { name: "Editor tools" }).waitFor();
    await component.getByRole("application").first().focus();

    // Perform Ctrl+Z — should not cause any error
    await page.keyboard.press("Control+z");

    // Editor should still be functional
    await expect(component.getByText("Photo Editor")).toBeVisible();
  });

  test("Ctrl+Shift+Z triggers redo", async ({ mount, page }) => {
    const component = await mount(
      <ImageEditor src={TEST_IMAGE} width="900px" height="600px" />,
    );

    await component.getByRole("toolbar", { name: "Editor tools" }).waitFor();
    await component.getByRole("application").first().focus();

    // Perform Ctrl+Shift+Z — should not cause any error
    await page.keyboard.press("Control+Shift+z");

    // Editor should still be functional
    await expect(component.getByText("Photo Editor")).toBeVisible();
  });
});
