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
  test("onReady handle saves and restores the scene", async ({ mount, page }) => {
    const component = await mount(<SaveLoadSceneHarness />);
    await waitForEditor(component);

    // saveScene() returns a versioned JSON payload, then the harness hides the
    // page image to create an obvious visual change.
    await component.getByTestId("save-scene").click();
    await expect(component.getByTestId("save-result")).toHaveText("saved", { timeout: 10_000 });

    // loadScene() restores it without error.
    await component.getByTestId("load-scene").click();
    await expect(component.getByTestId("load-result")).toHaveText("restored", { timeout: 10_000 });

    // Regression: restoring rebuilds the renderer. The previous Konva stage must
    // be torn down (a single stage container) and the restored image must
    // actually render to the new content layer (non-blank canvas). Before the
    // fix, a stale node map left the reloaded canvas blank.
    await expect
      .poll(() => page.locator(".konvajs-content").count(), { timeout: 10_000 })
      .toBe(1);

    await expect
      .poll(
        () =>
          page.evaluate(() => {
            const canvases = Array.from(
              document.querySelectorAll<HTMLCanvasElement>(".konvajs-content canvas"),
            );
            let painted = 0;
            for (const canvas of canvases) {
              const ctx = canvas.getContext("2d");
              if (!ctx || canvas.width === 0 || canvas.height === 0) continue;
              const { data } = ctx.getImageData(0, 0, canvas.width, canvas.height);
              for (let i = 3; i < data.length; i += 4) {
                if (data[i] !== 0) painted++;
              }
            }
            return painted;
          }),
        { timeout: 10_000 },
      )
      .toBeGreaterThan(0);
  });
});
