import { useRef, useState } from "react";
import { type EditorHandle, ImageEditor } from "../../src/image-editor";

/**
 * Test story for the save-load-scene guide. The EditorHandle exposes methods
 * (and the engine) that Playwright CT can't proxy across the test boundary, so
 * saving/restoring runs here in the browser and the outcome is rendered to the
 * DOM for the spec to assert on.
 */

export const SaveLoadSceneHarness = () => {
  const handleRef = useRef<EditorHandle | null>(null);
  const sceneRef = useRef<string>("");

  const [saveResult, setSaveResult] = useState<string>("");
  const [loadResult, setLoadResult] = useState<string>("");

  const onSave = () => {
    const handle = handleRef.current;
    if (!handle) return;
    const json = handle.saveScene();
    const pageId = handle.engine.scene.getCurrentPage();
    if (pageId === null) return;

    sceneRef.current = json;
    handle.engine.block.setPageImageSrc(pageId, "");
    const scene = JSON.parse(json) as { version?: number; blocks?: unknown[] };
    setSaveResult(
      (scene.version === 1 || scene.version === 2) && Array.isArray(scene.blocks)
        ? "saved"
        : "invalid",
    );
  };

  const onLoad = async () => {
    const handle = handleRef.current;
    if (!handle || !sceneRef.current) return;
    try {
      await handle.loadScene(sceneRef.current);
      setLoadResult("restored");
    } catch {
      setLoadResult("error");
    }
  };

  return (
    <div>
      <div data-testid="save-result">{saveResult}</div>
      <div data-testid="load-result">{loadResult}</div>
      <button type="button" data-testid="save-scene" onClick={onSave}>
        Save
      </button>
      <button type="button" data-testid="load-scene" onClick={onLoad}>
        Restore
      </button>
      <ImageEditor
        src="/fixtures/test-image-100x100.png"
        width="900px"
        height="600px"
        onReady={(h) => {
          handleRef.current = h;
        }}
      />
    </div>
  );
};
