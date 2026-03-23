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
  CreateShapeCommand,
  CreateFillCommand,
  SetShapeCommand,
  SetFillCommand,
  MoveChildCommand,
} from '../controller/commands';
import { BlockType, Color, EffectType, FillType, PropertyValue, ShapeType, TextRun, TextRunStyle } from './block.types';
import {
  CROP_X, CROP_Y, CROP_WIDTH, CROP_HEIGHT, CROP_ENABLED,
  CROP_SCALE_X, CROP_SCALE_Y, CROP_ROTATION, CROP_SCALE_RATIO,
  CROP_FLIP_HORIZONTAL, CROP_FLIP_VERTICAL, CROP_ASPECT_RATIO_LOCKED,
  PAGE_WIDTH, PAGE_HEIGHT,
  IMAGE_SRC, IMAGE_ORIGINAL_WIDTH, IMAGE_ORIGINAL_HEIGHT, IMAGE_ROTATION,
  PAGE_MARGIN_ENABLED, PAGE_MARGIN_TOP, PAGE_MARGIN_BOTTOM,
  PAGE_MARGIN_LEFT, PAGE_MARGIN_RIGHT,
  FILL_COLOR, FILL_ENABLED, STROKE_ENABLED, STROKE_COLOR, STROKE_WIDTH,
  SHADOW_ENABLED, SHADOW_COLOR, SHADOW_OFFSET_X, SHADOW_OFFSET_Y, SHADOW_BLUR,
  SHAPE_POLYGON_SIDES,
  EFFECT_ENABLED,
  EFFECT_ADJUSTMENTS_BRIGHTNESS, EFFECT_ADJUSTMENTS_SATURATION,
  EFFECT_ADJUSTMENTS_CONTRAST, EFFECT_ADJUSTMENTS_GAMMA,
  EFFECT_ADJUSTMENTS_CLARITY, EFFECT_ADJUSTMENTS_EXPOSURE,
  EFFECT_ADJUSTMENTS_SHADOWS, EFFECT_ADJUSTMENTS_HIGHLIGHTS,
  EFFECT_ADJUSTMENTS_BLACKS, EFFECT_ADJUSTMENTS_WHITES,
  EFFECT_ADJUSTMENTS_TEMPERATURE, EFFECT_ADJUSTMENTS_SHARPNESS,
} from './property-keys';
import {
  TEXT_RUNS, TEXT_ALIGN, TEXT_LINE_HEIGHT, TEXT_VERTICAL_ALIGN, TEXT_PADDING, TEXT_WRAP,
} from './property-keys';
import { normalizeRotation } from '../utils/rotation-math';
import {
  insertText as utilInsertText,
  removeRange as utilRemoveRange,
  replaceRange as utilReplaceRange,
  setStyleOnRange as utilSetStyleOnRange,
  getPlainText as utilGetPlainText,
  mergeAdjacentRuns,
} from './text-run-utils';
import { TextEditorSession } from './text-editor-session';

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
  #transformerEnabled = true;
  #textEditingSessions = new Map<number, TextEditorSession>();

  /** @internal — callback wired by CreativeEngine to route applyCropRatio through the active overlay. */
  #applyCropRatioHandler: ((ratio: number | null) => any) | null = null;
  /** @internal — callback for applyCropDimensions routing. */
  #applyCropDimensionsHandler: ((w: number, h: number) => any) | null = null;
  /** @internal — callback for getCropVisualDimensions routing. */
  #getCropVisualDimensionsHandler: (() => { width: number; height: number } | null) | null = null;

  constructor(engine: Engine) {
    this.#engine = engine;
  }

  /** @internal — called by CreativeEngine after construction to wire up crop overlay routing. */
  _setApplyCropRatioHandler(handler: (ratio: number | null) => any): void {
    this.#applyCropRatioHandler = handler;
  }

  /** @internal */
  _setApplyCropDimensionsHandler(handler: (w: number, h: number) => any): void {
    this.#applyCropDimensionsHandler = handler;
  }

  /** @internal */
  _setGetCropVisualDimensionsHandler(handler: () => { width: number; height: number } | null): void {
    this.#getCropVisualDimensionsHandler = handler;
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

  /** @internal — remove destroyed block IDs from selection (used by undo/redo). */
  _removeFromSelection(ids: number[]): void {
    let changed = false;
    for (const id of ids) {
      if (this.#selection.delete(id)) changed = true;
    }
    if (changed) this.#syncTransformer();
  }

  #syncTransformer(): void {
    const ids = [...this.#selection];
    this.#engine.emit('selection:changed', ids);
    const renderer = this.#engine.getRenderer();
    if (ids.length > 0 && this.#transformerEnabled) {
      const blockType = ids.length === 1 ? this.getType(ids[0]) : undefined;
      renderer?.showTransformer(ids, blockType);
    } else {
      renderer?.hideTransformer();
    }
  }

  /**
   * Enable or disable the transformer overlay (selection handles).
   * When disabled, the transformer is hidden even if blocks are selected.
   */
  setTransformerEnabled(enabled: boolean): void {
    this.#transformerEnabled = enabled;
    this.#syncTransformer();
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

  getProperty(id: number, key: string): PropertyValue | undefined {
    return this.#engine.getBlockStore().getProperty(id, key);
  }

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

  getPosition(id: number): { x: number; y: number } {
    return {
      x: this.getFloat(id, 'transform/position/x'),
      y: this.getFloat(id, 'transform/position/y'),
    };
  }

  setSize(id: number, width: number, height: number): void {
    this.#engine.beginBatch();
    const store = this.#engine.getBlockStore();
    this.#engine.exec(new SetPropertyCommand(store, id, 'transform/size/width', width));
    this.#engine.exec(new SetPropertyCommand(store, id, 'transform/size/height', height));
    this.#engine.endBatch();
  }

  getSize(id: number): { width: number; height: number } {
    return {
      width: this.getFloat(id, 'transform/size/width'),
      height: this.getFloat(id, 'transform/size/height'),
    };
  }

  setRotation(id: number, degrees: number): void {
    this.setFloat(id, 'transform/rotation', degrees);
  }

  setOpacity(id: number, opacity: number): void {
    this.setFloat(id, 'appearance/opacity', opacity);
  }

  getOpacity(id: number): number {
    return this.getFloat(id, 'appearance/opacity');
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
   * Apply exact pixel dimensions to the active crop overlay.
   *
   * Computes the largest crop rect of the given size that fits within the
   * image bounds, centered on the current crop center.
   */
  applyCropDimensions(_id: number, width: number, height: number): void {
    this.#applyCropDimensionsHandler?.(width, height);
  }

  /**
   * Returns the current crop overlay dimensions in visual pixels.
   * Returns null when no crop overlay is active.
   */
  getCropVisualDimensions(_id: number): { width: number; height: number } | null {
    return this.#getCropVisualDimensionsHandler?.() ?? null;
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

  // ── Shape sub-blocks ─────────────────────────────────
  // Modeled after img.ly CE.SDK shape sub-block architecture.
  // Shape sub-blocks define geometry; attached to graphic blocks.

  /** Creates a shape sub-block of the given type. */
  createShape(type: ShapeType): number {
    const store = this.#engine.getBlockStore();
    const cmd = new CreateShapeCommand(store, type);
    this.#engine.exec(cmd);
    return cmd.getCreatedId()!;
  }

  /** Attaches a shape sub-block to a graphic block. */
  setShape(blockId: number, shapeId: number): void {
    const store = this.#engine.getBlockStore();
    this.#engine.exec(new SetShapeCommand(store, blockId, shapeId));
  }

  /** Returns the shape sub-block ID attached to a block, or null. */
  getShape(blockId: number): number | null {
    return this.#engine.getBlockStore().getShape(blockId);
  }

  /** Checks if a block type supports shape sub-blocks (graphic only). */
  supportsShape(blockId: number): boolean {
    return this.#engine.getBlockStore().supportsShape(blockId);
  }

  /** Returns true if the block has a shape sub-block attached. */
  hasShape(blockId: number): boolean {
    return this.getShape(blockId) != null;
  }

  // ── Fill sub-blocks ──────────────────────────────────
  // Fill sub-blocks define visual content (color, gradient, image).

  /** Creates a fill sub-block of the given type. */
  createFill(type: FillType): number {
    const store = this.#engine.getBlockStore();
    const cmd = new CreateFillCommand(store, type);
    this.#engine.exec(cmd);
    return cmd.getCreatedId()!;
  }

  /** Attaches a fill sub-block to a graphic block. */
  setFill(blockId: number, fillId: number): void {
    const store = this.#engine.getBlockStore();
    this.#engine.exec(new SetFillCommand(store, blockId, fillId));
  }

  /** Returns the fill sub-block ID attached to a block, or null. */
  getFill(blockId: number): number | null {
    return this.#engine.getBlockStore().getFill(blockId);
  }

  /** Checks if a block type supports fill sub-blocks (graphic only). */
  supportsFill(blockId: number): boolean {
    return this.#engine.getBlockStore().supportsFill(blockId);
  }

  /** Returns true if the block has a fill sub-block attached. */
  hasFill(blockId: number): boolean {
    return this.getFill(blockId) != null;
  }

  /** Enables or disables the fill on a graphic block. */
  setFillEnabled(blockId: number, enabled: boolean): void {
    this.setBool(blockId, FILL_ENABLED, enabled);
  }

  /** Returns whether fill is enabled on a graphic block. */
  isFillEnabled(blockId: number): boolean {
    return this.getBool(blockId, FILL_ENABLED);
  }

  // ── Stroke convenience ───────────────────────────────

  /** Enables or disables the stroke on a graphic block. */
  setStrokeEnabled(blockId: number, enabled: boolean): void {
    this.setBool(blockId, STROKE_ENABLED, enabled);
  }

  /** Returns whether stroke is enabled on a graphic block. */
  isStrokeEnabled(blockId: number): boolean {
    return this.getBool(blockId, STROKE_ENABLED);
  }

  /** Sets stroke colour on a graphic block. */
  setStrokeColor(blockId: number, color: Color): void {
    this.setColor(blockId, STROKE_COLOR, color);
  }

  /** Gets stroke colour from a graphic block. */
  getStrokeColor(blockId: number): Color {
    return this.getColor(blockId, STROKE_COLOR);
  }

  /** Sets stroke width on a graphic block. */
  setStrokeWidth(blockId: number, width: number): void {
    this.setFloat(blockId, STROKE_WIDTH, width);
  }

  /** Gets stroke width from a graphic block. */
  getStrokeWidth(blockId: number): number {
    return this.getFloat(blockId, STROKE_WIDTH);
  }

  // ── Shadow convenience ────────────────────────────

  /** Enables or disables the drop shadow on a graphic block. */
  setShadowEnabled(blockId: number, enabled: boolean): void {
    this.setBool(blockId, SHADOW_ENABLED, enabled);
  }

  /** Returns whether shadow is enabled on a graphic block. */
  isShadowEnabled(blockId: number): boolean {
    return this.getBool(blockId, SHADOW_ENABLED);
  }

  /** Sets shadow colour on a graphic block. */
  setShadowColor(blockId: number, color: Color): void {
    this.setColor(blockId, SHADOW_COLOR, color);
  }

  /** Gets shadow colour from a graphic block. */
  getShadowColor(blockId: number): Color {
    return this.getColor(blockId, SHADOW_COLOR);
  }

  /** Sets shadow X offset. */
  setShadowOffsetX(blockId: number, value: number): void {
    this.setFloat(blockId, SHADOW_OFFSET_X, value);
  }

  /** Gets shadow X offset. */
  getShadowOffsetX(blockId: number): number {
    return this.getFloat(blockId, SHADOW_OFFSET_X);
  }

  /** Sets shadow Y offset. */
  setShadowOffsetY(blockId: number, value: number): void {
    this.setFloat(blockId, SHADOW_OFFSET_Y, value);
  }

  /** Gets shadow Y offset. */
  getShadowOffsetY(blockId: number): number {
    return this.getFloat(blockId, SHADOW_OFFSET_Y);
  }

  /** Sets shadow blur radius. */
  setShadowBlur(blockId: number, value: number): void {
    this.setFloat(blockId, SHADOW_BLUR, value);
  }

  /** Gets shadow blur radius. */
  getShadowBlur(blockId: number): number {
    return this.getFloat(blockId, SHADOW_BLUR);
  }

  // ── Shape placement convenience ──────────────────────

  /**
   * Creates a graphic block with shape + fill sub-blocks, places it at (x, y)
   * with the given size, and appends it to the parent (typically a page).
   * Batched as a single undo step. Returns the graphic block ID.
   */
  addShape(
    parentId: number,
    shapeKind: ShapeType,
    fillKind: FillType,
    x: number,
    y: number,
    width: number,
    height: number,
    opts?: { sides?: number },
  ): number {
    this.#engine.beginBatch();

    const graphicId = this.create('graphic');
    this.setKind(graphicId, shapeKind);
    this.setPosition(graphicId, x, y);
    this.setSize(graphicId, width, height);

    const shapeId = this.createShape(shapeKind);
    this.setShape(graphicId, shapeId);

    // Set polygon sides inside the batch so it's part of one undo step
    if (opts?.sides != null && shapeKind === 'polygon') {
      this.setFloat(shapeId, SHAPE_POLYGON_SIDES, opts.sides);
    }

    const fillId = this.createFill(fillKind);
    this.setFill(graphicId, fillId);

    // Arrow/line shapes need stroke enabled to render the line body
    if (shapeKind === 'line') {
      this.setBool(graphicId, STROKE_ENABLED, true);
      this.setFloat(graphicId, STROKE_WIDTH, 10);
      this.setColor(graphicId, STROKE_COLOR, { r: 0.29, g: 0.56, b: 0.89, a: 1 });
    }

    this.appendChild(parentId, graphicId);

    this.#engine.endBatch();
    return graphicId;
  }

  // ── Text placement convenience ──────────────────────

  /**
   * Creates a text block at (x, y) with given size, optional initial text string,
   * and appends it to the parent. Batched as a single undo step. Returns the text block ID.
   */
  addText(
    parentId: number,
    x: number,
    y: number,
    width: number,
    height: number,
    initialText?: string,
    opts?: { style?: Partial<TextRunStyle> },
  ): number {
    this.#engine.beginBatch();

    const textId = this.create('text');
    this.setPosition(textId, x, y);
    this.setSize(textId, width, height);

    if (initialText !== undefined) {
      const baseStyle: TextRunStyle = { fontSize: 24, fontFamily: 'Arial', fill: '#000000' };
      const mergedStyle: TextRunStyle = opts?.style ? { ...baseStyle, ...opts.style } : baseStyle;
      const runs: TextRun[] = [{ text: initialText, style: mergedStyle }];
      this.setProperty(textId, TEXT_RUNS, runs);
    }

    this.appendChild(parentId, textId);

    this.#engine.endBatch();
    return textId;
  }

  // ── Image placement convenience ──────────────────────

  /**
   * Creates an image block at (x, y) with given size, sets the image source
   * and original dimensions, and appends it to the parent.
   * Batched as a single undo step. Returns the image block ID.
   */
  addImage(
    parentId: number,
    src: string,
    x: number,
    y: number,
    width: number,
    height: number,
    originalWidth: number,
    originalHeight: number,
  ): number {
    this.#engine.beginBatch();

    const imageId = this.create('image');
    this.setPosition(imageId, x, y);
    this.setSize(imageId, width, height);
    this.setString(imageId, IMAGE_SRC, src);
    this.setFloat(imageId, IMAGE_ORIGINAL_WIDTH, originalWidth);
    this.setFloat(imageId, IMAGE_ORIGINAL_HEIGHT, originalHeight);

    this.appendChild(parentId, imageId);

    this.#engine.endBatch();
    return imageId;
  }

  // ── Z-order (layer ordering) ─────────────────────────

  /** Move block one step forward (higher) in its parent's children order. */
  bringForward(blockId: number): void {
    const parentId = this.getParent(blockId);
    if (parentId === null) return;
    const children = this.getChildren(parentId);
    const idx = children.indexOf(blockId);
    if (idx === -1 || idx >= children.length - 1) return;
    const store = this.#engine.getBlockStore();
    this.#engine.exec(new MoveChildCommand(store, parentId, blockId, idx + 1));
  }

  /** Move block one step backward (lower) in its parent's children order. */
  sendBackward(blockId: number): void {
    const parentId = this.getParent(blockId);
    if (parentId === null) return;
    const children = this.getChildren(parentId);
    const idx = children.indexOf(blockId);
    if (idx <= 0) return;
    const store = this.#engine.getBlockStore();
    this.#engine.exec(new MoveChildCommand(store, parentId, blockId, idx - 1));
  }

  /** Move block to the front (top) of its parent's children. */
  bringToFront(blockId: number): void {
    const parentId = this.getParent(blockId);
    if (parentId === null) return;
    const children = this.getChildren(parentId);
    const idx = children.indexOf(blockId);
    if (idx === -1 || idx >= children.length - 1) return;
    const store = this.#engine.getBlockStore();
    this.#engine.exec(new MoveChildCommand(store, parentId, blockId, children.length - 1));
  }

  /** Move block to the back (bottom) of its parent's children. */
  sendToBack(blockId: number): void {
    const parentId = this.getParent(blockId);
    if (parentId === null) return;
    const children = this.getChildren(parentId);
    const idx = children.indexOf(blockId);
    if (idx <= 0) return;
    const store = this.#engine.getBlockStore();
    this.#engine.exec(new MoveChildCommand(store, parentId, blockId, 0));
  }

  // ── Page alignment ───────────────────────────────────

  /** Align a block relative to its parent page. */
  alignToPage(
    blockId: number,
    alignment: 'left' | 'center' | 'right' | 'top' | 'middle' | 'bottom',
  ): void {
    const parentId = this.getParent(blockId);
    if (parentId === null) return;

    const pageW = this.getFloat(parentId, PAGE_WIDTH) || this.getFloat(parentId, 'transform/size/width');
    const pageH = this.getFloat(parentId, PAGE_HEIGHT) || this.getFloat(parentId, 'transform/size/height');
    const { width: blockW, height: blockH } = this.getSize(blockId);

    switch (alignment) {
      case 'left':
        this.setFloat(blockId, 'transform/position/x', 0);
        break;
      case 'center':
        this.setFloat(blockId, 'transform/position/x', (pageW - blockW) / 2);
        break;
      case 'right':
        this.setFloat(blockId, 'transform/position/x', pageW - blockW);
        break;
      case 'top':
        this.setFloat(blockId, 'transform/position/y', 0);
        break;
      case 'middle':
        this.setFloat(blockId, 'transform/position/y', (pageH - blockH) / 2);
        break;
      case 'bottom':
        this.setFloat(blockId, 'transform/position/y', pageH - blockH);
        break;
    }
  }

  // ── Duplicate ────────────────────────────────────────

  /**
   * Deep-clones a block and all its sub-blocks (shape, fill, effects),
   * offsets the copy slightly, appends to the same parent, and selects it.
   * Batched as a single undo step. Returns the new block ID.
   */
  duplicate(blockId: number): number {
    const parentId = this.getParent(blockId);
    if (parentId === null) throw new Error(`Block ${blockId} has no parent`);

    const store = this.#engine.getBlockStore();
    const sourceBlock = store.get(blockId);
    if (!sourceBlock) throw new Error(`Block ${blockId} not found`);

    this.#engine.beginBatch();

    const newId = this.create(sourceBlock.type);
    this.setKind(newId, sourceBlock.kind);

    // Copy all properties
    const allKeys = store.findAllProperties(blockId);
    for (const key of allKeys) {
      const val = this.getProperty(blockId, key);
      if (val !== undefined) {
        this.setProperty(newId, key, val);
      }
    }

    // Offset the duplicate
    const pos = this.getPosition(blockId);
    this.setPosition(newId, pos.x + 20, pos.y + 20);

    // Clone shape sub-block
    if (sourceBlock.shapeId != null) {
      const srcShape = store.get(sourceBlock.shapeId);
      if (srcShape) {
        const newShapeId = this.createShape(srcShape.kind as ShapeType);
        const shapeKeys = store.findAllProperties(sourceBlock.shapeId);
        for (const key of shapeKeys) {
          const val = this.getProperty(sourceBlock.shapeId, key);
          if (val !== undefined) this.setProperty(newShapeId, key, val);
        }
        this.setShape(newId, newShapeId);
      }
    }

    // Clone fill sub-block
    if (sourceBlock.fillId != null) {
      const srcFill = store.get(sourceBlock.fillId);
      if (srcFill) {
        const newFillId = this.createFill(srcFill.kind as FillType);
        const fillKeys = store.findAllProperties(sourceBlock.fillId);
        for (const key of fillKeys) {
          const val = this.getProperty(sourceBlock.fillId, key);
          if (val !== undefined) this.setProperty(newFillId, key, val);
        }
        this.setFill(newId, newFillId);
      }
    }

    // Clone effect sub-blocks
    for (const effectId of sourceBlock.effectIds) {
      const srcEffect = store.get(effectId);
      if (srcEffect) {
        const newEffectId = this.createEffect(srcEffect.kind as EffectType);
        const effectKeys = store.findAllProperties(effectId);
        for (const key of effectKeys) {
          const val = this.getProperty(effectId, key);
          if (val !== undefined) this.setProperty(newEffectId, key, val);
        }
        this.appendEffect(newId, newEffectId);
      }
    }

    this.appendChild(parentId, newId);
    this.select(newId);

    this.#engine.endBatch();
    return newId;
  }

  // ── Text editing session lifecycle ────────────────────

  /** Start an editing session — creates a Lexical editor as single source of truth. */
  beginTextEditing(blockId: number): TextEditorSession {
    let session = this.#textEditingSessions.get(blockId);
    if (session) return session;
    const runs = this.getTextRuns(blockId);
    session = new TextEditorSession(blockId, runs, (newRuns) => {
      this.setProperty(blockId, TEXT_RUNS, newRuns);
    });
    this.#textEditingSessions.set(blockId, session);
    return session;
  }

  /** Get an active editing session, or null. */
  getTextEditingSession(blockId: number): TextEditorSession | null {
    return this.#textEditingSessions.get(blockId) ?? null;
  }

  /** End an editing session — disposes the Lexical editor. */
  endTextEditing(blockId: number): void {
    const session = this.#textEditingSessions.get(blockId);
    if (session) {
      session.dispose();
      this.#textEditingSessions.delete(blockId);
    }
  }

  // ── Range-based text editing ──────────────────────────

  /** Get the current TextRun[] for a text block. */
  getTextRuns(blockId: number): TextRun[] {
    const val = this.getProperty(blockId, TEXT_RUNS);
    return Array.isArray(val) ? val as TextRun[] : [];
  }

  /** Get plain text content from a text block. */
  getTextContent(blockId: number): string {
    return utilGetPlainText(this.getTextRuns(blockId));
  }

  /** Insert text at the given character position, inheriting the style at that position. */
  insertTextAt(blockId: number, position: number, text: string): void {
    const runs = this.getTextRuns(blockId);
    const newRuns = utilInsertText(runs, position, text);
    this.setProperty(blockId, TEXT_RUNS, newRuns);
  }

  /** Remove characters in [start, end). */
  removeText(blockId: number, start: number, end: number): void {
    const runs = this.getTextRuns(blockId);
    const newRuns = utilRemoveRange(runs, start, end);
    this.setProperty(blockId, TEXT_RUNS, newRuns);
  }

  /** Replace text in [start, end) with new text. */
  replaceText(blockId: number, start: number, end: number, newText: string): void {
    const runs = this.getTextRuns(blockId);
    const newRuns = utilReplaceRange(runs, start, end, newText);
    this.setProperty(blockId, TEXT_RUNS, newRuns);
  }

  /** Apply a partial style update to characters in [start, end). */
  setTextStyle(blockId: number, start: number, end: number, styleUpdate: Partial<TextRunStyle>): void {
    const session = this.#textEditingSessions.get(blockId);
    if (session) {
      session.setTextStyle(start, end, styleUpdate);
    } else {
      const runs = this.getTextRuns(blockId);
      const newRuns = utilSetStyleOnRange(runs, start, end, styleUpdate);
      this.setProperty(blockId, TEXT_RUNS, newRuns);
    }
  }

  /** Set text color for characters in [start, end). */
  setTextColor(blockId: number, start: number, end: number, color: string): void {
    this.setTextStyle(blockId, start, end, { fill: color });
  }

  /** Set font size for characters in [start, end). */
  setTextFontSize(blockId: number, start: number, end: number, fontSize: number): void {
    this.setTextStyle(blockId, start, end, { fontSize });
  }

  /** Set font family for characters in [start, end). */
  setTextFontFamily(blockId: number, start: number, end: number, fontFamily: string): void {
    this.setTextStyle(blockId, start, end, { fontFamily });
  }

  /** Set font weight for characters in [start, end). */
  setTextFontWeight(blockId: number, start: number, end: number, fontWeight: string): void {
    this.setTextStyle(blockId, start, end, { fontWeight });
  }

  /** Toggle bold on characters in [start, end). */
  toggleBoldText(blockId: number, start: number, end: number): void {
    const session = this.#textEditingSessions.get(blockId);
    if (session) {
      session.toggleBold(start, end);
    } else {
      const runs = this.getTextRuns(blockId);
      let currentWeight = 'normal';
      let offset = 0;
      for (const run of runs) {
        if (offset + run.text.length > start) {
          currentWeight = run.style.fontWeight ?? 'normal';
          break;
        }
        offset += run.text.length;
      }
      const newWeight = currentWeight === 'bold' ? 'normal' : 'bold';
      this.setTextStyle(blockId, start, end, { fontWeight: newWeight });
    }
  }

  /** Toggle italic on characters in [start, end). */
  toggleItalicText(blockId: number, start: number, end: number): void {
    const session = this.#textEditingSessions.get(blockId);
    if (session) {
      session.toggleItalic(start, end);
    } else {
      const runs = this.getTextRuns(blockId);
      let currentStyle = 'normal';
      let offset = 0;
      for (const run of runs) {
        if (offset + run.text.length > start) {
          currentStyle = run.style.fontStyle ?? 'normal';
          break;
        }
        offset += run.text.length;
      }
      const newStyle = currentStyle === 'italic' ? 'normal' : 'italic';
      this.setTextStyle(blockId, start, end, { fontStyle: newStyle });
    }
  }

  /** Set block-level text alignment. */
  setTextAlign(blockId: number, align: string): void {
    this.setProperty(blockId, TEXT_ALIGN, align);
  }

  /** Set block-level line height. */
  setTextLineHeight(blockId: number, lineHeight: number): void {
    this.setProperty(blockId, TEXT_LINE_HEIGHT, lineHeight);
  }

  /** Set block-level vertical alignment. */
  setTextVerticalAlign(blockId: number, align: string): void {
    this.setProperty(blockId, TEXT_VERTICAL_ALIGN, align);
  }

  /** Set text background/highlight color for characters in [start, end). */
  setTextBackgroundColor(blockId: number, start: number, end: number, color: string | undefined): void {
    this.setTextStyle(blockId, start, end, { backgroundColor: color });
  }

  /** Set text transform (uppercase/lowercase/capitalize) for characters in [start, end). */
  setTextTransform(blockId: number, start: number, end: number, transform: 'none' | 'uppercase' | 'lowercase' | 'capitalize'): void {
    this.setTextStyle(blockId, start, end, { textTransform: transform });
  }

  /** Set text shadow for characters in [start, end). */
  setTextShadow(blockId: number, start: number, end: number, shadow: { color?: string; blur?: number; offsetX?: number; offsetY?: number }): void {
    this.setTextStyle(blockId, start, end, {
      textShadowColor: shadow.color,
      textShadowBlur: shadow.blur,
      textShadowOffsetX: shadow.offsetX,
      textShadowOffsetY: shadow.offsetY,
    });
  }

  /** Set text stroke/outline for characters in [start, end). */
  setTextStroke(blockId: number, start: number, end: number, stroke: { color?: string; width?: number }): void {
    this.setTextStyle(blockId, start, end, {
      textStrokeColor: stroke.color,
      textStrokeWidth: stroke.width,
    });
  }
}
