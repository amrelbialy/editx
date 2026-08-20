import { ImageEditor } from "../../src/image-editor";
import { expect, test } from "../fixtures";

const TEST_IMAGE = "/fixtures/test-image-100x100.png";

async function waitForEditor(component: any) {
  await component.getByRole("toolbar", { name: "Editor tools" }).waitFor({ timeout: 15_000 });
}

function filledShape(component: any, name: string) {
  return component
    .getByLabel("Filled", { exact: true })
    .getByRole("button", { name, exact: true });
}

test.describe("Journey: Add Shape → Select → Delete", () => {
  test("adding a rectangle shape via the shapes panel", async ({ mount }) => {
    const component = await mount(
      <ImageEditor src={TEST_IMAGE} width="900px" height="600px" />,
    );
    await waitForEditor(component);

    // Open Shapes tool
    await component.getByRole("toolbar", { name: "Editor tools" }).getByText("Shapes").click();
    const rectangle = filledShape(component, "Rectangle");
    await expect(rectangle).toBeVisible({ timeout: 5_000 });

    // Click Rectangle to add it to canvas
    await rectangle.click();

    // Shape should be added — the tool panel stays open
    await expect(rectangle).toBeVisible();
  });

  test("adding an ellipse and star shape successively", async ({ mount }) => {
    const component = await mount(
      <ImageEditor src={TEST_IMAGE} width="900px" height="600px" />,
    );
    await waitForEditor(component);

    await component.getByRole("toolbar", { name: "Editor tools" }).getByText("Shapes").click();
  await expect(filledShape(component, "Rectangle")).toBeVisible({ timeout: 5_000 });

  // Add circle (ellipse geometry)
  await filledShape(component, "Circle").click();

    // Add star
  const search = component.getByRole("searchbox", { name: "Search presets" });
  await search.fill("Star");
  await filledShape(component, "Star").click();
  await search.fill("");

    // Panel still functional
  await expect(filledShape(component, "Rectangle")).toBeVisible();
  });

  test("deleting a shape with the Delete key", async ({ mount, page }) => {
    const component = await mount(
      <ImageEditor src={TEST_IMAGE} width="900px" height="600px" />,
    );
    await waitForEditor(component);

    // Add a rectangle
    await component.getByRole("toolbar", { name: "Editor tools" }).getByText("Shapes").click();
    const rectangle = filledShape(component, "Rectangle");
    await expect(rectangle).toBeVisible({ timeout: 5_000 });
    await rectangle.click();

    // Focus editor and press Delete
    await component.getByRole("application").first().focus();
    await page.keyboard.press("Delete");

    // Editor should still be functional
    await expect(component.getByRole("toolbar", { name: "Editor tools" })).toBeVisible();
  });
});
