import { expect, test } from "../fixtures";
import { CustomToolHarness } from "./custom-tool.harness";

/**
 * Guide: custom-tool — see docs/guides/custom-tool.md
 *
 * `config.customTools` adds a tool button to the sidebar and renders its panel
 * when the tool is selected. The panel reaches the engine (captured from
 * `onReady`) and applies a real filter effect to the image block. The config
 * (with component-typed icon/panel) is built in an importable story so
 * Playwright CT can mount it.
 */

// biome-ignore lint/suspicious/noExplicitAny: Playwright CT mount return type
async function waitForEditor(component: any) {
  await component.getByRole("toolbar", { name: "Editor tools" }).waitFor({ timeout: 15_000 });
}

test.describe("Guide: custom-tool", () => {
  test("config.customTools adds a tool whose panel applies an image effect", async ({ mount }) => {
    const component = await mount(<CustomToolHarness />);
    await waitForEditor(component);

    const button = component.getByRole("button", { name: "Looks" });
    await expect(button).toBeVisible();

    await button.click();
    await expect(component.getByTestId("looks-panel")).toBeVisible({ timeout: 5_000 });

    // Selecting a look writes a filter effect to the image block (read back from
    // the engine), proving the custom tool actually mutates the document.
    await component.getByTestId("look-Sepia").click();
    await expect(component.getByTestId("applied-look")).toHaveText("Sepia", { timeout: 5_000 });

    // Selecting "Original" clears the effect.
    await component.getByTestId("look-original").click();
    await expect(component.getByTestId("applied-look")).toHaveText("");
  });
});
