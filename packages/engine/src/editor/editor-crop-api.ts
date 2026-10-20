import type { BlockAPI } from "../block/block-api";
import type {
  CropEditTarget,
  ImageFillCrop,
  ImageFillCropChange,
  ImageFillCropUpdate,
} from "../editor-types";
import type { EngineCore } from "../engine-core";
import type { CropRect } from "../utils/crop-math";
import type { EditorContext } from "./editor-context";
import { EditorCrop } from "./editor-crop";
import { EditorImageFillCrop } from "./editor-image-fill-crop";

/** Crop-specific portion of EditorAPI, split out to keep the public facade focused. */
export class EditorCropAPI {
  protected readonly ctx: EditorContext;
  protected readonly crop: EditorCrop;
  protected readonly imageFillCrop: EditorImageFillCrop;

  constructor(engine: EngineCore) {
    this.ctx = { engine, renderer: engine.getRenderer(), block: null };
    this.crop = new EditorCrop(this.ctx);
    this.imageFillCrop = new EditorImageFillCrop(this.ctx);
  }

  /** @internal — called by EditxEngine after construction. */
  _setBlockAPI(block: BlockAPI): void {
    this.ctx.block = block;
  }

  /** @internal */
  _getCrop(): EditorCrop {
    return this.crop;
  }

  getCropEditTarget(blockId: number): CropEditTarget | null {
    if (this.imageFillCrop.isEligible(blockId)) return "shape-image";
    return this.ctx.block?.supportsCrop(blockId) ? "source" : null;
  }

  getImageFillCrop(): ImageFillCrop | null {
    return this.imageFillCrop.get();
  }

  updateImageFillCrop(update: ImageFillCropUpdate): ImageFillCrop | null {
    return this.imageFillCrop.update(update);
  }

  resetImageFillCrop(): ImageFillCrop | null {
    return this.imageFillCrop.reset();
  }

  onImageFillCropChanged(cb: (change: ImageFillCropChange) => void): () => void {
    return this.imageFillCrop.onChanged(cb);
  }

  getCropBlockId(): number | null {
    return this.crop.getCropBlockId();
  }

  applyCropRatio(ratio: number | null): CropRect | null {
    return this.imageFillCrop.get()
      ? this.imageFillCrop.applyRatio(ratio)
      : this.crop.applyCropRatio(ratio);
  }

  applyCropDimensions(width: number, height: number): CropRect | null {
    return this.imageFillCrop.get()
      ? this.imageFillCrop.applyDimensions(width, height)
      : this.crop.applyCropDimensions(width, height);
  }

  getCropVisualDimensions(): { width: number; height: number } | null {
    return this.imageFillCrop.get()
      ? this.imageFillCrop.getDimensions()
      : this.crop.getCropVisualDimensions();
  }

  refreshCropOverlay(): void {
    this.crop.refreshCropOverlay();
  }

  showCropOverlay(
    blockId: number,
    imageRect: CropRect,
    initialCrop?: CropRect,
    transform?: {
      rotation: number;
      flipH: boolean;
      flipV: boolean;
      sourceWidth: number;
      sourceHeight: number;
    },
  ): void {
    this.ctx.renderer?.showCropOverlay(blockId, imageRect, initialCrop, transform);
  }

  hideCropOverlay(): void {
    this.ctx.renderer?.hideCropOverlay();
  }

  setCropRect(rect: CropRect): void {
    this.ctx.renderer?.setCropRect(rect);
  }

  getCropRect(): CropRect | null {
    return this.ctx.renderer?.getCropRect() ?? null;
  }

  setCropRatio(ratio: number | null): void {
    this.ctx.renderer?.setCropRatio(ratio);
  }
}
