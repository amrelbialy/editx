import type { EditxEngine } from "@editx/engine";

function documentContent(engine: EditxEngine): string {
  return engine.document.saveToString();
}

export function watchExportDocument(engine: EditxEngine, content = documentContent(engine)) {
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
