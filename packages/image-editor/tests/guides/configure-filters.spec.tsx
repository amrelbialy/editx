import { ImageEditor } from "../../src/image-editor";
import { expect, test } from "../fixtures";

/**
 * Guide: configure-filters — see docs/guides/configure-filters.md
 *
 * `config.filter.presets` whitelists which filter presets the Filters tool
 * shows, alongside the always-present "Original" option.
 */

const TEST_IMAGE = "/fixtures/test-image-100x100.png";

// biome-ignore lint/suspicious/noExplicitAny: Playwright CT mount return type
async function waitForEditor(component: any) {
  await component.getByRole("toolbar", { name: "Editor tools" }).waitFor({ timeout: 15_000 });
}

test.describe("Guide: configure-filters", () => {
  test("config.filter.presets renders only the whitelisted presets", async ({ mount }) => {
    const component = await mount(
      <ImageEditor
        src={TEST_IMAGE}
        width="900px"
        height="600px"
        config={{ filter: { presets: ["Sepia", "Clarendon", "Moon"] } }}
      />,
    );
    await waitForEditor(component);

    // Open the Filters tool.
    await component.getByRole("toolbar", { name: "Editor tools" }).getByText("Filters").click();

    // Original + the whitelisted presets appear (thumbnails render async).
    await expect(component.getByTestId("filter-original")).toBeVisible({ timeout: 10_000 });
    await expect(component.getByTestId("filter-Sepia")).toBeVisible();
    await expect(component.getByTestId("filter-Clarendon")).toBeVisible();
    await expect(component.getByTestId("filter-Moon")).toBeVisible();

    // Non-whitelisted presets are hidden.
    await expect(component.getByTestId("filter-Invert")).toHaveCount(0);
    await expect(component.getByTestId("filter-Ludwig")).toHaveCount(0);
  });
});
