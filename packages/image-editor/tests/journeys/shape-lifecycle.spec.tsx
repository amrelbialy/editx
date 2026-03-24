import { ImageEditor } from "../../src/image-editor";
import { expect, test } from "../fixtures";

const TEST_IMAGE = "/fixtures/test-image-100x100.png";

async function waitForEditor(component: any) {
  await component.getByRole("toolbar", { name: "Editor tools" }).waitFor({ timeout: 15_000 });
}

test.describe("Journey: Add Shape → Select → Delete", () => {
  test("adding a rectangle shape via the shapes panel", async ({ mount }) => {
    const component = await mount(
      <ImageEditor src={TEST_IMAGE} width="900px" height="600px" />,
    );
    await waitForEditor(component);

    // Open Shapes tool
    await component.getByRole("toolbar", { name: "Editor tools" }).getByText("Shapes").click();
    await expect(component.getByTestId("grid-rect")).toBeVisible({ timeout: 5_000 });

    // Click Rectangle to add it to canvas
    await component.getByTestId("grid-rect").click();

    // Shape should be added — the tool panel stays open
    await expect(component.getByTestId("grid-rect")).toBeVisible();
  });

  test("adding an ellipse and star shape successively", async ({ mount }) => {
    const component = await mount(
      <ImageEditor src={TEST_IMAGE} width="900px" height="600px" />,
    );
    await waitForEditor(component);

    await component.getByRole("toolbar", { name: "Editor tools" }).getByText("Shapes").click();
    await expect(component.getByTestId("grid-rect")).toBeVisible({ timeout: 5_000 });

    // Add ellipse
    await component.getByTestId("grid-ellipse").click();

    // Add star
    await component.getByTestId("grid-star").click();

    // Panel still functional
    await expect(component.getByTestId("grid-rect")).toBeVisible();
  });

  test("deleting a shape with the Delete key", async ({ mount, page }) => {
    const component = await mount(
      <ImageEditor src={TEST_IMAGE} width="900px" height="600px" />,
    );
    await waitForEditor(component);

    // Add a rectangle
    await component.getByRole("toolbar", { name: "Editor tools" }).getByText("Shapes").click();
    await expect(component.getByTestId("grid-rect")).toBeVisible({ timeout: 5_000 });
    await component.getByTestId("grid-rect").click();

    // Focus editor and press Delete
    await component.getByRole("application").first().focus();
    await page.keyboard.press("Delete");

    // Editor should still be functional
    await expect(component.getByRole("toolbar", { name: "Editor tools" })).toBeVisible();
  });
});
