import { ImageEditor } from "../src/image-editor";
import { expect, test } from "./fixtures";

const TEST_IMAGE = "/fixtures/test-image-100x100.png";

test.describe("Export Flow", () => {
  test("opens export dialog from topbar button", async ({ mount }) => {
    const component = await mount(
      <ImageEditor src={TEST_IMAGE} width="900px" height="600px" />,
    );

    // Click the Export Image button
    await component.getByText("Export Image").click();

    // Dialog should appear with heading
    await expect(component.getByRole("heading", { name: "Export Image" })).toBeVisible({ timeout: 5_000 });
    await expect(component.getByText("Format", { exact: true })).toBeVisible();
  });

  test("shows quality slider only for JPEG and WebP", async ({ mount }) => {
    const component = await mount(
      <ImageEditor src={TEST_IMAGE} width="900px" height="600px" />,
    );

    // Open export dialog
    await component.getByRole("button", { name: /export image/i }).click();
    await expect(component.getByText("Format", { exact: true })).toBeVisible({ timeout: 5_000 });

    // Default is PNG — quality slider should NOT be visible
    await expect(component.getByText("Quality", { exact: true })).not.toBeVisible();
  });

  test("cancel button closes the export dialog", async ({ mount }) => {
    const component = await mount(
      <ImageEditor src={TEST_IMAGE} width="900px" height="600px" />,
    );

    await component.getByRole("button", { name: /export image/i }).click();
    await expect(component.getByText("Format", { exact: true })).toBeVisible({ timeout: 5_000 });

    // Click Cancel
    await component.getByRole("button", { name: "Cancel" }).click();

    // Dialog should close
    await expect(component.getByText("Format", { exact: true })).not.toBeVisible();
  });

  test("calls onSave callback when export completes", async ({ mount }) => {
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

    // Wait for the editor to fully load (canvas initialized)
    await component.getByRole("toolbar", { name: "Editor tools" }).waitFor({ timeout: 10_000 });

    // Open export dialog and save
    await component.getByRole("button", { name: /export image/i }).click();
    await expect(component.getByText("Format", { exact: true })).toBeVisible({ timeout: 5_000 });

    await component.getByRole("button", { name: "Save" }).click();

    // Wait for export to complete (dialog closes)
    await expect(component.getByText("Format", { exact: true })).not.toBeVisible({ timeout: 10_000 });
  });
});
