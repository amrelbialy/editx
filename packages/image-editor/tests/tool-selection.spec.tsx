import { ImageEditor } from "../src/image-editor";
import { expect, test } from "./fixtures";

const TEST_IMAGE = "/fixtures/test-image-100x100.png";

test.describe("Tool Selection", () => {
  test("activates Adjust tool and shows adjustment controls", async ({ mount }) => {
    const component = await mount(
      <ImageEditor src={TEST_IMAGE} width="900px" height="600px" />,
    );

    const toolbar = component.getByRole("toolbar", { name: "Editor tools" });
    await expect(toolbar).toBeVisible();

    await toolbar.getByText("Adjust").click();

    // Should show adjustment sliders
    await expect(component.getByText("Brightness")).toBeVisible({ timeout: 5_000 });
  });

  test("activates Filter tool and shows filter presets", async ({ mount }) => {
    const component = await mount(
      <ImageEditor src={TEST_IMAGE} width="900px" height="600px" />,
    );

    const toolbar = component.getByRole("toolbar", { name: "Editor tools" });
    await expect(toolbar).toBeVisible();

    await toolbar.getByText("Filters").click();

    // Should show the "Original" option (no-filter preset)
    await expect(component.getByText("Original")).toBeVisible({ timeout: 5_000 });
  });

  test("activates Shapes tool and shows shape options", async ({ mount }) => {
    const component = await mount(
      <ImageEditor src={TEST_IMAGE} width="900px" height="600px" />,
    );

    const toolbar = component.getByRole("toolbar", { name: "Editor tools" });
    await expect(toolbar).toBeVisible();

    await toolbar.getByText("Shapes").click();

    // Should show shape types like Rectangle
    await expect(component.getByText("Rectangle")).toBeVisible({ timeout: 5_000 });
  });

  test("activates Text tool and shows text presets", async ({ mount }) => {
    const component = await mount(
      <ImageEditor src={TEST_IMAGE} width="900px" height="600px" />,
    );

    const toolbar = component.getByRole("toolbar", { name: "Editor tools" });
    await expect(toolbar).toBeVisible();

    await toolbar.getByText("Text").click();

    // Should show text preset options like "Heading"
    await expect(component.getByTestId("grid-heading")).toBeVisible({ timeout: 5_000 });
  });

  test("switches between tools preserving state", async ({ mount }) => {
    const component = await mount(
      <ImageEditor src={TEST_IMAGE} width="900px" height="600px" />,
    );

    const toolbar = component.getByRole("toolbar", { name: "Editor tools" });
    await expect(toolbar).toBeVisible();

    // Activate Adjust
    await toolbar.getByText("Adjust").click();
    await expect(component.getByText("Brightness")).toBeVisible({ timeout: 5_000 });

    // Switch to Shapes
    await toolbar.getByText("Shapes").click();
    await expect(component.getByText("Rectangle")).toBeVisible({ timeout: 5_000 });
    // Adjust panel should be gone
    await expect(component.getByText("Brightness")).not.toBeVisible();
  });
});
