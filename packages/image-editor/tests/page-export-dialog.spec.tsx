import { readFile } from "node:fs/promises";
import { expect, test } from "@playwright/experimental-ct-react";
import { unzipSync } from "fflate";
import { PageNavigationFixture } from "./page-navigation.component";

test("Current page downloads a page-sized image without changing camera, selection, or history", async ({ mount, page }) => {
  const component = await mount(<PageNavigationFixture />);
  await expect(component.locator("output")).toHaveAttribute("data-status", "ready");
  await page.evaluate(() => {
    const { engine, ids } = window.__pageNavigationHarness!;
    engine.scene.setActivePage(ids[1]);
    engine.block.select(engine.block.getChildren(ids[1])[0]);
  });
  const before = await page.evaluate(() => {
    const { engine } = window.__pageNavigationHarness!;
    return { saved: engine.scene.saveToString(), selection: engine.block.findAllSelected(),
      pan: engine.editor.getPan(), zoom: engine.editor.getZoom(), undo: engine.canUndo() };
  });
  await component.getByRole("button", { name: "Export Image", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "Export pages", exact: true });
  await expect(dialog.getByRole("combobox", { name: "Pages", exact: true })).toHaveText("Current page");
  const pending = page.waitForEvent("download");
  await dialog.getByRole("button", { name: "Save", exact: true }).click();
  const download = await pending;
  expect(download.suggestedFilename()).toBe("canvas.png");
  const bytes = [...await readFile((await download.path())!)];
  const dimensions = await page.evaluate(async (data) => {
    const bitmap = await createImageBitmap(new Blob([new Uint8Array(data)], { type: "image/png" }));
    const result = [bitmap.width, bitmap.height];
    bitmap.close();
    return result;
  }, bytes);
  expect(dimensions).toEqual([320, 480]);
  expect(await page.evaluate(() => {
    const { engine } = window.__pageNavigationHarness!;
    return { saved: engine.scene.saveToString(), selection: engine.block.findAllSelected(),
      pan: engine.editor.getPan(), zoom: engine.editor.getZoom(), undo: engine.canUndo() };
  })).toEqual(before);
});

for (const format of ["PNG", "JPEG", "WebP"] as const) {
  test(`${format}: All pages ZIP follows reordered document pages, sizes, and pixels despite active-page filtering`, async ({ mount, page }) => {
    const component = await mount(<PageNavigationFixture />);
    await expect(component.locator("output")).toHaveAttribute("data-status", "ready");
    await page.evaluate(() => {
      const { engine, ids } = window.__pageNavigationHarness!;
      engine.scene.movePage(ids[2], 0);
      engine.scene.setActivePage(ids[1]);
      engine.editor.setPageViewMode("active-page");
      engine.editor.setZoom(0.4);
      engine.editor.panTo(40, 60);
    });
    const before = await page.evaluate(() => {
      const { engine } = window.__pageNavigationHarness!;
      return { saved: engine.scene.saveToString(), pan: engine.editor.getPan(), zoom: engine.editor.getZoom(),
        mode: engine.editor.getPageViewMode(), undo: engine.canUndo(), redo: engine.canRedo() };
    });
    await component.getByRole("button", { name: "Export Image", exact: true }).click();
    const dialog = page.getByRole("dialog", { name: "Export pages", exact: true });
    await dialog.getByRole("combobox", { name: "Pages", exact: true }).click();
    await page.getByRole("option", { name: "All pages", exact: true }).click();
    if (format !== "PNG") {
      await dialog.getByRole("combobox", { name: "Format", exact: true }).click();
      await page.getByRole("option", { name: format, exact: true }).click();
    }
    const pending = page.waitForEvent("download");
    await dialog.getByRole("button", { name: "Save", exact: true }).click();
    const download = await pending;
    expect(download.suggestedFilename()).toBe("canvas.zip");
    const files = unzipSync(new Uint8Array(await readFile((await download.path())!)));
    const extension = format === "JPEG" ? "jpg" : format.toLowerCase();
    expect(Object.keys(files)).toEqual([`01-Card.${extension}`, `02-Cover.${extension}`, `03-Poster.${extension}`]);
    const images = await page.evaluate(async (entries) => Promise.all(entries.map(async ([name, data]) => {
      const bitmap = await createImageBitmap(new Blob([new Uint8Array(data)]));
      const canvas = document.createElement("canvas");
      canvas.width = bitmap.width;
      canvas.height = bitmap.height;
      const context = canvas.getContext("2d")!;
      context.drawImage(bitmap, 0, 0);
      const result = { name, width: bitmap.width, height: bitmap.height,
        pixel: [...context.getImageData(60, 60, 1, 1).data] };
      bitmap.close();
      return result;
    })), Object.entries(files).map(([name, bytes]): [string, number[]] => [name, [...bytes]]));
    expect(images.map(({ width, height }) => [width, height])).toEqual([[240, 240], [480, 320], [320, 480]]);
    for (const [index, expected] of [[37, 99, 235], [225, 29, 72], [22, 163, 74]].entries()) {
      for (let channel = 0; channel < 3; channel++) expect(Math.abs(images[index].pixel[channel] - expected[channel])).toBeLessThanOrEqual(format === "PNG" ? 0 : 5);
      expect(images[index].pixel[3]).toBe(255);
    }
    expect(await page.evaluate(() => {
      const { engine } = window.__pageNavigationHarness!;
      return { saved: engine.scene.saveToString(), pan: engine.editor.getPan(), zoom: engine.editor.getZoom(),
        mode: engine.editor.getPageViewMode(), undo: engine.canUndo(), redo: engine.canRedo() };
    })).toEqual(before);
  });
}

