import { ImageEditor } from "../src/image-editor";
import { expect, test } from "./fixtures";

const TEST_IMAGE = "/fixtures/test-image-100x100.png";

test.describe("Visual Regression", () => {
  test("editor shell renders correctly at desktop size", async ({ mount }) => {
    const component = await mount(
      <ImageEditor src={TEST_IMAGE} width="900px" height="600px" />,
    );

    // Wait for editor to stabilize
    await component.getByRole("toolbar", { name: "Editor tools" }).waitFor({ timeout: 10_000 });

    // Allow brief settle time for canvas rendering
    await component.page().waitForTimeout(500);

    await expect(component).toHaveScreenshot("editor-desktop.png", {
      maxDiffPixelRatio: 0.01,
    });
  });

  test("editor shell renders correctly at mobile size", async ({ mount }) => {
    const component = await mount(
      <ImageEditor src={TEST_IMAGE} width="400px" height="700px" />,
    );

    // Wait for tools
    await component.getByRole("toolbar", { name: "Editor tools" }).waitFor({ timeout: 10_000 });
    await component.page().waitForTimeout(500);

    await expect(component).toHaveScreenshot("editor-mobile.png", {
      maxDiffPixelRatio: 0.01,
    });
  });

  test("crop panel appearance", async ({ mount }) => {
    const component = await mount(
      <ImageEditor src={TEST_IMAGE} width="900px" height="600px" />,
    );

    await component.getByRole("toolbar", { name: "Editor tools" }).waitFor({ timeout: 10_000 });

    // Open crop tool
    await component.getByRole("toolbar", { name: "Editor tools" }).getByText("Crop").click();
    await expect(component.getByText("Free")).toBeVisible({ timeout: 5_000 });
    await component.page().waitForTimeout(300);

    await expect(component).toHaveScreenshot("editor-crop-panel.png", {
      maxDiffPixelRatio: 0.02,
    });
  });

  test("adjust panel appearance", async ({ mount }) => {
    const component = await mount(
      <ImageEditor src={TEST_IMAGE} width="900px" height="600px" />,
    );

    await component.getByRole("toolbar", { name: "Editor tools" }).waitFor({ timeout: 10_000 });

    // Open adjust tool
    await component.getByRole("toolbar", { name: "Editor tools" }).getByText("Adjust").click();
    await expect(component.getByText("Brightness")).toBeVisible({ timeout: 5_000 });
    await component.page().waitForTimeout(300);

    await expect(component).toHaveScreenshot("editor-adjust-panel.png", {
      maxDiffPixelRatio: 0.02,
    });
  });

  test("export dialog appearance", async ({ mount }) => {
    const component = await mount(
      <ImageEditor src={TEST_IMAGE} width="900px" height="600px" />,
    );

    await component.getByRole("toolbar", { name: "Editor tools" }).waitFor({ timeout: 10_000 });

    // Open export dialog
    await component.getByRole("button", { name: /export image/i }).click();
    await expect(component.getByText("Format", { exact: true })).toBeVisible({ timeout: 5_000 });
    await component.page().waitForTimeout(300);

    await expect(component.page()).toHaveScreenshot("export-dialog.png", {
      maxDiffPixelRatio: 0.02,
    });
  });
});
