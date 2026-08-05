import { ImageEditor } from "../src/image-editor";
import { expect, test } from "./fixtures";

const TEST_IMAGE = "/fixtures/test-image-100x100.png";

// biome-ignore lint/suspicious/noExplicitAny: Playwright CT mount return type
async function addShape(component: any) {
  await component.getByRole("toolbar", { name: "Editor tools" }).getByText("Shapes").click();
  await expect(component.getByTestId("grid-rect")).toBeVisible({ timeout: 5_000 });
  await component.getByTestId("grid-rect").click();
}

test.describe("Undo/Redo", () => {
  test("undo and redo start disabled on a fresh document", async ({ mount }) => {
    const component = await mount(
      <ImageEditor src={TEST_IMAGE} width="900px" height="600px" />,
    );
    await component.getByRole("toolbar", { name: "Editor tools" }).waitFor({ timeout: 15_000 });

    const undoBtn = component.getByRole("button", { name: /undo/i });
    const redoBtn = component.getByRole("button", { name: /redo/i });

    // Nothing has happened yet, so both actions are unavailable (engine-backed).
    await expect(undoBtn).toBeVisible();
    await expect(redoBtn).toBeVisible();
    await expect(undoBtn).toBeDisabled();
    await expect(redoBtn).toBeDisabled();
  });

  test("Ctrl+Z reverts the last edit", async ({ mount, page }) => {
    const component = await mount(
      <ImageEditor src={TEST_IMAGE} width="900px" height="600px" />,
    );
    await component.getByRole("toolbar", { name: "Editor tools" }).waitFor({ timeout: 15_000 });

    const undoBtn = component.getByRole("button", { name: /undo/i });
    const redoBtn = component.getByRole("button", { name: /redo/i });

    // Make an edit so there is something on the undo stack.
    await addShape(component);
    await expect(undoBtn).toBeEnabled();
    await expect(redoBtn).toBeDisabled();

    // Ctrl+Z should pop the edit: undo empties, redo fills.
    await component.getByRole("application").first().focus();
    await page.keyboard.press("Control+z");

    await expect(undoBtn).toBeDisabled();
    await expect(redoBtn).toBeEnabled();
  });

  test("Ctrl+Shift+Z re-applies an undone edit", async ({ mount, page }) => {
    const component = await mount(
      <ImageEditor src={TEST_IMAGE} width="900px" height="600px" />,
    );
    await component.getByRole("toolbar", { name: "Editor tools" }).waitFor({ timeout: 15_000 });

    const undoBtn = component.getByRole("button", { name: /undo/i });
    const redoBtn = component.getByRole("button", { name: /redo/i });

    // Edit -> undo, leaving a redoable action.
    await addShape(component);
    const app = component.getByRole("application").first();
    await app.focus();
    await page.keyboard.press("Control+z");
    await expect(redoBtn).toBeEnabled();

    // Ctrl+Shift+Z should re-apply it: redo empties, undo fills.
    await app.focus();
    await page.keyboard.press("Control+Shift+z");

    await expect(redoBtn).toBeDisabled();
    await expect(undoBtn).toBeEnabled();
  });
});
