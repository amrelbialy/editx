import type { BlockAPI } from "./block/block-api";
import {
  PAGE_HEIGHT,
  PAGE_WIDTH,
  SCENE_PAGE_DIMS_HEIGHT,
  SCENE_PAGE_DIMS_WIDTH,
} from "./block/property-keys";
import { getDocumentChanges } from "./document-change-tracker";
import { setDocumentRootSceneId } from "./document-state";
import type { EngineCore } from "./engine-core";
import { validatePageDimensions } from "./page-properties";

export async function createScene(
  engine: EngineCore,
  block: BlockAPI,
  opts: { width?: number; height?: number },
): Promise<void> {
  const width = opts.width ?? 1080;
  const height = opts.height ?? 1080;
  validatePageDimensions(width, height);
  const changes = getDocumentChanges(engine);
  const scope = changes.replacement("create");
  try {
    const { sceneId, pageId } = changes.run(scope, () => {
      const sceneId = block.create("scene");
      block.setFloat(sceneId, "scene/width", width);
      block.setFloat(sceneId, "scene/height", height);
      block.setFloat(sceneId, SCENE_PAGE_DIMS_WIDTH, width);
      block.setFloat(sceneId, SCENE_PAGE_DIMS_HEIGHT, height);
      const pageId = block.create("page");
      block.setFloat(pageId, PAGE_WIDTH, width);
      block.setFloat(pageId, PAGE_HEIGHT, height);
      block.appendChild(sceneId, pageId);
      setDocumentRootSceneId(engine, sceneId);
      engine._setActiveSceneAndPage(sceneId, pageId);
      return { sceneId, pageId };
    });
    const store = engine._getBlockStore();
    const scene = store.get(sceneId);
    const page = store.get(pageId);
    if (scene && page) {
      const renderer = engine.getRenderer();
      await changes.run(scope, () => renderer?.createScene(scene, page));
      changes.run(scope, () => {
        renderer?.syncBlock(pageId, page);
        engine._reconcilePageView();
      });
    }
    changes.run(scope, () => engine.clearHistory());
  } finally {
    changes.finish(scope);
  }
}
