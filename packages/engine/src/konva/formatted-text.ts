import Konva from "konva";
import type { TextRun } from "../block/block.types";
import { computeTextLines } from "./formatted-text-layout";
import { renderFormattedText } from "./formatted-text-render";
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
 * Custom Konva.Shape that renders multi-run styled text.
 * Each TextRun can have its own fontSize, fontFamily, fontWeight, fontStyle, fill,
 * letterSpacing, and textDecoration.
 *
 * Adapted from a reference formatted text implementation, simplified:
 * - No baselineShift/cap-height trimming (DEP-2)
 * - Binary search line breaking (IMP-1)
 * - Proportional text decoration (IMP-7)
 * - Cached plainText (IMP-10)
 */
export class FormattedText extends Konva.Shape {
  private _textLines: TextLine[] = [];
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
    ];
    watchAttrs.forEach((attr) => {
      this.on(`${attr}Change.konva`, () => {
        this._textLines = [];
        this._plainTextCache = null;
      });
    });
  }

  // ── Attribute accessors ─────────────────────────────

  textRuns(): TextRun[];
  textRuns(val: TextRun[]): this;
  textRuns(val?: TextRun[]): TextRun[] | this {
    if (val === undefined) return this.getAttr("textRuns") ?? [];
    this.setAttr("textRuns", val);
    return this;
  }

  align(): string;
  align(val: string): this;
  align(val?: string): string | this {
    if (val === undefined) return this.getAttr("align") ?? "left";
    this.setAttr("align", val);
    return this;
  }

  verticalAlign(): string;
  verticalAlign(val: string): this;
  verticalAlign(val?: string): string | this {
    if (val === undefined) return this.getAttr("verticalAlign") ?? "top";
    this.setAttr("verticalAlign", val);
    return this;
  }

  lineHeight(): number;
  lineHeight(val: number): this;
  lineHeight(val?: number): number | this {
    if (val === undefined) return this.getAttr("lineHeight") ?? 1.2;
    this.setAttr("lineHeight", val);
    return this;
  }

  padding(): number;
  padding(val: number): this;
  padding(val?: number): number | this {
    if (val === undefined) return this.getAttr("padding") ?? 0;
    this.setAttr("padding", val);
    return this;
  }

  wrap(): string;
  wrap(val: string): this;
  wrap(val?: string): string | this {
    if (val === undefined) return this.getAttr("wrap") ?? "word";
    this.setAttr("wrap", val);
    return this;
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

  findRunAtIndex(charIndex: number): { runIndex: number; offsetInRun: number } | null {
    const runs = this.textRuns();
    let offset = 0;
    for (let i = 0; i < runs.length; i++) {
      const end = offset + runs[i].text.length;
      if (charIndex < end) {
        return { runIndex: i, offsetInRun: charIndex - offset };
      }
      offset = end;
    }
    return null;
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

  // ── Rendering ──────────────────────────────────────

  _sceneFunc(context: Konva.Context): void {
    renderFormattedText(context._context, this._computeTextLines(), {
      width: this.width() || 99999,
      height: this.height() || 0,
      padding: this.padding(),
      align: this.align(),
      verticalAlign: this.verticalAlign(),
      backgroundFill: this.getAttr("backgroundFill") as string | undefined,
    });
  }

  _hitFunc(context: Konva.Context): void {
    const ctx = context._context;
    const w = this.width() || 0;
    const h = this.height() || this.getComputedHeight();
    ctx.beginPath();
    ctx.rect(0, 0, w, h);
    ctx.closePath();
    context.fillStrokeShape(this);
  }

  getComputedHeight(): number {
    const lines = this._computeTextLines();
    const pad = this.padding();
    return lines.reduce((sum, l) => sum + l.height, 0) + pad * 2;
  }

  getComputedWidth(): number {
    const lines = this._computeTextLines();
    const pad = this.padding();
    const maxLineWidth = lines.reduce((max, l) => Math.max(max, l.width), 0);
    return maxLineWidth + pad * 2;
  }

  getClassName(): string {
    return "FormattedText";
  }
}
