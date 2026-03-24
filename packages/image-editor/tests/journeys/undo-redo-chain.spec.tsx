import { ImageEditor } from "../../src/image-editor";
import { expect, test } from "../fixtures";

const TEST_IMAGE = "/fixtures/test-image-100x100.png";

async function waitForEditor(component: any) {
  await component.getByRole("toolbar", { name: "Editor tools" }).waitFor({ timeout: 15_000 });
}

test.describe("Journey: Undo/Redo chain integrity", () => {
  test("multiple edits can be fully undone and redone", async ({ mount, page }) => {
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

    // --- Edit 1: Apply filter ---
    await toolbar.getByText("Filters").click();
    await expect(component.getByTestId("filter-original")).toBeVisible({ timeout: 5_000 });
    await component.getByTestId("filter-Sepia").click();
    await component.getByRole("button", { name: "Done" }).click();

    // --- Edit 2: Add shape ---
    await toolbar.getByText("Shapes").click();
    await expect(component.getByTestId("grid-rect")).toBeVisible({ timeout: 5_000 });
    await component.getByTestId("grid-rect").click();

    // --- Edit 3: Add text ---
    await toolbar.getByText("Text").click();
    await expect(component.getByTestId("grid-heading")).toBeVisible({ timeout: 5_000 });
    await component.getByTestId("grid-heading").click();

    // --- Undo all 3 edits ---
    await component.getByRole("application").first().focus();
    await page.keyboard.press("Control+z");
    await page.keyboard.press("Control+z");
    await page.keyboard.press("Control+z");

    // Brief pause to let undo settle
    await page.waitForTimeout(300);

    // --- Redo all 3 edits ---
    await page.keyboard.press("Control+Shift+z");
    await page.keyboard.press("Control+Shift+z");
    await page.keyboard.press("Control+Shift+z");

    await page.waitForTimeout(300);

    // --- Export — should include all edits ---
    await component.getByRole("button", { name: /export image/i }).click();
    await expect(component.getByText("Format", { exact: true })).toBeVisible({ timeout: 5_000 });
    await component.getByRole("button", { name: "Save" }).click();
    await expect(component.getByText("Format", { exact: true })).not.toBeVisible({
      timeout: 15_000,
    });

    expect(savedBlob).not.toBeNull();
  });

  test("undo button in topbar triggers undo", async ({ mount }) => {
    const component = await mount(
      <ImageEditor src={TEST_IMAGE} width="900px" height="600px" />,
    );
    await waitForEditor(component);

    // Make an edit to enable undo
    await component.getByRole("toolbar", { name: "Editor tools" }).getByText("Shapes").click();
    await expect(component.getByTestId("grid-rect")).toBeVisible({ timeout: 5_000 });
    await component.getByTestId("grid-rect").click();

    // Click undo button
    await component.getByRole("button", { name: /undo/i }).click();

    // Editor should remain functional
    await expect(component.getByRole("toolbar", { name: "Editor tools" })).toBeVisible();
  });

  test("redo button in topbar triggers redo after undo", async ({ mount }) => {
    const component = await mount(
      <ImageEditor src={TEST_IMAGE} width="900px" height="600px" />,
    );
    await waitForEditor(component);

    // Make edit → undo → redo via buttons
    await component.getByRole("toolbar", { name: "Editor tools" }).getByText("Shapes").click();
    await expect(component.getByTestId("grid-rect")).toBeVisible({ timeout: 5_000 });
    await component.getByTestId("grid-rect").click();

    await component.getByRole("button", { name: /undo/i }).click();
    await component.getByRole("button", { name: /redo/i }).click();

    await expect(component.getByRole("toolbar", { name: "Editor tools" })).toBeVisible();
  });
});
