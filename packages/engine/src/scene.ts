import type { BlockData, PageLayoutMode } from "./block/block.types";
import type { BlockAPI } from "./block/block-api";
import {
  PAGE_HEIGHT,
  PAGE_WIDTH,
  SCENE_ASPECT_RATIO_LOCK,
  SCENE_LAYOUT,
  SCENE_PAGE_DIMS_HEIGHT,
  SCENE_PAGE_DIMS_WIDTH,
} from "./block/property-keys";
import type { EngineCore } from "./engine-core";

interface SerializedScene {
  version: number;
  blocks: BlockData[];
  activeSceneId: number | null;
  activePageId: number | null;
  variableValues?: Record<string, string>;
}

export class SceneAPI {
  #engine: EngineCore;
  #block: BlockAPI;

  constructor(engine: EngineCore, block: BlockAPI) {
    this.#engine = engine;
    this.#block = block;
  }

  async create(opts: { width?: number; height?: number } = {}) {
    const width = opts.width ?? 1080;
    const height = opts.height ?? 1080;

    // Create scene block
    const sceneId = this.#block.create("scene");
    this.#block.setFloat(sceneId, "scene/width", width);
    this.#block.setFloat(sceneId, "scene/height", height);
    this.#block.setFloat(sceneId, SCENE_PAGE_DIMS_WIDTH, width);
    this.#block.setFloat(sceneId, SCENE_PAGE_DIMS_HEIGHT, height);
    this.#engine.setActiveScene(sceneId);

    // Create first page block
    const pageId = this.#block.create("page");
    this.#block.setFloat(pageId, PAGE_WIDTH, width);
    this.#block.setFloat(pageId, PAGE_HEIGHT, height);
    this.#block.appendChild(sceneId, pageId);
    this.#engine.setActivePage(pageId);

    // Tell renderer to set up the canvas
    const store = this.#engine.getBlockStore();
    const sceneBlock = store.get(sceneId);
    const pageBlock = store.get(pageId);
    if (sceneBlock && pageBlock) {
      const renderer = this.#engine.getRenderer();
      await renderer?.createScene(sceneBlock, pageBlock);
      // Sync the page block so the page node is rendered
      renderer?.syncBlock(pageId, pageBlock);
    }

    // Clear history so scene creation isn't undoable
    this.#engine.clearHistory();
  }

  getScene(): number | null {
    return this.#engine.getActiveScene();
  }

  getCurrentPage(): number | null {
    return this.#engine.getActivePage();
  }

  getPages(): number[] {
    const sceneId = this.#engine.getActiveScene();
    if (sceneId === null) return [];
    return this.#block.getChildren(sceneId).filter((id) => this.#block.getType(id) === "page");
  }

  addPage(opts: { width?: number; height?: number } = {}): number {
    const sceneId = this.#engine.getActiveScene();
    if (sceneId === null) throw new Error("No active scene");

    const defaults = this.getDefaultPageDimensions();
    const width = opts.width ?? defaults.width;
    const height = opts.height ?? defaults.height;

    const pageId = this.#block.create("page");
    this.#block.setFloat(pageId, PAGE_WIDTH, width);
    this.#block.setFloat(pageId, PAGE_HEIGHT, height);
    this.#block.appendChild(sceneId, pageId);

    this.#engine.setActivePage(pageId);

    return pageId;
  }

  setActivePage(pageId: number): void {
    this.#engine.setActivePage(pageId);
  }

  removePage(pageId: number): void {
    const sceneId = this.#engine.getActiveScene();
    if (sceneId === null) throw new Error("No active scene");
    const pages = this.getPages();
    if (pages.length <= 1) throw new Error("Cannot remove the last page");
    if (!pages.includes(pageId)) throw new Error(`Page ${pageId} not found in scene`);

    this.#block.removeChild(sceneId, pageId);
    this.#block.destroy(pageId);

    if (this.#engine.getActivePage() === pageId) {
      const remaining = this.getPages();
      this.#engine.setActivePage(remaining[0]);
    }
  }

  // ── Scene-level page dimensions ──────────────────────

  /**
   * Sets the default page dimensions for the scene.
   * New pages inherit these dimensions.
   */
  setDefaultPageDimensions(width: number, height: number): void {
    const sceneId = this.#engine.getActiveScene();
    if (sceneId === null) throw new Error("No active scene");
    this.#block.setFloat(sceneId, SCENE_PAGE_DIMS_WIDTH, width);
    this.#block.setFloat(sceneId, SCENE_PAGE_DIMS_HEIGHT, height);
  }

