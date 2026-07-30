import { ImageEditor } from "../../src/image-editor";
import { expect, test } from "../fixtures";

/**
 * Guide: localize — see docs/guides/localize.md
 *
 * `config.translations` overrides UI strings over the built-in English dictionary.
 */

const TEST_IMAGE = "/fixtures/test-image-100x100.png";

// biome-ignore lint/suspicious/noExplicitAny: Playwright CT mount return type
async function waitForEditor(component: any) {
  await component.getByRole("toolbar", { name: "Editor tools" }).waitFor({ timeout: 15_000 });
}

test.describe("Guide: localize", () => {
  test("config.translations overrides UI labels", async ({ mount }) => {
    const component = await mount(
      <ImageEditor
        src={TEST_IMAGE}
        width="900px"
        height="600px"
        config={{ locale: "es", translations: { "tools.crop": "Recortar" } }}
      />,
    );
    await waitForEditor(component);

    await expect(component.getByRole("button", { name: "Recortar" })).toBeVisible();
    await expect(component.getByRole("button", { name: "Crop" })).toHaveCount(0);
  });
});
