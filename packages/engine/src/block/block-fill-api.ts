import { CreateFillCommand, DestroyBlockCommand, SetFillCommand } from "../controller/commands";
import type { EngineCore } from "../engine-core";
import type {
  Color,
  FillType,
  GradientFill,
  GradientStop,
  GradientType,
  ImageFillAlignment,
  ImageFillMode,
  ImageFillOptions,
  ImageFillUpdate,
  ResolvedImageFill,
} from "./block.types";
import * as H from "./block-api-helpers";
import { normalizeImageFill, normalizeImageFillUpdate } from "./image-fill-normalization";
import {
  FILL_ENABLED,
  FILL_GRADIENT_ANGLE,
  FILL_GRADIENT_STOPS,
  FILL_GRADIENT_TYPE,
  FILL_IMAGE_ALIGNMENT,
  FILL_IMAGE_FLIP_HORIZONTAL,
  FILL_IMAGE_FLIP_VERTICAL,
  FILL_IMAGE_MODE,
  FILL_IMAGE_OFFSET_X,
  FILL_IMAGE_OFFSET_Y,
  FILL_IMAGE_ROTATION,
  FILL_IMAGE_SCALE,
  FILL_IMAGE_SRC,
  FILL_SOLID_COLOR,
} from "./property-keys";

/** Fill sub-block CRUD — create, attach, enable/disable fills on graphic blocks. */
export class BlockFillAPI {
  #engine: EngineCore;

  constructor(engine: EngineCore) {
    this.#engine = engine;
  }

  createFill(type: FillType): number {
    const store = this.#engine._getBlockStore();
    const cmd = new CreateFillCommand(store, type);
    this.#engine.exec(cmd);
    return cmd.getCreatedId()!;
  }

  setFill(blockId: number, fillId: number): void {
    const store = this.#engine._getBlockStore();
    this.#engine.exec(new SetFillCommand(store, blockId, fillId));
  }

  getFill(blockId: number): number | null {
    return this.#engine._getBlockStore().getFill(blockId);
  }

  supportsFill(blockId: number): boolean {
    return this.#engine._getBlockStore().supportsFill(blockId);
  }

  hasFill(blockId: number): boolean {
    return this.getFill(blockId) != null;
  }

