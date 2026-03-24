import { ImageEditor } from "../../src/image-editor";
import { expect, test } from "../fixtures";

const TEST_IMAGE = "/fixtures/test-image-100x100.png";

async function waitForEditor(component: any) {
  await component.getByRole("toolbar", { name: "Editor tools" }).waitFor({ timeout: 15_000 });
}

test.describe("Journey: Multi-edit → Export", () => {
  test("crop + adjust + filter + shape → export as JPEG", async ({ mount, page }) => {
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

    const toolbar = component.getByRole("toolbar", { name: "Editor tools" });

    // --- Step 1: Crop 1:1 ---
    await toolbar.getByText("Crop").click();
    await expect(component.getByTestId("crop-preset-free")).toBeVisible({ timeout: 5_000 });
    await component.getByTestId("crop-preset-1:1").click();
    await component.getByRole("button", { name: "Done" }).click();
    await expect(component.getByTestId("crop-preset-free")).not.toBeVisible({ timeout: 5_000 });

    // --- Step 2: Adjust brightness ---
    await toolbar.getByText("Adjust").click();
    await expect(component.getByText("Brightness")).toBeVisible({ timeout: 5_000 });
    // Interact with brightness slider
    const slider = component.getByTestId("adjust-brightness");
    const box = await slider.boundingBox();
    if (box) {
      await page.mouse.click(box.x + box.width * 0.7, box.y + box.height / 2);
    }
    await component.getByRole("button", { name: "Done" }).click();

    // --- Step 3: Apply filter ---
    await toolbar.getByText("Filters").click();
    await expect(component.getByTestId("filter-original")).toBeVisible({ timeout: 5_000 });
    await component.getByTestId("filter-Sepia").click();
    await component.getByRole("button", { name: "Done" }).click();

    // --- Step 4: Add a rectangle shape ---
    await toolbar.getByText("Shapes").click();
    await expect(component.getByTestId("grid-rect")).toBeVisible({ timeout: 5_000 });
    await component.getByTestId("grid-rect").click();

    // --- Step 5: Export as JPEG ---
    await component.getByRole("button", { name: /export image/i }).click();
    await expect(component.getByText("Format", { exact: true })).toBeVisible({ timeout: 5_000 });

    // Change format to JPEG
    await component.getByRole("combobox").click();
    await component.getByRole("option", { name: "JPEG" }).click();

    // Quality slider should now be visible
    await expect(component.getByText("Quality", { exact: true })).toBeVisible();

    // Save
    await component.getByRole("button", { name: "Save" }).click();
    await expect(component.getByText("Format", { exact: true })).not.toBeVisible({
      timeout: 15_000,
    });

    expect(savedBlob).not.toBeNull();
  });
});