test("compact selection exports one page as ZIP, validates empty selections, and orders selected pages", async ({ mount, page }) => {
  const component = await mount(<PageNavigationFixture width={360} />);
  await expect(component.locator("output")).toHaveAttribute("data-status", "ready");
  for (const count of [1, 2]) {
    await component.getByRole("button", { name: "Export Image", exact: true }).click();
    const dialog = page.getByRole("dialog", { name: "Export pages", exact: true });
    await dialog.getByRole("combobox", { name: "Pages", exact: true }).click();
    await page.getByRole("option", { name: "Selected pages", exact: true }).click();
    const selection = dialog.getByRole("group", { name: "Pages to export", exact: true });
    await selection.getByRole("button", { name: /Page 1: Cover/ }).click();
    await expect(dialog.getByRole("button", { name: "Save", exact: true })).toBeDisabled();
    await expect(dialog.getByRole("status")).toHaveText("Select at least one page to export.");
    await selection.getByRole("button", { name: /Page 3: Card/ }).click();
    if (count === 2) await selection.getByRole("button", { name: /Page 1: Cover/ }).click();
    const pending = page.waitForEvent("download");
    await dialog.getByRole("button", { name: "Save", exact: true }).click();
    const download = await pending;
    expect(download.suggestedFilename()).toBe("canvas.zip");
    const files = unzipSync(new Uint8Array(await readFile((await download.path())!)));
    expect(Object.keys(files)).toEqual(count === 1 ? ["03-Card.png"] : ["01-Cover.png", "03-Card.png"]);
  }
});

test("a failed page export leaves the dialog open, reports the error, and supports retry", async ({ mount, page }) => {
  const component = await mount(<PageNavigationFixture />);
  await expect(component.locator("output")).toHaveAttribute("data-status", "ready");
  await page.evaluate(() => {
    const { engine } = window.__pageNavigationHarness!;
    const original = engine.exportPage.bind(engine);
    engine.exportPage = async () => {
      engine.exportPage = original;
      throw new Error("Page image is unavailable. Try again.");
    };
  });
  await component.getByRole("button", { name: "Export Image", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "Export pages", exact: true });
  await dialog.getByRole("button", { name: "Save", exact: true }).click();
  await expect(page.getByText("Page image is unavailable. Try again.", { exact: true })).toBeVisible();
  await expect(dialog).toBeVisible();
  await expect(dialog.getByRole("button", { name: "Save", exact: true })).toBeEnabled();
  const pending = page.waitForEvent("download");
  await dialog.getByRole("button", { name: "Save", exact: true }).click();
  expect((await pending).suggestedFilename()).toBe("canvas.png");
});

test("same-ID document replacement refreshes page metadata and resets the open export selection", async ({ mount, page }) => {
  const component = await mount(<PageNavigationFixture />);
  await expect(component.locator("output")).toHaveAttribute("data-status", "ready");
  const replacement = await page.evaluate(async () => {
    const { engine, ids } = window.__pageNavigationHarness!;
    const original = engine.scene.saveToString();
    engine.scene.setPageProperties(ids[0], { name: "Replacement", width: 321, height: 123 });
    const next = engine.scene.saveToString();
    await engine.scene.loadFromString(original);
    return next;
  });
  await component.getByRole("button", { name: "Export Image", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "Export pages", exact: true });
  const target = dialog.getByRole("combobox", { name: "Pages", exact: true });
  await target.click();
  await page.getByRole("option", { name: "Selected pages", exact: true }).click();
  await dialog.getByRole("button", { name: /Page 3: Card/ }).click();
  await page.evaluate(async (json) => { await window.__pageNavigationHarness!.engine.scene.loadFromString(json); }, replacement);
  await expect(target).toHaveText("Current page");
  await target.click();
  await page.getByRole("option", { name: "Selected pages", exact: true }).click();
  await expect(dialog.getByRole("button", { name: /Page 1: Replacement/ })).toHaveAttribute("aria-pressed", "true");
  await expect(dialog.getByRole("button", { name: /Page 1: Replacement/ })).toContainText("321 x 123");
  await expect(dialog.getByRole("button", { name: /Page 3: Card/ })).toHaveAttribute("aria-pressed", "false");
});
