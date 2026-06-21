import { ImageEditor } from "../../src/image-editor";
import { expect, test } from "../fixtures";

/**
 * Recipe: custom-theme — see docs/recipes/custom-theme.md
 *
 * `config.theme` is applied as CSS custom properties on the `.ie-theme` root.
 */

const TEST_IMAGE = "/fixtures/test-image-100x100.png";

// biome-ignore lint/suspicious/noExplicitAny: Playwright CT mount return type
async function waitForEditor(component: any) {
  await component.getByRole("toolbar", { name: "Editor tools" }).waitFor({ timeout: 15_000 });
}

test.describe("Recipe: custom-theme", () => {
  test("config.theme applies CSS custom properties", async ({ mount, page }) => {
    const component = await mount(
      <ImageEditor
        src={TEST_IMAGE}
        width="900px"
        height="600px"
        config={{ theme: { colors: { primary: "#ff3366" }, borderRadius: "0.75rem" } }}
      />,
    );
    await waitForEditor(component);

    const theme = page.locator(".ie-theme").first();
    const primary = await theme.evaluate((el) =>
      getComputedStyle(el).getPropertyValue("--primary").trim(),
    );
    const radius = await theme.evaluate((el) =>
      getComputedStyle(el).getPropertyValue("--radius").trim(),
    );

    expect(primary).toBe("#ff3366");
    expect(radius).toBe("0.75rem");
  });
});
