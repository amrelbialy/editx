import { Engine } from '../engine';
import {
  CreateBlockCommand,
  DestroyBlockCommand,
  SetPropertyCommand,
  SetKindCommand,
  AppendChildCommand,
  RemoveChildCommand,
  CreateEffectCommand,
  AppendEffectCommand,
  InsertEffectCommand,
  RemoveEffectCommand,
} from '../controller/commands';
import { BlockType, Color, EffectType, PropertyValue } from './block.types';
import {
  CROP_X, CROP_Y, CROP_WIDTH, CROP_HEIGHT, CROP_ENABLED,
  CROP_SCALE_X, CROP_SCALE_Y, CROP_ROTATION, CROP_SCALE_RATIO,
  CROP_FLIP_HORIZONTAL, CROP_FLIP_VERTICAL, CROP_ASPECT_RATIO_LOCKED,
  PAGE_WIDTH, PAGE_HEIGHT,
  IMAGE_SRC, IMAGE_ORIGINAL_WIDTH, IMAGE_ORIGINAL_HEIGHT, IMAGE_ROTATION,
  PAGE_MARGIN_ENABLED, PAGE_MARGIN_TOP, PAGE_MARGIN_BOTTOM,
  PAGE_MARGIN_LEFT, PAGE_MARGIN_RIGHT,
  FILL_COLOR,
  EFFECT_ENABLED,
  EFFECT_ADJUSTMENTS_BRIGHTNESS, EFFECT_ADJUSTMENTS_SATURATION,
  EFFECT_ADJUSTMENTS_CONTRAST, EFFECT_ADJUSTMENTS_GAMMA,
  EFFECT_ADJUSTMENTS_CLARITY, EFFECT_ADJUSTMENTS_EXPOSURE,
  EFFECT_ADJUSTMENTS_SHADOWS, EFFECT_ADJUSTMENTS_HIGHLIGHTS,
  EFFECT_ADJUSTMENTS_BLACKS, EFFECT_ADJUSTMENTS_WHITES,
  EFFECT_ADJUSTMENTS_TEMPERATURE, EFFECT_ADJUSTMENTS_SHARPNESS,
} from './property-keys';
import { normalizeRotation } from '../utils/rotation-math';

/** Identifies one of the 12 adjustment parameters. */
export type AdjustmentParam =
  | 'brightness' | 'saturation' | 'contrast' | 'gamma'
  | 'clarity' | 'exposure' | 'shadows' | 'highlights'
  | 'blacks' | 'whites' | 'temperature' | 'sharpness';

/** Configuration for a single adjustment parameter: property key + valid range. */
export interface AdjustmentConfig {
  key: string;
  min: number;
  max: number;
  step: number;
}

/** Maps each AdjustmentParam to its effect property key and valid range. */
export const ADJUSTMENT_CONFIG: Record<AdjustmentParam, AdjustmentConfig> = {
  brightness:  { key: EFFECT_ADJUSTMENTS_BRIGHTNESS,   min: -1,   max: 1,   step: 0.05 },
  saturation:  { key: EFFECT_ADJUSTMENTS_SATURATION,   min: -1,   max: 1,   step: 0.05 },
  contrast:    { key: EFFECT_ADJUSTMENTS_CONTRAST,     min: -1,   max: 1,   step: 0.05 },
  gamma:       { key: EFFECT_ADJUSTMENTS_GAMMA,        min: -1,   max: 1,   step: 0.05 },
  clarity:     { key: EFFECT_ADJUSTMENTS_CLARITY,      min: -1,   max: 1,   step: 0.05 },
  exposure:    { key: EFFECT_ADJUSTMENTS_EXPOSURE,     min: -1,   max: 1,   step: 0.05 },
  shadows:     { key: EFFECT_ADJUSTMENTS_SHADOWS,      min: -1,   max: 1,   step: 0.05 },
  highlights:  { key: EFFECT_ADJUSTMENTS_HIGHLIGHTS,   min: -1,   max: 1,   step: 0.05 },
  blacks:      { key: EFFECT_ADJUSTMENTS_BLACKS,       min: -1,   max: 1,   step: 0.05 },
  whites:      { key: EFFECT_ADJUSTMENTS_WHITES,       min: -1,   max: 1,   step: 0.05 },
  temperature: { key: EFFECT_ADJUSTMENTS_TEMPERATURE,  min: -1,   max: 1,   step: 0.05 },
  sharpness:   { key: EFFECT_ADJUSTMENTS_SHARPNESS,    min: -1,   max: 1,   step: 0.05 },
};

