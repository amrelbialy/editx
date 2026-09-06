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
    const heading = component.getByRole("button", { name: "Heading", exact: true });
    await expect(heading).toBeVisible({ timeout: 5_000 });

    // Click "Heading" preset to add text
    await heading.click();

    // Editor should still be functional
    await expect(component.getByRole("toolbar", { name: "Editor tools" })).toBeVisible();
  });

  test("adding a Body Text preset", async ({ mount }) => {
    const component = await mount(
      <ImageEditor src={TEST_IMAGE} width="900px" height="600px" />,
    );
    await waitForEditor(component);

    await component.getByRole("toolbar", { name: "Editor tools" }).getByText("Text").click();
  await component.getByRole("searchbox", { name: "Search presets" }).fill("Body Text");
  const body = component.getByRole("button", { name: "Body Text", exact: true });
  await expect(body).toBeVisible({ timeout: 5_000 });

  await body.click();

    await expect(component.getByRole("toolbar", { name: "Editor tools" })).toBeVisible();
  });

  test("adding multiple text presets in sequence", async ({ mount }) => {
    const component = await mount(
      <ImageEditor src={TEST_IMAGE} width="900px" height="600px" />,
    );
    await waitForEditor(component);

    await component.getByRole("toolbar", { name: "Editor tools" }).getByText("Text").click();
  const title = component.getByRole("button", { name: "Title", exact: true });
  await expect(title).toBeVisible({ timeout: 5_000 });

    // Add Title — the TextPanel stays open (activeTool remains "text")
  await title.click();

    // Add Heading directly — no need to re-click the toolbar button
  const heading = component.getByRole("button", { name: "Heading", exact: true });
  await expect(heading).toBeVisible({ timeout: 5_000 });
  await heading.click();

    // Editor should not crash
    await expect(component.getByRole("toolbar", { name: "Editor tools" })).toBeVisible();
  });
});
