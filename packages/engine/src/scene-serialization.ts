import { firstScenePage, validateNavigation } from "./active-page";
import type { BlockData } from "./block/block.types";
import type { EngineCore } from "./engine-core";

interface SerializedScene {
  version: number;
  blocks: BlockData[];
  activeSceneId: number | null;
  activePageId: number | null;
}

export function saveSceneToString(engine: EngineCore): string {
  const store = engine._getBlockStore();
  const blocks: BlockData[] = [];
  for (const id of store.getAllBlockIds()) {
    const snapshot = store.snapshot(id);
    if (snapshot) blocks.push(snapshot);
  }
  const payload: SerializedScene = {
    version: 2,
    blocks,
    activeSceneId: engine.getActiveScene(),
    activePageId: engine.getActivePage(),
  };
  return JSON.stringify(payload);
}

export async function loadSceneFromString(engine: EngineCore, json: string): Promise<void> {
  const payload = JSON.parse(json) as SerializedScene;
  // v1 properties absent from v2 continue to use the block defaults.
  if (payload.version !== 1 && payload.version !== 2) {
    throw new Error(`Unsupported scene version: ${payload.version}`);
  }
  if (!Array.isArray(payload.blocks)) {
    throw new Error("Invalid scene data: missing blocks array");
  }

  const candidate = new Map(payload.blocks.map((block) => [block.id, block]));
  const sceneId = payload.activeSceneId;
  const pageId = payload.activePageId ?? firstScenePage(candidate, sceneId);
  validateNavigation(candidate, sceneId, pageId);

  const store = engine._getBlockStore();
  store.clear();
  let maxId = 0;
  for (const block of payload.blocks) {
    store.restore(block);
    if (block.id > maxId) maxId = block.id;
  }
  store.resetNextId(maxId + 1);
  engine._setActiveSceneAndPage(sceneId, pageId);

  if (sceneId !== null && pageId !== null) {
    const scene = store.get(sceneId);
    const page = store.get(pageId);
    if (scene && page) {
      const renderer = engine.getRenderer();
      await renderer?.createScene(scene, page);
      for (const id of store.getAllBlockIds()) {
        const block = store.get(id);
        if (block) renderer?.syncBlock(id, block);
      }
    }
  }
  engine.clearHistory();
}
