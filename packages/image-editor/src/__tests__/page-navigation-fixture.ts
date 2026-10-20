import { EditxEngine, type PageViewMode } from "@editx/engine";
import { vi } from "vitest";
import { useImageEditorStore } from "../store/image-editor-store";

export async function createNavigationEngine() {
  const engine = new EditxEngine();
  await engine.scene.create({ width: 800, height: 600 });
  const cover = engine.scene.getCurrentPage()!;
  engine.scene.setPageProperties(cover, { name: "Cover" });
  const poster = engine.scene.addPage({ width: 600, height: 800 });
  engine.scene.setPageProperties(poster, { name: "Poster" });
  const card = engine.scene.addPage({ width: 400, height: 400 });
  engine.scene.setPageProperties(card, { name: "Card" });
  engine.scene.setActivePage(cover);
  engine.clearHistory();

  let mode: PageViewMode = "all-pages";
  vi.spyOn(engine.editor, "getPageViewMode").mockImplementation(() => mode);
  const setMode = vi.spyOn(engine.editor, "setPageViewMode").mockImplementation((next) => {
    mode = next;
  });
  vi.spyOn(engine.editor, "getPageViewBounds").mockImplementation((id) => {
    const index = engine.scene.getPages().indexOf(id);
    if (index === -1) return null;
    const { width, height } = engine.scene.getPageProperties(id);
    return { x: 100, y: 120 + index * 850, width, height };
  });
  vi.spyOn(engine.editor, "worldToScreen").mockImplementation((point) => point);
  const blobs = new Map<number, Blob>();
  const exportThumbnail = vi.spyOn(engine, "exportPageThumbnail").mockImplementation(async (id) => {
    let blob = blobs.get(id);
    if (!blob) {
      blob = new Blob([String(id)]);
      blobs.set(id, blob);
    }
    return blob;
  });
  return { engine, cover, poster, card, setMode, exportThumbnail };
}

export function resetPageNavigationStore(): void {
  useImageEditorStore.setState({
    activeTool: "select",
    editingTextBlockId: null,
    textSelectionRange: null,
    editableBlockId: null,
    hasUnsavedChanges: false,
  });
}
