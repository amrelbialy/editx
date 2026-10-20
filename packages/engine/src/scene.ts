import type { ActivePageChangedEvent } from "./active-page";
import type { PageLayoutMode } from "./block/block.types";
import type { BlockAPI } from "./block/block-api";
import {
  PAGE_HEIGHT,
  PAGE_WIDTH,
  SCENE_ASPECT_RATIO_LOCK,
  SCENE_LAYOUT,
  SCENE_PAGE_DIMS_HEIGHT,
  SCENE_PAGE_DIMS_WIDTH,
} from "./block/property-keys";
import { CreatePageCommand } from "./controller/commands/create-page-command";
import { DuplicatePageCommand } from "./controller/commands/duplicate-page-command";
import { MovePageCommand } from "./controller/commands/move-page-command";
import { RemovePageCommand } from "./controller/commands/remove-page-command";
import type { EngineCore } from "./engine-core";
import { getScenePages, type PageOrderChangedEvent } from "./page-order";
import {
  type PageProperties,
  type PagePropertiesUpdate,
  validatePageDimensions,
} from "./page-properties";
import { getPageProperties, setPageProperties } from "./page-properties-api";
import { loadSceneFromString, saveSceneToString } from "./scene-serialization";

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
    validatePageDimensions(width, height);

    // Create scene block
    const sceneId = this.#block.create("scene");
    this.#block.setFloat(sceneId, "scene/width", width);
    this.#block.setFloat(sceneId, "scene/height", height);
    this.#block.setFloat(sceneId, SCENE_PAGE_DIMS_WIDTH, width);
    this.#block.setFloat(sceneId, SCENE_PAGE_DIMS_HEIGHT, height);

    // Create first page block
    const pageId = this.#block.create("page");
    this.#block.setFloat(pageId, PAGE_WIDTH, width);
    this.#block.setFloat(pageId, PAGE_HEIGHT, height);
    this.#block.appendChild(sceneId, pageId);
    this.#engine._setActiveSceneAndPage(sceneId, pageId);

    // Tell renderer to set up the canvas
    const store = this.#engine._getBlockStore();
    const sceneBlock = store.get(sceneId);
    const pageBlock = store.get(pageId);
    if (sceneBlock && pageBlock) {
      const renderer = this.#engine.getRenderer();
      await renderer?.createScene(sceneBlock, pageBlock);
      // Sync the page block so the page node is rendered
      renderer?.syncBlock(pageId, pageBlock);
      this.#engine._reconcilePageView();
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
    return getScenePages(this.#engine._getBlockStore(), this.#engine.getActiveScene());
  }

  addPage(opts: { width?: number; height?: number } = {}): number {
    const sceneId = this.#engine.getActiveScene();
    if (sceneId === null) throw new Error("No active scene");

    const defaults = this.getDefaultPageDimensions();
    const width = opts.width ?? defaults.width;
    const height = opts.height ?? defaults.height;

    const command = new CreatePageCommand(
      this.#engine._getBlockStore(),
      sceneId,
      this.#engine.getActivePage(),
      width,
      height,
    );
    this.#engine.exec(command);
    return command.getCreatedId()!;
  }

  /** Duplicate a direct page after its source and activate the copy as one undo step. */
  duplicatePage(pageId: number): number {
    const sceneId = this.#engine.getActiveScene();
    if (sceneId === null) throw new Error("No active scene");
    const command = new DuplicatePageCommand(
      this.#engine._getBlockStore(),
      sceneId,
      pageId,
      this.#engine.getActivePage(),
    );
    this.#engine.exec(command);
    return command.getCreatedId()!;
  }

  /** Move a page to a clamped, zero-based page index without changing navigation. */
  movePage(pageId: number, index: number): void {
    const sceneId = this.#engine.getActiveScene();
    if (sceneId === null) throw new Error("No active scene");
    const command = new MovePageCommand(this.#engine._getBlockStore(), sceneId, pageId, index);
    if (command.hasChanges) this.#engine.exec(command);
  }

  onPageOrderChanged(callback: (event: PageOrderChangedEvent) => void): () => void {
    return this.#engine.onPageOrderChanged(callback);
  }

  getPageProperties(pageId: number): PageProperties {
    return getPageProperties(this.#engine, pageId);
  }

  setPageProperties(pageId: number, update: PagePropertiesUpdate): void {
    setPageProperties(this.#engine, pageId, update);
  }

  resizePage(pageId: number, width: number, height: number): void {
    setPageProperties(this.#engine, pageId, { width, height });
  }

  setActivePage(pageId: number): void {
    this.#engine.setActivePage(pageId);
  }

  onActivePageChanged(callback: (event: ActivePageChangedEvent) => void): () => void {
    return this.#engine.onActivePageChanged(callback);
  }

  removePage(pageId: number): void {
    const sceneId = this.#engine.getActiveScene();
    if (sceneId === null) throw new Error("No active scene");
    this.#engine.exec(
      new RemovePageCommand(
        this.#engine._getBlockStore(),
        sceneId,
        pageId,
        this.#engine.getActivePage(),
      ),
    );
  }

  // ── Scene-level page dimensions ──────────────────────

  /**
   * Sets the default page dimensions for the scene.
   * New pages inherit these dimensions.
   */
  setDefaultPageDimensions(width: number, height: number): void {
    const sceneId = this.#engine.getActiveScene();
    if (sceneId === null) throw new Error("No active scene");
    validatePageDimensions(width, height);
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
    return saveSceneToString(this.#engine);
  }

  /** Deserialize a JSON string and restore the full scene. */
  async loadFromString(json: string): Promise<void> {
    return loadSceneFromString(this.#engine, json);
  }
}
