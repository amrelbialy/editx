import type { BlockData } from "./block/block.types";
import { getDocumentChanges } from "./document-change-tracker";
import { type PreparedDocumentLoad, prepareLegacySceneLoad } from "./document-migration";
import { replaceDocumentState, resetDocumentState } from "./document-state";
import type { EngineCore } from "./engine-core";

interface SerializedScene {
  version: number;
  blocks: BlockData[];
  activeSceneId: number | null;
  activePageId: number | null;
}

export interface SceneReplacement {
  readonly blocks: readonly BlockData[];
  readonly sceneId: number | null;
  readonly pageId: number | null;
}

export function collectSceneBlocks(engine: EngineCore): BlockData[] {
  const store = engine._getBlockStore();
  const blocks: BlockData[] = [];
  for (const id of store.getAllBlockIds()) {
    const snapshot = store.snapshot(id);
    if (snapshot) blocks.push(snapshot);
  }
  return blocks;
}

export function saveSceneToString(engine: EngineCore): string {
  const payload: SerializedScene = {
    version: 2,
    blocks: collectSceneBlocks(engine),
    activeSceneId: engine.getActiveScene(),
    activePageId: engine.getActivePage(),
  };
  return JSON.stringify(payload);
}

export async function loadPreparedScene(
  engine: EngineCore,
  replacement: SceneReplacement,
  onReplacementBegins: () => void,
): Promise<void> {
  const changes = getDocumentChanges(engine);
  const scope = changes.replacement("load");
  const store = engine._getBlockStore();
  try {
    const previousBlockIds = changes.run(scope, () => {
      engine._prepareSceneReplacement();
      const previous = store.getAllBlockIds();
      onReplacementBegins();
      store.clear();
      let maxId = 0;
      for (const block of replacement.blocks) {
        store.restore(block);
        if (block.id > maxId) maxId = block.id;
      }
      store.resetNextId(maxId + 1);
      engine._setActiveSceneAndPage(replacement.sceneId, replacement.pageId);
      return previous;
    });
    if (replacement.sceneId !== null && replacement.pageId !== null) {
      const scene = store.get(replacement.sceneId);
      const page = store.get(replacement.pageId);
      if (scene && page) {
        const renderer = engine.getRenderer();
        await changes.run(scope, () => renderer?.createScene(scene, page));
        changes.run(scope, () => {
          for (const id of store.getAllBlockIds()) {
            const block = store.get(id);
            if (block) renderer?.syncBlock(id, block);
          }
          renderer?.syncChildOrder?.(scene.children);
          engine._reconcilePageView();
        });
      }
    } else {
      const renderer = engine.getRenderer();
      if (renderer) {
        changes.run(scope, () => {
          for (const id of previousBlockIds) renderer.removeBlock(id);
          renderer.renderFrame();
        });
      }
    }
    changes.run(scope, () => engine.clearHistory());
  } finally {
    changes.finish(scope);
  }
}

export async function loadSceneFromString(engine: EngineCore, json: string): Promise<void> {
  const payload: unknown = JSON.parse(json);
  return loadPreparedDocument(engine, prepareLegacySceneLoad(payload));
}

export async function loadPreparedDocument(
  engine: EngineCore,
  prepared: PreparedDocumentLoad,
): Promise<void> {
  const replacement: SceneReplacement = {
    blocks: prepared.scene.blocks,
    sceneId: prepared.navigation.sceneId,
    pageId: prepared.navigation.pageId,
  };
  return loadPreparedScene(engine, replacement, () => {
    if (prepared.identity.mode === "fresh") {
      resetDocumentState(engine, prepared.scene.rootSceneId);
    } else {
      replaceDocumentState(
        engine,
        prepared.identity.id,
        prepared.metadata,
        prepared.scene.rootSceneId,
      );
    }
  });
}
