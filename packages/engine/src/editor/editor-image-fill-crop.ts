import type { ImageFillCrop, ImageFillCropChange, ImageFillCropUpdate } from "../editor-types";
import type { CropRect } from "../utils/crop-math";
import type { EditorContext } from "./editor-context";

const SCALE_MIN = 0.1;
const SCALE_MAX = 4;

interface CropSession {
  blockId: number;
  initial: ImageFillCrop;
  value: ImageFillCrop;
}

function clampScale(scale: number): number {
  return Math.min(Math.max(scale, SCALE_MIN), SCALE_MAX);
}

export class EditorImageFillCrop {
  #ctx: EditorContext;
  #session: CropSession | null = null;
  #listeners = new Set<(change: ImageFillCropChange) => void>();

  constructor(ctx: EditorContext) {
    this.#ctx = ctx;
    if (ctx.renderer) {
      ctx.renderer.onImageFillCropPreviewChange = (crop) => this.#setPreview(crop);
    }
  }

  isEligible(blockId: number): boolean {
    const block = this.#ctx.block;
    const fill = block?.getFillImage(blockId) ?? null;
    return (
      block?.getType(blockId) === "graphic" &&
      block.isFillEnabled(blockId) &&
      fill !== null &&
      fill.src.trim().length > 0
    );
  }

  setup(blockId: number): ImageFillCrop | null {
    if (!this.isEligible(blockId)) return null;
    const block = this.#ctx.block;
    const fill = block?.getFillImage(blockId);
    if (!block || !fill) return null;
    const position = block.getPosition(blockId);
    const size = block.getSize(blockId);
    const initial: ImageFillCrop = {
      ...position,
      ...size,
      fit: fill.fit,
      alignment: fill.alignment ?? "center",
      offsetX: fill.offsetX,
      offsetY: fill.offsetY,
      scale: clampScale(fill.scale),
      rotation: fill.rotation,
      flipHorizontal: fill.flipHorizontal,
      flipVertical: fill.flipVertical,
    };
    const shown = this.#ctx.renderer?.showImageFillCropPreview?.(blockId, initial) ?? initial;
    this.#session = { blockId, initial, value: shown };
    this.#notify();
    return { ...shown };
  }

  teardown(commit: boolean): void {
    const session = this.#session;
    if (!session) return;
    this.#session = null;
    this.#ctx.renderer?.hideImageFillCropPreview?.();

    if (commit && !this.#isUnchanged(session)) this.#commit(session);
    const block = this.#ctx.engine._getBlockStore().get(session.blockId);
    if (block) this.#ctx.renderer?.syncBlock(session.blockId, block);
  }

  get(): ImageFillCrop | null {
    return this.#session ? { ...this.#session.value } : null;
  }

  update(update: ImageFillCropUpdate): ImageFillCrop | null {
    if (!this.#session) return null;
    const normalized = {
      ...this.#session.value,
      ...update,
      scale: clampScale(update.scale ?? this.#session.value.scale),
    };
    this.#session.value = this.#ctx.renderer?.setImageFillCropPreview?.(normalized) ?? normalized;
    this.#notify();
    return { ...this.#session.value };
  }

  reset(): ImageFillCrop | null {
    if (!this.#session) return null;
    const { initial } = this.#session;
    return this.update({
      x: initial.x,
      y: initial.y,
      width: initial.width,
      height: initial.height,
      fit: "cover",
      alignment: "center",
      offsetX: 0,
      offsetY: 0,
      scale: 1,
      rotation: 0,
      flipHorizontal: false,
      flipVertical: false,
    });
  }

  applyRatio(ratio: number | null): CropRect | null {
    const current = this.#session?.value;
    if (!current) return null;
    if (ratio === null || !Number.isFinite(ratio) || ratio <= 0) {
      this.#ctx.renderer?.setImageFillCropPreview?.(current, null);
      return this.#toRect(current);
    }
    const height = current.width / ratio;
    const value = {
      ...current,
      y: current.y + (current.height - height) / 2,
      height,
    };
    this.#session!.value = this.#ctx.renderer?.setImageFillCropPreview?.(value, ratio) ?? value;
    this.#notify();
    return this.#toRect(this.#session!.value);
  }

  applyDimensions(width: number, height: number): CropRect | null {
    const current = this.#session?.value;
    if (!current || width <= 0 || height <= 0) return current ? this.#toRect(current) : null;
    return this.#toRect(
      this.update({
        x: current.x + (current.width - width) / 2,
        y: current.y + (current.height - height) / 2,
        width,
        height,
      }) ?? current,
    );
  }

  getDimensions(): { width: number; height: number } | null {
    const value = this.#session?.value;
    return value ? { width: value.width, height: value.height } : null;
  }

  onChanged(cb: (change: ImageFillCropChange) => void): () => void {
    this.#listeners.add(cb);
    return () => this.#listeners.delete(cb);
  }

  #commit(session: CropSession): void {
    const block = this.#ctx.block;
    const fill = block?.getFillImage(session.blockId);
    if (!block || !fill) return;
    const value = session.value;
    this.#ctx.engine.beginBatch();
    block.setPosition(session.blockId, value.x, value.y);
    block.setSize(session.blockId, value.width, value.height);
    block.setFillImage(session.blockId, {
      ...fill,
      fit: value.fit,
      alignment: value.alignment ?? "center",
      offsetX: value.offsetX,
      offsetY: value.offsetY,
      scale: value.scale,
      rotation: value.rotation,
      flipHorizontal: value.flipHorizontal,
      flipVertical: value.flipVertical,
    });
    this.#ctx.engine.endBatch();
  }

  #setPreview(crop: ImageFillCrop): void {
    if (!this.#session) return;
    this.#session.value = crop;
    this.#notify();
  }

  #notify(): void {
    if (!this.#session) return;
    const change = { blockId: this.#session.blockId, crop: { ...this.#session.value } };
    for (const listener of this.#listeners) listener(change);
  }

  #toRect(value: ImageFillCrop): CropRect {
    return { x: value.x, y: value.y, width: value.width, height: value.height };
  }

  #isUnchanged(session: CropSession): boolean {
    return (Object.keys(session.initial) as (keyof ImageFillCrop)[]).every(
      (key) => session.initial[key] === session.value[key],
    );
  }
}
