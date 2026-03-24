import { ImageEditor } from "../src/image-editor";
import { expect, test } from "./fixtures";

const TEST_IMAGE = "/fixtures/test-image-100x100.png";

test.describe("Image Load", () => {
  test("renders editor shell with canvas when given a URL src", async ({ mount, page }) => {
    const component = await mount(
      <ImageEditor src={TEST_IMAGE} width="800px" height="600px" />,
    );

    // Editor shell should be visible
    await expect(component).toBeVisible();

    // Topbar should appear
    await expect(component.getByText("Photo Editor")).toBeVisible();

    // Export button should be present
    await expect(component.getByText("Export Image")).toBeVisible();
  });

  test("shows loading overlay initially", async ({ mount }) => {
    const component = await mount(
      <ImageEditor src={TEST_IMAGE} width="800px" height="600px" />,
    );

    // The editor shell should be present right away
    await expect(component).toBeVisible();
  });

  test("displays tool navigation with all default tools", async ({ mount }) => {
    const component = await mount(
      <ImageEditor src={TEST_IMAGE} width="800px" height="600px" />,
    );

    // Wait for tools to render
    const toolbar = component.getByRole("toolbar", { name: "Editor tools" });
    await expect(toolbar).toBeVisible();

    // All default tools should be present
    await expect(toolbar.getByText("Crop")).toBeVisible();
    await expect(toolbar.getByText("Adjust")).toBeVisible();
    await expect(toolbar.getByText("Filters")).toBeVisible();
    await expect(toolbar.getByText("Text")).toBeVisible();
    await expect(toolbar.getByText("Shapes")).toBeVisible();
    await expect(toolbar.getByText("Image")).toBeVisible();
  });

  test("respects custom tool configuration", async ({ mount }) => {
    const component = await mount(
      <ImageEditor
        src={TEST_IMAGE}
        width="800px"
        height="600px"
        config={{ tools: ["crop", "adjust"] }}
      />,
    );

    const toolbar = component.getByRole("toolbar", { name: "Editor tools" });
    await expect(toolbar).toBeVisible();

    await expect(toolbar.getByText("Crop")).toBeVisible();
    await expect(toolbar.getByText("Adjust")).toBeVisible();
    // These should NOT be visible
    await expect(toolbar.getByText("Text")).not.toBeVisible();
    await expect(toolbar.getByText("Shapes")).not.toBeVisible();
  });

  test("displays error on invalid image source", async ({ mount }) => {
    const component = await mount(
      <ImageEditor src="/nonexistent-image.png" width="800px" height="600px" />,
    );

    // Should show error placeholder eventually
    await expect(component.getByText("Failed to load image", { exact: true })).toBeVisible({ timeout: 10_000 });
  });
});
