import { ImageEditor } from "../../src/image-editor";
import { expect, test } from "../fixtures";

const TEST_IMAGE = "/fixtures/test-image-100x100.png";

async function waitForEditor(component: any) {
  await component.getByRole("toolbar", { name: "Editor tools" }).waitFor({ timeout: 15_000 });
}

test.describe("Journey: Export format switching", () => {
  test("quality slider appears for JPEG, stays for WebP, disappears for PNG", async ({
    mount,
  }) => {
    const component = await mount(
      <ImageEditor src={TEST_IMAGE} width="900px" height="600px" />,
    );
    await waitForEditor(component);

    // Open export dialog
    await component.getByRole("button", { name: /export image/i }).click();
    await expect(component.getByText("Format", { exact: true })).toBeVisible({ timeout: 5_000 });

    // Default is PNG — no quality slider
    await expect(component.getByText("Quality", { exact: true })).not.toBeVisible();

    // Switch to JPEG
    await component.getByRole("combobox").click();
    await component.getByRole("option", { name: "JPEG" }).click();
    await expect(component.getByText("Quality", { exact: true })).toBeVisible();

    // Switch to WebP
    await component.getByRole("combobox").click();
    await component.getByRole("option", { name: "WebP" }).click();
    await expect(component.getByText("Quality", { exact: true })).toBeVisible();

    // Switch back to PNG
    await component.getByRole("combobox").click();
    await component.getByRole("option", { name: "PNG" }).click();
    await expect(component.getByText("Quality", { exact: true })).not.toBeVisible();
  });

  test("exporting as WebP calls onSave with a blob", async ({ mount }) => {
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

    await component.getByRole("button", { name: /export image/i }).click();
    await expect(component.getByText("Format", { exact: true })).toBeVisible({ timeout: 5_000 });

    // Select WebP
    await component.getByRole("combobox").click();
    await component.getByRole("option", { name: "WebP" }).click();

    // Save
    await component.getByRole("button", { name: "Save" }).click();
    await expect(component.getByText("Format", { exact: true })).not.toBeVisible({
      timeout: 15_000,
    });

    expect(savedBlob).not.toBeNull();
  });
});
