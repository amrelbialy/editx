import { ImageEditor } from "../../src/image-editor";
import { expect, test } from "../fixtures";

/**
 * Guide: export-formats — see docs/guides/export-formats.md
 *
 * `config.export` limits the offered formats and sets the default selection.
 */

const TEST_IMAGE = "/fixtures/test-image-100x100.png";

// biome-ignore lint/suspicious/noExplicitAny: Playwright CT mount return type
async function waitForEditor(component: any) {
  await component.getByRole("toolbar", { name: "Editor tools" }).waitFor({ timeout: 15_000 });
}

test.describe("Guide: export-formats", () => {
  test("config.export limits formats and sets the default", async ({ mount, page }) => {
    const component = await mount(
      <ImageEditor
        src={TEST_IMAGE}
        width="900px"
        height="600px"
        config={{ export: { formats: ["png", "jpeg"], defaultFormat: "jpeg" } }}
      />,
    );
    await waitForEditor(component);

    await component.getByRole("button", { name: /export image/i }).click();
    await expect(component.getByText("Format", { exact: true })).toBeVisible({ timeout: 5_000 });

    // Default format is preselected on the trigger.
    const trigger = component.getByRole("combobox");
    await expect(trigger).toContainText("JPEG");

    // Open the dropdown and assert the offered formats (options portal to body).
    await trigger.click();
    await expect(page.getByRole("option", { name: "PNG" })).toBeVisible();
    await expect(page.getByRole("option", { name: "JPEG" })).toBeVisible();
    await expect(page.getByRole("option", { name: "WebP" })).toHaveCount(0);
  });
});
