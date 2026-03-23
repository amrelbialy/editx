import {
  AppendChildCommand,
  CreateBlockCommand,
  DestroyBlockCommand,
  RemoveChildCommand,
  SetKindCommand,
} from "../controller/commands";
import type { Engine } from "../engine";
import type {
  BlockType,
  Color,
  EffectType,
  FillType,
  PropertyValue,
  ShapeType,
  TextRun,
  TextRunStyle,
} from "./block.types";
import * as H from "./block-api-helpers";
import { BlockCropAPI } from "./block-crop-api";
import { BlockEffectAPI } from "./block-effect-api";
import { BlockFillAPI } from "./block-fill-api";
import { BlockLayoutAPI } from "./block-layout-api";
import { BlockPropertyAPI } from "./block-property-api";
import { BlockSelectionAPI } from "./block-selection-api";
import { BlockShadowAPI } from "./block-shadow-api";
import { BlockShapeAPI } from "./block-shape-api";
import { BlockStrokeAPI } from "./block-stroke-api";
import { BlockTextAPI } from "./block-text-api";
import { IMAGE_ORIGINAL_HEIGHT, IMAGE_ORIGINAL_WIDTH, IMAGE_SRC } from "./property-keys";
import type { TextEditorSession } from "./text-editor-session";

// Re-export adjustment types/constants from effect sub-API
export type { AdjustmentConfig, AdjustmentParam } from "./block-effect-api";
export { ADJUSTMENT_CONFIG, ADJUSTMENT_PARAMS } from "./block-effect-api";

/**
 * Facade over all block sub-APIs — preserves the flat `engine.block.*` surface.
 * Delegates to focused sub-API modules for each concern.
 */
export class BlockAPI {
  #engine: Engine;
  #property: BlockPropertyAPI;
  #selection: BlockSelectionAPI;
  #layout: BlockLayoutAPI;
  #crop: BlockCropAPI;
  #effect: BlockEffectAPI;
  #shape: BlockShapeAPI;
  #fill: BlockFillAPI;
  #stroke: BlockStrokeAPI;
  #shadow: BlockShadowAPI;
  #text: BlockTextAPI;

  constructor(engine: Engine) {
    this.#engine = engine;
    this.#property = new BlockPropertyAPI(engine);
    this.#selection = new BlockSelectionAPI(engine);
    this.#layout = new BlockLayoutAPI(engine);
    this.#crop = new BlockCropAPI(engine);
    this.#effect = new BlockEffectAPI(engine);
    this.#shape = new BlockShapeAPI(engine);
    this.#fill = new BlockFillAPI(engine);
    this.#stroke = new BlockStrokeAPI(engine);
    this.#shadow = new BlockShadowAPI(engine);
    this.#text = new BlockTextAPI(engine);
  }

  // ── Crop handler wiring (@internal) ───────────────

  _setApplyCropRatioHandler(handler: (ratio: number | null) => any): void {
    this.#crop._setApplyCropRatioHandler(handler);
  }
  _setApplyCropDimensionsHandler(handler: (w: number, h: number) => any): void {
    this.#crop._setApplyCropDimensionsHandler(handler);
  }
  _setGetCropVisualDimensionsHandler(
    handler: () => { width: number; height: number } | null,
  ): void {
    this.#crop._setGetCropVisualDimensionsHandler(handler);
  }

  // ── Selection ─────────────────────────────────────

  select(id: number): void {
    this.#selection.select(id);
  }
  setSelected(id: number, selected: boolean): void {
    this.#selection.setSelected(id, selected);
  }
  isSelected(id: number): boolean {
    return this.#selection.isSelected(id);
  }
  findAllSelected(): number[] {
    return this.#selection.findAllSelected();
  }
  deselectAll(): void {
    this.#selection.deselectAll();
  }
  _removeFromSelection(ids: number[]): void {
    this.#selection._removeFromSelection(ids);
  }
  setTransformerEnabled(enabled: boolean): void {
    this.#selection.setTransformerEnabled(enabled);
  }

  // ── Lifecycle ─────────────────────────────────────

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

  // ── Type / Kind ───────────────────────────────────

  getType(id: number): BlockType | undefined {
    return this.#engine.getBlockStore().getType(id);
  }

  getKind(id: number): string {
    return this.#engine.getBlockStore().getKind(id);
  }

