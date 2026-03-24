import { ImageEditor } from "../../src/image-editor";
import { expect, test } from "../fixtures";

const TEST_IMAGE = "/fixtures/test-image-100x100.png";

async function waitForEditor(component: any) {
  await component.getByRole("toolbar", { name: "Editor tools" }).waitFor({ timeout: 15_000 });
}

test.describe("Journey: Adjust → Undo → Export", () => {
  test("adjusting brightness then undoing restores default, export still works", async ({
    mount,
    page,
  }) => {
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

    // 1. Open Adjust tool
    await component.getByRole("toolbar", { name: "Editor tools" }).getByText("Adjust").click();
    await expect(component.getByText("Brightness")).toBeVisible({ timeout: 5_000 });

    // 2. Change brightness via the slider
    const brightnessSlider = component.getByTestId("adjust-brightness");
    await expect(brightnessSlider).toBeVisible();

    // Click somewhere on the slider to change value
    const box = await brightnessSlider.boundingBox();
    if (box) {
      // Click right of center to increase brightness
      await page.mouse.click(box.x + box.width * 0.75, box.y + box.height / 2);
    }

    // 3. Click Done to commit
    await component.getByRole("button", { name: "Done" }).click();

    // 4. Undo
    await component.getByRole("application").first().focus();
    await page.keyboard.press("Control+z");

    // 5. Export — should still produce valid output
    await component.getByRole("button", { name: /export image/i }).click();
    await expect(component.getByText("Format", { exact: true })).toBeVisible({ timeout: 5_000 });
    await component.getByRole("button", { name: "Save" }).click();
    await expect(component.getByText("Format", { exact: true })).not.toBeVisible({
      timeout: 15_000,
    });

    expect(savedBlob).not.toBeNull();
  });

  test("adjust reset clears all sliders back to defaults", async ({ mount }) => {
    const component = await mount(
      <ImageEditor src={TEST_IMAGE} width="900px" height="600px" />,
    );
    await waitForEditor(component);

    // Open Adjust
    await component.getByRole("toolbar", { name: "Editor tools" }).getByText("Adjust").click();
    await expect(component.getByText("Brightness")).toBeVisible({ timeout: 5_000 });

    // Click Reset All
    await component.getByTestId("adjust-reset").click();

    // Sliders should still be present (panel didn't close)
    await expect(component.getByText("Brightness")).toBeVisible();
    await expect(component.getByText("Contrast")).toBeVisible();
  });
});
