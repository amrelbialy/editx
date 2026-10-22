import type { EditxEngine } from "@editx/engine";
import { useImageEditorStore } from "../store/image-editor-store";

export function synchronizeDimensions(engine: EditxEngine): void {
  const pageId = engine.scene.getCurrentPage();
  const store = useImageEditorStore.getState();
  if (pageId === null) {
    store.setShownImageDimensions(null);
    return;
  }
  const page = engine.scene.getPageProperties(pageId);
  const zoom = engine.editor.getZoom();
  store.setShownImageDimensions({
    width: page.width * zoom,
    height: page.height * zoom,
    scale: zoom,
  });
}

export function synchronizePageImage(engine: EditxEngine): void {
  const pageId = engine.scene.getCurrentPage();
  const store = useImageEditorStore.getState();
  store.setEditableBlockId(pageId);
  if (pageId === null) {
    store.setOriginalImage(null);
    synchronizeDimensions(engine);
    return;
  }
  const page = engine.scene.getPageProperties(pageId);
  const original = engine.block.getPageImageOriginalDimensions(pageId);
  store.setOriginalImage({
    src: engine.block.getPageImageSrc(pageId),
    width: original.width > 0 ? original.width : page.width,
    height: original.height > 0 ? original.height : page.height,
    name: page.name,
  });
  synchronizeDimensions(engine);
}

export function synchronizePageTools(engine: EditxEngine): void {
  const store = useImageEditorStore.getState();
  store.setEditingTextBlockId(null);
  store.setTextSelectionRange(null);
  store.setActiveTool("select");
  store.setCropPreset("free");
  synchronizePageImage(engine);
}