  setFillEnabled(blockId: number, enabled: boolean): void {
    H.setBool(this.#engine, blockId, FILL_ENABLED, enabled);
  }

  isFillEnabled(blockId: number): boolean {
    return H.getBool(this.#engine, blockId, FILL_ENABLED);
  }

  setFillSolidColor(blockId: number, color: Color): void {
    const fillId = this.getFill(blockId);
    if (fillId == null) return;
    H.setColor(this.#engine, fillId, FILL_SOLID_COLOR, color);
  }

  getFillSolidColor(blockId: number): Color | null {
    const fillId = this.getFill(blockId);
    if (fillId == null) return null;
    return H.getColor(this.#engine, fillId, FILL_SOLID_COLOR);
  }

  // ── Gradient fill ─────────────────────────────────

  /** Set gradient properties. No-op unless the block's fill sub-block kind is "gradient". */
  setFillGradient(
    blockId: number,
    g: { type: GradientType; stops: GradientStop[]; angle?: number },
  ): void {
    const store = this.#engine._getBlockStore();
    const fillId = this.getFill(blockId);
    if (fillId == null || store.getKind(fillId) !== "gradient") return;

    this.#engine.beginBatch();
    H.setString(this.#engine, fillId, FILL_GRADIENT_TYPE, g.type);
    H.setProperty(
      this.#engine,
      fillId,
      FILL_GRADIENT_STOPS,
      g.stops.map((s) => ({ offset: s.offset, color: s.color })),
    );
    H.setFloat(this.#engine, fillId, FILL_GRADIENT_ANGLE, g.angle ?? 0);
    this.#engine.endBatch();
  }

  getFillGradient(blockId: number): GradientFill | null {
    const store = this.#engine._getBlockStore();
    const fillId = this.getFill(blockId);
    if (fillId == null || store.getKind(fillId) !== "gradient") return null;

    const type = (store.getProperty(fillId, FILL_GRADIENT_TYPE) as GradientType) ?? "linear";
    const angle = store.getFloat(fillId, FILL_GRADIENT_ANGLE);
    const raw = store.getProperty(fillId, FILL_GRADIENT_STOPS);
    const stops = Array.isArray(raw)
      ? (raw as GradientStop[]).map((s) => ({ offset: s.offset, color: s.color }))
      : [];
    return { type, angle, stops };
  }

  // ── Image fill ────────────────────────────────────

  /** Set image-fill properties. No-op unless the block's fill sub-block kind is "image". */
  setFillImage(blockId: number, img: ImageFillOptions): void {
    const store = this.#engine._getBlockStore();
    const fillId = this.getFill(blockId);
    if (fillId == null || store.getKind(fillId) !== "image") return;

    const normalized = normalizeImageFill(img);
    this.#engine.beginBatch();
    H.setString(this.#engine, fillId, FILL_IMAGE_SRC, normalized.src);
    H.setString(this.#engine, fillId, FILL_IMAGE_MODE, normalized.mode);
    H.setString(this.#engine, fillId, FILL_IMAGE_ALIGNMENT, normalized.alignment);
    H.setFloat(this.#engine, fillId, FILL_IMAGE_OFFSET_X, normalized.offsetX);
    H.setFloat(this.#engine, fillId, FILL_IMAGE_OFFSET_Y, normalized.offsetY);
    H.setFloat(this.#engine, fillId, FILL_IMAGE_SCALE, normalized.scale);
    H.setFloat(this.#engine, fillId, FILL_IMAGE_ROTATION, normalized.rotation);
    H.setBool(this.#engine, fillId, FILL_IMAGE_FLIP_HORIZONTAL, normalized.flipHorizontal);
    H.setBool(this.#engine, fillId, FILL_IMAGE_FLIP_VERTICAL, normalized.flipVertical);
    this.#engine.endBatch();
  }

  updateFillImage(blockId: number, update: ImageFillUpdate): void {
    const current = this.getFillImage(blockId);
    if (!current) return;
    this.setFillImage(blockId, normalizeImageFillUpdate(current, update));
  }

  getFillImage(blockId: number): ResolvedImageFill | null {
    const store = this.#engine._getBlockStore();
    const fillId = this.getFill(blockId);
    if (fillId == null || store.getKind(fillId) !== "image") return null;

    return normalizeImageFill({
      src: store.getString(fillId, FILL_IMAGE_SRC),
      mode: (store.getString(fillId, FILL_IMAGE_MODE) as ImageFillMode) || "crop",
      alignment: (store.getString(fillId, FILL_IMAGE_ALIGNMENT) as ImageFillAlignment) || "center",
      offsetX: store.getFloat(fillId, FILL_IMAGE_OFFSET_X),
      offsetY: store.getFloat(fillId, FILL_IMAGE_OFFSET_Y),
      scale: store.getFloat(fillId, FILL_IMAGE_SCALE),
      rotation: ((store.getFloat(fillId, FILL_IMAGE_ROTATION) % 360) + 360) % 360,
      flipHorizontal: store.getBool(fillId, FILL_IMAGE_FLIP_HORIZONTAL),
      flipVertical: store.getBool(fillId, FILL_IMAGE_FLIP_VERTICAL),
    });
  }

  // ── Fill kind switching ───────────────────────────

  /**
   * Replace the block's fill sub-block with a fresh one of `kind`. Composed as
   * one batch (create + set + destroy-old) so it is a single undo entry and the
   * orphaned old fill is destroyed in the same batch (no leak). Undo restores
   * the previous fill wholesale.
   */
  changeFillKind(blockId: number, kind: FillType): void {
    const store = this.#engine._getBlockStore();
    if (!store.supportsFill(blockId)) return;

    const oldFillId = store.getFill(blockId);

    this.#engine.beginBatch();
    const createCmd = new CreateFillCommand(store, kind);
    this.#engine.exec(createCmd);
    const newFillId = createCmd.getCreatedId()!;
    this.#engine.exec(new SetFillCommand(store, blockId, newFillId));
    if (oldFillId != null) {
      this.#engine.exec(new DestroyBlockCommand(store, oldFillId));
    }
    this.#engine.endBatch();
  }
}
