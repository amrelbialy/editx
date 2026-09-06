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
  test("additional preset groups are searchable and insert shapes", async ({ mount }) => {
    const component = await mount(
      <ImageEditor
        src={TEST_IMAGE}
        width="900px"
        height="600px"
        config={{
          shapes: {
            additionalPresetGroups: [
              {
                id: "brand",
                label: "Brand",
                presets: [
                  {
                    id: "brand-badge",
                    label: "Brand Badge",
                    shape: { kind: "rect", cornerRadius: 20 },
                    fill: { kind: "color", color: "#2563eb" },
                    stroke: { color: "#ffffff", width: 4 },
                  },
                ],
              },
            ],
          },
        }}
      />,
    );
    await waitForEditor(component);

    await component.getByRole("toolbar", { name: "Editor tools" }).getByText("Shapes").click();
    await component.getByRole("searchbox", { name: "Search presets" }).fill("Brand Badge");

    const preset = component.getByRole("button", { name: "Brand Badge", exact: true });
    await expect(preset).toBeVisible({ timeout: 10_000 });
    await expect(
      component.getByRole("button", { name: "Rectangle", exact: true }),
    ).toHaveCount(0);
    await preset.click();

    await expect(component.getByRole("button", { name: "Fill", exact: true })).toBeVisible({
      timeout: 5_000,
    });
  });

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
    await expect(component.getByRole("button", { name: "rect", exact: true })).toBeVisible({
      timeout: 10_000,
    });
    await expect(component.getByRole("button", { name: "ellipse", exact: true })).toBeVisible();
    await expect(component.getByRole("button", { name: "star", exact: true })).toBeVisible();

    // Non-whitelisted shapes are hidden.
    await expect(component.getByRole("button", { name: "triangle", exact: true })).toHaveCount(0);
    await expect(component.getByRole("button", { name: "pentagon", exact: true })).toHaveCount(0);
    await expect(component.getByRole("button", { name: "hexagon", exact: true })).toHaveCount(0);
  });
});
