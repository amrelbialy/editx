import { expect, type Page, test } from "@playwright/experimental-ct-react";
import { PageNavigationFixture } from "./page-navigation.component";

async function openActions(page: Page, title: string) {
  const navigation = page.getByRole("navigation", { name: "Pages", exact: true });
  await page.keyboard.press("Escape");
  await navigation.getByRole("button", { name: `Select page ${title}`, exact: true }).focus();
  await navigation.getByRole("button", { name: `Page actions: Page ${title}`, exact: true }).click();
}

async function snapshot(page: Page) {
  return page.evaluate(() => {
    const { engine } = window.__pageNavigationHarness!;
    return {
      pages: engine.scene.getPages().map((id) => ({
        id,
        ...engine.scene.getPageProperties(id),
        children: engine.block.getChildren(id),
      })),
      active: engine.scene.getCurrentPage(),
      selected: engine.block.findAllSelected(),
      canUndo: engine.canUndo(),
      canRedo: engine.canRedo(),
    };
  });
}

for (const layout of ["vertical", "horizontal"] as const) {
  test(`${layout}: manages a three-page document through canvas controls and preserves history`, async ({
    mount,
    page,
  }) => {
    const component = await mount(
      <PageNavigationFixture layout={layout} width={layout === "vertical" ? 420 : 900} />,
    );
    await expect(component.locator("output")).toHaveAttribute("data-status", "ready");
    const initial = await snapshot(page);
    const navigation = component.getByRole("navigation", { name: "Pages", exact: true });
    await expect(navigation.getByRole("button", { name: /^Page actions:/ })).toHaveCount(0);
    await navigation.getByRole("button", { name: "Select page 1: Cover", exact: true }).click();
    const actions = await navigation.getByRole("button", {
      name: "Page actions: Page 1: Cover", exact: true,
    }).boundingBox();
    expect(actions?.width).toBeGreaterThanOrEqual(32);
    expect(actions?.height).toBeGreaterThanOrEqual(32);

    await openActions(page, "2: Poster");
    await expect(page.getByRole("menuitem", { name: "Move page earlier" })).toBeEnabled();
    await page.keyboard.press("Escape");
    await navigation.getByRole("button", { name: "Duplicate page", exact: true }).click();
    const duplicated = await snapshot(page);
    const copy = duplicated.pages[2];
    expect(duplicated.pages.map(({ name }) => name)).toEqual(["Cover", "Poster", "Poster", "Card"]);
    expect(copy.id).not.toBe(initial.pages[1].id);
    expect(copy.children).toHaveLength(initial.pages[1].children.length);
    expect(copy.children).not.toEqual(initial.pages[1].children);
    expect(duplicated.active).toBe(copy.id);
    expect(duplicated.selected).toEqual([copy.id]);

    await navigation.getByRole("button", { name: "Select page 3: Poster", exact: true }).dblclick();
    const dialog = page.getByRole("dialog", { name: "Rename and resize page" });
    await expect(dialog.getByRole("textbox", { name: "Name", exact: true })).toBeFocused();
    await dialog.getByRole("textbox", { name: "Name", exact: true }).fill("Flyer");
    await dialog.getByRole("spinbutton", { name: "Width", exact: true }).fill("360.5");
    await dialog.getByRole("spinbutton", { name: "Height", exact: true }).fill("240");
    await dialog.getByRole("button", { name: "Save page" }).click();
    await expect(dialog).toHaveCount(0);
    const edited = await snapshot(page);
    expect(edited.pages[2]).toEqual({ ...copy, name: "Flyer", width: 360.5, height: 240 });
    await component.getByRole("button", { name: "Undo", exact: true }).click();
    expect((await snapshot(page)).pages[2]).toEqual(copy);
    await component.getByRole("button", { name: "Redo", exact: true }).click();
    expect((await snapshot(page)).pages[2]).toEqual(edited.pages[2]);

    await openActions(page, "3: Flyer");
    await page.getByRole("menuitem", { name: "Move page earlier" }).click();
    expect((await snapshot(page)).pages.map(({ name }) => name)).toEqual([
      "Cover", "Flyer", "Poster", "Card",
    ]);
    expect((await snapshot(page)).active).toBe(copy.id);
    await openActions(page, "2: Flyer");
    await page.getByRole("menuitem", { name: "Move page later" }).click();
    expect((await snapshot(page)).pages.map(({ name }) => name)).toEqual([
      "Cover", "Poster", "Flyer", "Card",
    ]);

    await openActions(page, "3: Flyer");
    await page.getByRole("menuitem", { name: "Delete page", exact: true }).click();
    expect((await snapshot(page)).pages).toEqual(initial.pages);
    await component.getByRole("button", { name: "Undo", exact: true }).click();
    expect((await snapshot(page)).pages[2]).toEqual(edited.pages[2]);
    await component.getByRole("button", { name: "Redo", exact: true }).click();
    expect((await snapshot(page)).pages).toEqual(initial.pages);

    await page.keyboard.press("Escape");
    await navigation.getByRole("button", { name: "Select page 3: Card", exact: true }).focus();
    await navigation.getByRole("button", { name: "Add page", exact: true }).click();
    const added = await snapshot(page);
    expect(added.pages).toHaveLength(4);
    expect(added.pages[3]).toMatchObject({ width: 480, height: 320, children: [] });
    expect(added.active).toBe(added.pages[3].id);
    await component.getByRole("button", { name: "Undo", exact: true }).click();
    expect((await snapshot(page)).pages).toEqual(initial.pages);
    const saved = await page.evaluate(() => window.__pageNavigationHarness!.engine.scene.saveToString());
    await page.evaluate(async (data) => {
      await window.__pageNavigationHarness!.engine.scene.loadFromString(data);
    }, saved);
    expect((await snapshot(page)).pages).toEqual(initial.pages);
    await expect(navigation.getByRole("button", { name: /^Select page/ })).toHaveCount(3);
  });
}

test("reports last-page deletion, validates dimensions, and cancels without a history entry", async ({
  mount, page,
}) => {
  const component = await mount(<PageNavigationFixture />);
  await expect(component.locator("output")).toHaveAttribute("data-status", "ready");
  for (const title of ["3: Card", "2: Poster"]) {
    await openActions(page, title);
    await page.getByRole("menuitem", { name: "Delete page", exact: true }).click();
  }
  const before = await snapshot(page);
  await openActions(page, "1: Cover");
  await expect(page.getByRole("menuitem", { name: "Move page earlier" })).toHaveAttribute("data-disabled");
  await expect(page.getByRole("menuitem", { name: "Move page later" })).toHaveAttribute("data-disabled");
  await page.getByRole("menuitem", { name: "Delete page", exact: true }).click();
  await expect(page.getByText("Could not update pages: The last page cannot be deleted.", { exact: true })).toBeVisible();
  expect(await snapshot(page)).toEqual(before);
  await openActions(page, "1: Cover");
  await page.getByRole("menuitem", { name: "Rename page" }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByRole("spinbutton", { name: "Width", exact: true }).fill("-1");
  await dialog.getByRole("button", { name: "Save page" }).click();
  await expect(dialog).toBeVisible();
  expect(await snapshot(page)).toEqual(before);
  await dialog.getByRole("button", { name: "Cancel", exact: true }).click();
  expect(await snapshot(page)).toEqual(before);
});