/** All adjustment param names, useful for iteration. */
export const ADJUSTMENT_PARAMS: AdjustmentParam[] = Object.keys(ADJUSTMENT_CONFIG) as AdjustmentParam[];

export class BlockAPI {
  #engine: Engine;
  #selection = new Set<number>();

  /** @internal — callback wired by CreativeEngine to route applyCropRatio through the active overlay. */
  #applyCropRatioHandler: ((ratio: number | null) => any) | null = null;

  constructor(engine: Engine) {
    this.#engine = engine;
  }

  /** @internal — called by CreativeEngine after construction to wire up crop overlay routing. */
  _setApplyCropRatioHandler(handler: (ratio: number | null) => any): void {
    this.#applyCropRatioHandler = handler;
  }

  // ── Block Selection & Visibility ─────────────────────

  /**
   * Selects a block, deselecting all others.
   */
  select(id: number): void {
    this.#selection.clear();
    this.#selection.add(id);
    this.#syncTransformer();
  }

  /**
   * Sets the selection state of a block.
   */
  setSelected(id: number, selected: boolean): void {
    if (selected) {
      this.#selection.add(id);
    } else {
      this.#selection.delete(id);
    }
    this.#syncTransformer();
  }

  /**
   * Gets the selection state of a block.
   */
  isSelected(id: number): boolean {
    return this.#selection.has(id);
  }

