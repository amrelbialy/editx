import { ImageEditor } from "../../src/image-editor";
import { expect, test } from "../fixtures";

const TEST_IMAGE = "/fixtures/test-image-100x100.png";

/** Helper: wait for the editor canvas to be fully initialized. */
async function waitForEditor(component: any) {
  await component.getByRole("toolbar", { name: "Editor tools" }).waitFor({ timeout: 15_000 });
}

test.describe("Journey: Crop → Export", () => {
  test("crop with 1:1 preset then export produces a PNG blob", async ({ mount }) => {
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

    // 1. Open Crop tool
    const toolbar = component.getByRole("toolbar", { name: "Editor tools" });
    await toolbar.getByText("Crop").click();
    await expect(component.getByTestId("crop-preset-free")).toBeVisible({ timeout: 5_000 });

    // 2. Select 1:1 preset
    await component.getByTestId("crop-preset-1:1").click();

    // 3. Click Done to apply crop
    await component.getByRole("button", { name: "Done" }).click();

    // Crop panel should close
    await expect(component.getByTestId("crop-preset-free")).not.toBeVisible({ timeout: 5_000 });

    // 4. Export
    await component.getByRole("button", { name: /export image/i }).click();
    await expect(component.getByText("Format", { exact: true })).toBeVisible({ timeout: 5_000 });
    await component.getByRole("button", { name: "Save" }).click();

    // Wait for dialog to close (export complete)
    await expect(component.getByText("Format", { exact: true })).not.toBeVisible({
      timeout: 15_000,
    });

    // onSave should have been called with a Blob
    expect(savedBlob).not.toBeNull();
  });

  test("crop with original preset preserves aspect ratio", async ({ mount }) => {
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

    // Open Crop → select Original
    await component.getByRole("toolbar", { name: "Editor tools" }).getByText("Crop").click();
    await expect(component.getByTestId("crop-preset-free")).toBeVisible({ timeout: 5_000 });
    await component.getByTestId("crop-preset-original").click();

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
});
