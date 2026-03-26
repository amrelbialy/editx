import { MoveChildCommand } from "../controller/commands";
import type { EngineCore } from "../engine-core";
import * as H from "./block-api-helpers";
import { PAGE_HEIGHT, PAGE_WIDTH } from "./property-keys";

/** Position, size, rotation, z-order, and alignment operations. */
export class BlockLayoutAPI {
  #engine: EngineCore;

  constructor(engine: EngineCore) {
    this.#engine = engine;
  }

  // ── Position / Size / Transform ───────────────────

  setPosition(id: number, x: number, y: number): void {
    this.#engine.beginBatch();
    H.setFloat(this.#engine, id, "transform/position/x", x);
    H.setFloat(this.#engine, id, "transform/position/y", y);
    this.#engine.endBatch();
  }

  getPosition(id: number): { x: number; y: number } {
    return {
      x: H.getFloat(this.#engine, id, "transform/position/x"),
      y: H.getFloat(this.#engine, id, "transform/position/y"),
    };
  }

  setSize(id: number, width: number, height: number): void {
    this.#engine.beginBatch();
    H.setFloat(this.#engine, id, "transform/size/width", width);
    H.setFloat(this.#engine, id, "transform/size/height", height);
    this.#engine.endBatch();
  }

  getSize(id: number): { width: number; height: number } {
    return {
      width: H.getFloat(this.#engine, id, "transform/size/width"),
      height: H.getFloat(this.#engine, id, "transform/size/height"),
    };
  }

  setRotation(id: number, degrees: number): void {
    H.setFloat(this.#engine, id, "transform/rotation", degrees);
  }

  getRotation(id: number): number {
    return H.getFloat(this.#engine, id, "transform/rotation");
  }

  setOpacity(id: number, opacity: number): void {
    H.setFloat(this.#engine, id, "appearance/opacity", opacity);
  }

  getOpacity(id: number): number {
    return H.getFloat(this.#engine, id, "appearance/opacity");
  }

  setVisible(id: number, visible: boolean): void {
    H.setBool(this.#engine, id, "appearance/visible", visible);
  }

  isVisible(id: number): boolean {
    return H.getBool(this.#engine, id, "appearance/visible");
  }

  // ── Z-order (layer ordering) ──────────────────────

  bringForward(blockId: number): void {
    const store = this.#engine.getBlockStore();
    const parentId = store.getParent(blockId);
    if (parentId === null) return;
    const children = store.getChildren(parentId);
    const idx = children.indexOf(blockId);
    if (idx === -1 || idx >= children.length - 1) return;
    this.#engine.exec(new MoveChildCommand(store, parentId, blockId, idx + 1));
  }

  sendBackward(blockId: number): void {
    const store = this.#engine.getBlockStore();
    const parentId = store.getParent(blockId);
    if (parentId === null) return;
    const children = store.getChildren(parentId);
    const idx = children.indexOf(blockId);
    if (idx <= 0) return;
    this.#engine.exec(new MoveChildCommand(store, parentId, blockId, idx - 1));
  }

  bringToFront(blockId: number): void {
    const store = this.#engine.getBlockStore();
    const parentId = store.getParent(blockId);
    if (parentId === null) return;
    const children = store.getChildren(parentId);
    const idx = children.indexOf(blockId);
    if (idx === -1 || idx >= children.length - 1) return;
    this.#engine.exec(new MoveChildCommand(store, parentId, blockId, children.length - 1));
  }

  sendToBack(blockId: number): void {
    const store = this.#engine.getBlockStore();
    const parentId = store.getParent(blockId);
    if (parentId === null) return;
    const children = store.getChildren(parentId);
    const idx = children.indexOf(blockId);
    if (idx <= 0) return;
    this.#engine.exec(new MoveChildCommand(store, parentId, blockId, 0));
  }

  // ── Page alignment ────────────────────────────────

  alignToPage(
    blockId: number,
    alignment: "left" | "center" | "right" | "top" | "middle" | "bottom",
  ): void {
    const store = this.#engine.getBlockStore();
    const parentId = store.getParent(blockId);
    if (parentId === null) return;

    const pageW =
      H.getFloat(this.#engine, parentId, PAGE_WIDTH) ||
      H.getFloat(this.#engine, parentId, "transform/size/width");
    const pageH =
      H.getFloat(this.#engine, parentId, PAGE_HEIGHT) ||
      H.getFloat(this.#engine, parentId, "transform/size/height");
    const { width: blockW, height: blockH } = this.getSize(blockId);

    switch (alignment) {
      case "left":
        H.setFloat(this.#engine, blockId, "transform/position/x", 0);
        break;
      case "center":
        H.setFloat(this.#engine, blockId, "transform/position/x", (pageW - blockW) / 2);
        break;
      case "right":
        H.setFloat(this.#engine, blockId, "transform/position/x", pageW - blockW);
        break;
      case "top":
        H.setFloat(this.#engine, blockId, "transform/position/y", 0);
        break;
      case "middle":
        H.setFloat(this.#engine, blockId, "transform/position/y", (pageH - blockH) / 2);
        break;
      case "bottom":
        H.setFloat(this.#engine, blockId, "transform/position/y", pageH - blockH);
        break;
    }
  }
}
