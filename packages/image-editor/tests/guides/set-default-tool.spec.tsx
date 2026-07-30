import { ImageEditor } from "../../src/image-editor";
import { expect, test } from "../fixtures";

/**
 * Guide: set-default-tool — see docs/guides/set-default-tool.md
 *
 * `config.defaultTool` opens the editor directly on the named tool once the
 * image loads — no click required.
 */

const TEST_IMAGE = "/fixtures/test-image-100x100.png";

// biome-ignore lint/suspicious/noExplicitAny: Playwright CT mount return type
async function waitForEditor(component: any) {
  await component.getByRole("toolbar", { name: "Editor tools" }).waitFor({ timeout: 15_000 });
}

test.describe("Guide: set-default-tool", () => {
  test("config.defaultTool opens the editor on the named tool", async ({ mount }) => {
    const component = await mount(
      <ImageEditor
        src={TEST_IMAGE}
        width="900px"
        height="600px"
        config={{ defaultTool: "adjust" }}
      />,
    );
    await waitForEditor(component);

    // Adjust panel is open without any interaction.
    await expect(component.getByTestId("adjust-brightness")).toBeVisible({ timeout: 10_000 });
  });
});
