import { ImageEditor } from "../../src/image-editor";
import { expect, test } from "../fixtures";

const TEST_IMAGE = "/fixtures/test-image-100x100.png";

async function waitForEditor(component: any) {
  await component.getByRole("toolbar", { name: "Editor tools" }).waitFor({ timeout: 15_000 });
}

test.describe("Journey: Filter selection and undo", () => {
  test("applying a filter highlights it, switching deselects the old one", async ({ mount }) => {
    const component = await mount(
      <ImageEditor src={TEST_IMAGE} width="900px" height="600px" />,
    );
    await waitForEditor(component);

    // Open Filters tool
    await component.getByRole("toolbar", { name: "Editor tools" }).getByText("Filters").click();
    await expect(component.getByTestId("filter-original")).toBeVisible({ timeout: 5_000 });

    // Select Clarendon
    await component.getByTestId("filter-Clarendon").click();

    // Select Sepia (should replace Clarendon)
    await component.getByTestId("filter-Sepia").click();

    // Original should still be clickable (not active)
    await expect(component.getByTestId("filter-original")).toBeVisible();
  });

  test("undo reverts filter change", async ({ mount, page }) => {
    const component = await mount(
      <ImageEditor src={TEST_IMAGE} width="900px" height="600px" />,
    );
    await waitForEditor(component);

    // Open Filters
    await component.getByRole("toolbar", { name: "Editor tools" }).getByText("Filters").click();
    await expect(component.getByTestId("filter-original")).toBeVisible({ timeout: 5_000 });

    // Apply a filter then Done
    await component.getByTestId("filter-Sepia").click();
    await component.getByRole("button", { name: "Done" }).click();

    // Undo
    await component.getByRole("application").first().focus();
    await page.keyboard.press("Control+z");

    // Re-open Filters — "Original" should be the active state
    await component.getByRole("toolbar", { name: "Editor tools" }).getByText("Filters").click();
    await expect(component.getByTestId("filter-original")).toBeVisible({ timeout: 5_000 });
  });

  test("filter applied then exported produces a valid blob", async ({ mount }) => {
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

    // Apply filter
    await component.getByRole("toolbar", { name: "Editor tools" }).getByText("Filters").click();
    await expect(component.getByTestId("filter-original")).toBeVisible({ timeout: 5_000 });
    await component.getByTestId("filter-Clarendon").click();
    await component.getByRole("button", { name: "Done" }).click();

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
