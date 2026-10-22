import type { EditxEngine } from "@editx/engine";
import type { EditorHandle } from "../image-editor.types";
import {
  loadPreparedProject,
  type ProjectEngineRef,
  prepareProjectFile,
  saveProject,
} from "./project-file";

export function createEditorHandle(
  engine: EditxEngine,
  ref: ProjectEngineRef,
  onProjectBusyChange?: (busy: boolean) => void,
): EditorHandle {
  async function runProject<T>(operation: () => Promise<T>): Promise<T> {
    if (ref.current !== engine) throw new Error("This editor handle is stale.");
    onProjectBusyChange?.(true);
    try {
      return await operation();
    } finally {
      onProjectBusyChange?.(false);
    }
  }
  return {
    engine,
    saveScene: () => engine.scene.saveToString(),
    loadScene: (json) => engine.scene.loadFromString(json),
    saveProject: () => runProject(() => saveProject(ref)),
    loadProject: (source) =>
      runProject(async () => {
        const file = await prepareProjectFile(ref, source);
        const { info } = await loadPreparedProject(ref, file);
        return info;
      }),
  };
}
