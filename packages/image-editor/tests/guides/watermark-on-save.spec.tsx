import { expect, test } from "../fixtures";
import { WatermarkOnSaveHarness } from "./watermark-on-save.harness";

/**
 * Guide: watermark-on-save � see docs/guides/watermark-on-save.md
 *
 * `events.onBeforeSave` transforms the exported blob before it reaches onSave.
 * The blob is inspected in-browser via the harness (see the harness comment).
 */

// biome-ignore lint/suspicious/noExplicitAny: Playwright CT mount return type
async function waitForEditor(component: any) {
  await component.getByRole("toolbar", { name: "Editor tools" }).waitFor({ timeout: 15_000 });
}

test.describe("Guide: watermark-on-save", () => {
  test("onBeforeSave replaces the blob handed to onSave", async ({ mount }) => {
    const component = await mount(<WatermarkOnSaveHarness />);
    await waitForEditor(component);

    // Open the export dialog and save
    await component.getByRole("button", { name: /export image/i }).click();
    await expect(component.getByText("Format", { exact: true })).toBeVisible({ timeout: 5_000 });
    await component.getByRole("button", { name: "Save" }).click();

    // onSave received the exact blob returned by onBeforeSave
    await expect(component.getByTestId("save-result")).toHaveText("watermarked", {
      timeout: 10_000,
    });
  });
});