  /**
   * Finds all currently selected blocks.
   */
  findAllSelected(): number[] {
    return [...this.#selection];
  }

  /**
   * Deselects all blocks.
   */
  deselectAll(): void {
    this.#selection.clear();
    this.#syncTransformer();
  }

  #syncTransformer(): void {
    const ids = [...this.#selection];
    this.#engine.emit('selection:changed', ids);
    const renderer = this.#engine.getRenderer();
    if (ids.length > 0) {
      renderer?.showTransformer(ids);
    } else {
      renderer?.hideTransformer();
    }
  }

  // --- Lifecycle ---

  create(type: BlockType): number {
    const store = this.#engine.getBlockStore();
    const cmd = new CreateBlockCommand(store, type);
    this.#engine.exec(cmd);
    return cmd.getCreatedId()!;
  }

  destroy(id: number): void {
    const store = this.#engine.getBlockStore();
    this.#engine.exec(new DestroyBlockCommand(store, id));
  }

  // --- Type / Kind ---

  getType(id: number): BlockType | undefined {
    return this.#engine.getBlockStore().getType(id);
  }

  getKind(id: number): string {
    return this.#engine.getBlockStore().getKind(id);
  }

  setKind(id: number, kind: string): void {
    const store = this.#engine.getBlockStore();
    this.#engine.exec(new SetKindCommand(store, id, kind));
  }

  // --- Hierarchy ---

  appendChild(parent: number, child: number): void {
    const store = this.#engine.getBlockStore();
    this.#engine.exec(new AppendChildCommand(store, parent, child));
  }

  removeChild(parent: number, child: number): void {
    const store = this.#engine.getBlockStore();
    this.#engine.exec(new RemoveChildCommand(store, parent, child));
  }

  getParent(id: number): number | null {
    return this.#engine.getBlockStore().getParent(id);
  }

  getChildren(id: number): number[] {
    return this.#engine.getBlockStore().getChildren(id);
  }

  // --- Property getters ---

  getFloat(id: number, key: string): number {
    return this.#engine.getBlockStore().getFloat(id, key);
  }

  getString(id: number, key: string): string {
    return this.#engine.getBlockStore().getString(id, key);
  }

  getBool(id: number, key: string): boolean {
    return this.#engine.getBlockStore().getBool(id, key);
  }

  getColor(id: number, key: string): Color {
    return this.#engine.getBlockStore().getColor(id, key);
  }

  // --- Property setters ---

  /** Generic property setter — typed variants below are convenience wrappers. */
  setProperty(id: number, key: string, value: PropertyValue): void {
    const store = this.#engine.getBlockStore();
    this.#engine.exec(new SetPropertyCommand(store, id, key, value));
  }

  setFloat(id: number, key: string, value: number): void {
    this.setProperty(id, key, value);
  }

  setString(id: number, key: string, value: string): void {
    this.setProperty(id, key, value);
  }

  setBool(id: number, key: string, value: boolean): void {
    this.setProperty(id, key, value);
  }

  setColor(id: number, key: string, value: Color): void {
    this.setProperty(id, key, value);
  }

  // --- Convenience setters ---
  // These call beginBatch/endBatch. When called from an outer batch
  // (e.g. onBlockTransformEnd in creative-engine.ts), the inner batch
  // is a no-op — this is intentional.

  setPosition(id: number, x: number, y: number): void {
    this.#engine.beginBatch();
    const store = this.#engine.getBlockStore();
    this.#engine.exec(new SetPropertyCommand(store, id, 'transform/position/x', x));
    this.#engine.exec(new SetPropertyCommand(store, id, 'transform/position/y', y));
    this.#engine.endBatch();
  }

  setSize(id: number, width: number, height: number): void {
    this.#engine.beginBatch();
    const store = this.#engine.getBlockStore();
    this.#engine.exec(new SetPropertyCommand(store, id, 'transform/size/width', width));
    this.#engine.exec(new SetPropertyCommand(store, id, 'transform/size/height', height));
    this.#engine.endBatch();
  }

  setRotation(id: number, degrees: number): void {
    this.setFloat(id, 'transform/rotation', degrees);
  }

  setOpacity(id: number, opacity: number): void {
    this.setFloat(id, 'appearance/opacity', opacity);
  }

  setVisible(id: number, visible: boolean): void {
    this.setBool(id, 'appearance/visible', visible);
  }

  // --- Query ---

  exists(id: number): boolean {
    return this.#engine.getBlockStore().exists(id);
  }

  findByType(type: BlockType): number[] {
    return this.#engine.getBlockStore().findByType(type);
  }

  findByKind(kind: string): number[] {
    return this.#engine.getBlockStore().findByKind(kind);
  }

  findAllProperties(id: number): string[] {
    return this.#engine.getBlockStore().findAllProperties(id);
  }

  // ── Block Crop ───────────────────────────────────────
  // Modeled after CESDK BlockAPI Block Crop section.
  // See: https://img.ly/docs/cesdk/js/api/cesdk-js/classes/blockapi/#block-crop

  /** Checks if a block currently has an active crop. */
  hasCrop(id: number): boolean {
    return this.supportsCrop(id) && this.getBool(id, CROP_ENABLED);
  }

  /** Checks if a block supports cropping (image blocks and page blocks). */
  supportsCrop(id: number): boolean {
    const type = this.getType(id);
    return type === 'image' || type === 'page';
  }

  /** Sets the horizontal crop scale of a block. */
  setCropScaleX(id: number, scaleX: number): void {
    this.setFloat(id, CROP_SCALE_X, scaleX);
  }

  /** Gets the horizontal crop scale of a block. */
  getCropScaleX(id: number): number {
    return this.getFloat(id, CROP_SCALE_X);
  }

  /** Sets the vertical crop scale of a block. */
  setCropScaleY(id: number, scaleY: number): void {
    this.setFloat(id, CROP_SCALE_Y, scaleY);
  }

  /** Gets the vertical crop scale of a block. */
  getCropScaleY(id: number): number {
    return this.getFloat(id, CROP_SCALE_Y);
  }

  /** Sets the crop rotation of a block in radians. */
  setCropRotation(id: number, rotation: number): void {
    this.setFloat(id, CROP_ROTATION, rotation);
  }

  /** Gets the crop rotation of a block in radians. */
  getCropRotation(id: number): number {
    return this.getFloat(id, CROP_ROTATION);
  }

  /** Sets the uniform crop scale ratio of a block. */
  setCropScaleRatio(id: number, scaleRatio: number): void {
    this.setFloat(id, CROP_SCALE_RATIO, scaleRatio);
  }

  /** Gets the uniform crop scale ratio of a block. */
  getCropScaleRatio(id: number): number {
    return this.getFloat(id, CROP_SCALE_RATIO);
  }

  /** Sets the horizontal crop translation of a block. */
  setCropTranslationX(id: number, translationX: number): void {
    this.setFloat(id, CROP_X, translationX);
  }

  /** Gets the horizontal crop translation of a block. */
  getCropTranslationX(id: number): number {
    return this.getFloat(id, CROP_X);
  }

  /** Sets the vertical crop translation of a block. */
  setCropTranslationY(id: number, translationY: number): void {
    this.setFloat(id, CROP_Y, translationY);
  }

  /** Gets the vertical crop translation of a block. */
  getCropTranslationY(id: number): number {
    return this.getFloat(id, CROP_Y);
  }

  /**
   * Resets the crop of a block to its default state.
   *
   * For page blocks with stored original image dimensions, also restores
   * PAGE_WIDTH / PAGE_HEIGHT to the original values (img.ly-style).
   * Single undo batch.
   */
  resetCrop(id: number): void {
    this.#engine.beginBatch();
    this.setFloat(id, CROP_X, 0);
    this.setFloat(id, CROP_Y, 0);
    this.setFloat(id, CROP_WIDTH, 0);
    this.setFloat(id, CROP_HEIGHT, 0);
    this.setBool(id, CROP_ENABLED, false);
    this.setFloat(id, CROP_SCALE_X, 1);
    this.setFloat(id, CROP_SCALE_Y, 1);
    this.setFloat(id, CROP_ROTATION, 0);
    this.setFloat(id, CROP_SCALE_RATIO, 1);
    this.setBool(id, CROP_FLIP_HORIZONTAL, false);
    this.setBool(id, CROP_FLIP_VERTICAL, false);
    this.setBool(id, CROP_ASPECT_RATIO_LOCKED, false);
    // For page blocks, restore page dimensions to original image size
    const blockType = this.getType(id);
    if (blockType === 'page') {
      const origW = this.getFloat(id, IMAGE_ORIGINAL_WIDTH);
      const origH = this.getFloat(id, IMAGE_ORIGINAL_HEIGHT);
      if (origW > 0 && origH > 0) {
        this.setFloat(id, PAGE_WIDTH, origW);
        this.setFloat(id, PAGE_HEIGHT, origH);
      }
    }
    this.#engine.endBatch();
  }

  /**
   * Apply an aspect ratio to the active crop overlay for a block.
   *
   * This routes through the editor's internal crop module to compute
   * the largest rect with the given ratio that fits within the image
   * bounds, and updates the overlay accordingly.
   *
   * @param _id — The block ID (currently unused; the overlay tracks the active crop block).
   * @param ratio — Aspect ratio (width/height), or null for free mode.
   */
  applyCropRatio(_id: number, ratio: number | null): void {
    this.#applyCropRatioHandler?.(ratio);
  }

  /**
   * Adjusts the crop position and scale to fill its frame.
   * Sets crop to cover the entire image dimensions (block size).
   */
  adjustCropToFillFrame(id: number): void {
    const w = this.getFloat(id, 'transform/size/width');
    const h = this.getFloat(id, 'transform/size/height');
    this.#engine.beginBatch();
    this.setFloat(id, CROP_X, 0);
    this.setFloat(id, CROP_Y, 0);
    this.setFloat(id, CROP_WIDTH, w);
    this.setFloat(id, CROP_HEIGHT, h);
    this.setBool(id, CROP_ENABLED, true);
    this.#engine.endBatch();
  }

  /** Flips the content horizontally within its crop frame. */
  flipCropHorizontal(id: number): void {
    const current = this.getBool(id, CROP_FLIP_HORIZONTAL);
    this.setBool(id, CROP_FLIP_HORIZONTAL, !current);
  }

  /** Returns true if the content is flipped horizontally. */
  isCropFlippedHorizontal(id: number): boolean {
    return this.getBool(id, CROP_FLIP_HORIZONTAL);
  }

  /** Flips the content vertically within its crop frame. */
  flipCropVertical(id: number): void {
    const current = this.getBool(id, CROP_FLIP_VERTICAL);
    this.setBool(id, CROP_FLIP_VERTICAL, !current);
  }

  /** Returns true if the content is flipped vertically. */
  isCropFlippedVertical(id: number): boolean {
    return this.getBool(id, CROP_FLIP_VERTICAL);
  }

  /** Checks if the crop aspect ratio is locked for a block. */
  isCropAspectRatioLocked(id: number): boolean {
    return this.getBool(id, CROP_ASPECT_RATIO_LOCKED);
  }

  /** Sets whether the crop aspect ratio should be locked for a block. */
  setCropAspectRatioLocked(id: number, locked: boolean): void {
    this.setBool(id, CROP_ASPECT_RATIO_LOCKED, locked);
  }

  // ── Page convenience ─────────────────────────────────

  /** Sets the page dimensions (width & height). */
  setPageDimensions(id: number, width: number, height: number): void {
    this.#engine.beginBatch();
    this.setFloat(id, PAGE_WIDTH, width);
    this.setFloat(id, PAGE_HEIGHT, height);
    this.#engine.endBatch();
  }

  /** Gets the page dimensions. */
  getPageDimensions(id: number): { width: number; height: number } {
    return {
      width: this.getFloat(id, PAGE_WIDTH) || 1080,
      height: this.getFloat(id, PAGE_HEIGHT) || 1080,
    };
  }

  /** Sets the page image source (enables dual-mode page-as-image). Empty string clears it. */
  setPageImageSrc(id: number, src: string): void {
    this.setString(id, IMAGE_SRC, src);
  }

  /** Stores the original image dimensions (before any crop). */
  setPageImageOriginalDimensions(id: number, width: number, height: number): void {
    this.#engine.beginBatch();
    this.setFloat(id, IMAGE_ORIGINAL_WIDTH, width);
    this.setFloat(id, IMAGE_ORIGINAL_HEIGHT, height);
    this.#engine.endBatch();
  }

  /** Gets the original image dimensions (before any crop). */
  getPageImageOriginalDimensions(id: number): { width: number; height: number } {
    return {
      width: this.getFloat(id, IMAGE_ORIGINAL_WIDTH),
      height: this.getFloat(id, IMAGE_ORIGINAL_HEIGHT),
    };
  }

  /** Gets the page image source. */
  getPageImageSrc(id: number): string {
    return this.getString(id, IMAGE_SRC);
  }

  /** Sets the page fill colour (used when no IMAGE_SRC is set). */
  setPageFillColor(id: number, color: Color): void {
    this.setColor(id, FILL_COLOR, color);
  }

  /** Gets the page fill colour. */
  getPageFillColor(id: number): Color {
    return this.getColor(id, FILL_COLOR);
  }

  /** Enable/disable page margins. */
  setPageMarginsEnabled(id: number, enabled: boolean): void {
    this.setBool(id, PAGE_MARGIN_ENABLED, enabled);
  }

  /** Check if page margins are enabled. */
  isPageMarginsEnabled(id: number): boolean {
    return this.getBool(id, PAGE_MARGIN_ENABLED);
  }

  /** Sets all four page margins at once. */
  setPageMargins(id: number, top: number, right: number, bottom: number, left: number): void {
    this.#engine.beginBatch();
    this.setBool(id, PAGE_MARGIN_ENABLED, true);
    this.setFloat(id, PAGE_MARGIN_TOP, top);
    this.setFloat(id, PAGE_MARGIN_RIGHT, right);
    this.setFloat(id, PAGE_MARGIN_BOTTOM, bottom);
    this.setFloat(id, PAGE_MARGIN_LEFT, left);
    this.#engine.endBatch();
  }

  /** Gets all four page margins. */
  getPageMargins(id: number): { top: number; right: number; bottom: number; left: number } {
    return {
      top: this.getFloat(id, PAGE_MARGIN_TOP),
      right: this.getFloat(id, PAGE_MARGIN_RIGHT),
      bottom: this.getFloat(id, PAGE_MARGIN_BOTTOM),
      left: this.getFloat(id, PAGE_MARGIN_LEFT),
    };
  }

  // ── Image Rotation & Flip ────────────────────────────

  /**
   * Set the image rotation on the given block.
   * Value is clamped to [-180, 180].
   */
  setImageRotation(id: number, angleDeg: number): void {
    const clamped = Math.max(-180, Math.min(180, angleDeg));
    this.setFloat(id, IMAGE_ROTATION, clamped);
  }

  /** Get the current image rotation in degrees. */
  getImageRotation(id: number): number {
    return this.getFloat(id, IMAGE_ROTATION);
  }

  /**
   * Rotate the image clockwise by 90°.
   * Swaps page dimensions for page blocks. Single undo batch.
   */
  rotateClockwise(id: number): void {
    const current = this.getFloat(id, IMAGE_ROTATION);
    const newAngle = normalizeRotation(current + 90);

    this.#engine.beginBatch();
    this.setFloat(id, IMAGE_ROTATION, newAngle);

    // Swap page dimensions for page blocks
    const blockType = this.getType(id);
    if (blockType === 'page') {
      const pageW = this.getFloat(id, PAGE_WIDTH);
      const pageH = this.getFloat(id, PAGE_HEIGHT);
      this.setFloat(id, PAGE_WIDTH, pageH);
      this.setFloat(id, PAGE_HEIGHT, pageW);
    }
    this.#engine.endBatch();
  }

  /**
   * Rotate the image counter-clockwise by 90°.
   * Swaps page dimensions for page blocks. Single undo batch.
   */
  rotateCounterClockwise(id: number): void {
    const current = this.getFloat(id, IMAGE_ROTATION);
    const newAngle = normalizeRotation(current - 90);

    this.#engine.beginBatch();
    this.setFloat(id, IMAGE_ROTATION, newAngle);

    const blockType = this.getType(id);
    if (blockType === 'page') {
      const pageW = this.getFloat(id, PAGE_WIDTH);
      const pageH = this.getFloat(id, PAGE_HEIGHT);
      this.setFloat(id, PAGE_WIDTH, pageH);
      this.setFloat(id, PAGE_HEIGHT, pageW);
    }
    this.#engine.endBatch();
  }

  /**
   * Reset rotation and flip to defaults.
   * Single undo batch.
   */
  resetRotationAndFlip(id: number): void {
    this.#engine.beginBatch();
    this.setFloat(id, IMAGE_ROTATION, 0);
    this.setBool(id, CROP_FLIP_HORIZONTAL, false);
    this.setBool(id, CROP_FLIP_VERTICAL, false);

    // Restore page dimensions from original image dims if available
    const blockType = this.getType(id);
    if (blockType === 'page') {
      const origW = this.getFloat(id, IMAGE_ORIGINAL_WIDTH);
      const origH = this.getFloat(id, IMAGE_ORIGINAL_HEIGHT);
      if (origW > 0 && origH > 0) {
        this.setFloat(id, PAGE_WIDTH, origW);
        this.setFloat(id, PAGE_HEIGHT, origH);
      }
    }
    this.#engine.endBatch();
  }

  // ── Effects ────────────────────────────────────────
  // Modeled after CESDK BlockAPI Effects section.
  // Effects are entity blocks (type='effect') attached to design blocks.
  // See: https://img.ly/docs/cesdk/js/api/cesdk-js/classes/blockapi/#effects

  /** Creates an effect block of the given type. */
  createEffect(type: EffectType): number {
    const store = this.#engine.getBlockStore();
    const cmd = new CreateEffectCommand(store, type);
    this.#engine.exec(cmd);
    return cmd.getCreatedId()!;
  }

  /** Attaches an effect block to a design block. */
  appendEffect(blockId: number, effectId: number): void {
    const store = this.#engine.getBlockStore();
    this.#engine.exec(new AppendEffectCommand(store, blockId, effectId));
  }

  /** Inserts an effect block at a specific position in the effect stack. */
  insertEffect(blockId: number, effectId: number, index: number): void {
    const store = this.#engine.getBlockStore();
    this.#engine.exec(new InsertEffectCommand(store, blockId, effectId, index));
  }

  /** Detaches the effect at the given index from a design block. Returns the detached effect ID. */
  removeEffect(blockId: number, index: number): number | null {
    const store = this.#engine.getBlockStore();
    const cmd = new RemoveEffectCommand(store, blockId, index);
    this.#engine.exec(cmd);
    return cmd.getRemovedEffectId();
  }

  /** Returns the ordered list of effect block IDs attached to a design block. */
  getEffects(blockId: number): number[] {
    return this.#engine.getBlockStore().getEffects(blockId);
  }

  /** Checks if a block type supports effects (page, image, graphic). */
  supportsEffects(blockId: number): boolean {
    const type = this.getType(blockId);
    return type === 'page' || type === 'image' || type === 'graphic';
  }

  /** Returns true if the block has any effects attached. */
  hasEffects(blockId: number): boolean {
    return this.#engine.getBlockStore().getEffects(blockId).length > 0;
  }

  /** Enables or disables an effect block. */
  setEffectEnabled(effectId: number, enabled: boolean): void {
    this.setBool(effectId, EFFECT_ENABLED, enabled);
  }

  /** Returns whether an effect block is enabled. */
  isEffectEnabled(effectId: number): boolean {
    return this.getBool(effectId, EFFECT_ENABLED);
  }
}
