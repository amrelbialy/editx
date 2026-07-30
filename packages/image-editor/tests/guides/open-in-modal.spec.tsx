import { expect, test } from "../fixtures";
import { OpenInModalHarness } from "./open-in-modal.harness";

/**
 * Guide: open-in-modal — see docs/guides/open-in-modal.md
 *
 * <ImageEditorModal> renders the editor inside a Radix dialog (portaled to the
 * body), so the editor chrome is asserted via `page`, not the mounted root.
 */

test.describe("Guide: open-in-modal", () => {
  test("ImageEditorModal renders the editor when opened", async ({ mount, page }) => {
    const component = await mount(<OpenInModalHarness />);

    await expect(page.getByRole("toolbar", { name: "Editor tools" })).toHaveCount(0);

    await component.getByRole("button", { name: "Edit image" }).click();

    await expect(page.getByRole("toolbar", { name: "Editor tools" })).toBeVisible({
      timeout: 15_000,
    });
  });
});
