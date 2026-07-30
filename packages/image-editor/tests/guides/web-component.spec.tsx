import { expect, test } from "../fixtures";
import { WebComponentHarness } from "./web-component.harness";

/**
 * Guide: web-component — see docs/guides/web-component.md
 *
 * `<editx-image-editor>` is a light-DOM custom element that mounts the editor
 * from plain HTML. `src`/`width`/`height` are attributes; `config` and the
 * callbacks are JS properties. Removing the element from the DOM tears it down.
 */

// biome-ignore lint/suspicious/noExplicitAny: Playwright CT mount return type
async function waitForEditor(component: any) {
  await component.getByRole("toolbar", { name: "Editor tools" }).waitFor({ timeout: 15_000 });
}

test.describe("Guide: web-component", () => {
  test("mounts the editor from a custom element", async ({ mount }) => {
    const component = await mount(<WebComponentHarness />);
    await waitForEditor(component);

    await expect(component.getByRole("button", { name: "Crop" })).toBeVisible();
    await expect(component.getByRole("button", { name: "Filters" })).toBeVisible();
  });

  test("setting the config property re-renders the editor", async ({ mount }) => {
    const component = await mount(<WebComponentHarness />);
    await waitForEditor(component);

    await component.getByRole("button", { name: "Limit tools" }).click();

    await expect(component.getByRole("button", { name: "Crop" })).toBeVisible();
    await expect(component.getByRole("button", { name: "Filters" })).toHaveCount(0);
  });

  test("removing the element tears the editor down", async ({ mount }) => {
    const component = await mount(<WebComponentHarness />);
    await waitForEditor(component);

    await component.getByRole("button", { name: "Remove element" }).click();

    await expect(component.getByRole("toolbar", { name: "Editor tools" })).toHaveCount(0);
  });
});
