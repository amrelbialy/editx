import { ImageEditor } from "../../src/image-editor";
import { expect, test } from "../fixtures";

/**
 * Recipe: inject-slots — see docs/recipes/inject-slots.md
 *
 * The `slots` prop renders custom React nodes into named regions of the shell.
 */

const TEST_IMAGE = "/fixtures/test-image-100x100.png";

// biome-ignore lint/suspicious/noExplicitAny: Playwright CT mount return type
async function waitForEditor(component: any) {
  await component.getByRole("toolbar", { name: "Editor tools" }).waitFor({ timeout: 15_000 });
}

test.describe("Recipe: inject-slots", () => {
  test("slots.topbarRight renders custom UI in the topbar", async ({ mount }) => {
    const component = await mount(
      <ImageEditor
        src={TEST_IMAGE}
        width="900px"
        height="600px"
        slots={{ topbarRight: <span data-testid="topbar-slot">Share</span> }}
      />,
    );
    await waitForEditor(component);

    await expect(component.getByTestId("topbar-slot")).toBeVisible();
  });
});
