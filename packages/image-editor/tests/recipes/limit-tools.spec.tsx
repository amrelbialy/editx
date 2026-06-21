import { ImageEditor } from "../../src/image-editor";
import { expect, test } from "../fixtures";

/**
 * Recipe: limit-tools — see docs/recipes/limit-tools.md
 *
 * Passing `config.tools` renders only the listed tools in the sidebar.
 */

const TEST_IMAGE = "/fixtures/test-image-100x100.png";

// biome-ignore lint/suspicious/noExplicitAny: Playwright CT mount return type
async function waitForEditor(component: any) {
  await component.getByRole("toolbar", { name: "Editor tools" }).waitFor({ timeout: 15_000 });
}

test.describe("Recipe: limit-tools", () => {
  test("config.tools renders only the listed tools", async ({ mount }) => {
    const component = await mount(
      <ImageEditor
        src={TEST_IMAGE}
        width="900px"
        height="600px"
        config={{ tools: ["crop", "adjust"] }}
      />,
    );
    await waitForEditor(component);

    await expect(component.getByRole("button", { name: "Crop" })).toBeVisible();
    await expect(component.getByRole("button", { name: "Adjust" })).toBeVisible();

    await expect(component.getByRole("button", { name: "Filters" })).toHaveCount(0);
    await expect(component.getByRole("button", { name: "Text" })).toHaveCount(0);
  });
});
