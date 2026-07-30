import { expect, test } from "../fixtures";
import { VanillaMountHarness } from "./vanilla-mount.harness";

/**
 * Guide: vanilla-mount — see docs/guides/vanilla-mount.md
 *
 * `createImageEditor(target, options)` mounts the editor into a plain DOM
 * element (no React required) and returns an instance with `update()` and
 * `destroy()`.
 */

// biome-ignore lint/suspicious/noExplicitAny: Playwright CT mount return type
async function waitForEditor(component: any) {
  await component.getByRole("toolbar", { name: "Editor tools" }).waitFor({ timeout: 15_000 });
}

test.describe("Guide: vanilla-mount", () => {
  test("mounts the editor into a plain DOM element", async ({ mount }) => {
    const component = await mount(<VanillaMountHarness />);
    await waitForEditor(component);

    await expect(component.getByRole("button", { name: "Crop" })).toBeVisible();
    await expect(component.getByRole("button", { name: "Filters" })).toBeVisible();
  });

  test("update() re-renders with patched options", async ({ mount }) => {
    const component = await mount(<VanillaMountHarness />);
    await waitForEditor(component);

    await component.getByRole("button", { name: "Limit tools" }).click();

    await expect(component.getByRole("button", { name: "Crop" })).toBeVisible();
    await expect(component.getByRole("button", { name: "Filters" })).toHaveCount(0);
  });

  test("destroy() unmounts the editor", async ({ mount }) => {
    const component = await mount(<VanillaMountHarness />);
    await waitForEditor(component);

    await component.getByRole("button", { name: "Destroy editor" }).click();

    await expect(component.getByRole("toolbar", { name: "Editor tools" })).toHaveCount(0);
  });
});
