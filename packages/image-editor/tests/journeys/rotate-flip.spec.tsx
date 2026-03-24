import { ImageEditor } from "../../src/image-editor";
import { expect, test } from "../fixtures";

const TEST_IMAGE = "/fixtures/test-image-100x100.png";

async function waitForEditor(component: any) {
  await component.getByRole("toolbar", { name: "Editor tools" }).waitFor({ timeout: 15_000 });
}

test.describe("Journey: Rotate and Flip", () => {
  test("rotate CW and flip horizontal then export", async ({ mount }) => {
    let savedBlob: Blob | null = null;

    const component = await mount(
      <ImageEditor
        src={TEST_IMAGE}
        width="900px"
        height="600px"
        onSave={(blob) => {
          savedBlob = blob;
        }}
      />,
    );
    await waitForEditor(component);

    // Open Crop tool — rotate/flip buttons are in the floating ToolPropertiesBar
    await component.getByRole("toolbar", { name: "Editor tools" }).getByText("Crop").click();
    await expect(component.getByTestId("crop-preset-free")).toBeVisible({ timeout: 5_000 });

    // Rotate CW via the ToolPropertiesBar (accessible name from title attribute)
    await component.getByRole("button", { name: "Rotate 90° right" }).click();

    // Flip horizontal
    await component.getByRole("button", { name: "Flip horizontal" }).click();

    // Done
    await component.getByRole("button", { name: "Done" }).click();
    await expect(component.getByTestId("crop-preset-free")).not.toBeVisible({ timeout: 5_000 });

    // Export
    await component.getByRole("button", { name: /export image/i }).click();
    await expect(component.getByText("Format", { exact: true })).toBeVisible({ timeout: 5_000 });
    await component.getByRole("button", { name: "Save" }).click();
    await expect(component.getByText("Format", { exact: true })).not.toBeVisible({
      timeout: 15_000,
    });

    expect(savedBlob).not.toBeNull();
  });

  test("rotate CCW twice then flip vertical", async ({ mount }) => {
    const component = await mount(
      <ImageEditor src={TEST_IMAGE} width="900px" height="600px" />,
    );
    await waitForEditor(component);

    await component.getByRole("toolbar", { name: "Editor tools" }).getByText("Crop").click();
    await expect(component.getByTestId("crop-preset-free")).toBeVisible({ timeout: 5_000 });

    // Rotate CCW twice via the ToolPropertiesBar
    await component.getByRole("button", { name: "Rotate 90° left" }).click();
    await component.getByRole("button", { name: "Rotate 90° left" }).click();

    // Flip vertical
    await component.getByRole("button", { name: "Flip vertical" }).click();

    // Done
    await component.getByRole("button", { name: "Done" }).click();
    await expect(component.getByTestId("crop-preset-free")).not.toBeVisible({ timeout: 5_000 });

    // Editor should remain functional
    await expect(component.getByRole("toolbar", { name: "Editor tools" })).toBeVisible();
  });
});
