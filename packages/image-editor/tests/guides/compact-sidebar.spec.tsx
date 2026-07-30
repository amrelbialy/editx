import { ImageEditor } from "../../src/image-editor";
import { expect, test } from "../fixtures";

/**
 * Guide: compact-sidebar — see docs/guides/compact-sidebar.md
 *
 * `config.ui.toolSidebar.compact: true` collapses the tool rail to an icon-only
 * column while keeping each tool reachable by its accessible name.
 */

const TEST_IMAGE = "/fixtures/test-image-100x100.png";

// biome-ignore lint/suspicious/noExplicitAny: Playwright CT mount return type
async function waitForEditor(component: any) {
  await component.getByRole("toolbar", { name: "Editor tools" }).waitFor({ timeout: 15_000 });
}

test.describe("Guide: compact-sidebar", () => {
  test("compact: true hides label text but keeps tools accessible", async ({ mount }) => {
    const component = await mount(
      <ImageEditor
        src={TEST_IMAGE}
        width="900px"
        height="600px"
        config={{ ui: { toolSidebar: { compact: true } } }}
      />,
    );
    await waitForEditor(component);

    const toolbar = component.getByRole("toolbar", { name: "Editor tools" });

    // Visible label text is gone.
    await expect(toolbar.getByText("Crop", { exact: true })).toHaveCount(0);

    // The tool button is still reachable by its accessible name.
    await expect(toolbar.getByRole("button", { name: "Crop" })).toBeVisible();
  });
});
