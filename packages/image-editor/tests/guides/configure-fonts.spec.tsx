import { ImageEditor } from "../../src/image-editor";
import { expect, test } from "../fixtures";

/**
 * Guide: configure-fonts — see docs/guides/configure-fonts.md
 *
 * `config.text.fonts` drives the font-family pickers and the default family for
 * newly added text.
 */

const TEST_IMAGE = "/fixtures/test-image-100x100.png";

// biome-ignore lint/suspicious/noExplicitAny: Playwright CT mount return type
async function waitForEditor(component: any) {
  await component.getByRole("toolbar", { name: "Editor tools" }).waitFor({ timeout: 15_000 });
}

test.describe("Guide: configure-fonts", () => {
  test("config.text.fonts drives the font picker", async ({ mount, page }) => {
    const component = await mount(
      <ImageEditor
        src={TEST_IMAGE}
        width="900px"
        height="600px"
        config={{ text: { fonts: ["Poppins", "Roboto Mono", "Playfair Display"] } }}
      />,
    );
    await waitForEditor(component);

    // Open the Text tool and add a body text block (auto-selects it).
    await component.getByRole("toolbar", { name: "Editor tools" }).getByText("Text").click();
    await component.getByTestId("grid-body").click();

    // Open the selection bar's font picker.
    const fontPicker = component.getByRole("combobox").first();
    await expect(fontPicker).toBeVisible({ timeout: 5_000 });
    await fontPicker.click();

    // It lists exactly the configured fonts — not the built-in defaults.
    await expect(page.getByRole("option", { name: "Poppins" })).toBeVisible();
    await expect(page.getByRole("option", { name: "Roboto Mono" })).toBeVisible();
    await expect(page.getByRole("option", { name: "Playfair Display" })).toBeVisible();
    await expect(page.getByRole("option", { name: "Arial" })).toHaveCount(0);
  });
});
