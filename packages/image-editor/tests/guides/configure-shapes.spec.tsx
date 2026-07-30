import { ImageEditor } from "../../src/image-editor";
import { expect, test } from "../fixtures";

/**
 * Guide: configure-shapes — see docs/guides/configure-shapes.md
 *
 * `config.shapes.presets` whitelists which shapes the Shapes tool offers.
 */

const TEST_IMAGE = "/fixtures/test-image-100x100.png";

// biome-ignore lint/suspicious/noExplicitAny: Playwright CT mount return type
async function waitForEditor(component: any) {
  await component.getByRole("toolbar", { name: "Editor tools" }).waitFor({ timeout: 15_000 });
}

test.describe("Guide: configure-shapes", () => {
  test("config.shapes.presets renders only the whitelisted shapes", async ({ mount }) => {
    const component = await mount(
      <ImageEditor
        src={TEST_IMAGE}
        width="900px"
        height="600px"
        config={{ shapes: { presets: ["rect", "ellipse", "star"] } }}
      />,
    );
    await waitForEditor(component);

    // Open the Shapes tool.
    await component.getByRole("toolbar", { name: "Editor tools" }).getByText("Shapes").click();

    // Whitelisted shapes appear.
    await expect(component.getByTestId("grid-rect")).toBeVisible({ timeout: 10_000 });
    await expect(component.getByTestId("grid-ellipse")).toBeVisible();
    await expect(component.getByTestId("grid-star")).toBeVisible();

    // Non-whitelisted shapes are hidden.
    await expect(component.getByTestId("grid-triangle")).toHaveCount(0);
    await expect(component.getByTestId("grid-pentagon")).toHaveCount(0);
    await expect(component.getByTestId("grid-hexagon")).toHaveCount(0);
  });
});
