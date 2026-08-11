import type Konva from "konva";
import type { TextRun } from "../block/block.types";
import { FormattedTextAttrs } from "./formatted-text-attrs";
import {
  computedTextHeight,
  computedTextWidth,
  readBackgroundBox,
  type TextRect,
  textBoxBleedRect,
} from "./formatted-text-bounds";
import { type CurvedTextLayout, computeCurvedLayout } from "./formatted-text-curve";
import { computeTextLines } from "./formatted-text-layout";
import { renderCurvedText, renderFormattedText } from "./formatted-text-render";
import type { TextLine } from "./formatted-text-utils";

export interface FormattedTextConfig extends Konva.ShapeConfig {
  textRuns?: TextRun[];
  align?: string;
  verticalAlign?: string;
  lineHeight?: number;
  padding?: number;
  wrap?: string;
  width?: number;
  height?: number;
}

/**
 * Custom Konva.Shape that renders multi-run styled text, flat or along an arc.
 * Curved rendering is gated behind `curveRadius > 0`; when flat, the original
 * layout/render path runs unchanged. Attribute accessors live on
 * {@link FormattedTextAttrs}.
 */
export class FormattedText extends FormattedTextAttrs {
  private _textLines: TextLine[] = [];
  private _curvedLayout: CurvedTextLayout | null = null;
  private _plainTextCache: string | null = null;

  constructor(config?: FormattedTextConfig) {
    super(config);

    const watchAttrs = [
      "textRuns",
      "align",
      "verticalAlign",
      "lineHeight",
      "padding",
      "wrap",
      "width",
      "height",
      "curveRadius",
      "curveDirection",
    ];
    watchAttrs.forEach((attr) => {
      this.on(`${attr}Change.konva`, () => {
        this._textLines = [];
        this._curvedLayout = null;
        this._plainTextCache = null;
      });
    });
  }

  // ── Cached plain text ─────────────────────────────

  getPlainText(): string {
    if (this._plainTextCache === null) {
      this._plainTextCache = this.textRuns()
        .map((r) => r.text)
        .join("");
    }
    return this._plainTextCache;
  }

  // ── Text layout (delegated) ───────────────────────

  private _computeTextLines(): TextLine[] {
    if (this._textLines.length > 0) return this._textLines;
    this._textLines = computeTextLines(this.textRuns(), {
      width: this.width() || 99999,
      padding: this.padding(),
      wrap: this.wrap(),
      lineHeight: this.lineHeight(),
      plainText: this.getPlainText(),
    });
    return this._textLines;
  }

  /** Curved layout (memoized). Only reached when curveRadius > 0. */
  private _computeCurvedLayout(): CurvedTextLayout {
    if (this._curvedLayout) return this._curvedLayout;
    this._curvedLayout = computeCurvedLayout(this.textRuns(), {
      radius: this.curveRadius(),
      direction: this.curveDirection(),
      padding: this.padding(),
    });
    return this._curvedLayout;
  }

  _sceneFunc(context: Konva.Context): void {
    const ctx = context._context;

    // Curved path is fully gated: flat text below runs byte-for-byte unchanged.
    if (this.curveRadius() > 0) {
      renderCurvedText(ctx, this._computeCurvedLayout());
      return;
    }

    const w = this.width() || 0;
    const h = this.height() || 0;
    const box = readBackgroundBox(this);

    // Clip text to the container bounds (plus any box bleed) so it doesn't overflow on resize
    if (w > 0 && h > 0) {
      const clip = textBoxBleedRect(box, w, h);
      ctx.save();
      ctx.beginPath();
      ctx.rect(clip.x, clip.y, clip.width, clip.height);
      ctx.clip();
    }

    renderFormattedText(ctx, this._computeTextLines(), {
      width: w || 99999,
      height: h,
      padding: this.padding(),
      align: this.align(),
      verticalAlign: this.verticalAlign(),
      backgroundFill: this.getAttr("backgroundFill") as string | undefined,
      backgroundBox: box,
    });

    if (w > 0 && h > 0) {
      ctx.restore();
    }
  }

  _hitFunc(context: Konva.Context): void {
    const ctx = context._context;
    if (this.curveRadius() > 0) {
      const rect = this._computeCurvedLayout().bbox;
      ctx.beginPath();
      ctx.rect(rect.x, rect.y, rect.width, rect.height);
      ctx.closePath();
      context.fillStrokeShape(this);
      return;
    }
    const w = this.width() || 0;
    const h = this.height() || this.getComputedHeight();
    // Same rect as the scene clip: everything the block can paint is clickable,
    // so the box's own padding hits the block instead of falling through.
    const hit = textBoxBleedRect(readBackgroundBox(this), w, h);
    ctx.beginPath();
    ctx.rect(hit.x, hit.y, hit.width, hit.height);
    ctx.closePath();
    context.fillStrokeShape(this);
  }

  /**
   * Arc bounding box when curved (grows with radius), else the plain container
   * rect — NOT the bleed rect. The Transformer sizes its frame from this, and
   * the pill-anchor resize turns that frame into a width, so inflating it would
   * both unhug the selection frame and make a drag of d px move the edge by
   * less than d. The paint bleed reaches the cache / export path via
   * {@link cache} instead.
   */
  getSelfRect(): TextRect {
    if (this.curveRadius() > 0) return { ...this._computeCurvedLayout().bbox };
    return { x: 0, y: 0, width: this.width() || 0, height: this.height() || 0 };
  }

  /**
   * Cache the bleed rect rather than Konva's default (`getSelfRect`), so a
   * cached or exported node keeps the box shadow / stroke that `_sceneFunc`
   * paints outside the container. An explicit size from the caller wins.
   */
  cache(config?: Parameters<Konva.Node["cache"]>[0]): this | undefined {
    const w = this.width() || 0;
    const h = this.height() || 0;
    if (this.curveRadius() > 0 || w <= 0 || h <= 0 || config?.width != null) {
      return super.cache(config);
    }
    return super.cache({ ...config, ...textBoxBleedRect(readBackgroundBox(this), w, h) });
  }

  getComputedHeight(): number {
    if (this.curveRadius() > 0) {
      return this._computeCurvedLayout().bbox.height;
    }
    return computedTextHeight(this._computeTextLines(), this.padding());
  }

  getComputedWidth(): number {
    if (this.curveRadius() > 0) {
      return this._computeCurvedLayout().bbox.width;
    }
    return computedTextWidth(this._computeTextLines(), this.padding());
  }

  getClassName(): string {
    return "FormattedText";
  }
}