  setKind(id: number, kind: string): void {
    this.#engine.exec(new SetKindCommand(this.#engine.getBlockStore(), id, kind));
  }

  // ── Hierarchy ─────────────────────────────────────

  appendChild(parent: number, child: number): void {
    this.#engine.exec(new AppendChildCommand(this.#engine.getBlockStore(), parent, child));
  }

  removeChild(parent: number, child: number): void {
    this.#engine.exec(new RemoveChildCommand(this.#engine.getBlockStore(), parent, child));
  }

  getParent(id: number): number | null {
    return this.#engine.getBlockStore().getParent(id);
  }
  getChildren(id: number): number[] {
    return this.#engine.getBlockStore().getChildren(id);
  }

  // ── Property ──────────────────────────────────────

  getProperty(id: number, key: string): PropertyValue | undefined {
    return this.#property.getProperty(id, key);
  }
  getFloat(id: number, key: string): number {
    return this.#property.getFloat(id, key);
  }
  getString(id: number, key: string): string {
    return this.#property.getString(id, key);
  }
  getBool(id: number, key: string): boolean {
    return this.#property.getBool(id, key);
  }
  getColor(id: number, key: string): Color {
    return this.#property.getColor(id, key);
  }
  setProperty(id: number, key: string, value: PropertyValue): void {
    this.#property.setProperty(id, key, value);
  }
  setFloat(id: number, key: string, value: number): void {
    this.#property.setFloat(id, key, value);
  }
  setString(id: number, key: string, value: string): void {
    this.#property.setString(id, key, value);
  }
  setBool(id: number, key: string, value: boolean): void {
    this.#property.setBool(id, key, value);
  }
  setColor(id: number, key: string, value: Color): void {
    this.#property.setColor(id, key, value);
  }