  /** Gets the default page dimensions from the scene. */
  getDefaultPageDimensions(): { width: number; height: number } {
    const sceneId = this.#engine.getActiveScene();
    if (sceneId === null) return { width: 1080, height: 1080 };
    return {
      width: this.#block.getFloat(sceneId, SCENE_PAGE_DIMS_WIDTH) || 1080,
      height: this.#block.getFloat(sceneId, SCENE_PAGE_DIMS_HEIGHT) || 1080,
    };
  }

  /** Sets whether the scene's aspect ratio should be locked. */
  setAspectRatioLock(locked: boolean): void {
    const sceneId = this.#engine.getActiveScene();
    if (sceneId === null) throw new Error("No active scene");
    this.#block.setBool(sceneId, SCENE_ASPECT_RATIO_LOCK, locked);
  }

  /** Gets whether the scene's aspect ratio is locked. */
  isAspectRatioLocked(): boolean {
    const sceneId = this.#engine.getActiveScene();
    if (sceneId === null) return false;
    return this.#block.getBool(sceneId, SCENE_ASPECT_RATIO_LOCK);
  }

  /** Sets the page layout mode for the scene. */
  setPageLayout(layout: PageLayoutMode): void {
    const sceneId = this.#engine.getActiveScene();
    if (sceneId === null) throw new Error("No active scene");
    this.#block.setString(sceneId, SCENE_LAYOUT, layout);
  }

  /** Gets the current page layout mode. */
  getPageLayout(): PageLayoutMode {
    const sceneId = this.#engine.getActiveScene();
    if (sceneId === null) return "Free";
    return (this.#block.getString(sceneId, SCENE_LAYOUT) || "Free") as PageLayoutMode;
  }

  // ── Serialization ──────────────────────────────────────

  /** Serialize the entire scene (all blocks) to a JSON string. */
  saveToString(): string {
    const store = this.#engine.getBlockStore();
    const blocks: BlockData[] = [];

    for (const id of store.getAllBlockIds()) {
      const snapshot = store.snapshot(id);
      if (snapshot) blocks.push(snapshot);
    }

    const payload: SerializedScene = {
      version: 1,
      blocks,
      activeSceneId: this.#engine.getActiveScene(),
      activePageId: this.#engine.getActivePage(),
    };

    const variableValues = this.#engine.variable._serialize();
    if (Object.keys(variableValues).length > 0) {
      payload.variableValues = variableValues;
    }

    return JSON.stringify(payload);
  }

  /** Deserialize a JSON string and restore the full scene. */
  async loadFromString(json: string): Promise<void> {
    const payload = JSON.parse(json) as SerializedScene;
    if (payload.version !== 1) {
      throw new Error(`Unsupported scene version: ${payload.version}`);
    }
    if (!Array.isArray(payload.blocks)) {
      throw new Error("Invalid scene data: missing blocks array");
    }

    const store = this.#engine.getBlockStore();
    store.clear();

    // Restore all blocks
    let maxId = 0;
    for (const blockData of payload.blocks) {
      store.restore(blockData);
      if (blockData.id > maxId) maxId = blockData.id;
    }
    store.resetNextId(maxId + 1);

    // Restore active scene/page
    if (payload.activeSceneId !== null) {
      this.#engine.setActiveScene(payload.activeSceneId);
    }
    if (payload.activePageId !== null) {
      this.#engine.setActivePage(payload.activePageId);
    }

    // Restore variable values
    if (payload.variableValues) {
      this.#engine.variable._deserialize(payload.variableValues);
    }

    // Rebuild renderer
    const sceneId = this.#engine.getActiveScene();
    const pageId = this.#engine.getActivePage();
    if (sceneId !== null && pageId !== null) {
      const sceneBlock = store.get(sceneId);
      const pageBlock = store.get(pageId);
      if (sceneBlock && pageBlock) {
        const renderer = this.#engine.getRenderer();
        await renderer?.createScene(sceneBlock, pageBlock);
        // Sync all blocks so the renderer is up to date
        for (const id of store.getAllBlockIds()) {
          const block = store.get(id);
          if (block) renderer?.syncBlock(id, block);
        }
      }
    }

    this.#engine.clearHistory();
  }
}
