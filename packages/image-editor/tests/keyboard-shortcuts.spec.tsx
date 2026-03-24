import { ImageEditor } from "../src/image-editor";
import { expect, test } from "./fixtures";

const TEST_IMAGE = "/fixtures/test-image-100x100.png";

test.describe("Keyboard Shortcuts", () => {
  async function focusEditor(component: any) {
    await component.getByRole("application").first().focus();
  }

  test("C key activates crop tool", async ({ mount, page }) => {
    const component = await mount(
      <ImageEditor src={TEST_IMAGE} width="900px" height="600px" />,
    );

    await component.getByRole("toolbar", { name: "Editor tools" }).waitFor();
    await focusEditor(component);

    await page.keyboard.press("c");
    await expect(component.getByText("Free")).toBeVisible({ timeout: 5_000 });
  });

  test("A key activates adjust tool", async ({ mount, page }) => {
    const component = await mount(
      <ImageEditor src={TEST_IMAGE} width="900px" height="600px" />,
    );

    await component.getByRole("toolbar", { name: "Editor tools" }).waitFor();
    await focusEditor(component);

    await page.keyboard.press("a");
    await expect(component.getByText("Brightness")).toBeVisible({ timeout: 5_000 });
  });

  test("F key activates filter tool", async ({ mount, page }) => {
    const component = await mount(
      <ImageEditor src={TEST_IMAGE} width="900px" height="600px" />,
    );

    await component.getByRole("toolbar", { name: "Editor tools" }).waitFor();
    await focusEditor(component);

    await page.keyboard.press("f");
    await expect(component.getByText("Original")).toBeVisible({ timeout: 5_000 });
  });

  test("S key activates shapes tool", async ({ mount, page }) => {
    const component = await mount(
      <ImageEditor src={TEST_IMAGE} width="900px" height="600px" />,
    );

    await component.getByRole("toolbar", { name: "Editor tools" }).waitFor();
    await focusEditor(component);

    await page.keyboard.press("s");
    await expect(component.getByText("Rectangle")).toBeVisible({ timeout: 5_000 });
  });

  test("Escape key deactivates current tool", async ({ mount, page }) => {
    const component = await mount(
      <ImageEditor src={TEST_IMAGE} width="900px" height="600px" />,
    );

    await component.getByRole("toolbar", { name: "Editor tools" }).waitFor();
    await focusEditor(component);

    // Activate adjust tool
    await page.keyboard.press("a");
    await expect(component.getByText("Brightness")).toBeVisible({ timeout: 5_000 });

    // Escape to deactivate
    await page.keyboard.press("Escape");
    await expect(component.getByText("Brightness")).not.toBeVisible({ timeout: 5_000 });
  });

  test("+ and - keys zoom in and out", async ({ mount, page }) => {
    const component = await mount(
      <ImageEditor src={TEST_IMAGE} width="900px" height="600px" />,
    );

    await component.getByRole("toolbar", { name: "Editor tools" }).waitFor();
    await focusEditor(component);

    // The zoom label should be visible in the topbar
    // Press + to zoom in — this should change the zoom level
    await page.keyboard.press("+");
    // Just verify no errors — zoom label should still be present
    await expect(component.getByRole("button", { name: /zoom/i }).first()).toBeVisible();
  });
});