  // ── Query ─────────────────────────────────────────

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
    return this.#property.findAllProperties(id);
  }

  // ── Layout ────────────────────────────────────────

  setPosition(id: number, x: number, y: number): void {
    this.#layout.setPosition(id, x, y);
  }
  getPosition(id: number) {
    return this.#layout.getPosition(id);
  }
  setSize(id: number, w: number, h: number): void {
    this.#layout.setSize(id, w, h);
  }
  getSize(id: number) {
    return this.#layout.getSize(id);
  }
  setRotation(id: number, degrees: number): void {
    this.#layout.setRotation(id, degrees);
  }
  setOpacity(id: number, opacity: number): void {
    this.#layout.setOpacity(id, opacity);
  }
  getOpacity(id: number): number {
    return this.#layout.getOpacity(id);
  }
  setVisible(id: number, visible: boolean): void {
    this.#layout.setVisible(id, visible);
  }
  bringForward(blockId: number): void {
    this.#layout.bringForward(blockId);
  }
  sendBackward(blockId: number): void {
    this.#layout.sendBackward(blockId);
  }
  bringToFront(blockId: number): void {
    this.#layout.bringToFront(blockId);
  }
  sendToBack(blockId: number): void {
    this.#layout.sendToBack(blockId);
  }
  alignToPage(
    blockId: number,
    alignment: "left" | "center" | "right" | "top" | "middle" | "bottom",
  ): void {
    this.#layout.alignToPage(blockId, alignment);
  }

  // ── Crop ──────────────────────────────────────────

  hasCrop(id: number): boolean {
    return this.#crop.hasCrop(id);
  }
  supportsCrop(id: number): boolean {
    return this.#crop.supportsCrop(id);
  }
  setCropScaleX(id: number, v: number): void {
    this.#crop.setCropScaleX(id, v);
  }
  getCropScaleX(id: number): number {
    return this.#crop.getCropScaleX(id);
  }
  setCropScaleY(id: number, v: number): void {
    this.#crop.setCropScaleY(id, v);
  }
  getCropScaleY(id: number): number {
    return this.#crop.getCropScaleY(id);
  }
  setCropRotation(id: number, r: number): void {
    this.#crop.setCropRotation(id, r);
  }
  getCropRotation(id: number): number {
    return this.#crop.getCropRotation(id);
  }
  setCropScaleRatio(id: number, v: number): void {
    this.#crop.setCropScaleRatio(id, v);
  }
  getCropScaleRatio(id: number): number {
    return this.#crop.getCropScaleRatio(id);
  }
  setCropTranslationX(id: number, v: number): void {
    this.#crop.setCropTranslationX(id, v);
  }
  getCropTranslationX(id: number): number {
    return this.#crop.getCropTranslationX(id);
  }
  setCropTranslationY(id: number, v: number): void {
    this.#crop.setCropTranslationY(id, v);
  }
  getCropTranslationY(id: number): number {
    return this.#crop.getCropTranslationY(id);
  }
  resetCrop(id: number): void {
    this.#crop.resetCrop(id);
  }
  applyCropRatio(id: number, ratio: number | null): void {
    this.#crop.applyCropRatio(id, ratio);
  }
  applyCropDimensions(id: number, w: number, h: number): void {
    this.#crop.applyCropDimensions(id, w, h);
  }
  getCropVisualDimensions(id: number) {
    return this.#crop.getCropVisualDimensions(id);
  }
  adjustCropToFillFrame(id: number): void {
    this.#crop.adjustCropToFillFrame(id);
  }
  flipCropHorizontal(id: number): void {
    this.#crop.flipCropHorizontal(id);
  }
  isCropFlippedHorizontal(id: number): boolean {
    return this.#crop.isCropFlippedHorizontal(id);
  }
  flipCropVertical(id: number): void {
    this.#crop.flipCropVertical(id);
  }
  isCropFlippedVertical(id: number): boolean {
    return this.#crop.isCropFlippedVertical(id);
  }
  isCropAspectRatioLocked(id: number): boolean {
    return this.#crop.isCropAspectRatioLocked(id);
  }
  setCropAspectRatioLocked(id: number, locked: boolean): void {
    this.#crop.setCropAspectRatioLocked(id, locked);
  }

  // ── Page convenience ──────────────────────────────

  setPageDimensions(id: number, w: number, h: number): void {
    this.#crop.setPageDimensions(id, w, h);
  }
  getPageDimensions(id: number) {
    return this.#crop.getPageDimensions(id);
  }
  setPageImageSrc(id: number, src: string): void {
    this.#crop.setPageImageSrc(id, src);
  }
  getPageImageSrc(id: number): string {
    return this.#crop.getPageImageSrc(id);
  }
  setPageImageOriginalDimensions(id: number, w: number, h: number): void {
    this.#crop.setPageImageOriginalDimensions(id, w, h);
  }
  getPageImageOriginalDimensions(id: number) {
    return this.#crop.getPageImageOriginalDimensions(id);
  }
  setPageFillColor(id: number, color: Color): void {
    this.#crop.setPageFillColor(id, color);
  }
  getPageFillColor(id: number): Color {
    return this.#crop.getPageFillColor(id);
  }
  setPageMarginsEnabled(id: number, enabled: boolean): void {
    this.#crop.setPageMarginsEnabled(id, enabled);
  }
  isPageMarginsEnabled(id: number): boolean {
    return this.#crop.isPageMarginsEnabled(id);
  }
  setPageMargins(id: number, top: number, right: number, bottom: number, left: number): void {
    this.#crop.setPageMargins(id, top, right, bottom, left);
  }
  getPageMargins(id: number) {
    return this.#crop.getPageMargins(id);
  }

  // ── Image rotation & flip ─────────────────────────

  setImageRotation(id: number, angleDeg: number): void {
    this.#crop.setImageRotation(id, angleDeg);
  }
  getImageRotation(id: number): number {
    return this.#crop.getImageRotation(id);
  }
  rotateClockwise(id: number): void {
    this.#crop.rotateClockwise(id);
  }
  rotateCounterClockwise(id: number): void {
    this.#crop.rotateCounterClockwise(id);
  }
  resetRotationAndFlip(id: number): void {
    this.#crop.resetRotationAndFlip(id);
  }

  // ── Effects ───────────────────────────────────────

  createEffect(type: EffectType): number {
    return this.#effect.createEffect(type);
  }
  appendEffect(blockId: number, effectId: number): void {
    this.#effect.appendEffect(blockId, effectId);
  }
  insertEffect(blockId: number, effectId: number, index: number): void {
    this.#effect.insertEffect(blockId, effectId, index);
  }
  removeEffect(blockId: number, index: number): number | null {
    return this.#effect.removeEffect(blockId, index);
  }
  getEffects(blockId: number): number[] {
    return this.#effect.getEffects(blockId);
  }
  supportsEffects(blockId: number): boolean {
    return this.#effect.supportsEffects(blockId);
  }
  hasEffects(blockId: number): boolean {
    return this.#effect.hasEffects(blockId);
  }
  setEffectEnabled(effectId: number, enabled: boolean): void {
    this.#effect.setEffectEnabled(effectId, enabled);
  }
  isEffectEnabled(effectId: number): boolean {
    return this.#effect.isEffectEnabled(effectId);
  }

  // ── Shape sub-blocks ──────────────────────────────

  createShape(type: ShapeType): number {
    return this.#shape.createShape(type);
  }
  setShape(blockId: number, shapeId: number): void {
    this.#shape.setShape(blockId, shapeId);
  }
  getShape(blockId: number): number | null {
    return this.#shape.getShape(blockId);
  }
  supportsShape(blockId: number): boolean {
    return this.#shape.supportsShape(blockId);
  }
  hasShape(blockId: number): boolean {
    return this.#shape.hasShape(blockId);
  }
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
    return this.#shape.addShape(parentId, shapeKind, fillKind, x, y, width, height, opts);
  }

  // ── Fill sub-blocks ───────────────────────────────

  createFill(type: FillType): number {
    return this.#fill.createFill(type);
  }
  setFill(blockId: number, fillId: number): void {
    this.#fill.setFill(blockId, fillId);
  }
  getFill(blockId: number): number | null {
    return this.#fill.getFill(blockId);
  }
  supportsFill(blockId: number): boolean {
    return this.#fill.supportsFill(blockId);
  }
  hasFill(blockId: number): boolean {
    return this.#fill.hasFill(blockId);
  }
  setFillEnabled(blockId: number, enabled: boolean): void {
    this.#fill.setFillEnabled(blockId, enabled);
  }
  isFillEnabled(blockId: number): boolean {
    return this.#fill.isFillEnabled(blockId);
  }

  // ── Stroke ────────────────────────────────────────

  setStrokeEnabled(blockId: number, enabled: boolean): void {
    this.#stroke.setStrokeEnabled(blockId, enabled);
  }
  isStrokeEnabled(blockId: number): boolean {
    return this.#stroke.isStrokeEnabled(blockId);
  }
  setStrokeColor(blockId: number, color: Color): void {
    this.#stroke.setStrokeColor(blockId, color);
  }
  getStrokeColor(blockId: number): Color {
    return this.#stroke.getStrokeColor(blockId);
  }
  setStrokeWidth(blockId: number, width: number): void {
    this.#stroke.setStrokeWidth(blockId, width);
  }
  getStrokeWidth(blockId: number): number {
    return this.#stroke.getStrokeWidth(blockId);
  }

  // ── Shadow ────────────────────────────────────────

  setShadowEnabled(blockId: number, enabled: boolean): void {
    this.#shadow.setShadowEnabled(blockId, enabled);
  }
  isShadowEnabled(blockId: number): boolean {
    return this.#shadow.isShadowEnabled(blockId);
  }
  setShadowColor(blockId: number, color: Color): void {
    this.#shadow.setShadowColor(blockId, color);
  }
  getShadowColor(blockId: number): Color {
    return this.#shadow.getShadowColor(blockId);
  }
  setShadowOffsetX(blockId: number, v: number): void {
    this.#shadow.setShadowOffsetX(blockId, v);
  }
  getShadowOffsetX(blockId: number): number {
    return this.#shadow.getShadowOffsetX(blockId);
  }
  setShadowOffsetY(blockId: number, v: number): void {
    this.#shadow.setShadowOffsetY(blockId, v);
  }
  getShadowOffsetY(blockId: number): number {
    return this.#shadow.getShadowOffsetY(blockId);
  }
  setShadowBlur(blockId: number, v: number): void {
    this.#shadow.setShadowBlur(blockId, v);
  }
  getShadowBlur(blockId: number): number {
    return this.#shadow.getShadowBlur(blockId);
  }

  // ── Text ──────────────────────────────────────────

  beginTextEditing(blockId: number): TextEditorSession {
    return this.#text.beginTextEditing(blockId);
  }
  getTextEditingSession(blockId: number): TextEditorSession | null {
    return this.#text.getTextEditingSession(blockId);
  }
  endTextEditing(blockId: number): void {
    this.#text.endTextEditing(blockId);
  }
  getTextRuns(blockId: number): TextRun[] {
    return this.#text.getTextRuns(blockId);
  }
  getTextContent(blockId: number): string {
    return this.#text.getTextContent(blockId);
  }
  insertTextAt(blockId: number, position: number, text: string): void {
    this.#text.insertTextAt(blockId, position, text);
  }
  removeText(blockId: number, start: number, end: number): void {
    this.#text.removeText(blockId, start, end);
  }
  replaceText(blockId: number, start: number, end: number, newText: string): void {
    this.#text.replaceText(blockId, start, end, newText);
  }
  setTextStyle(
    blockId: number,
    start: number,
    end: number,
    styleUpdate: Partial<TextRunStyle>,
  ): void {
    this.#text.setTextStyle(blockId, start, end, styleUpdate);
  }
  setTextColor(blockId: number, start: number, end: number, color: string): void {
    this.#text.setTextColor(blockId, start, end, color);
  }
  setTextFontSize(blockId: number, start: number, end: number, fontSize: number): void {
    this.#text.setTextFontSize(blockId, start, end, fontSize);
  }
  setTextFontFamily(blockId: number, start: number, end: number, fontFamily: string): void {
    this.#text.setTextFontFamily(blockId, start, end, fontFamily);
  }
  setTextFontWeight(blockId: number, start: number, end: number, fontWeight: string): void {
    this.#text.setTextFontWeight(blockId, start, end, fontWeight);
  }
  toggleBoldText(blockId: number, start: number, end: number): void {
    this.#text.toggleBoldText(blockId, start, end);
  }
  toggleItalicText(blockId: number, start: number, end: number): void {
    this.#text.toggleItalicText(blockId, start, end);
  }
  setTextAlign(blockId: number, align: string): void {
    this.#text.setTextAlign(blockId, align);
  }
  setTextLineHeight(blockId: number, lineHeight: number): void {
    this.#text.setTextLineHeight(blockId, lineHeight);
  }
  setTextVerticalAlign(blockId: number, align: string): void {
    this.#text.setTextVerticalAlign(blockId, align);
  }
  setTextBackgroundColor(
    blockId: number,
    start: number,
    end: number,
    color: string | undefined,
  ): void {
    this.#text.setTextBackgroundColor(blockId, start, end, color);
  }
  setTextTransform(
    blockId: number,
    start: number,
    end: number,
    transform: "none" | "uppercase" | "lowercase" | "capitalize",
  ): void {
    this.#text.setTextTransform(blockId, start, end, transform);
  }
  setTextShadow(
    blockId: number,
    start: number,
    end: number,
    shadow: { color?: string; blur?: number; offsetX?: number; offsetY?: number },
  ): void {
    this.#text.setTextShadow(blockId, start, end, shadow);
  }
  setTextStroke(
    blockId: number,
    start: number,
    end: number,
    stroke: { color?: string; width?: number },
  ): void {
    this.#text.setTextStroke(blockId, start, end, stroke);
  }
  addText(
    parentId: number,
    x: number,
    y: number,
    width: number,
    height: number,
    initialText?: string,
    opts?: { style?: Partial<TextRunStyle> },
  ): number {
    return this.#text.addText(parentId, x, y, width, height, initialText, opts);
  }

  // ── Image placement convenience ───────────────────

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
    const imageId = this.create("image");
    this.setPosition(imageId, x, y);
    this.setSize(imageId, width, height);
    H.setString(this.#engine, imageId, IMAGE_SRC, src);
    H.setFloat(this.#engine, imageId, IMAGE_ORIGINAL_WIDTH, originalWidth);
    H.setFloat(this.#engine, imageId, IMAGE_ORIGINAL_HEIGHT, originalHeight);
    this.appendChild(parentId, imageId);
    this.#engine.endBatch();
    return imageId;
  }

  // ── Duplicate ─────────────────────────────────────

  duplicate(blockId: number): number {
    const parentId = this.getParent(blockId);
    if (parentId === null) throw new Error(`Block ${blockId} has no parent`);
    const store = this.#engine.getBlockStore();
    const sourceBlock = store.get(blockId);
    if (!sourceBlock) throw new Error(`Block ${blockId} not found`);

    this.#engine.beginBatch();
    const newId = this.create(sourceBlock.type);
    this.setKind(newId, sourceBlock.kind);

    const allKeys = store.findAllProperties(blockId);
    for (const key of allKeys) {
      const val = this.getProperty(blockId, key);
      if (val !== undefined) this.setProperty(newId, key, val);
    }

    const pos = this.getPosition(blockId);
    this.setPosition(newId, pos.x + 20, pos.y + 20);

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
}
