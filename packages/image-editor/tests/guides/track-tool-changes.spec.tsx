import { expect, test } from "../fixtures";
import { TrackToolChangesHarness } from "./track-tool-changes.harness";

/**
 * Guide: track-tool-changes — see docs/guides/track-tool-changes.md
 *
 * The `events.onToolChange` callback fires with the active tool id when the
 * selection changes, or `null` on deselect.
 */

// biome-ignore lint/suspicious/noExplicitAny: Playwright CT mount return type
async function waitForEditor(component: any) {
  await component.getByRole("toolbar", { name: "Editor tools" }).waitFor({ timeout: 15_000 });
}

test.describe("Guide: track-tool-changes", () => {
  test("events.onToolChange fires with the selected tool id", async ({ mount }) => {
    const component = await mount(<TrackToolChangesHarness />);
    await waitForEditor(component);

    await expect(component.getByTestId("last-tool")).toHaveText("none");

    await component.getByRole("button", { name: "Adjust" }).click();

    await expect(component.getByTestId("last-tool")).toHaveText("adjust");
  });
});
