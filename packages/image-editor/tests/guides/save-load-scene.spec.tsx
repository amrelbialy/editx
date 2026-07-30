import { expect, test } from "../fixtures";
import { SaveLoadSceneHarness } from "./save-load-scene.harness";

/**
 * Guide: save-load-scene — see docs/guides/save-load-scene.md
 *
 * `onReady` hands back an EditorHandle whose saveScene()/loadScene() round-trip
 * the full scene. The handle is used in-browser via the harness (see its
 * comment) and the result is surfaced to the DOM.
 */

// biome-ignore lint/suspicious/noExplicitAny: Playwright CT mount return type
async function waitForEditor(component: any) {
  await component.getByRole("toolbar", { name: "Editor tools" }).waitFor({ timeout: 15_000 });
}

test.describe("Guide: save-load-scene", () => {
  test("onReady handle saves and restores the scene", async ({ mount }) => {
    const component = await mount(<SaveLoadSceneHarness />);
    await waitForEditor(component);

    // saveScene() returns a versioned JSON payload.
    await component.getByTestId("save-scene").click();
    await expect(component.getByTestId("save-result")).toHaveText("saved", { timeout: 10_000 });

    // loadScene() restores it without error.
    await component.getByTestId("load-scene").click();
    await expect(component.getByTestId("load-result")).toHaveText("restored", { timeout: 10_000 });
  });
});
