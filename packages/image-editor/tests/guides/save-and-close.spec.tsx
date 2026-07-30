import { ImageEditor } from "../../src/image-editor";
import { expect, test } from "../fixtures";

/**
 * Guide: save-and-close — see docs/guides/save-and-close.md
 *
 * `config.export.closeAfterSave` calls onClose("save") after a successful export.
 */

const TEST_IMAGE = "/fixtures/test-image-100x100.png";

// biome-ignore lint/suspicious/noExplicitAny: Playwright CT mount return type
async function waitForEditor(component: any) {
  await component.getByRole("toolbar", { name: "Editor tools" }).waitFor({ timeout: 15_000 });
}

test.describe("Guide: save-and-close", () => {
  test("closeAfterSave triggers onClose with the save reason", async ({ mount }) => {
    let closeReason: string | null = null;

    const component = await mount(
      <ImageEditor
        src={TEST_IMAGE}
        width="900px"
        height="600px"
        onSave={() => {}}
        onClose={(reason) => {
          closeReason = reason ?? null;
        }}
        config={{ export: { closeAfterSave: true } }}
      />,
    );
    await waitForEditor(component);

    // Open the export dialog and save
    await component.getByRole("button", { name: /export image/i }).click();
    await expect(component.getByText("Format", { exact: true })).toBeVisible({ timeout: 5_000 });
    await component.getByRole("button", { name: "Save" }).click();

    // Editor requested close with the "save" reason
    await expect.poll(() => closeReason, { timeout: 10_000 }).toBe("save");
  });
});
