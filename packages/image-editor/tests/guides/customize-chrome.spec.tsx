import { ImageEditor } from "../../src/image-editor";
import { expect, test } from "../fixtures";

/**
 * Guide: customize-chrome — see docs/guides/customize-chrome.md
 *
 * `config.ui` controls the topbar title and the close/back button.
 */

const TEST_IMAGE = "/fixtures/test-image-100x100.png";

// biome-ignore lint/suspicious/noExplicitAny: Playwright CT mount return type
async function waitForEditor(component: any) {
  await component.getByRole("toolbar", { name: "Editor tools" }).waitFor({ timeout: 15_000 });
}

test.describe("Guide: customize-chrome", () => {
  test("config.ui.title renders a custom topbar title", async ({ mount }) => {
    const component = await mount(
      <ImageEditor
        src={TEST_IMAGE}
        width="900px"
        height="600px"
        config={{ ui: { title: "Photo Studio" } }}
      />,
    );
    await waitForEditor(component);

    await expect(component.getByText("Photo Studio")).toBeVisible();
  });

  test("showBackButton swaps the close X for a Back button", async ({ mount }) => {
    const component = await mount(
      <ImageEditor
        src={TEST_IMAGE}
        width="900px"
        height="600px"
        onClose={() => {}}
        config={{ ui: { showBackButton: true } }}
      />,
    );
    await waitForEditor(component);

    await expect(component.getByRole("button", { name: "Back" })).toBeVisible();
    await expect(component.getByRole("button", { name: "Close editor" })).toHaveCount(0);
  });
});
