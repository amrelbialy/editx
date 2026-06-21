import { expect, test } from "../fixtures";
import { CustomToolHarness } from "./custom-tool.harness";

/**
 * Recipe: custom-tool — see docs/recipes/custom-tool.md
 *
 * `config.customTools` adds a tool button to the sidebar and renders its panel
 * when the tool is selected. The config (with component-typed icon/panel) is
 * built in an importable story so Playwright CT can mount it.
 */

// biome-ignore lint/suspicious/noExplicitAny: Playwright CT mount return type
async function waitForEditor(component: any) {
  await component.getByRole("toolbar", { name: "Editor tools" }).waitFor({ timeout: 15_000 });
}

test.describe("Recipe: custom-tool", () => {
  test("config.customTools adds a tool and renders its panel", async ({ mount }) => {
    const component = await mount(<CustomToolHarness />);
    await waitForEditor(component);

    const button = component.getByRole("button", { name: "Stickers" });
    await expect(button).toBeVisible();

    await button.click();
    await expect(component.getByTestId("stickers-panel")).toBeVisible({ timeout: 5_000 });
  });
});
