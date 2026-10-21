import type { EditxEngine } from "@editx/engine";

function documentContent(engine: EditxEngine): string {
  const scene: unknown = JSON.parse(engine.scene.saveToString());
  if (!scene || typeof scene !== "object" || Array.isArray(scene)) {
    throw new Error("The document could not be read for export.");
  }
  // Active-page navigation is not an authored document change.
  return JSON.stringify({ ...scene, activePageId: undefined });
}

export function watchExportDocument(engine: EditxEngine) {
  const content = documentContent(engine);
  let changed = false;
  const invalidate = () => {
    changed = true;
  };
  const stopHistory = engine.onHistoryChanged(invalidate);
  engine.on("history:clear", invalidate);

  return {
    get changed() {
      return changed || documentContent(engine) !== content;
    },
    assertCurrent() {
      if (changed || documentContent(engine) !== content) {
        throw new Error("The document changed during export. Please try again.");
      }
    },
    dispose() {
      stopHistory();
      engine.off("history:clear", invalidate);
    },
  };
}
