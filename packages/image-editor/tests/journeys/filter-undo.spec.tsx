import type { Page } from "@playwright/test";
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
const SOURCE_SIZE = 100;

// A filter is "active" when its preset button carries the primary ring class,
// which is driven directly by the engine-backed `activeFilter` state.
const ACTIVE_RING = /ring-primary/;

// biome-ignore lint/suspicious/noExplicitAny: Playwright CT mount return type
async function waitForEditor(component: any) {
  await component.getByRole("toolbar", { name: "Editor tools" }).waitFor({ timeout: 15_000 });
}

// biome-ignore lint/suspicious/noExplicitAny: Playwright CT mount return type
async function openFilters(component: any) {
  await component.getByRole("toolbar", { name: "Editor tools" }).getByText("Filters").click();
  await expect(component.getByTestId("filter-original")).toBeVisible({ timeout: 5_000 });
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

async function pressUndo(
  // biome-ignore lint/suspicious/noExplicitAny: Playwright CT mount return type
  component: any,
) {
  // Drive the engine-backed Undo button (auto-waits for it to be actionable).
  await component.getByRole("button", { name: /undo/i }).click();
}

async function pressRedo(
  // biome-ignore lint/suspicious/noExplicitAny: Playwright CT mount return type
  component: any,
) {
  await component.getByRole("button", { name: /redo/i }).click();
}

test.describe("Journey: Filter selection and undo", () => {
  test("applying a filter marks it active and deselects the previous one", async ({ mount }) => {
    const component = await mount(<ImageEditor src={TEST_IMAGE} width="900px" height="600px" />);
    await waitForEditor(component);
    await openFilters(component);

    const original = component.getByTestId("filter-original");
    const clarendon = component.getByTestId("filter-Clarendon");
    const sepia = component.getByTestId("filter-Sepia");

    // Baseline: "Original" is the active preset.
    await expect(original).toHaveClass(ACTIVE_RING);
    await expect(clarendon).not.toHaveClass(ACTIVE_RING);

    // Select Clarendon -> it becomes the sole active preset.
    await clarendon.click();
    await expect(clarendon).toHaveClass(ACTIVE_RING);
    await expect(original).not.toHaveClass(ACTIVE_RING);

    // Switching to Sepia deselects Clarendon.
    await sepia.click();
    await expect(sepia).toHaveClass(ACTIVE_RING);
    await expect(clarendon).not.toHaveClass(ACTIVE_RING);
    await expect(original).not.toHaveClass(ACTIVE_RING);
  });

  test("undo reverts the active filter and redo re-applies it", async ({ mount }) => {
    const component = await mount(<ImageEditor src={TEST_IMAGE} width="900px" height="600px" />);
    await waitForEditor(component);
    await openFilters(component);

    const original = component.getByTestId("filter-original");
    const sepia = component.getByTestId("filter-Sepia");

    // Selecting a preset commits a history entry immediately.
    await sepia.click();
    await expect(sepia).toHaveClass(ACTIVE_RING);
    await expect(original).not.toHaveClass(ACTIVE_RING);

    // Undo -> the filter selection reverts to "Original", live in the open panel.
    await pressUndo(component);
    await expect(original).toHaveClass(ACTIVE_RING);
    await expect(sepia).not.toHaveClass(ACTIVE_RING);

    // Redo -> Sepia becomes active again.
    await pressRedo(component);
    await expect(sepia).toHaveClass(ACTIVE_RING);
    await expect(original).not.toHaveClass(ACTIVE_RING);
  });

  test("applying a filter changes exported pixels; undo restores the original", async ({
    mount,
    page,
  }) => {
    const component = await mount(<ImageEditor src={TEST_IMAGE} width="900px" height="600px" />);
    await waitForEditor(component);
    await installExportCapture(page);

    // Baseline export of the untouched (solid red) source image.
    const baseline = await exportPngStats(component, page);
    expect(baseline, "no baseline export captured").not.toBeNull();
    if (!baseline) return;
    expect(baseline.width).toBe(SOURCE_SIZE);
    expect(baseline.height).toBe(SOURCE_SIZE);
    expect(baseline.opaquePixels).toBeGreaterThan(0);

    // Apply Sepia and commit.
    await openFilters(component);
    await component.getByTestId("filter-Sepia").click();
    await expect(component.getByTestId("filter-Sepia")).toHaveClass(ACTIVE_RING);
    await component.getByRole("button", { name: "Done" }).click();

    // Filtered export must differ measurably from the baseline.
    const filtered = await exportPngStats(component, page);
    expect(filtered, "no filtered export captured").not.toBeNull();
    if (!filtered) return;
    expect(filtered.width).toBe(SOURCE_SIZE);
    expect(meanColorDistance(baseline, filtered)).toBeGreaterThan(10);

    // Undo removes the filter; the export must match the baseline again.
    await pressUndo(component);
    const reverted = await exportPngStats(component, page);
    expect(reverted, "no reverted export captured").not.toBeNull();
    if (!reverted) return;
    expect(meanColorDistance(baseline, reverted)).toBeLessThan(3);
    expect(meanColorDistance(filtered, reverted)).toBeGreaterThan(10);
  });
});
