import { ImageEditor } from "../../src/image-editor";
import { expect, test } from "../fixtures";

const TEST_IMAGE = "/fixtures/test-image-100x100.png";

async function waitForEditor(component: any) {
  await component.getByRole("toolbar", { name: "Editor tools" }).waitFor({ timeout: 15_000 });
}

test.describe("Journey: Add Text", () => {
  test("adding a Heading text block from the text panel", async ({ mount }) => {
    const component = await mount(
      <ImageEditor src={TEST_IMAGE} width="900px" height="600px" />,
    );
    await waitForEditor(component);

    // Open Text tool
    await component.getByRole("toolbar", { name: "Editor tools" }).getByText("Text").click();
    await expect(component.getByTestId("grid-heading")).toBeVisible({ timeout: 5_000 });

    // Click "Heading" preset to add text
    await component.getByTestId("grid-heading").click();

    // Editor should still be functional
    await expect(component.getByRole("toolbar", { name: "Editor tools" })).toBeVisible();
  });

  test("adding a Body Text preset", async ({ mount }) => {
    const component = await mount(
      <ImageEditor src={TEST_IMAGE} width="900px" height="600px" />,
    );
    await waitForEditor(component);

    await component.getByRole("toolbar", { name: "Editor tools" }).getByText("Text").click();
    await expect(component.getByTestId("grid-body")).toBeVisible({ timeout: 5_000 });

    await component.getByTestId("grid-body").click();

    await expect(component.getByRole("toolbar", { name: "Editor tools" })).toBeVisible();
  });

  test("adding multiple text presets in sequence", async ({ mount }) => {
    const component = await mount(
      <ImageEditor src={TEST_IMAGE} width="900px" height="600px" />,
    );
    await waitForEditor(component);

    await component.getByRole("toolbar", { name: "Editor tools" }).getByText("Text").click();
    await expect(component.getByTestId("grid-title")).toBeVisible({ timeout: 5_000 });

    // Add Title — the TextPanel stays open (activeTool remains "text")
    await component.getByTestId("grid-title").click();

    // Add Heading directly — no need to re-click the toolbar button
    await expect(component.getByTestId("grid-heading")).toBeVisible({ timeout: 5_000 });
    await component.getByTestId("grid-heading").click();

    // Editor should not crash
    await expect(component.getByRole("toolbar", { name: "Editor tools" })).toBeVisible();
  });
});
