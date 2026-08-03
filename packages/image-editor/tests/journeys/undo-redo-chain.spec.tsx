import type { Locator, Page } from "@playwright/test";
import { ImageEditor } from "../../src/image-editor";
import { expect, test } from "../fixtures";
import {
  type ExportStats,
  installExportCapture,
  meanColorDistance,
  readLargestExportStats,
  resetExportCapture,
} from "../utils/export-capture";

const TEST_IMAGE = "/fixtures/test-image-100x100.png";

// biome-ignore lint/suspicious/noExplicitAny: Playwright CT mount return type
async function waitForEditor(component: any) {
  await component.getByRole("toolbar", { name: "Editor tools" }).waitFor({ timeout: 15_000 });
}

/** Open the export dialog, save as PNG, and return the decoded pixel stats. */
async function exportPngStats(
  // biome-ignore lint/suspicious/noExplicitAny: Playwright CT mount return type
  component: any,
  page: Page,
): Promise<ExportStats | null> {
  await resetExportCapture(page);
  await component.getByRole("button", { name: /export image/i }).click();
  await expect(component.getByText("Format", { exact: true })).toBeVisible({ timeout: 5_000 });
  await component.getByRole("button", { name: "Save" }).click();
  await expect(component.getByText("Format", { exact: true })).not.toBeVisible({
    timeout: 15_000,
  });
  return readLargestExportStats(page);
}

/**
 * Undo everything by pressing Ctrl+Z until the (engine-backed) Undo button is
 * disabled. Extra presses on an empty history are no-ops, so a fixed cap with a
 * final `toBeDisabled` assertion is both deterministic and robust to the exact
 * number of history entries each edit produces — no arbitrary sleep needed.
 */
async function undoAll(page: Page, app: Locator, undoBtn: Locator) {
  for (let i = 0; i < 8; i++) {
    await app.focus();
    await page.keyboard.press("Control+z");
  }
  await expect(undoBtn).toBeDisabled();
}

/** Redo everything by pressing Ctrl+Shift+Z until the Redo button is disabled. */
async function redoAll(page: Page, app: Locator, redoBtn: Locator) {
  for (let i = 0; i < 8; i++) {
    await app.focus();
    await page.keyboard.press("Control+Shift+z");
  }
  await expect(redoBtn).toBeDisabled();
}

test.describe("Journey: Undo/Redo chain integrity", () => {
  test("a chain of edits round-trips through undo and redo (verified via pixels)", async ({
    mount,
    page,
  }) => {
    const component = await mount(<ImageEditor src={TEST_IMAGE} width="900px" height="600px" />);
    await waitForEditor(component);
    await installExportCapture(page);

    const toolbar = component.getByRole("toolbar", { name: "Editor tools" });
    const app = component.getByRole("application").first();
    const undoBtn = component.getByRole("button", { name: /undo/i });
    const redoBtn = component.getByRole("button", { name: /redo/i });

    // Baseline export of the untouched image.
    const baseline = await exportPngStats(component, page);
    expect(baseline, "no baseline export captured").not.toBeNull();
    if (!baseline) return;

    // --- Edit 1: Apply filter ---
    await toolbar.getByText("Filters").click();
    await expect(component.getByTestId("filter-original")).toBeVisible({ timeout: 5_000 });
    await component.getByTestId("filter-Sepia").click();
    await expect(component.getByTestId("filter-Sepia")).toHaveClass(/ring-primary/);
    await component.getByRole("button", { name: "Done" }).click();

    // --- Edit 2: Add shape ---
    await toolbar.getByText("Shapes").click();
    await expect(component.getByTestId("grid-rect")).toBeVisible({ timeout: 5_000 });
    await component.getByTestId("grid-rect").click();

    // --- Edit 3: Add text ---
    await toolbar.getByText("Text").click();
    await expect(component.getByTestId("grid-heading")).toBeVisible({ timeout: 5_000 });
    await component.getByTestId("grid-heading").click();

    // Every edit is on the stack now.
    await expect(undoBtn).toBeEnabled();

    // Edited export must differ from the untouched baseline.
    const edited = await exportPngStats(component, page);
    expect(edited, "no edited export captured").not.toBeNull();
    if (!edited) return;
    expect(meanColorDistance(baseline, edited)).toBeGreaterThan(10);

    // --- Undo everything -> back to the baseline pixels ---
    await undoAll(page, app, undoBtn);
    await expect(redoBtn).toBeEnabled();
    const undone = await exportPngStats(component, page);
    expect(undone, "no undone export captured").not.toBeNull();
    if (!undone) return;
    expect(meanColorDistance(baseline, undone)).toBeLessThan(3);

    // --- Redo everything -> back to the edited pixels ---
    await redoAll(page, app, redoBtn);
    await expect(undoBtn).toBeEnabled();
    const redone = await exportPngStats(component, page);
    expect(redone, "no redone export captured").not.toBeNull();
    if (!redone) return;
    expect(meanColorDistance(edited, redone)).toBeLessThan(3);
    expect(meanColorDistance(baseline, redone)).toBeGreaterThan(10);
  });

  test("undo button toggles history availability", async ({ mount }) => {
    const component = await mount(<ImageEditor src={TEST_IMAGE} width="900px" height="600px" />);
    await waitForEditor(component);

    const undoBtn = component.getByRole("button", { name: /undo/i });
    const redoBtn = component.getByRole("button", { name: /redo/i });

    // Fresh document: nothing to undo or redo.
    await expect(undoBtn).toBeDisabled();
    await expect(redoBtn).toBeDisabled();

    // Make an edit -> undo becomes available, redo stays unavailable.
    await component.getByRole("toolbar", { name: "Editor tools" }).getByText("Shapes").click();
    await expect(component.getByTestId("grid-rect")).toBeVisible({ timeout: 5_000 });
    await component.getByTestId("grid-rect").click();
    await expect(undoBtn).toBeEnabled();

    // Undo -> the edit is popped, redo becomes available.
    await undoBtn.click();
    await expect(undoBtn).toBeDisabled();
    await expect(redoBtn).toBeEnabled();
  });

  test("redo button restores an undone edit", async ({ mount }) => {
    const component = await mount(<ImageEditor src={TEST_IMAGE} width="900px" height="600px" />);
    await waitForEditor(component);

    const undoBtn = component.getByRole("button", { name: /undo/i });
    const redoBtn = component.getByRole("button", { name: /redo/i });

    // Make an edit, undo it, then redo it.
    await component.getByRole("toolbar", { name: "Editor tools" }).getByText("Shapes").click();
    await expect(component.getByTestId("grid-rect")).toBeVisible({ timeout: 5_000 });
    await component.getByTestId("grid-rect").click();

    await undoBtn.click();
    await expect(redoBtn).toBeEnabled();

    await redoBtn.click();
    // Edit is back on the undo stack; nothing left to redo.
    await expect(redoBtn).toBeDisabled();
    await expect(undoBtn).toBeEnabled();
  });
});
